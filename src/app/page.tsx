'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { 
  HelpCircle, 
  ScrollText, 
  Sparkles,
  ArrowRight,
  Eye,
  RotateCcw,
  Volume2,
  VolumeX,
  AlertTriangle,
  Flame,
  Check,
  X,
  Languages,
  Smartphone,
  Laptop,
  Copy,
  Radio,
  Music,
  LayoutGrid,
  ListChecks,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { SUSPECTS, LOCATIONS, WEAPONS, CHARACTER_PROFILES } from '@/engine/data';
import { GameBoard } from '@/components/board/GameBoard';
import { ClueCard } from '@/components/cards/ClueCard';
import { CardHandTray } from '@/components/cards/CardHandTray';
import { CardPassModal } from '@/components/cards/CardPassModal';
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
    isRollingDice,
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
  } = useGameStore();

  // 기본 언어: 영어 ('en'), 옵션: 스페인어 ('es'), 한국어 ('ko')
  const [locale, setLocale] = useState<SupportedLocale>('en');
  const t = translations[locale];

  const [hasStarted, setHasStarted] = useState(false);
  
  // 1 & 2 플레이어 캐릭터 선택 상태
  const [p1Character, setP1Character] = useState<string>('suspect_scarlett');
  const [p2Character, setP2Character] = useState<string>('suspect_mustard');
  const [activePickerTab, setActivePickerTab] = useState<'p1' | 'p2'>('p1');

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

  // 탐정 수첩 보기 모드 (단순 체크리스트 vs 매트릭스 그리드)
  const [notebookViewMode, setNotebookViewMode] = useState<'simple' | 'matrix'>('simple');
  const [matrixNotes, setMatrixNotes] = useState<Record<string, Record<string, '?' | 'X' | 'O'>>>({});
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  
  // 최종 고발 모달 상태 (용의자, 살인 장소, 흉기 도구)
  const [isAccuseModalOpen, setIsAccuseModalOpen] = useState(false);
  const [accuseSuspect, setAccuseSuspect] = useState(SUSPECTS[0].id);
  const [accuseLocation, setAccuseLocation] = useState(LOCATIONS[0].id);
  const [accuseWeapon, setAccuseWeapon] = useState(WEAPONS[0].id);

  // 개인 추리 수첩 (체크리스트: ? / NO / YES)
  const [userNotes, setUserNotes] = useState<Record<string, 'UNKNOWN' | 'YES' | 'NO'>>({});

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isHumanTurn = currentPlayer?.type === 'human';

  // 동기화된 캐릭터 선택값 파생 (호스트는 게스트 선택, 게스트는 호스트 선택을 우선 반영)
  const effectiveP1 = (playMode === 'guest' && hostSelectedCharacter) ? hostSelectedCharacter : p1Character;
  const effectiveP2 = (playMode === 'host' && guestSelectedCharacter) ? guestSelectedCharacter : p2Character;

  // 게임 시작 여부 파생 (호스트/로컬은 hasStarted, 게스트 또는 세션 복원 시 카드가 분배되었을 때 시작으로 간주)
  const isGameStarted = hasStarted || 
    (playMode === 'guest' && (gameState.players[0]?.hand?.length ?? 0) > 0) ||
    (gameState.phase !== 'LOBBY' && (gameState.players[0]?.hand?.length ?? 0) > 0);

  // 멀티플레이어 기기별 관점 (호스트=p1, 게스트=p2, 로컬=현재 차례)
  const myPlayer = playMode === 'guest'
    ? gameState.players[1]
    : playMode === 'host'
      ? gameState.players[0]
      : currentPlayer;

  const isMyTurn = playMode === 'local'
    ? isHumanTurn
    : (myPlayerRole === 'p1' && currentPlayer?.roleType === 'p1') ||
      (myPlayerRole === 'p2' && currentPlayer?.roleType === 'p2');

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

  const handleFinalAccusation = () => {
    setIsAccuseModalOpen(false);
    const isCorrect = performAccusation({
      suspectId: accuseSuspect,
      locationId: accuseLocation,
      weaponId: accuseWeapon,
    });

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

  if (!isGameStarted) {
    const aiCandidates = SUSPECTS.filter(s => s.id !== effectiveP1 && s.id !== effectiveP2);

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-amber-500 relative">
        {/* 우측 상단 언어 선택 버튼 */}
        <div className="absolute top-6 right-6 flex items-center gap-2 bg-slate-900/80 border border-slate-700/80 px-3 py-1.5 rounded-2xl backdrop-blur-md shadow-lg z-20">
          <Languages className="w-4 h-4 text-amber-400" />
          <button 
            onClick={() => setLocale('en')}
            className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${locale === 'en' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
          >
            EN
          </button>
          <button 
            onClick={() => setLocale('es')}
            className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${locale === 'es' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
          >
            ES
          </button>
          <button 
            onClick={() => setLocale('ko')}
            className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${locale === 'ko' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
          >
            KO
          </button>
        </div>

        <div className="max-w-3xl w-full bg-slate-900/80 border border-amber-500/30 p-6 sm:p-8 rounded-3xl backdrop-blur-2xl flex flex-col items-center text-center gap-6 shadow-2xl relative overflow-hidden my-8">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-black text-2xl shadow-xl shadow-amber-500/20 mb-1">
              C
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
              {t.gameTitle}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm max-w-md">
              {t.gameSubtitle}
            </p>
          </div>

          {/* 1. 플레이 모드 선택 (각자 폰으로 플레이 vs 한 화면에서 플레이) */}
          <div className="flex items-center justify-center p-1 bg-slate-800/90 rounded-2xl border border-slate-700 w-full max-w-md shadow-inner">
            <button
              onClick={() => {
                if (playMode === 'local') {
                  setPlayMode('host');
                }
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                playMode !== 'local'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>{t.playModeMulti}</span>
            </button>
            <button
              onClick={() => {
                setPlayMode('local');
                disconnectRoom();
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                playMode === 'local'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Laptop className="w-4 h-4" />
              <span>{t.playModeLocal}</span>
            </button>
          </div>

          {/* 2. 멀티 디바이스 연동 패널 */}
          {playMode !== 'local' && (
            <div className="w-full bg-slate-800/60 p-4 sm:p-5 rounded-2xl border border-amber-500/30 flex flex-col gap-4 text-left">
              {!roomCode ? (
                /* 방 만들기 / 참여하기 버튼 */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 방 만들기 (Host) */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/80 flex flex-col justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <Radio className="w-4 h-4 text-amber-400" /> {t.hostRoomTitle}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {locale === 'ko' ? '방을 개설하고 초대 링크를 공유하여 함께 접속합니다.' : 'Host a new room and share the invite link with Player 2.'}
                      </p>
                    </div>
                    <button
                      disabled={isConnecting}
                      onClick={() => createRoom()}
                      className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors shadow disabled:opacity-50"
                    >
                      {isConnecting && playMode === 'host' ? t.connectingToRoom : t.hostRoomBtn}
                    </button>
                  </div>

                  {/* 방 참여하기 (Guest) */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/80 flex flex-col justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-indigo-400" /> {t.joinRoomTitle}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {locale === 'ko' ? '전달받은 2자리 방 코드를 입력합니다.' : 'Enter the 2-digit room code sent by Player 1.'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={2}
                        value={inputRoomCode}
                        onChange={e => setInputRoomCode(e.target.value.replace(/\D/g, '').slice(0, 2))}
                        placeholder={t.enterRoomCodePlaceholder}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono text-center tracking-widest font-black"
                      />
                      <button
                        disabled={inputRoomCode.length !== 2 || isConnecting}
                        onClick={() => joinRoom(inputRoomCode.trim())}
                        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition-colors disabled:opacity-50"
                      >
                        {isConnecting && playMode === 'guest' ? t.connectingToRoom : t.joinRoomBtn}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* 이미 방에 접속된 상태 */
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-xl border border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-mono font-black text-amber-400 tracking-wider bg-slate-950 px-3 py-1.5 rounded-lg border border-amber-500/40">
                      {roomCode}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                        <span>{playMode === 'host' ? t.player1Choice : t.player2Choice}</span>
                        {isConnected ? (
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {t.player2Connected}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-bold bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                            {t.waitingForPlayer2}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {playMode === 'host' ? 'Host (Authoritative Engine)' : t.connectedToRoom}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {playMode === 'host' && (
                      <button
                        onClick={handleCopyInviteLink}
                        className="flex-1 sm:flex-initial px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5 text-amber-400" />
                        <span>{copySuccessToast ? 'Copied! ✅' : t.copyInviteLink}</span>
                      </button>
                    )}
                    <button
                      onClick={disconnectRoom}
                      className="px-3 py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-700 text-xs font-bold text-rose-300 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              )}

              {connectionError && (
                <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800 p-2.5 rounded-xl">
                  ⚠️ {connectionError}
                </div>
              )}
            </div>
          )}

          {/* 규칙 요약 바 */}
          <div className="bg-slate-800/40 p-3.5 rounded-2xl border border-slate-700/50 text-left text-xs text-slate-300 flex flex-col gap-1.5 w-full">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
              <Sparkles className="w-3.5 h-3.5" /> {t.ruleTitle}
            </div>
            <p className="text-[11px] text-slate-400">• {t.rule1}</p>
            <p className="text-[11px] text-slate-400">• {t.rule2}</p>
            <p className="text-[11px] text-slate-400">• {t.rule3}</p>
          </div>

          {/* 탐정 캐릭터 선택 영역 */}
          <div className="w-full flex flex-col gap-4 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800 pb-2">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-amber-400 flex items-center gap-2">
                  🕵️ {t.selectCharacterTitle}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t.selectCharacterSubtitle}
                </p>
              </div>

              {/* 로컬 모드일 때만 탭 토글 허용, 멀티플레이어는 각자 기기 역할 고정 */}
              {playMode === 'local' && (
                <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 self-start sm:self-auto mt-2 sm:mt-0">
                  <button
                    onClick={() => setActivePickerTab('p1')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activePickerTab === 'p1'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{t.player} 1</span>
                    <span>{CHARACTER_PROFILES[effectiveP1]?.avatar}</span>
                  </button>
                  <button
                    onClick={() => setActivePickerTab('p2')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activePickerTab === 'p2'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{t.player} 2</span>
                    <span>{CHARACTER_PROFILES[effectiveP2]?.avatar}</span>
                  </button>
                </div>
              )}
            </div>

            {/* 현재 기기 선택 안내 */}
            <div className="text-xs font-semibold text-slate-300 flex items-center justify-between px-1">
              <span>
                {playMode === 'guest'
                  ? t.player2Choice
                  : playMode === 'host'
                    ? t.player1Choice
                    : activePickerTab === 'p1' ? t.player1Choice : t.player2Choice}
              </span>
              <span className="text-[11px] text-amber-300/80 font-mono">
                {playMode === 'guest'
                  ? `${t.player} 2: ${getCardName(effectiveP2)}`
                  : playMode === 'host'
                    ? `${t.player} 1: ${getCardName(effectiveP1)}`
                    : activePickerTab === 'p1' 
                      ? `${t.player} 1: ${getCardName(effectiveP1)}` 
                      : `${t.player} 2: ${getCardName(effectiveP2)}`}
              </span>
            </div>

            {/* 6명 용의자 캐릭터 선택 그리드 카드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {SUSPECTS.map(s => {
                const profile = CHARACTER_PROFILES[s.id];
                const isP1 = effectiveP1 === s.id;
                const isP2 = effectiveP2 === s.id;
                
                const isTargetRoleP1 = playMode === 'host' || (playMode === 'local' && activePickerTab === 'p1');
                const isSelected = isTargetRoleP1 ? isP1 : isP2;
                const isDisabledForP2 = !isTargetRoleP1 && isP1;
                const isDisabledForP1 = isTargetRoleP1 && isP2;

                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      if (isTargetRoleP1) {
                        if (!isDisabledForP1) handleSelectP1(s.id);
                      } else {
                        if (!isDisabledForP2) handleSelectP2(s.id);
                      }
                    }}
                    style={{
                      borderColor: isSelected ? profile?.color : undefined,
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-2 ${
                      isSelected
                        ? 'ring-2 bg-slate-800/90 shadow-lg'
                        : isDisabledForP2 || isDisabledForP1
                          ? 'opacity-40 cursor-not-allowed bg-slate-900/30 border-slate-800'
                          : 'cursor-pointer hover:bg-slate-800/50 bg-slate-900/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{profile?.avatar}</span>
                          <span className="font-bold text-xs text-slate-200">
                            {getCardName(s.id)}
                          </span>
                        </div>
                        {isP1 && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-slate-950">
                            {t.player} 1
                          </span>
                        )}
                        {isP2 && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-pink-500 text-slate-950">
                            {t.player} 2
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {t.cards[s.id]?.description || s.description}
                      </p>
                    </div>

                    {isDisabledForP2 && (
                      <div className="text-[10px] text-amber-400/80 font-semibold mt-1">
                        🔒 {t.characterAlreadyChosen}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* AI 탐정 자동 배정 미리보기 */}
            <div className="bg-slate-800/30 border border-slate-700/40 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-400 font-medium">
                <span>🤖</span>
                <span>{t.aiDetectivesPreview}:</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {aiCandidates.map(c => (
                  <span 
                    key={c.id} 
                    className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300 font-mono flex items-center gap-1"
                  >
                    <span>{CHARACTER_PROFILES[c.id]?.avatar}</span>
                    <span>{getCardName(c.id).replace(/^[^\s]+\s+/, '')}</span>
                  </span>
                ))}
                <span className="text-[10px] text-slate-500">(2 randomly assigned)</span>
              </div>
            </div>
          </div>

          {/* 시작 버튼: 호스트/로컬은 시작 버튼, 게스트는 대기 안내 */}
          {playMode === 'guest' ? (
            <div className="w-full py-4 rounded-xl bg-slate-800/80 border border-slate-700 text-amber-400 font-bold text-sm text-center flex items-center justify-center gap-2 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>{locale === 'ko' ? '방장(플레이어 1)이 게임을 시작하기를 기다리고 있습니다...' : 'Waiting for Player 1 to start the investigation...'}</span>
            </div>
          ) : (
            <button
              disabled={playMode === 'host' && !isConnected}
              onClick={handleStartGame}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black text-base sm:text-lg shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>{t.startGame}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 상단 턴 헤더 */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-amber-400 tracking-tight text-lg">Clueamos</span>
          <div className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
            {t.round} {gameState.turnCount} / {gameState.maxTurns}
          </div>

          {/* 멀티플레이 룸 뱃지 및 온라인 상태 */}
          {playMode !== 'local' && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-xs font-mono">
              {roomCode && <span className="text-slate-200 font-bold">{roomCode}</span>}
              {peerOnline ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold font-sans">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="hidden sm:inline">{t.online}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold font-sans">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span className="hidden sm:inline">{t.offline}</span>
                </span>
              )}
              <span className="text-[10px] text-amber-400 font-bold hidden sm:inline font-sans">({playMode.toUpperCase()})</span>
            </div>
          )}
        </div>

        {/* 현재 차례 표시기 */}
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full animate-pulse" 
            style={{ backgroundColor: currentPlayer.color }} 
          />
          <span className="text-xs sm:text-sm font-bold text-slate-200 truncate max-w-[180px] sm:max-w-none">
            {getPlayerDisplayName(currentPlayer, locale)}{t.turn}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 hidden sm:inline-block">
            {currentPlayer.type === 'human' ? t.player : t.detective}
          </span>
        </div>

        {/* 언어 선택 및 유틸리티 버튼들 */}
        <div className="flex items-center gap-2">
          {/* 언어 토글 */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 text-xs font-semibold">
            <button 
              onClick={() => setLocale('en')} 
              className={`px-2 py-1 rounded ${locale === 'en' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              EN
            </button>
            <button 
              onClick={() => setLocale('es')} 
              className={`px-2 py-1 rounded ${locale === 'es' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              ES
            </button>
            <button 
              onClick={() => setLocale('ko')} 
              className={`px-2 py-1 rounded ${locale === 'ko' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              KO
            </button>
          </div>

          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* 절차적 필름 느와르 재즈 BGM 토글 */}
          <button
            onClick={() => {
              const next = sounds.toggleBgm();
              setBgmActive(next);
            }}
            title={t.bgmMusic}
            className={`p-2 rounded-lg border transition-all ${
              bgmActive
                ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-sm shadow-amber-500/30 ring-1 ring-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400'
            }`}
          >
            <Music className={`w-4 h-4 ${bgmActive ? 'animate-pulse text-amber-400' : ''}`} />
          </button>

          <button 
            onClick={() => setActiveTab(activeTab === 'board' ? 'notes' : 'board')}
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center gap-1.5 text-amber-400"
          >
            <ScrollText className="w-4 h-4" />
            <span>{activeTab === 'board' ? t.viewNotes : t.viewMap}</span>
          </button>

          {isHumanTurn && isMyTurn && !currentPlayer.isEliminated && (
            <button
              onClick={() => setIsAccuseModalOpen(true)}
              className="text-xs font-bold px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors flex items-center gap-1.5 shadow-md shadow-rose-900/30"
            >
              <Flame className="w-4 h-4" />
              <span>{t.finalAccusationBtn}</span>
            </button>
          )}

          <button 
            onClick={() => {
              setHasStarted(false);
              disconnectRoom();
            }}
            title={t.newGame}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

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

      {/* 메인 대시보드 */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 좌측 2열: 맵 또는 추리 수첩 */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {activeTab === 'board' ? (
            <div className="flex flex-col gap-4">
              <GameBoard
                players={gameState.players}
                currentPlayerIndex={gameState.currentPlayerIndex}
                phase={gameState.phase}
                currentDiceRoll={gameState.currentDiceRoll}
                accessibleRoomIds={gameState.accessibleRoomIds}
                isRollingDice={isRollingDice}
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
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
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
                      <label className="text-slate-400 block mb-1">{t.solutionLocation}</label>
                      <div className="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-2.5 text-amber-300 font-semibold truncate flex items-center">
                        <span>{getRoomName(currentPlayer.currentRoomId)}</span>
                      </div>
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
            /* 사건 추리 수첩 (간편 체크리스트 vs 실전 탐정 매트릭스 그리드) */
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <ScrollText className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-bold text-slate-200">
                    {t.notebookTitle}
                  </h2>
                </div>

                {/* 보기 모드 전환 (체크리스트 vs 실전 매트릭스) */}
                <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700 self-start sm:self-auto">
                  <button
                    onClick={() => setNotebookViewMode('simple')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      notebookViewMode === 'simple'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ListChecks className="w-3.5 h-3.5" />
                    <span>{t.notebookSimpleMode}</span>
                  </button>
                  <button
                    onClick={() => setNotebookViewMode('matrix')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      notebookViewMode === 'matrix'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>{t.notebookMatrixMode}</span>
                  </button>
                </div>
              </div>

              {notebookViewMode === 'simple' ? (
                /* 1. 간편 체크리스트 뷰 */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* 용의자 */}
                  <div className="flex flex-col gap-1.5">
                    <div className="font-bold text-rose-400 border-b border-slate-800 pb-1">{t.suspectsHeader}</div>
                    {SUSPECTS.map(s => {
                      const isMyCard = myPlayer?.hand?.some(c => c.id === s.id);
                      const mark = isMyCard ? 'NO' : (userNotes[s.id] || 'UNKNOWN');
                      return (
                        <div 
                          key={s.id} 
                          onClick={() => !isMyCard && toggleNote(s.id)}
                          className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                            !isMyCard ? 'cursor-pointer hover:bg-slate-800/50' : 'opacity-70'
                          } border-slate-800 bg-slate-900/40`}
                        >
                          <span className="text-slate-300">{getCardName(s.id)}</span>
                          <span>
                            {mark === 'NO' && <X className="w-3.5 h-3.5 text-rose-500" />}
                            {mark === 'YES' && <Check className="w-3.5 h-3.5 text-emerald-400 font-bold" />}
                            {mark === 'UNKNOWN' && <span className="text-slate-600">?</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* 살인이 일어난 장소 */}
                  <div className="flex flex-col gap-1.5">
                    <div className="font-bold text-blue-400 border-b border-slate-800 pb-1">{t.locationsHeader}</div>
                    {LOCATIONS.map(r => {
                      const isMyCard = myPlayer?.hand?.some(c => c.id === r.id);
                      const mark = isMyCard ? 'NO' : (userNotes[r.id] || 'UNKNOWN');
                      return (
                        <div 
                          key={r.id} 
                          onClick={() => !isMyCard && toggleNote(r.id)}
                          className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                            !isMyCard ? 'cursor-pointer hover:bg-slate-800/50' : 'opacity-70'
                          } border-slate-800 bg-slate-900/40`}
                        >
                          <span className="text-slate-300">{getRoomName(r.id)}</span>
                          <span>
                            {mark === 'NO' && <X className="w-3.5 h-3.5 text-rose-500" />}
                            {mark === 'YES' && <Check className="w-3.5 h-3.5 text-emerald-400 font-bold" />}
                            {mark === 'UNKNOWN' && <span className="text-slate-600">?</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* 범행 도구 */}
                  <div className="flex flex-col gap-1.5">
                    <div className="font-bold text-amber-400 border-b border-slate-800 pb-1">{t.weaponsHeader}</div>
                    {WEAPONS.map(w => {
                      const isMyCard = myPlayer?.hand?.some(c => c.id === w.id);
                      const mark = isMyCard ? 'NO' : (userNotes[w.id] || 'UNKNOWN');
                      return (
                        <div 
                          key={w.id} 
                          onClick={() => !isMyCard && toggleNote(w.id)}
                          className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                            !isMyCard ? 'cursor-pointer hover:bg-slate-800/50' : 'opacity-70'
                          } border-slate-800 bg-slate-900/40`}
                        >
                          <span className="text-slate-300">{getCardName(w.id)}</span>
                          <span>
                            {mark === 'NO' && <X className="w-3.5 h-3.5 text-rose-500" />}
                            {mark === 'YES' && <Check className="w-3.5 h-3.5 text-emerald-400 font-bold" />}
                            {mark === 'UNKNOWN' && <span className="text-slate-600">?</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* 2. 전 탐정 매트릭스 그리드 뷰 (보드게임 정석 추리표) */
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 shadow-inner">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-800/80 text-slate-300 border-b border-slate-700 font-semibold">
                        <th className="p-2.5 min-w-[130px] text-slate-300">
                          {locale === 'ko' ? '단서 카드' : 'Clue Card'}
                        </th>
                        {gameState.players.map(p => {
                          const isMyDetective = p.id === myPlayer?.id;
                          return (
                            <th key={p.id} className="p-2 text-center min-w-[70px] border-l border-slate-800/80">
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-base leading-none">{p.avatar}</span>
                                <span className={`text-[10px] font-bold truncate max-w-[65px] ${isMyDetective ? 'text-amber-400' : 'text-slate-300'}`}>
                                  {isMyDetective ? (locale === 'ko' ? '나 (Me)' : 'You') : getPlayerDisplayName(p, locale).split(' ')[0]}
                                </span>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {/* 용의자 섹션 */}
                      <tr className="bg-rose-950/40 text-rose-300 font-black text-[10px]">
                        <td colSpan={1 + gameState.players.length} className="px-3 py-1 uppercase tracking-wider">
                          {t.suspectsHeader}
                        </td>
                      </tr>
                      {SUSPECTS.map(s => {
                        const cardName = getCardName(s.id);
                        return (
                          <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-2 font-medium text-slate-200 border-r border-slate-800/50">
                              {cardName}
                            </td>
                            {gameState.players.map(p => {
                              const isMyDetective = p.id === myPlayer?.id;
                              const isMyCard = myPlayer?.hand?.some(c => c.id === s.id);

                              if (isMyDetective) {
                                if (isMyCard) {
                                  return (
                                    <td key={p.id} className="p-1.5 text-center border-l border-slate-800/50 bg-amber-500/10">
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-slate-950">
                                        HAND
                                      </span>
                                    </td>
                                  );
                                }
                                const mark = userNotes[s.id] || 'UNKNOWN';
                                return (
                                  <td
                                    key={p.id}
                                    onClick={() => toggleNote(s.id)}
                                    className="p-1.5 text-center cursor-pointer hover:bg-slate-800/60 border-l border-slate-800/50 transition-colors"
                                  >
                                    {mark === 'NO' && <span className="text-rose-400 font-black text-sm">✕</span>}
                                    {mark === 'YES' && <span className="text-emerald-400 font-black text-sm">✓</span>}
                                    {mark === 'UNKNOWN' && <span className="text-slate-600 font-mono">?</span>}
                                  </td>
                                );
                              }

                              const cellVal = matrixNotes[s.id]?.[p.id] || '?';
                              return (
                                <td
                                  key={p.id}
                                  onClick={() => toggleMatrixCell(s.id, p.id)}
                                  className="p-1.5 text-center cursor-pointer hover:bg-slate-800/60 border-l border-slate-800/50 transition-colors select-none"
                                >
                                  {cellVal === 'O' && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 border border-emerald-500/60 text-emerald-300">
                                      O
                                    </span>
                                  )}
                                  {cellVal === 'X' && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 border border-rose-500/60 text-rose-300">
                                      X
                                    </span>
                                  )}
                                  {cellVal === '?' && (
                                    <span className="text-slate-600 font-mono text-xs">·</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}

                      {/* 장소 섹션 */}
                      <tr className="bg-blue-950/40 text-blue-300 font-black text-[10px]">
                        <td colSpan={1 + gameState.players.length} className="px-3 py-1 uppercase tracking-wider">
                          {t.locationsHeader}
                        </td>
                      </tr>
                      {LOCATIONS.map(r => {
                        const roomName = getRoomName(r.id);
                        return (
                          <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-2 font-medium text-slate-200 border-r border-slate-800/50">
                              {roomName}
                            </td>
                            {gameState.players.map(p => {
                              const isMyDetective = p.id === myPlayer?.id;
                              const isMyCard = myPlayer?.hand?.some(c => c.id === r.id);

                              if (isMyDetective) {
                                if (isMyCard) {
                                  return (
                                    <td key={p.id} className="p-1.5 text-center border-l border-slate-800/50 bg-amber-500/10">
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-slate-950">
                                        HAND
                                      </span>
                                    </td>
                                  );
                                }
                                const mark = userNotes[r.id] || 'UNKNOWN';
                                return (
                                  <td
                                    key={p.id}
                                    onClick={() => toggleNote(r.id)}
                                    className="p-1.5 text-center cursor-pointer hover:bg-slate-800/60 border-l border-slate-800/50 transition-colors"
                                  >
                                    {mark === 'NO' && <span className="text-rose-400 font-black text-sm">✕</span>}
                                    {mark === 'YES' && <span className="text-emerald-400 font-black text-sm">✓</span>}
                                    {mark === 'UNKNOWN' && <span className="text-slate-600 font-mono">?</span>}
                                  </td>
                                );
                              }

                              const cellVal = matrixNotes[r.id]?.[p.id] || '?';
                              return (
                                <td
                                  key={p.id}
                                  onClick={() => toggleMatrixCell(r.id, p.id)}
                                  className="p-1.5 text-center cursor-pointer hover:bg-slate-800/60 border-l border-slate-800/50 transition-colors select-none"
                                >
                                  {cellVal === 'O' && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 border border-emerald-500/60 text-emerald-300">
                                      O
                                    </span>
                                  )}
                                  {cellVal === 'X' && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 border border-rose-500/60 text-rose-300">
                                      X
                                    </span>
                                  )}
                                  {cellVal === '?' && (
                                    <span className="text-slate-600 font-mono text-xs">·</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}

                      {/* 범행 도구 섹션 */}
                      <tr className="bg-amber-950/40 text-amber-300 font-black text-[10px]">
                        <td colSpan={1 + gameState.players.length} className="px-3 py-1 uppercase tracking-wider">
                          {t.weaponsHeader}
                        </td>
                      </tr>
                      {WEAPONS.map(w => {
                        const weaponName = getCardName(w.id);
                        return (
                          <tr key={w.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-2 font-medium text-slate-200 border-r border-slate-800/50">
                              {weaponName}
                            </td>
                            {gameState.players.map(p => {
                              const isMyDetective = p.id === myPlayer?.id;
                              const isMyCard = myPlayer?.hand?.some(c => c.id === w.id);

                              if (isMyDetective) {
                                if (isMyCard) {
                                  return (
                                    <td key={p.id} className="p-1.5 text-center border-l border-slate-800/50 bg-amber-500/10">
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-slate-950">
                                        HAND
                                      </span>
                                    </td>
                                  );
                                }
                                const mark = userNotes[w.id] || 'UNKNOWN';
                                return (
                                  <td
                                    key={p.id}
                                    onClick={() => toggleNote(w.id)}
                                    className="p-1.5 text-center cursor-pointer hover:bg-slate-800/60 border-l border-slate-800/50 transition-colors"
                                  >
                                    {mark === 'NO' && <span className="text-rose-400 font-black text-sm">✕</span>}
                                    {mark === 'YES' && <span className="text-emerald-400 font-black text-sm">✓</span>}
                                    {mark === 'UNKNOWN' && <span className="text-slate-600 font-mono">?</span>}
                                  </td>
                                );
                              }

                              const cellVal = matrixNotes[w.id]?.[p.id] || '?';
                              return (
                                <td
                                  key={p.id}
                                  onClick={() => toggleMatrixCell(w.id, p.id)}
                                  className="p-1.5 text-center cursor-pointer hover:bg-slate-800/60 border-l border-slate-800/50 transition-colors select-none"
                                >
                                  {cellVal === 'O' && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 border border-emerald-500/60 text-emerald-300">
                                      O
                                    </span>
                                  )}
                                  {cellVal === 'X' && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 border border-rose-500/60 text-rose-300">
                                      X
                                    </span>
                                  )}
                                  {cellVal === '?' && (
                                    <span className="text-slate-600 font-mono text-xs">·</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 내 비공개 손패 영역 (실물 카드 보관함 랙) */}
          {myPlayer && (
            <CardHandTray
              cards={myPlayer.hand}
              playerName={getPlayerDisplayName(myPlayer, locale)}
              getCardName={getCardName}
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

      {/* 비밀 반증 요청 모달 창 (반증해야 하는 사람의 화면에만 팝업) */}
      {pendingDisprovePrompt && !isPassingCard && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="max-w-md w-full bg-slate-900 border border-indigo-500/50 p-6 rounded-3xl flex flex-col gap-4 shadow-2xl text-center">
            <div className="flex items-center justify-center gap-2 text-indigo-400">
              <Eye className="w-5 h-5" />
              <h2 className="text-lg font-black text-slate-100">{t.disprovePromptTitle}</h2>
            </div>
            <p className="text-xs text-slate-300">
              {t.disproveCardSelectionPrompt}
            </p>

            {/* 촉각적인 실물 카드 선택 영역 */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 py-3 min-h-[190px] overflow-x-auto">
              {pendingDisprovePrompt.availableCards.map(card => (
                <div key={card.id} className="transition-transform duration-200">
                  <ClueCard
                    cardId={card.id}
                    size="md"
                    isSelected={selectedDisproveCard === card.id}
                    isSelectable={true}
                    onClick={() => {
                      sounds.playCardSlide();
                      setSelectedDisproveCard(card.id);
                    }}
                    getCardName={getCardName}
                    className="shadow-xl cursor-pointer"
                  />
                </div>
              ))}
            </div>

            <button
              disabled={!selectedDisproveCard}
              onClick={() => {
                if (selectedDisproveCard) {
                  handleConfirmDisprove(selectedDisproveCard);
                }
              }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-40 text-white font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-[0.98]"
            >
              <span>{t.submitDisproveBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 최종 고발(Accusation) 모달 창 */}
      {isAccuseModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="max-w-lg w-full bg-slate-900 border border-rose-500/50 p-6 rounded-3xl flex flex-col gap-5 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="text-lg font-black text-slate-100">{t.accuseTitle}</h2>
            </div>
            <p className="text-xs text-rose-300/80 bg-rose-950/30 p-3 rounded-xl border border-rose-500/20">
              {t.accuseWarning}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">{t.accuseSuspect}</label>
                <select 
                  value={accuseSuspect} 
                  onChange={e => setAccuseSuspect(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200"
                >
                  {SUSPECTS.map(s => <option key={s.id} value={s.id}>{getCardName(s.id)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">{t.accuseLocation}</label>
                <select 
                  value={accuseLocation} 
                  onChange={e => setAccuseLocation(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200"
                >
                  {LOCATIONS.map(l => <option key={l.id} value={l.id}>{getRoomName(l.id)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">{t.accuseWeapon}</label>
                <select 
                  value={accuseWeapon} 
                  onChange={e => setAccuseWeapon(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200"
                >
                  {WEAPONS.map(w => <option key={w.id} value={w.id}>{getCardName(w.id)}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-2">
              <button
                onClick={() => setIsAccuseModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleFinalAccusation}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-900/30"
              >
                {t.declareTruth}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 게임 오버 모달 창 (정답 공개 및 사건 수사 타임라인 복기) */}
      {gameState.phase === 'GAME_OVER' && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="max-w-lg w-full bg-slate-900 border border-amber-500/50 p-6 rounded-3xl text-center flex flex-col items-center gap-4 shadow-2xl my-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/10">
              🏆
            </div>
            <h2 className="text-2xl font-black text-slate-100">{t.investigationEnd}</h2>
            <p className="text-sm text-slate-300 font-medium">
              {gameState.winnerId 
                ? `${getPlayerDisplayName(gameState.players.find(p => p.id === gameState.winnerId)!, locale)} ${t.truthRevealed}`
                : t.mysteryUnsolved}
            </p>

            {/* 사건의 진상 (정답 카드 3장) */}
            <div className="bg-slate-800/70 border border-amber-500/30 p-4 rounded-2xl text-xs text-left w-full flex flex-col gap-1.5 text-slate-200 shadow-inner">
              <div className="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>{t.secretSolutionTitle}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
                <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-700/80">
                  <span className="text-[10px] text-rose-400 block font-bold">{t.solutionCulprit}</span>
                  <span className="font-semibold text-slate-100">{getCardName(gameState.solution.suspectId)}</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-700/80">
                  <span className="text-[10px] text-blue-400 block font-bold">{t.solutionLocation}</span>
                  <span className="font-semibold text-slate-100">{getRoomName(gameState.solution.locationId)}</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-700/80">
                  <span className="text-[10px] text-amber-400 block font-bold">{t.solutionWeapon}</span>
                  <span className="font-semibold text-slate-100">{getCardName(gameState.solution.weaponId)}</span>
                </div>
              </div>
            </div>

            {/* 사건 수사 타임라인 복기 (Collapsible Timeline Debrief) */}
            <div className="w-full bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden text-left shadow-inner">
              <button
                onClick={() => setTimelineExpanded(!timelineExpanded)}
                className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-amber-400 hover:bg-slate-800/60 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ScrollText className="w-4 h-4 text-amber-400" />
                  <span>{t.investigationTimeline}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300">
                    {gameState.logs.length}
                  </span>
                </span>
                {timelineExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {timelineExpanded && (
                <div className="p-3 border-t border-slate-700/60 max-h-56 overflow-y-auto flex flex-col gap-2 text-xs text-slate-300">
                  {gameState.logs.map((log) => (
                    <div 
                      key={log.id} 
                      className={`p-2.5 rounded-xl border text-[11px] leading-relaxed ${
                        log.type === 'accusation'
                          ? 'border-rose-500/40 bg-rose-950/20 text-rose-200'
                          : log.type === 'disprove'
                            ? 'border-indigo-500/40 bg-indigo-950/20 text-indigo-200'
                            : 'border-slate-800 bg-slate-900/60 text-slate-300'
                      }`}
                    >
                      <span className="text-[10px] text-slate-500 mr-1.5 font-mono">[{t.round} {log.turn}]</span>
                      {log.message}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setHasStarted(false);
                disconnectRoom();
              }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98]"
            >
              {t.playAgain}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
