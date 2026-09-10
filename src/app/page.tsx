'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { HelpCircle, ScrollText, ArrowRight, Flame } from 'lucide-react';
import { SUSPECTS, WEAPONS } from '@/engine/data';
import { GameBoard } from '@/components/board/GameBoard';
import { CardHandTray } from '@/components/cards/CardHandTray';
import { CardPassModal } from '@/components/cards/CardPassModal';
import { LobbyScreen } from '@/components/lobby/LobbyScreen';
import { GameHeader } from '@/components/layout/GameHeader';
import { DeductionNotebook } from '@/components/notebook/DeductionNotebook';
import { AccusationModal } from '@/components/modals/AccusationModal';
import { GameOverModal } from '@/components/modals/GameOverModal';
import { DisprovePromptModal } from '@/components/modals/DisprovePromptModal';
import { HypothesisVisualizerModal } from '@/components/modals/HypothesisVisualizerModal';
import { SpeechBubble } from '@/components/board/SpeechBubble';
import { TurnPhaseStepper } from '@/components/board/TurnPhaseStepper';
import { TableEmotesBar } from '@/components/board/TableEmotesBar';
import { AfkWarningModal } from '@/components/modals/AfkWarningModal';
import { AutoPlayBanner } from '@/components/game/AutoPlayBanner';
import { sounds } from '@/utils/sounds';
import { translations, SupportedLocale } from '@/i18n/translations';
import { getPlayerDisplayName } from '@/engine/engine';
import confetti from 'canvas-confetti';

