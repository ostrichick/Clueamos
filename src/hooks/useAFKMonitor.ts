import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';

interface UseAFKMonitorOptions {
  gameStarted: boolean;
  isMyTurn: boolean;
}

/**
 * AFK(자리 비움) 감지 훅.
 * 1초 폴링 대신 "다음 60초 경계" setTimeout + "경고 카운트다운(60~90s) 1초 인터벌"만 예약하여
 * 정상 플레이 중에는 타이머 부하가 사실상 0이 된다.
 *  - 60초 경과: AFK 경고 카운트다운 노출 (afkSecondsRemaining)
 *  - 90초 경과: AI 자동 대리 플레이 시작 (auto-play)
 */
export function useAFKMonitor({ gameStarted, isMyTurn }: UseAFKMonitorOptions) {
  const gamePhase = useGameStore(s => s.gameState.phase);
  const isAutoPlaying = useGameStore(s => s.isAutoPlaying);
  const turnReviewState = useGameStore(s => s.turnReviewState);
  const playMode = useGameStore(s => s.playMode);
  const myPlayerRole = useGameStore(s => s.myPlayerRole);
  const executeAutoPlayTurn = useGameStore(s => s.executeAutoPlayTurn);
  const confirmTurnReview = useGameStore(s => s.confirmTurnReview);
  const setIsAutoPlaying = useGameStore(s => s.setIsAutoPlaying);

  const [afkSecondsRemaining, setAfkSecondsRemaining] = useState<number | null>(null);
  const lastActivityRef = useRef<number>(0);
  const [activityTick, setActivityTick] = useState(0);

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setActivityTick(t => t + 1);
  }, []);

  // 전역 사용자 상호작용 감지 (클릭, 터치, 키보드)
  useEffect(() => {
    lastActivityRef.current = Date.now();
    const onActivity = () => markActivity();
    window.addEventListener('pointerdown', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('touchstart', onActivity);
    return () => {
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('touchstart', onActivity);
    };
  }, [markActivity]);

  // 턴/단계 전환 시 활동 기준 시각 갱신
  useEffect(() => {
    lastActivityRef.current = Date.now();
  }, [isMyTurn]);

  // 메인 AFK 타이머: setTimeout 경계 기반 (아무 활동이 없는 동안만 동작)
  useEffect(() => {
    if (!gameStarted || gamePhase === 'GAME_OVER' || isAutoPlaying || !isMyTurn) return;
    if (turnReviewState?.active) return;

    let timeoutId: number | null = null;
    let countdownId: number | null = null;

    const clearTimers = () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (countdownId !== null) window.clearInterval(countdownId);
      timeoutId = null;
      countdownId = null;
    };

    const startCountdown = (elapsed: number) => {
      setAfkSecondsRemaining(Math.max(0, Math.ceil(90 - elapsed)));
      countdownId = window.setInterval(() => {
        const e = (Date.now() - lastActivityRef.current) / 1000;
        if (e >= 90) {
          if (countdownId !== null) window.clearInterval(countdownId);
          countdownId = null;
          setAfkSecondsRemaining(null);
          setIsAutoPlaying(true);
          executeAutoPlayTurn();
          return;
        }
        setAfkSecondsRemaining(Math.max(0, Math.ceil(90 - e)));
      }, 1000);
    };

    const checkNow = () => {
      const elapsed = (Date.now() - lastActivityRef.current) / 1000;
      if (elapsed >= 90) {
        setAfkSecondsRemaining(null);
        setIsAutoPlaying(true);
        executeAutoPlayTurn();
        return;
      }
      if (elapsed >= 60) {
        startCountdown(elapsed);
        return;
      }
      // 다음 60초 경계 지점까지 재예약 (정상 플레이 중에는 폴링 없음) + 경고 카운트다운 정리
      setAfkSecondsRemaining(null);
      timeoutId = window.setTimeout(checkNow, Math.max(250, (60 - elapsed) * 1000));
    };

    timeoutId = window.setTimeout(checkNow, 300);
    return clearTimers;
  }, [
    gameStarted,
    gamePhase,
    isMyTurn,
    isAutoPlaying,
    turnReviewState?.active,
    activityTick,
    executeAutoPlayTurn,
    confirmTurnReview,
    playMode,
    myPlayerRole,
    setIsAutoPlaying,
  ]);

  const dismissAfkWarning = useCallback(() => {
    markActivity();
    setAfkSecondsRemaining(null);
  }, [markActivity]);

  return { afkSecondsRemaining, markActivity, dismissAfkWarning };
}