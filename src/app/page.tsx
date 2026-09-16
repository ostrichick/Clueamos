'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { SUSPECTS, WEAPONS } from '@/engine/data';
import { GameBoard } from '@/components/board/GameBoard';
import { CardHandTray } from '@/components/cards/CardHandTray';
import { CardPassModal } from '@/components/cards/CardPassModal';
import { LobbyScreen } from '@/components/lobby/LobbyScreen';
import { GameHeader } from '@/components/layout/GameHeader';
import { DeductionNotebook, type NoteMark, type MatrixMark } from '@/components/notebook/DeductionNotebook';
import { AccusationModal } from '@/components/modals/AccusationModal';
import { GameOverModal } from '@/components/modals/GameOverModal';
import { DisprovePromptModal } from '@/components/modals/DisprovePromptModal';
import { HypothesisVisualizerModal } from '@/components/modals/HypothesisVisualizerModal';
import { SpeechBubble } from '@/components/board/SpeechBubble';
import { TurnPhaseStepper } from '@/components/board/TurnPhaseStepper';
import { TableEmotesBar } from '@/components/board/TableEmotesBar';
import { AfkWarningModal } from '@/components/modals/AfkWarningModal';
import { AutoPlayBanner } from '@/components/game/AutoPlayBanner';
import { AskHypothesisPanel } from '@/components/game/AskHypothesisPanel';
import { ActionDonePanel } from '@/components/game/ActionDonePanel';
import { DetectiveRoster } from '@/components/game/DetectiveRoster';
import { GameLogPanel } from '@/components/game/GameLogPanel';
import { sounds } from '@/utils/sounds';
import { translations, type SupportedLocale } from '@/i18n/translations';
import { getInitialLocale, persistLocale } from '@/i18n/locales';
import { getPlayerDisplayName } from '@/engine/engine';
import confetti from 'canvas-confetti';
import { useDraggableModal, ModalDragHandle } from '@/hooks/useDraggableModal';
import { useAFKMonitor } from '@/hooks/useAFKMonitor';

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

  // 멀티플레이어 로컬 입력 상태 (URL 쿼리스트링 파라미터가 있으면 초기값으로 사용)
  const [inputRoomCode, setInputRoomCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('room')?.trim().replace(/\D/g, '').slice(0, 4) || '';
    }
    return '';
  });
  const [copySuccessToast, setCopySuccessToast] = useState(false);
  const [inputRoomPassword, setInputRoomPassword] = useState('');
  const [selectedDisproveCard, setSelectedDisproveCard] = useState<string | null>(null);
  const [isPassingCard, setIsPassingCard] = useState(false);
  const [passingToPlayerName, setPassingToPlayerName] = useState<string>('');

  const [selectedSuspect, setSelectedSuspect] = useState(SUSPECTS[0].id);
  const [selectedWeapon, setSelectedWeapon] = useState(WEAPONS[0].id);
  const [activeTab, setActiveTab] = useState<'board' | 'notes'>('board');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [bgmActive, setBgmActive] = useState(false);

  // 개인 추리 수첩 (체크리스트 & 매트릭스 상태)
  const [userNotes, setUserNotes] = useState<Record<string, NoteMark>>({});
  const [matrixNotes, setMatrixNotes] = useState<Record<string, Record<string, MatrixMark>>>({});
  
  // 게임이 새로 시작되었을 때 (새 라운드/새 게임) 이전 게임의 추리 수첩 메모를 깨끗하게 자동 초기화
  const lastGameTimestampRef = useRef<number | null>(null);
  useEffect(() => {
    const initialLog = gameState.logs[0];
    if (initialLog && initialLog.id === 'log_0') {
      if (lastGameTimestampRef.current !== initialLog.timestamp) {
        lastGameTimestampRef.current = initialLog.timestamp;
        setUserNotes({});
        setMatrixNotes({});
      }
    }
  }, [gameState.logs]);
  
  // 최종 고발 모달 상태
  const [isAccuseModalOpen, setIsAccuseModalOpen] = useState(false);
  // 메인 로비 나가기 확인 모달 상태
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const exitModalDraggable = useDraggableModal({ isOpen: isExitModalOpen });

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

  // 카드 추리 상태 판별 헬퍼 (스마트 수첩 및 내 손패와 드롭다운 완벽 일치 동기화)
  const getEffectiveCardStatus = (cardId: string): { mark: NoteMark; tag: string; label: string } => {
    const isMyCard = myPlayer?.hand?.some(c => c.id === cardId);
    const note = userNotes[cardId] || 'EMPTY';
    if (note === 'NO') {
      return { mark: 'NO', tag: isMyCard ? ` [${t.handBadge} ✕]` : ' [✕ 제외]', label: isMyCard ? `✕ (${t.handBadge})` : '✕ 제외됨' };
    }
    if (note === 'YES') {
      return { mark: 'YES', tag: ' [✓ 확정]', label: '✓ 확정' };
    }
    if (note === 'UNKNOWN') {
      return { mark: 'UNKNOWN', tag: ' [? 미확인]', label: '? 미확인' };
    }
    if (isMyCard) {
      return { mark: 'EMPTY', tag: ` [${t.handBadge}]`, label: `- (${t.handBadge})` };
    }
    return { mark: 'EMPTY', tag: '', label: '- 미작성' };
  };

  // 이미 배제된(X 표시) 카드가 기본 선택되어 있을 경우 미제외 후보로 스마트 자동 전환
  const activeSuspect = (getEffectiveCardStatus(selectedSuspect).mark === 'NO')
    ? (SUSPECTS.find(s => getEffectiveCardStatus(s.id).mark !== 'NO')?.id || selectedSuspect)
    : selectedSuspect;

  const activeWeapon = (getEffectiveCardStatus(selectedWeapon).mark === 'NO')
    ? (WEAPONS.find(w => getEffectiveCardStatus(w.id).mark !== 'NO')?.id || selectedWeapon)
    : selectedWeapon;

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

  // 메인 설정 화면으로 나가기 핸들러
  const handleExitToLobby = () => {
    sounds.playCardSlide();
    setUserNotes({});
    setMatrixNotes({});
    setHasStarted(false);
    setIsExitModalOpen(false);
    exitToLobby();
  };

  // 세션 복원 시도 (모바일 새로고침 또는 브라우저 복귀 시)
  useEffect(() => {
    restoreSessionIfNeeded().catch(() => {});
  }, [restoreSessionIfNeeded]);

  // URL 쿼리스트링 `?room=XXXX` 감지 시 게스트 모드로 전환 (코드는 state 초기값에서 미리 채움, 비밀번호는 사용자가 입력 후 접속)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isConnected || roomCode) return;
    const roomParam = new URLSearchParams(window.location.search).get('room');
    if (roomParam) {
      setPlayMode('guest');
    }
  }, [isConnected, roomCode, setPlayMode]);

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

  const handleJoinRoom = (code: string, password: string) => {
    joinRoom(code, password);
  };

  const handleStartGame = () => {
    sounds.playMove();
    setUserNotes({});
    setMatrixNotes({});
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

  const toggleNote = (cardId: string) => {
    sounds.playDisprove();
    setUserNotes(prev => {
      const current = prev[cardId] || 'EMPTY';
      // Cycle: EMPTY (-) -> NO (x) -> UNKNOWN (?) -> YES (v) -> EMPTY (-)
      let next: NoteMark;
      if (current === 'EMPTY') {
        next = 'NO';
      } else if (current === 'NO') {
        next = 'UNKNOWN';
      } else if (current === 'UNKNOWN') {
        next = 'YES';
      } else {
        next = 'EMPTY';
      }
      return { ...prev, [cardId]: next };
    });
  };

  const toggleMatrixCell = (cardId: string, playerId: string) => {
    sounds.playDisprove();
    setMatrixNotes(prev => {
      const cardMap = prev[cardId] || {};
      const current = cardMap[playerId] || '-';
      // Cycle: - -> X -> ? -> O -> -
      let next: MatrixMark;
      if (current === '-') {
        next = 'X';
      } else if (current === 'X') {
        next = '?';
      } else if (current === '?') {
        next = 'O';
      } else {
        next = '-';
      }
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

          {/* 보드판 (Mansion Game Board) - 내부에서 주사위, 패스 턴, 노트 확인 완료 직접 처리 */}
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
            onEndTurn={performEndTurn}
            onOpenAccuse={() => setIsAccuseModalOpen(true)}
            turnReview={turnReviewState}
            onConfirmTurnReview={confirmTurnReview}
            myPlayerRole={myPlayerRole}
            playMode={playMode}
            isAutoPlaying={isAutoPlaying}
          />
        </div>

        {/* 2. 추리 스테이션 (모바일 2순위: 보드 바로 밑에서 추측/수첩/손패 확인 / 데스크톱 우측 8~12열 2행 높이) */}
        <div className="xl:col-start-8 xl:col-span-5 xl:row-start-1 xl:row-span-2 flex flex-col gap-4 order-2">
          {/* 1. 플레이어 질문 작성 패널 (내 차례일 때 수첩 바로 위에 노출) */}
          {isHumanTurn && isMyTurn && gameState.phase === 'PLAYING_SUGGEST' && (
            <AskHypothesisPanel
              t={t}
              currentRoomName={getRoomName(currentPlayer.currentRoomId)}
              getCardName={getCardName}
              getEffectiveCardStatus={getEffectiveCardStatus}
              selectedSuspect={selectedSuspect}
              onSelectSuspect={setSelectedSuspect}
              selectedWeapon={selectedWeapon}
              onSelectWeapon={setSelectedWeapon}
              onSuggest={handleSuggestion}
            />
          )}

          {/* 2. 플레이어 행동 완료 후 턴 넘기기 vs 최종 고발 결정 패널 (내 차례일 때 수첩 바로 위에 노출) */}
          {isHumanTurn && isMyTurn && gameState.phase === 'PLAYING_ACTION_DONE' && (
            <ActionDonePanel
              t={t}
              isEliminated={currentPlayer.isEliminated}
              onEndTurn={performEndTurn}
              onOpenAccuse={() => setIsAccuseModalOpen(true)}
            />
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
            <DetectiveRoster
              t={t}
              players={gameState.players}
              currentPlayerIndex={gameState.currentPlayerIndex}
              getPlayerName={p => getPlayerDisplayName(p, locale)}
            />

            {/* 사건 수사 일지 (Live Activity Log) */}
            <GameLogPanel t={t} logs={gameState.logs} />
          </div>
        </div>

      </div>

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
        t={t}
        locale={locale}
        getCardName={getCardName}
        getRoomName={getRoomName}
        onPlayAgain={() => {
          setUserNotes({});
          setMatrixNotes({});
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
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none">
          <div 
            onPointerDown={exitModalDraggable.handlePointerDown}
            style={exitModalDraggable.modalStyle}
            className="max-w-sm w-full bg-slate-900 border border-amber-500/40 p-6 rounded-3xl text-center flex flex-col items-center gap-3.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <ModalDragHandle label="드래그하여 이동 (Drag to move)" />
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
