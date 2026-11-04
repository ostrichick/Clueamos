'use client';

import { useEffect, useRef } from 'react';
import type { Card, GameState, HypothesisVisualState } from '@/engine/types';
import type { PlayMode, PlayerRole, TurnReviewState } from '@/store/useGameStore';
import { useAFKMonitor } from '@/hooks/useAFKMonitor';
import { sounds } from '@/utils/sounds';

interface GameOrchestration {
  isGameStarted: boolean;
  isMyTurn: boolean;
  isHumanTurn: boolean;
  myPlayerRole: PlayerRole;
  gameState: GameState;
  turnReviewState: TurnReviewState | null;
  isRollingDice: boolean;
  isAutoPlaying: boolean;
  playMode: PlayMode;
  isConnected: boolean;
  guestDisconnected: boolean;
  pendingDisprovePrompt: { availableCards: Card[]; askerId: string } | null;
  activeHypothesisVisual: HypothesisVisualState | null;
  lastSecretClue: { card: Card; fromName: string } | null;
  runAITurnIfNeeded: () => void;
  executeAutoPlayTurn: (actingRole?: PlayerRole) => void;
  confirmTurnReview: () => void;
  dismissSecretClue: () => void;
  dismissHypothesisVisual: () => void;
  setIsAutoPlaying: (value: boolean) => void;
}

/**
 * 게임 진행 오케스트레이션: AI 턴 킥스타트, AFK 감지/대리 플레이,
 * 턴 리뷰 자동 확인, 모달 자동 닫기, 행동 촉구 알림음.
 * effect 의존성과 cleanup을 page.tsx에서 그대로 옮겼다. 동작 변경 없음.
 */
