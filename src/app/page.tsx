'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { SUSPECTS } from '@/engine/data';
import { CardPassModal } from '@/components/cards/CardPassModal';
import { LobbyScreen } from '@/components/lobby/LobbyScreen';
import { GameHeader } from '@/components/layout/GameHeader';
import { AccusationModal } from '@/components/modals/AccusationModal';
import { GameOverModal } from '@/components/modals/GameOverModal';
import { DisprovePromptModal } from '@/components/modals/DisprovePromptModal';
import { HypothesisVisualizerModal } from '@/components/modals/HypothesisVisualizerModal';
import { SpeechBubble } from '@/components/board/SpeechBubble';
import { TableEmotesBar } from '@/components/board/TableEmotesBar';
import { AfkWarningModal } from '@/components/modals/AfkWarningModal';
import { AutoPlayBanner } from '@/components/game/AutoPlayBanner';
import { ExitConfirmModal } from '@/components/game/ExitConfirmModal';
import { InGameDashboard } from '@/components/game/InGameDashboard';
import { sounds } from '@/utils/sounds';
import { translations, type SupportedLocale } from '@/i18n/translations';
import { getInitialLocale, persistLocale } from '@/i18n/locales';
import { getPlayerDisplayName } from '@/engine/engine';
import confetti from 'canvas-confetti';
import { useLobbyQueryParams } from '@/hooks/useLobbyQueryParams';
import { useNotebookState } from '@/hooks/useNotebookState';
import { useGameOrchestration } from '@/hooks/useGameOrchestration';

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
    roomSecret,
    isConnected,
    guestDisconnected,
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
    turnReviewState,
    confirmTurnReview,
    setLocale: setStoreLocale,
  } = useGameStore();

  // 언어 선택 상태: 브라우저/저장된 로케일을 초기값으로 사용
  const [locale, setLocaleState] = useState<SupportedLocale>(getInitialLocale);
  const t = translations[locale];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __gameStore: typeof useGameStore }).__gameStore = useGameStore;
    }
  }, []);

  const setLocale = (newLoc: SupportedLocale) => {
    setLocaleState(newLoc);
    persistLocale(newLoc);
    setStoreLocale(newLoc);
  };

  const [hasStarted, setHasStarted] = useState(false);
  
  // 1 & 2 플레이어 캐릭터 선택 상태
  const [p1Character, setP1Character] = useState<string>('suspect_scarlett');
  const [p2Character, setP2Character] = useState<string>('suspect_mustard');

  // URL은 마운트 후 읽어 SSR/클라이언트 첫 렌더의 disabled 상태가 달라지지 않게 한다.
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [copySuccessToast, setCopySuccessToast] = useState(false);
  const [copyFailToast, setCopyFailToast] = useState(false);
  const [inputRoomPassword, setInputRoomPassword] = useState('');
  useLobbyQueryParams({ isConnected, roomCode, setPlayMode, setInputRoomCode, setInputRoomPassword });
  const [selectedDisproveCard, setSelectedDisproveCard] = useState<string | null>(null);
  const [isPassingCard, setIsPassingCard] = useState(false);
  const [passingToPlayerName, setPassingToPlayerName] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'board' | 'notes'>('board');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [bgmActive, setBgmActive] = useState(false);
  
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
    (playMode === 'host' && gameState.phase !== 'LOBBY') ||
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

  // 개인 추리 수첩 (마킹/초안/손패 연동 상태 — 새 게임 시 자동 초기화)
  const {
    userNotes,
    setUserNotes,
    matrixNotes,
    resetNotes,
    toggleNote,
    toggleMatrixCell,
    selectedSuspect,
    setSelectedSuspect,
    selectedWeapon,
    setSelectedWeapon,
    activeSuspect,
    activeWeapon,
    getEffectiveCardStatus,
  } = useNotebookState({ myPlayer, t, logs: gameState.logs });

  // 게임 진행 오케스트레이션 (AI 킥스타트/AFK/자동확인/알림음 — 동작 변경 없이 훅으로 이동)
  const { afkSecondsRemaining, handleResumeControl, handleDismissAfkWarning } = useGameOrchestration({
    isGameStarted, isMyTurn, isHumanTurn, myPlayerRole, gameState, turnReviewState,
    isRollingDice, isAutoPlaying, playMode, isConnected, guestDisconnected,
    pendingDisprovePrompt, activeHypothesisVisual, lastSecretClue,
    runAITurnIfNeeded, executeAutoPlayTurn, confirmTurnReview,
    dismissSecretClue, dismissHypothesisVisual, setIsAutoPlaying,
  });
  // 메인 설정 화면으로 나가기 핸들러
  const handleExitToLobby = () => {
    sounds.playCardSlide();
    resetNotes();
    setHasStarted(false);
    setIsExitModalOpen(false);
    exitToLobby();
  };

  // 세션 복원 시도 (모바일 새로고침 또는 브라우저 복귀 시)
  useEffect(() => {
    restoreSessionIfNeeded().catch((err) => {
      console.warn('Session restore failed:', err);
    });
  }, [restoreSessionIfNeeded]);

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
    if (typeof window !== 'undefined' && roomCode && roomSecret) {
      const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}#key=${encodeURIComponent(roomSecret)}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopySuccessToast(true);
        setTimeout(() => setCopySuccessToast(false), 3500);
      }).catch((err) => {
        console.warn('Invite link copy failed:', err);
        setCopyFailToast(true);
        setTimeout(() => setCopyFailToast(false), 3500);
      });
    }
  };

  const handleCreateRoom = () => {
    createRoom();
  };

  const handleJoinRoom = (code: string, password: string) => {
    joinRoom(code, password);
  };

  const handleStartGame = () => {
    sounds.playMove();
    resetNotes();
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
      suspectId: activeSuspect,
      locationId: currentPlayer.currentRoomId,
      weaponId: activeWeapon,
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

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.enabled = next;
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
        roomSecret={roomSecret}
        inputRoomCode={inputRoomCode}
        setInputRoomCode={setInputRoomCode}
        inputRoomPassword={inputRoomPassword}
        setInputRoomPassword={setInputRoomPassword}
        isConnecting={isConnecting}
        isConnected={isConnected}
        connectionError={connectionError}
        createRoom={handleCreateRoom}
        joinRoom={handleJoinRoom}
        disconnectRoom={disconnectRoom}
        handleCopyInviteLink={handleCopyInviteLink}
        copySuccessToast={copySuccessToast}
        copyFailToast={copyFailToast}
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
        onNewGame={playMode === 'guest' ? undefined : () => {
          startNewGame(effectiveP1, effectiveP2, locale);
        }}
        onExitToLobby={() => setIsExitModalOpen(true)}
      />

      {playMode === 'host' && guestDisconnected && gameState.players.some(p => p.roleType === 'p2') && (
        <div role="status" className="border-b border-amber-500/30 bg-amber-950/30 px-4 py-2 text-center text-xs text-amber-200">
          {locale === 'ko' ? '상대방 연결이 끊어졌습니다. 재접속 전까지 2번 플레이어의 행동을 AI가 대신합니다.' :
            locale === 'es' ? 'El invitado está desconectado. La IA jugará sus turnos hasta que vuelva.' :
              'Guest disconnected. AI will cover Player 2 until they reconnect.'}
        </div>
      )}

      {/* AI 대리 플레이 중 플로팅 배너 */}
      <AutoPlayBanner
        isActive={isAutoPlaying}
        onResumeControl={handleResumeControl}
        t={t}
      />

      {/* 실시간 은밀한 단서 3D 뒤집기 카드 모달 및 전달 애니메이션 */}
      {!activeHypothesisVisual && (lastSecretClue || isPassingCard) && (
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
      <InGameDashboard
        gameState={gameState}
        isRollingDice={isRollingDice}
        roomWeapons={roomWeapons}
        t={t}
        locale={locale}
        isMyTurn={isMyTurn}
        isHumanTurn={isHumanTurn}
        currentPlayer={currentPlayer}
        myPlayer={myPlayer}
        myPlayerRole={myPlayerRole}
        playMode={playMode}
        isAutoPlaying={isAutoPlaying}
        turnReviewState={turnReviewState}
        userNotes={userNotes}
        matrixNotes={matrixNotes}
        selectedSuspect={selectedSuspect}
        selectedWeapon={selectedWeapon}
        onRollDice={handleRollDice}
        onMoveToRoom={handleMove}
        onWaitInHallway={performWaitInHallway}
        onEndTurn={performEndTurn}
        onOpenAccuse={() => setIsAccuseModalOpen(true)}
        onConfirmTurnReview={confirmTurnReview}
        onSelectSuspect={setSelectedSuspect}
        onSelectWeapon={setSelectedWeapon}
        onSuggest={handleSuggestion}
        onToggleNote={toggleNote}
        onToggleMatrixCell={toggleMatrixCell}
        onResetNotes={resetNotes}
        getCardName={getCardName}
        getRoomName={getRoomName}
        getEffectiveCardStatus={getEffectiveCardStatus}
      />

      {/* 가설 추리 및 반증 카드 시각화 모달 창 */}
      <HypothesisVisualizerModal
        visual={activeHypothesisVisual}
        getCardName={getCardName}
        getRoomName={getRoomName}
        onDismiss={() => {
          dismissHypothesisVisual();
          if (lastSecretClue) dismissSecretClue();
        }}
        onMarkNotebookAndDismiss={(cardId) => {
          setUserNotes(prev => ({ ...prev, [cardId]: 'NO' }));
          dismissHypothesisVisual();
          if (lastSecretClue) dismissSecretClue();
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
        getEffectiveCardStatus={getEffectiveCardStatus}
      />

      {/* 게임 오버 모달 창 */}
      <GameOverModal
        phase={gameState.phase}
        winnerId={gameState.winnerId}
        solution={gameState.solution}
        players={gameState.players}
        logs={gameState.logs}
        turnCount={gameState.turnCount}
        t={t}
        locale={locale}
        trackedPlayerId={playMode === 'local' ? undefined : myPlayer?.id}
        getCardName={getCardName}
        getRoomName={getRoomName}
        onPlayAgain={playMode === 'guest' ? undefined : () => {
          resetNotes();
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
      <ExitConfirmModal
        isOpen={isExitModalOpen}
        locale={locale}
        t={t}
        onCancel={() => setIsExitModalOpen(false)}
        onConfirm={handleExitToLobby}
      />
    </div>
  );
}
