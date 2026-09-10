'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { HelpCircle, ScrollText, ArrowRight } from 'lucide-react';
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

  // 멀티플레이어 기기별 관점 (호스트=p1, 게스트=p2, 로컬=현재 차례)
  const myPlayer = playMode === 'guest'
    ? gameState.players[1]
    : playMode === 'host'
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
        createRoom={createRoom}
        joinRoom={joinRoom}
        disconnectRoom={disconnectRoom}
        handleCopyInviteLink={handleCopyInviteLink}
        copySuccessToast={copySuccessToast}
        handleStartGame={handleStartGame}
        getCardName={getCardName}
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
        isHumanTurn={isHumanTurn}
        isMyTurn={isMyTurn}
        onOpenAccuse={() => setIsAccuseModalOpen(true)}
        onNewGame={() => {
          startNewGame(effectiveP1, effectiveP2, locale);
        }}
        onExitToLobby={() => setIsExitModalOpen(true)}
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

      {/* 메인 대시보드 */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 좌측 2열: 맵 또는 추리 수첩 */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {activeTab === 'board' ? (
            <div className="flex flex-col gap-4">
              {/* 턴 진행 가이드 스텝 바 (Turn Phase Stepper) */}
              <TurnPhaseStepper
                phase={gameState.phase}
                isMyTurn={isMyTurn}
                t={t}
                activePlayerName={currentPlayer ? getPlayerDisplayName(currentPlayer, locale) : undefined}
                isAITurn={!isHumanTurn}
              />

              <GameBoard
                players={gameState.players}
                currentPlayerIndex={gameState.currentPlayerIndex}
                phase={gameState.phase}
                currentDiceRoll={gameState.currentDiceRoll}
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

              {/* 플레이어 질문 작성 패널 (내 차례일 때만 활성화) */}
              {isHumanTurn && isMyTurn && gameState.phase === 'PLAYING_SUGGEST' && (
                <div className="mt-2 bg-slate-800/60 border border-amber-500/40 rounded-xl p-4 flex flex-col gap-3 shadow-lg">
                  <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4" /> {t.askHypothesis} ({t.currentRoom}: {getRoomName(currentPlayer.currentRoomId)})
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">{t.selectSuspect}</label>
                      <select 
                        value={selectedSuspect} 
                        onChange={e => setSelectedSuspect(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200"
                      >
                        {SUSPECTS.map(s => <option key={s.id} value={s.id}>{getCardName(s.id)}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">{t.selectWeapon}</label>
                      <select 
                        value={selectedWeapon} 
                        onChange={e => setSelectedWeapon(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200"
                      >
                        {WEAPONS.map(w => <option key={w.id} value={w.id}>{getCardName(w.id)}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end mt-2">
                    <button
                      onClick={handleSuggestion}
                      className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                    >
                      <span>{t.askQuestionBtn}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* 사건 추리 수첩 (스마트 어시스트 & 로그 연동) */
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
              onBackToBoard={() => setActiveTab('board')}
            />
          )}

          {/* 내 비공개 손패 영역 (실물 카드 보관함 랙) */}
          {myPlayer && (
            <CardHandTray
              cards={myPlayer.hand}
              playerName={getPlayerDisplayName(myPlayer, locale)}
              getCardName={getCardName}
              onOpenNotebook={() => setActiveTab('notes')}
              t={t}
            />
          )}
        </div>

        {/* 우측 1열: 탐정 현황 & 실시간 사건 일지 */}
        <div className="flex flex-col gap-4">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3">
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

          {/* 사건 수사 일지 */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3 flex-1 min-h-[300px]">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ScrollText className="w-3.5 h-3.5 text-amber-400" />
              {t.liveLogTitle}
            </h3>
            <div className="flex-1 overflow-y-auto max-h-[360px] flex flex-col gap-2 pr-1 text-xs">
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