export function useGameOrchestration({
  isGameStarted,
  isMyTurn,
  isHumanTurn,
  myPlayerRole,
  gameState,
  turnReviewState,
  isRollingDice,
  isAutoPlaying,
  playMode,
  isConnected,
  guestDisconnected,
  pendingDisprovePrompt,
  activeHypothesisVisual,
  lastSecretClue,
  runAITurnIfNeeded,
  executeAutoPlayTurn,
  confirmTurnReview,
  dismissSecretClue,
  dismissHypothesisVisual,
  setIsAutoPlaying,
}: GameOrchestration) {
  // AI 턴 자동 실행 감지 (상태 변경 및 턴 전환 시 안전하게 AI 실행 보장)
  useEffect(() => {
    if (!isGameStarted) return;
    if (gameState.phase === 'GAME_OVER') return;
    if (turnReviewState && turnReviewState.active) return;

    const currentP = gameState.players[gameState.currentPlayerIndex];
    if (!currentP || !currentP.type.startsWith('ai_')) return;

    if (gameState.phase === 'PLAYING_ROLL') {
      if (!isRollingDice) {
        const timer = setTimeout(() => {
          runAITurnIfNeeded();
        }, 600);
        return () => clearTimeout(timer);
      }
    } else if (
      gameState.phase === 'PLAYING_MOVE' ||
      gameState.phase === 'PLAYING_SUGGEST' ||
      gameState.phase === 'PLAYING_ACTION_DONE'
    ) {
      // AI가 롤 외의 단계(이동, 가설, 행동완료)에 머물러 있는 경우 자동 진행 보장 (AFK 해제 시 멈춤 방지)
      const timer = setTimeout(() => {
        runAITurnIfNeeded();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isGameStarted, gameState.phase, gameState.currentPlayerIndex, gameState.players, isRollingDice, runAITurnIfNeeded, turnReviewState]);

  // AFK(자리 비움) 감지 - setTimeout 경계 기반 타이머 훅 (60초 경고 -> 90초 자동 대리 플레이)
  const { afkSecondsRemaining, markActivity, dismissAfkWarning } = useAFKMonitor({
    gameStarted: isGameStarted,
    isMyTurn,
  });

  // AI 대리 플레이(AFK) 중 턴 검토 배너(Notes Ready) 자동 확인
  useEffect(() => {
    if (!isGameStarted || gameState.phase === 'GAME_OVER' || !isAutoPlaying) return;
    if (!turnReviewState || !turnReviewState.active) return;

    const isMultiplayer = playMode === 'host' || playMode === 'guest';
    if (isMultiplayer && turnReviewState.readyRoles.includes(myPlayerRole)) return;

    const timer = setTimeout(() => {
      confirmTurnReview();
    }, 1200);
    return () => clearTimeout(timer);
  }, [isGameStarted, gameState.phase, isAutoPlaying, turnReviewState, playMode, myPlayerRole, confirmTurnReview]);

  // AI 대리 플레이 상태에서 단계 전환 시 자동 수행 (행동 완료 시 1초 후 자동 턴 종료)
  useEffect(() => {
    if (!isGameStarted || gameState.phase === 'GAME_OVER') return;
    if (!isAutoPlaying || !isMyTurn) return;

    const delay = gameState.phase === 'PLAYING_ACTION_DONE' ? 1000 : 700;
    const timer = setTimeout(() => {
      executeAutoPlayTurn();
    }, delay);
    return () => clearTimeout(timer);
  }, [isGameStarted, gameState.phase, isAutoPlaying, isMyTurn, executeAutoPlayTurn]);

  // If the guest disconnects, the host covers only Player 2's actions until rejoin.
  useEffect(() => {
    if (!isGameStarted || playMode !== 'host' || !guestDisconnected || isConnected || gameState.phase === 'GAME_OVER') return;
    const actor = gameState.players[gameState.currentPlayerIndex];
    const guestTurn = actor?.type === 'human' && actor.roleType === 'p2';
    const guestDisprove = gameState.phase === 'WAITING_DISPROVE' && gameState.currentSuggestion &&
      gameState.players.some(player => player.roleType === 'p2' &&
        player.hand.some(card => [gameState.currentSuggestion!.suspectId,
          gameState.currentSuggestion!.locationId, gameState.currentSuggestion!.weaponId].includes(card.id)));
    if (!guestTurn && !guestDisprove) return;
    if (turnReviewState?.active || isRollingDice) return;
    const timer = setTimeout(() => executeAutoPlayTurn('p2'), 1200);
    return () => clearTimeout(timer);
  }, [isGameStarted, playMode, guestDisconnected, isConnected, gameState, turnReviewState, isRollingDice, executeAutoPlayTurn]);

  // 대리 플레이 중 반증 요청 발생 시 자동 처리
  useEffect(() => {
    if (!isGameStarted || gameState.phase === 'GAME_OVER' || !isAutoPlaying) return;

    if (pendingDisprovePrompt && pendingDisprovePrompt.availableCards.length > 0) {
      const timer = setTimeout(() => {
        executeAutoPlayTurn();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isGameStarted, gameState.phase, isAutoPlaying, pendingDisprovePrompt, executeAutoPlayTurn]);

  // 대리 플레이 중 모달 팝업 자동 닫기 (1.2초 후)
  useEffect(() => {
    if (!isAutoPlaying) return;
    if (activeHypothesisVisual || lastSecretClue) {
      const timer = setTimeout(() => {
        if (lastSecretClue) dismissSecretClue();
        if (activeHypothesisVisual) dismissHypothesisVisual();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isAutoPlaying, activeHypothesisVisual, lastSecretClue, dismissSecretClue, dismissHypothesisVisual]);

  // 행동 촉구 알림음: 턴 종료(Pass Turn) 또는 노트 확인(Notes Ready)을 눌러야 할 때 은은한 2음 차임벨 1회 재생
  const lastPromptAlertRef = useRef<string>('');
  useEffect(() => {
    if (!isGameStarted || isAutoPlaying) return;

    // 1. 내 턴의 행동 완료 단계 (턴 넘기기 또는 최종 고발 필요)
    if (gameState.phase === 'PLAYING_ACTION_DONE' && isHumanTurn && isMyTurn) {
      const key = `action_done_${gameState.turnCount}`;
      if (lastPromptAlertRef.current !== key) {
        lastPromptAlertRef.current = key;
        sounds.playActionPrompt();
      }
      return;
    }

    // 2. 턴 종료 후 수첩 정리 및 노트 확인 단계 (노트 레디 필요)
    if (
      turnReviewState?.active &&
      myPlayerRole &&
      !turnReviewState.readyRoles.includes(myPlayerRole)
    ) {
      const key = `turn_review_${turnReviewState.turnNumber || gameState.turnCount}`;
      if (lastPromptAlertRef.current !== key) {
        lastPromptAlertRef.current = key;
        sounds.playActionPrompt();
      }
      return;
    }
  }, [
    isGameStarted,
    isAutoPlaying,
    gameState.phase,
    gameState.turnCount,
    isHumanTurn,
    isMyTurn,
    turnReviewState?.active,
    turnReviewState?.readyRoles,
    turnReviewState?.turnNumber,
    myPlayerRole,
  ]);

  // 직접 조작으로 제어권 되찾기
  const handleResumeControl = () => {
    markActivity();
    setIsAutoPlaying(false);

    // AI 플레이어 턴 중에 제어권을 복구한 경우, 멈추지 않고 AI가 턴을 정상 완수하도록 킥스타트
    const currentP = gameState.players[gameState.currentPlayerIndex];
    if (currentP && currentP.type.startsWith('ai_')) {
      setTimeout(() => {
        runAITurnIfNeeded();
      }, 200);
    }
  };

  // AFK 경고 모달 확인 (저 여기 있어요!)
  const handleDismissAfkWarning = () => {
    dismissAfkWarning();
  };

  return { afkSecondsRemaining, handleResumeControl, handleDismissAfkWarning };
}