export default function Home() {
  const {
    gameState,
    startNewGame,
    performRollDice,
    performMove,
    performWaitInHallway,
    performSuggestion,
    performDisprove,
    performAccusation,
    performEndTurn,
    runAITurnIfNeeded,
    isRollingDice,
    roomWeapons,
    activeEmote,
    triggerEmote,
    dismissEmote,
    playMode,
    setPlayMode,
    createRoom,
    joinRoom,
    disconnectRoom,
    restoreSessionIfNeeded,
    roomCode,
    isConnected,
    isConnecting,
    connectionError,
    peerOnline,
    myPlayerRole,
    aiPlayerCount,
    setAiPlayerCount,
    syncGuestCharacterChoice,
    syncHostCharacterChoice,
    guestSelectedCharacter,
    hostSelectedCharacter,
    pendingDisprovePrompt,
    lastSecretClue,
    dismissSecretClue,
    activeHypothesisVisual,
    dismissHypothesisVisual,
    activeDialogue,
    dismissDialogue,
    exitToLobby,
    isAutoPlaying,
    setIsAutoPlaying,
    executeAutoPlayTurn,
    setLocale: setStoreLocale,
  } = useGameStore();

  // 언어 선택 상태: 영어 ('en'), 스페인어 ('es'), 한국어 ('ko')
  const [locale, setLocaleState] = useState<SupportedLocale>('en');
  const t = translations[locale];

  const setLocale = (newLoc: SupportedLocale) => {
    setLocaleState(newLoc);
    setStoreLocale(newLoc);
  };

  const [hasStarted, setHasStarted] = useState(false);
  
  // 1 & 2 플레이어 캐릭터 선택 상태
  const [p1Character, setP1Character] = useState<string>('suspect_scarlett');
  const [p2Character, setP2Character] = useState<string>('suspect_mustard');

  // 멀티플레이어 로컬 입력 상태 (URL 쿼리스트링 파라미터가 있으면 초기값으로 사용)
  const [inputRoomCode, setInputRoomCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('room')?.trim().replace(/\D/g, '').slice(0, 2) || '';
    }
    return '';
  });
  const [copySuccessToast, setCopySuccessToast] = useState(false);
  const [selectedDisproveCard, setSelectedDisproveCard] = useState<string | null>(null);
  const [isPassingCard, setIsPassingCard] = useState(false);
  const [passingToPlayerName, setPassingToPlayerName] = useState<string>('');

  const [selectedSuspect, setSelectedSuspect] = useState(SUSPECTS[0].id);
  const [selectedWeapon, setSelectedWeapon] = useState(WEAPONS[0].id);
  const [activeTab, setActiveTab] = useState<'board' | 'notes'>('board');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [bgmActive, setBgmActive] = useState(false);

  // 개인 추리 수첩 (체크리스트 & 매트릭스 상태)
  const [userNotes, setUserNotes] = useState<Record<string, 'UNKNOWN' | 'YES' | 'NO'>>({});
  const [matrixNotes, setMatrixNotes] = useState<Record<string, Record<string, '?' | 'X' | 'O'>>>({});
  
  // 최종 고발 모달 상태
  const [isAccuseModalOpen, setIsAccuseModalOpen] = useState(false);
  // 메인 로비 나가기 확인 모달 상태
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isHumanTurn = currentPlayer?.type === 'human';

  // 동기화된 캐릭터 선택값 파생 (호스트는 게스트 선택, 게스트는 호스트 선택을 우선 반영)
  const effectiveP1 = (playMode === 'guest' && hostSelectedCharacter) ? hostSelectedCharacter : p1Character;
  const effectiveP2 = (playMode === 'host' && guestSelectedCharacter) ? guestSelectedCharacter : p2Character;

  // 게임 시작 여부:
  // 1. 호스트/1인 플레이어가 시작 버튼을 눌렀을 때 (hasStarted === true)
  // 2. 게스트 모드에서 호스트가 게임을 시작하여 게임 상태가 LOBBY가 아니고 카드가 분배되었을 때
  const isGameStarted = hasStarted || 
    (playMode === 'guest' && gameState.phase !== 'LOBBY' && (gameState.players[1]?.hand?.length ?? 0) > 0);

  // 멀티플레이어 기기별 관점 (호스트=p1, 게스트=p2, 솔로=p1 human, 로컬=현재 차례)
  const myPlayer = playMode === 'guest'
    ? (gameState.players.find(p => p.roleType === 'p2') || gameState.players[1])
    : (playMode === 'host' || playMode === 'solo')
      ? gameState.players[0]
      : currentPlayer;

  const isMyTurn = (playMode === 'solo' || playMode === 'local')
    ? isHumanTurn
    : (myPlayerRole === 'p1' && currentPlayer?.roleType === 'p1') ||
      (myPlayerRole === 'p2' && currentPlayer?.roleType === 'p2');

  // AI 턴 자동 실행 감지 (상태 변경 및 턴 전환 시 안전하게 AI 실행 보장)
  useEffect(() => {
    if (!isGameStarted) return;
    if (gameState.phase === 'GAME_OVER') return;

    if (gameState.phase === 'PLAYING_ROLL' && !isRollingDice) {
      const currentP = gameState.players[gameState.currentPlayerIndex];
      if (currentP && currentP.type.startsWith('ai_')) {
        const timer = setTimeout(() => {
          runAITurnIfNeeded();
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [isGameStarted, gameState.phase, gameState.currentPlayerIndex, gameState.players, isRollingDice, runAITurnIfNeeded]);

  // AFK(자리 비움) 감지 타이머 및 대리 플레이 상태
  const lastActivityTime = useRef<number>(0);
  const [afkSecondsRemaining, setAfkSecondsRemaining] = useState<number | null>(null);

  // 사용자 인터랙션 감지 (화면 터치, 클릭, 키보드)
  useEffect(() => {
    lastActivityTime.current = Date.now();
    const handleUserActivity = () => {
      lastActivityTime.current = Date.now();
    };
    window.addEventListener('pointerdown', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    return () => {
      window.removeEventListener('pointerdown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
    };
  }, []);

  // 턴 전환 시 활동 기준 시간 갱신
  useEffect(() => {
    lastActivityTime.current = Date.now();
  }, [isMyTurn, gameState.currentPlayerIndex, gameState.phase]);

  // AFK 타이머 주기 검사 (매 초마다 비동기 인터벌로 동작)
  useEffect(() => {
    if (!isGameStarted || gameState.phase === 'GAME_OVER') {
      return;
    }

    const interval = setInterval(() => {
      // 이미 AI 대리 플레이 중인 경우
      if (isAutoPlaying) {
        setAfkSecondsRemaining(prev => (prev !== null ? null : prev));
        if (isMyTurn) {
          executeAutoPlayTurn();
        }
        return;
      }

      // 내 턴이 아닐 때는 경고를 띄우지 않음
      if (!isMyTurn) {
        setAfkSecondsRemaining(prev => (prev !== null ? null : prev));
        return;
      }

      if (lastActivityTime.current === 0) {
        lastActivityTime.current = Date.now();
      }

      const elapsedSec = (Date.now() - lastActivityTime.current) / 1000;

      // 1분(60초) + 30초 = 90초 경과 시 AI 자동 대리 플레이 시작
      if (elapsedSec >= 90) {
        setAfkSecondsRemaining(null);
        setIsAutoPlaying(true);
        executeAutoPlayTurn();
      } else if (elapsedSec >= 60) {
        // 60초 경과 시 30초 카운트다운 팝업 노출
        const remaining = Math.max(0, Math.ceil(90 - elapsedSec));
        setAfkSecondsRemaining(remaining);
      } else {
        setAfkSecondsRemaining(prev => (prev !== null ? null : prev));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isGameStarted, gameState.phase, isMyTurn, isAutoPlaying, setIsAutoPlaying, executeAutoPlayTurn]);

  // AI 대리 플레이 상태에서 단계 전환 시 자동 수행
  useEffect(() => {
    if (!isGameStarted || gameState.phase === 'GAME_OVER') return;
    if (!isAutoPlaying || !isMyTurn) return;

    const timer = setTimeout(() => {
      executeAutoPlayTurn();
    }, 700);
    return () => clearTimeout(timer);
  }, [isGameStarted, gameState.phase, isAutoPlaying, isMyTurn, executeAutoPlayTurn]);

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

  // 대리 플레이 중 모달 팝업 자동 닫기 (2.5초 후)
  useEffect(() => {
    if (!isAutoPlaying) return;
    if (activeHypothesisVisual || lastSecretClue) {
      const timer = setTimeout(() => {
        if (lastSecretClue) dismissSecretClue();
        if (activeHypothesisVisual) dismissHypothesisVisual();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isAutoPlaying, activeHypothesisVisual, lastSecretClue, dismissSecretClue, dismissHypothesisVisual]);

  // 직접 조작으로 제어권 되찾기
  const handleResumeControl = () => {
    setIsAutoPlaying(false);
    lastActivityTime.current = Date.now();
    setAfkSecondsRemaining(null);
  };

  // AFK 경고 모달 확인 (저 여기 있어요!)
  const handleDismissAfkWarning = () => {
    lastActivityTime.current = Date.now();
    setAfkSecondsRemaining(null);
  };

  // 메인 설정 화면으로 나가기 핸들러
  const handleExitToLobby = () => {
    sounds.playCardSlide();
    setHasStarted(false);
    setIsExitModalOpen(false);
    exitToLobby();
  };

  // 세션 복원 시도 (모바일 새로고침 또는 브라우저 복귀 시)
  useEffect(() => {
    restoreSessionIfNeeded().catch(() => {});
  }, [restoreSessionIfNeeded]);

  // URL 쿼리스트링 `?room=XXXX` 자동 감지 및 자동 접속
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam && !isConnected && !roomCode) {
        setPlayMode('guest');
        joinRoom(roomParam.trim()).catch(() => {});
      }
    }
  }, [isConnected, roomCode, joinRoom, setPlayMode]);

  // 음향 효과 토글
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.enabled = next;
  };

  // 게임 승리/종료 연출
  useEffect(() => {
    if (gameState.phase === 'GAME_OVER') {
      if (gameState.winnerId) {
        sounds.playWin();
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      } else {
        sounds.playFail();
      }
    }
  }, [gameState.phase, gameState.winnerId]);

  const handleSelectP1 = (charId: string) => {
    setP1Character(charId);
    syncHostCharacterChoice(charId);
    if (effectiveP2 === charId) {
      const remaining = SUSPECTS.find(s => s.id !== charId);
      if (remaining) {
        setP2Character(remaining.id);
        syncGuestCharacterChoice(remaining.id);
      }
    }
  };

  const handleSelectP2 = (charId: string) => {
    if (charId === effectiveP1) return;
    setP2Character(charId);
    syncGuestCharacterChoice(charId);
  };

  const handleCopyInviteLink = () => {
    if (typeof window !== 'undefined' && roomCode) {
      const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
      navigator.clipboard.writeText(url);
      setCopySuccessToast(true);
      setTimeout(() => setCopySuccessToast(false), 3500);
    }
  };

  const handleCreateRoom = () => {
    createRoom();
  };

  const handleJoinRoom = (code: string) => {
    joinRoom(code);
  };

  const handleStartGame = () => {
    sounds.playMove();
    startNewGame(effectiveP1, effectiveP2, locale);
    setHasStarted(true);
  };

  const handleRollDice = () => {
    sounds.playDice();
    performRollDice();
  };

  const handleMove = (roomId: string) => {
    sounds.playMove();
    performMove(roomId);
  };

  const handleSuggestion = () => {
    sounds.playQuestion();
    performSuggestion({
      suspectId: selectedSuspect,
      locationId: currentPlayer.currentRoomId,
      weaponId: selectedWeapon,
    });
  };

  const handleFinalAccusation = (accusation: { suspectId: string; locationId: string; weaponId: string }) => {
    setIsAccuseModalOpen(false);
    const isCorrect = performAccusation(accusation);

    if (isCorrect) {
      sounds.playWin();
    } else {
      sounds.playFail();
    }
  };

  const toggleNote = (cardId: string) => {
    sounds.playDisprove();
    setUserNotes(prev => {
      const current = prev[cardId] || 'UNKNOWN';
      const next = current === 'UNKNOWN' ? 'NO' : current === 'NO' ? 'YES' : 'UNKNOWN';
      return { ...prev, [cardId]: next };
    });
  };

  const toggleMatrixCell = (cardId: string, playerId: string) => {
    sounds.playDisprove();
    setMatrixNotes(prev => {
      const cardMap = prev[cardId] || {};
      const current = cardMap[playerId] || '?';
      const next = current === '?' ? 'X' : current === 'X' ? 'O' : '?';
      return {
        ...prev,
        [cardId]: {
          ...cardMap,
          [playerId]: next,
        },
      };
    });
  };

  const handleConfirmDisprove = (cardId: string) => {
    const asker = gameState.players.find(p => p.id === pendingDisprovePrompt?.askerId);
    const targetName = asker ? getPlayerDisplayName(asker, locale) : 'Detective';
    setPassingToPlayerName(targetName);
    setIsPassingCard(true);
    sounds.playCardSlide();

    setTimeout(() => {
      setIsPassingCard(false);
      performDisprove(cardId);
      setSelectedDisproveCard(null);
    }, 850);
  };

  // 카드 및 방 다국어 이름 가져오기 헬퍼
  const getCardName = (id: string) => t.cards[id]?.name || id;
  const getRoomName = (id: string) => t.rooms[id]?.name || id;

  // 로비 화면
  if (!isGameStarted) {
    return (
      <LobbyScreen
        locale={locale}
        setLocale={setLocale}
        t={t}
        playMode={playMode}
        setPlayMode={setPlayMode}
        effectiveP1={effectiveP1}
        effectiveP2={effectiveP2}
        handleSelectP1={handleSelectP1}
        handleSelectP2={handleSelectP2}
        roomCode={roomCode}
        inputRoomCode={inputRoomCode}
        setInputRoomCode={setInputRoomCode}
        isConnecting={isConnecting}
        isConnected={isConnected}
        connectionError={connectionError}
        createRoom={handleCreateRoom}
        joinRoom={handleJoinRoom}
        disconnectRoom={disconnectRoom}
        handleCopyInviteLink={handleCopyInviteLink}
        copySuccessToast={copySuccessToast}
        handleStartGame={handleStartGame}
        getCardName={getCardName}
        aiPlayerCount={aiPlayerCount}
        setAiPlayerCount={setAiPlayerCount}
      />
    );
  }

  // 메인 인게임 화면
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 상단 네비게이션 헤더 */}
      <GameHeader
        t={t}
        locale={locale}
        setLocale={setLocale}
        turnCount={gameState.turnCount}
        maxTurns={gameState.maxTurns}
        playMode={playMode}
        roomCode={roomCode}
        peerOnline={peerOnline}
        currentPlayer={currentPlayer}
        soundEnabled={soundEnabled}
        toggleSound={toggleSound}
        bgmActive={bgmActive}
        toggleBgm={() => {
          const next = sounds.toggleBgm();
          setBgmActive(next);
        }}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onScrollToNotes={() => {
          document.getElementById('deduction-notebook')?.scrollIntoView({ behavior: 'smooth' });
        }}
        isHumanTurn={isHumanTurn}
        isMyTurn={isMyTurn}
        onOpenAccuse={() => setIsAccuseModalOpen(true)}
        onNewGame={() => {
          startNewGame(effectiveP1, effectiveP2, locale);
        }}
        onExitToLobby={() => setIsExitModalOpen(true)}
      />

      {/* AI 대리 플레이 중 플로팅 배너 */}
      <AutoPlayBanner
        isActive={isAutoPlaying}
        onResumeControl={handleResumeControl}
        t={t}
      />

      {/* 실시간 은밀한 단서 3D 뒤집기 카드 모달 및 전달 애니메이션 */}
      {(lastSecretClue || isPassingCard) && (
        <CardPassModal
          secretClue={lastSecretClue}
          isPassing={isPassingCard}
          passingToName={passingToPlayerName}
          passingCardId={selectedDisproveCard}
          getCardName={getCardName}
          onDismiss={dismissSecretClue}
          onMarkNotebookAndDismiss={(cardId) => {
            setUserNotes(prev => ({ ...prev, [cardId]: 'NO' }));
            dismissSecretClue();
          }}
          t={t}
        />
      )}

      {/* AI 탐정 실시간 말풍선 배너 & 탐정 테이블 이모지 바 */}
      <div className="px-4 pt-3 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex-1 w-full">
          <SpeechBubble dialogue={activeDialogue} onDismiss={dismissDialogue} />
        </div>
        <TableEmotesBar
          activeEmote={activeEmote}
          onTriggerEmote={triggerEmote}
          onDismissEmote={dismissEmote}
          t={t}
        />
      </div>

      {/* 메인 대시보드: 모바일(보드 -> 추리수첩/손패 -> 로스터/로그) | 데스크톱(좌측 보드+로스터/로그, 우측 추리수첩/손패) */}
      <div className="flex-1 max-w-[1700px] w-full mx-auto p-3 sm:p-5 grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* 1. 보드판 영역 (모바일 1순위 / 데스크톱 1행 1~7열) */}
        <div className="xl:col-start-1 xl:col-span-7 xl:row-start-1 flex flex-col gap-4 order-1">
          {/* 턴 진행 가이드 스텝 바 (Turn Phase Stepper) */}
          <TurnPhaseStepper
            phase={gameState.phase}
            isMyTurn={isMyTurn}
            t={t}
            activePlayerName={currentPlayer ? getPlayerDisplayName(currentPlayer, locale) : undefined}
            isAITurn={!isHumanTurn}
          />

          {/* 보드판 (Mansion Game Board) */}
          <GameBoard
            players={gameState.players}
            currentPlayerIndex={gameState.currentPlayerIndex}
            phase={gameState.phase}
            currentDiceRoll={gameState.currentDiceRoll}
            diceRolls={gameState.diceRolls}
            accessibleRoomIds={gameState.accessibleRoomIds}
            isRollingDice={isRollingDice}
            roomWeapons={roomWeapons}
            t={t}
            locale={locale}
            isMyTurn={isMyTurn}
            onRollDice={handleRollDice}
            onMoveToRoom={handleMove}
            onWaitInHallway={performWaitInHallway}
          />
        </div>

        {/* 2. 추리 스테이션 (모바일 2순위: 보드 바로 밑에서 추측/수첩/손패 확인 / 데스크톱 우측 8~12열 2행 높이) */}
        <div className="xl:col-start-8 xl:col-span-5 xl:row-start-1 xl:row-span-2 flex flex-col gap-4 order-2">
          {/* 1. 플레이어 질문 작성 패널 (내 차례일 때 수첩 바로 위에 노출) */}
          {isHumanTurn && isMyTurn && gameState.phase === 'PLAYING_SUGGEST' && (
            <div className="bg-gradient-to-r from-amber-950/40 via-slate-900/95 to-amber-950/40 border-2 border-amber-500/60 rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 shadow-xl shadow-amber-500/15 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
                <div className="text-xs font-bold text-amber-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-extrabold text-amber-300">{t.askHypothesis}</span>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold font-mono">
                  📍 {t.currentRoom}: {getRoomName(currentPlayer.currentRoomId)}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-300 font-bold block mb-1.5 flex items-center justify-between">
                    <span>{t.selectSuspect}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {userNotes[selectedSuspect] === 'NO' ? '✕ 제외됨' : userNotes[selectedSuspect] === 'YES' ? '◯ 확정' : '❓ 미확인'}
                    </span>
                  </label>
                  <select 
                    value={selectedSuspect} 
                    onChange={e => setSelectedSuspect(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 hover:border-amber-500/60 focus:border-amber-500 rounded-xl p-2.5 text-slate-100 font-medium transition-colors cursor-pointer"
                  >
                    {SUSPECTS.map(s => {
                      const note = userNotes[s.id];
                      const tag = note === 'NO' ? ' [✕ 제외]' : note === 'YES' ? ' [◯ 확정]' : ' [❓ 미확인]';
                      return (
                        <option key={s.id} value={s.id}>
                          {getCardName(s.id)}{tag}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1.5 flex items-center justify-between">
                    <span>{t.selectWeapon}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {userNotes[selectedWeapon] === 'NO' ? '✕ 제외됨' : userNotes[selectedWeapon] === 'YES' ? '◯ 확정' : '❓ 미확인'}
                    </span>
                  </label>
                  <select 
                    value={selectedWeapon} 
                    onChange={e => setSelectedWeapon(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 hover:border-amber-500/60 focus:border-amber-500 rounded-xl p-2.5 text-slate-100 font-medium transition-colors cursor-pointer"
                  >
                    {WEAPONS.map(w => {
                      const note = userNotes[w.id];
                      const tag = note === 'NO' ? ' [✕ 제외]' : note === 'YES' ? ' [◯ 확정]' : ' [❓ 미확인]';
                      return (
                        <option key={w.id} value={w.id}>
                          {getCardName(w.id)}{tag}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* 빠른 후보 칩 (아직 배제되지 않은 미확인 ? 후보들 원터치 선택) */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-amber-300/80 font-bold uppercase tracking-wider mr-1">미확인 후보:</span>
                {SUSPECTS.filter(s => userNotes[s.id] === 'UNKNOWN').slice(0, 3).map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSuspect(s.id)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                      selectedSuspect === s.id 
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm' 
                        : 'bg-slate-800/80 text-amber-200/90 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {getCardName(s.id)}
                  </button>
                ))}
                {WEAPONS.filter(w => userNotes[w.id] === 'UNKNOWN').slice(0, 3).map(w => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setSelectedWeapon(w.id)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                      selectedWeapon === w.id 
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm' 
                        : 'bg-slate-800/80 text-amber-200/90 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {getCardName(w.id)}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 justify-end mt-1 pt-2 border-t border-slate-800/80">
                <button
                  onClick={handleSuggestion}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer active:scale-95"
                >
                  <span>{t.askQuestionBtn}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 2. 플레이어 행동 완료 후 턴 넘기기 vs 최종 고발 결정 패널 (내 차례일 때 수첩 바로 위에 노출) */}
          {isHumanTurn && isMyTurn && gameState.phase === 'PLAYING_ACTION_DONE' && (
            <div className="bg-gradient-to-r from-slate-900/95 via-slate-850 to-slate-900/95 border-2 border-amber-500/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-amber-500/10 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex flex-col gap-1">
                <div className="text-sm font-extrabold text-amber-300 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  {t.actionDoneTitle}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-md">
                  {t.actionDoneDesc}
                </p>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  onClick={performEndTurn}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer active:scale-95"
                >
                  <span>{t.endTurnBtn}</span>
                </button>

                {!currentPlayer.isEliminated && (
                  <button
                    onClick={() => setIsAccuseModalOpen(true)}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-rose-900/40 cursor-pointer active:scale-95 ring-1 ring-rose-400/50"
                  >
                    <Flame className="w-4 h-4 text-rose-200" />
                    <span>{t.makeAccusationBtn}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 3. 사건 추리 수첩 (항상 상시 노출) */}
          <DeductionNotebook
            t={t}
            locale={locale}
            myPlayer={myPlayer}
            players={gameState.players}
            userNotes={userNotes}
            toggleNote={toggleNote}
            matrixNotes={matrixNotes}
            toggleMatrixCell={toggleMatrixCell}
            getCardName={getCardName}
            getRoomName={getRoomName}
            logs={gameState.logs}
            onResetNotes={() => {
              setUserNotes({});
              setMatrixNotes({});
            }}
            onBackToBoard={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />

          {/* 4. 내 비공개 손패 영역 (실물 카드 보관함 랙) */}
          {myPlayer && (
            <CardHandTray
              cards={myPlayer.hand}
              playerName={getPlayerDisplayName(myPlayer, locale)}
              getCardName={getCardName}
              onOpenNotebook={() => {
                document.getElementById('deduction-notebook')?.scrollIntoView({ behavior: 'smooth' });
              }}
              t={t}
            />
          )}
        </div>

        {/* 3. 탐정 명단 & 실시간 사건 일지 (모바일 3순위 / 데스크톱 2행 1~7열) */}
        <div className="xl:col-start-1 xl:col-span-7 xl:row-start-2 flex flex-col gap-4 order-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 탐정 현황 (Detectives Roster) */}
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3 shadow-md">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.detectivesListTitle}</h3>
              <div className="flex flex-col gap-2">
                {gameState.players.map((p, idx) => (
                  <div 
                    key={p.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                      idx === gameState.currentPlayerIndex
                        ? 'border-amber-500/60 bg-amber-500/10'
                        : 'border-slate-800 bg-slate-900/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{p.avatar}</span>
                      <span className="font-semibold text-slate-200">{getPlayerDisplayName(p, locale)}</span>
                    </div>
                    {p.isEliminated ? (
                      <span className="text-[10px] text-rose-400 font-bold">{t.eliminated}</span>
                    ) : (
                      <span className="text-[11px] text-slate-500">
                        {p.hand.length} {t.cardsCount}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 사건 수사 일지 (Live Activity Log) */}
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3 flex-1 min-h-[260px] shadow-md">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ScrollText className="w-3.5 h-3.5 text-amber-400" />
                {t.liveLogTitle}
              </h3>
              <div className="flex-1 overflow-y-auto max-h-[300px] flex flex-col gap-2 pr-1 text-xs">
                {gameState.logs.slice().reverse().map(log => (
                  <div 
                    key={log.id} 
                    className={`p-2.5 rounded-lg border leading-relaxed ${
                      log.type === 'accusation'
                        ? 'border-rose-500/50 bg-rose-950/20 text-rose-200'
                        : log.type === 'disprove'
                          ? 'border-indigo-500/40 bg-indigo-950/20 text-indigo-200'
                          : 'border-slate-800 bg-slate-900/50 text-slate-300'
                    }`}
                  >
                    <span className="text-[10px] text-slate-500 block">{t.round} {log.turn}</span>
                    {log.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 가설 추리 및 반증 카드 시각화 모달 창 */}
      <HypothesisVisualizerModal
        visual={activeHypothesisVisual}
        getCardName={getCardName}
        getRoomName={getRoomName}
        onDismiss={dismissHypothesisVisual}
        onMarkNotebookAndDismiss={(cardId) => {
          setUserNotes(prev => ({ ...prev, [cardId]: 'NO' }));
          dismissHypothesisVisual();
        }}
        t={t}
        myPlayerId={myPlayer?.id}
      />

      {/* 비밀 반증 요청 모달 창 */}
      <DisprovePromptModal
        prompt={pendingDisprovePrompt}
        isPassingCard={isPassingCard}
        selectedCard={selectedDisproveCard}
        onSelectCard={setSelectedDisproveCard}
        onConfirm={handleConfirmDisprove}
        getCardName={getCardName}
        t={t}
      />

      {/* 최종 고발(Accusation) 모달 창 */}
      <AccusationModal
        isOpen={isAccuseModalOpen}
        onClose={() => setIsAccuseModalOpen(false)}
        onDeclare={handleFinalAccusation}
        t={t}
        getCardName={getCardName}
        getRoomName={getRoomName}
      />

      {/* 게임 오버 모달 창 */}
      <GameOverModal
        phase={gameState.phase}
        winnerId={gameState.winnerId}
        solution={gameState.solution}
        players={gameState.players}
        logs={gameState.logs}
        t={t}
        locale={locale}
        getCardName={getCardName}
        getRoomName={getRoomName}
        onPlayAgain={() => {
          startNewGame(effectiveP1, effectiveP2, locale);
        }}
        onExitToLobby={handleExitToLobby}
      />

      {/* 자리 비움(AFK) 경고 모달 창 */}
      <AfkWarningModal
        isOpen={afkSecondsRemaining !== null}
        secondsRemaining={afkSecondsRemaining ?? 30}
        onDismiss={handleDismissAfkWarning}
        t={t}
      />

      {/* 게임 나가기 확인 모달 창 */}
      {isExitModalOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="max-w-sm w-full bg-slate-900 border border-amber-500/40 p-6 rounded-3xl text-center flex flex-col items-center gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center text-2xl shadow-inner">
              🚪
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-100">
                {t.exitToLobby}
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                {t.confirmExitToLobby}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full mt-2">
              <button
                onClick={() => setIsExitModalOpen(false)}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
              >
                {locale === 'ko' ? '계속 플레이' : locale === 'es' ? 'Continuar' : 'Keep Playing'}
              </button>
              <button
                onClick={handleExitToLobby}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer"
              >
                {locale === 'ko' ? '메인 화면으로' : locale === 'es' ? 'Salir al Menú' : 'Exit to Setup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
