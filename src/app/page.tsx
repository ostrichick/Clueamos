'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { 
  Compass, 
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
  Languages
} from 'lucide-react';
import { SUSPECTS, LOCATIONS, WEAPONS, MOTIVES } from '@/engine/data';
import { sounds } from '@/utils/sounds';
import { translations, SupportedLocale } from '@/i18n/translations';
import confetti from 'canvas-confetti';

export default function Home() {
  const {
    gameState,
    startNewGame,
    performMove,
    performSuggestion,
    performAccusation,
  } = useGameStore();

  // 기본 언어: 영어 ('en'), 옵션: 스페인어 ('es'), 한국어 ('ko')
  const [locale, setLocale] = useState<SupportedLocale>('en');
  const t = translations[locale];

  const [hasStarted, setHasStarted] = useState(false);
  const [selectedSuspect, setSelectedSuspect] = useState(SUSPECTS[0].id);
  const [selectedWeapon, setSelectedWeapon] = useState(WEAPONS[0].id);
  const [selectedMotive, setSelectedMotive] = useState(MOTIVES[0].id);
  const [activeTab, setActiveTab] = useState<'board' | 'notes'>('board');
  const [showHand, setShowHand] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // 최종 고발 모달 상태
  const [isAccuseModalOpen, setIsAccuseModalOpen] = useState(false);
  const [accuseSuspect, setAccuseSuspect] = useState(SUSPECTS[0].id);
  const [accuseLocation, setAccuseLocation] = useState(LOCATIONS[0].id);
  const [accuseWeapon, setAccuseWeapon] = useState(WEAPONS[0].id);
  const [accuseMotive, setAccuseMotive] = useState(MOTIVES[0].id);

  // 개인 추리 수첩 (체크리스트: ? / NO / YES)
  const [userNotes, setUserNotes] = useState<Record<string, 'UNKNOWN' | 'YES' | 'NO'>>({});

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isHumanTurn = currentPlayer?.type === 'human';

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

  const handleStartGame = () => {
    sounds.playMove();
    const p1Name = locale === 'ko' ? '플레이어 1 (나)' : locale === 'es' ? 'Jugador 1' : 'Player 1 (Me)';
    const p2Name = locale === 'ko' ? '플레이어 2 (아내)' : locale === 'es' ? 'Jugadora 2 (Esposa)' : 'Player 2 (Wife)';
    startNewGame(p1Name, p2Name);
    setHasStarted(true);
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
      motiveId: selectedMotive,
    });
  };

  const handleFinalAccusation = () => {
    setIsAccuseModalOpen(false);
    const isCorrect = performAccusation({
      suspectId: accuseSuspect,
      locationId: accuseLocation,
      weaponId: accuseWeapon,
      motiveId: accuseMotive,
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

  // 카드 및 방 다국어 이름 가져오기 헬퍼
  const getCardName = (id: string) => t.cards[id]?.name || id;
  const getCardDesc = (id: string) => t.cards[id]?.description || '';
  const getRoomName = (id: string) => t.rooms[id]?.name || id;
  const getRoomDesc = (id: string) => t.rooms[id]?.description || '';

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-amber-500 relative">
        {/* 우측 상단 언어 선택 버튼 */}
        <div className="absolute top-6 right-6 flex items-center gap-2 bg-slate-900/80 border border-slate-700/80 px-3 py-1.5 rounded-2xl backdrop-blur-md shadow-lg">
          <Languages className="w-4 h-4 text-amber-400" />
          <button 
            onClick={() => setLocale('en')}
            className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${locale === 'en' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
          >
            English
          </button>
          <button 
            onClick={() => setLocale('es')}
            className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${locale === 'es' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Español
          </button>
          <button 
            onClick={() => setLocale('ko')}
            className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${locale === 'ko' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
          >
            한국어
          </button>
        </div>

        <div className="max-w-xl w-full bg-slate-900/80 border border-amber-500/30 p-8 rounded-3xl backdrop-blur-2xl flex flex-col items-center text-center gap-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-black text-3xl shadow-xl shadow-amber-500/20">
            C
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
              {t.gameTitle}
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              {t.gameSubtitle}
            </p>
          </div>

          <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 text-left text-xs text-slate-300 flex flex-col gap-2.5 w-full">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Sparkles className="w-4 h-4" /> {t.ruleTitle}
            </div>
            <p>• {t.rule1}</p>
            <p>• {t.rule2}</p>
            <p>• {t.rule3}</p>
          </div>

          <button
            onClick={handleStartGame}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-lg shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span>{t.enterScene}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 상단 턴 헤더 */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <span className="font-extrabold text-amber-400 tracking-tight text-lg">Clueamos</span>
          <div className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
            {t.round} {gameState.turnCount} / {gameState.maxTurns}
          </div>
        </div>

        {/* 현재 차례 표시기 */}
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full animate-pulse" 
            style={{ backgroundColor: currentPlayer.color }} 
          />
          <span className="text-sm font-bold text-slate-200">
            {currentPlayer.name}{t.turn}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            {currentPlayer.type === 'human' ? t.player : t.detective}
          </span>
        </div>

        {/* 언어 선택 및 유틸리티 버튼들 */}
        <div className="flex items-center gap-2">
          {/* 언어 드롭다운/토글 */}
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

          <button 
            onClick={() => setActiveTab(activeTab === 'board' ? 'notes' : 'board')}
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center gap-1.5 text-amber-400"
          >
            <ScrollText className="w-4 h-4" />
            <span>{activeTab === 'board' ? t.viewNotes : t.viewMap}</span>
          </button>

          {isHumanTurn && !currentPlayer.isEliminated && (
            <button
              onClick={() => setIsAccuseModalOpen(true)}
              className="text-xs font-bold px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors flex items-center gap-1.5 shadow-md shadow-rose-900/30"
            >
              <Flame className="w-4 h-4" />
              <span>{t.finalAccusationBtn}</span>
            </button>
          )}

          <button 
            onClick={() => handleStartGame()}
            title={t.newGame}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 메인 대시보드 */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 좌측 2열: 맵 또는 추리 수첩 */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {activeTab === 'board' ? (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-amber-400" />
                  {t.adjacentRoomsDesc}
                </h2>
                <span className="text-xs text-slate-500">
                  {t.currentRoom}: <strong className="text-slate-300">{getRoomName(currentPlayer.currentRoomId)}</strong>
                </span>
              </div>

              {/* 6개 방 그리드 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {gameState.rooms.map(room => {
                  const currentRoom = gameState.rooms.find(r => r.id === currentPlayer.currentRoomId);
                  const isAdjacent = currentRoom?.adjacentRoomIds.includes(room.id);
                  const isCurrent = room.id === currentPlayer.currentRoomId;
                  const playersInRoom = gameState.players.filter(p => p.currentRoomId === room.id && !p.isEliminated);

                  return (
                    <button
                      key={room.id}
                      disabled={!isHumanTurn || gameState.phase !== 'PLAYING_MOVE' || (!isAdjacent && !isCurrent)}
                      onClick={() => handleMove(room.id)}
                      className={`h-32 p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all relative overflow-hidden ${
                        isCurrent 
                          ? 'border-amber-500/80 bg-amber-500/10 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40'
                          : isAdjacent && isHumanTurn && gameState.phase === 'PLAYING_MOVE'
                            ? 'border-slate-700 bg-slate-800/40 hover:bg-slate-800 hover:border-amber-400/50 cursor-pointer active:scale-95'
                            : 'border-slate-800/60 bg-slate-900/20 opacity-70'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm text-slate-200">{getRoomName(room.id)}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{getRoomDesc(room.id)}</div>
                      </div>

                      {/* 방에 위치한 탐정 토큰들 */}
                      <div className="flex items-center gap-1.5">
                        {playersInRoom.map(p => (
                          <div 
                            key={p.id}
                            title={`${p.name}`}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs border border-white/20 shadow-md"
                            style={{ backgroundColor: p.color }}
                          >
                            {p.avatar}
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 플레이어 질문 작성 패널 */}
              {isHumanTurn && gameState.phase === 'PLAYING_SUGGEST' && (
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
                      <label className="text-slate-400 block mb-1">{t.selectWeapon}</label>
                      <select 
                        value={selectedWeapon} 
                        onChange={e => setSelectedWeapon(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200"
                      >
                        {WEAPONS.map(w => <option key={w.id} value={w.id}>{getCardName(w.id)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">{t.selectMotive}</label>
                      <select 
                        value={selectedMotive} 
                        onChange={e => setSelectedMotive(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200"
                      >
                        {MOTIVES.map(m => <option key={m.id} value={m.id}>{getCardName(m.id)}</option>)}
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
            /* 사건 추리 수첩 (체크리스트) */
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
                  <ScrollText className="w-4 h-4 text-amber-400" />
                  {t.notebookTitle}
                </h2>
                <span className="text-xs text-slate-500">
                  {t.notebookDesc}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {/* 용의자 */}
                <div className="flex flex-col gap-1.5">
                  <div className="font-bold text-rose-400 border-b border-slate-800 pb-1">{t.suspectsHeader}</div>
                  {SUSPECTS.map(s => {
                    const isMyCard = currentPlayer.hand.some(c => c.id === s.id);
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

                {/* 장소 */}
                <div className="flex flex-col gap-1.5">
                  <div className="font-bold text-blue-400 border-b border-slate-800 pb-1">{t.locationsHeader}</div>
                  {LOCATIONS.map(r => {
                    const isMyCard = currentPlayer.hand.some(c => c.id === r.id);
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

                {/* 도구 */}
                <div className="flex flex-col gap-1.5">
                  <div className="font-bold text-amber-400 border-b border-slate-800 pb-1">{t.weaponsHeader}</div>
                  {WEAPONS.map(w => {
                    const isMyCard = currentPlayer.hand.some(c => c.id === w.id);
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

                {/* 동기 */}
                <div className="flex flex-col gap-1.5">
                  <div className="font-bold text-purple-400 border-b border-slate-800 pb-1">{t.motivesHeader}</div>
                  {MOTIVES.map(m => {
                    const isMyCard = currentPlayer.hand.some(c => c.id === m.id);
                    const mark = isMyCard ? 'NO' : (userNotes[m.id] || 'UNKNOWN');
                    return (
                      <div 
                        key={m.id} 
                        onClick={() => !isMyCard && toggleNote(m.id)}
                        className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                          !isMyCard ? 'cursor-pointer hover:bg-slate-800/50' : 'opacity-70'
                        } border-slate-800 bg-slate-900/40`}
                      >
                        <span className="text-slate-300">{getCardName(m.id)}</span>
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
            </div>
          )}

          {/* 내 비공개 손패 영역 */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                {currentPlayer.name}{t.secretHand} ({currentPlayer.hand.length}{t.cardsCount})
              </span>
              <button
                onClick={() => setShowHand(!showHand)}
                className="text-xs text-amber-400 hover:underline"
              >
                {showHand ? t.hideHand : t.showHand}
              </button>
            </div>
            {showHand && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                {currentPlayer.hand.map(card => (
                  <div key={card.id} className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700 text-xs">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">{card.category}</div>
                    <div className="font-bold text-slate-200 mt-0.5">{getCardName(card.id)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
                    <span className="font-semibold text-slate-200">{p.name}</span>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
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
              <div>
                <label className="text-slate-400 block mb-1">{t.accuseMotive}</label>
                <select 
                  value={accuseMotive} 
                  onChange={e => setAccuseMotive(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200"
                >
                  {MOTIVES.map(m => <option key={m.id} value={m.id}>{getCardName(m.id)}</option>)}
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

      {/* 게임 오버 모달 창 */}
      {gameState.phase === 'GAME_OVER' && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full bg-slate-900 border border-amber-500/40 p-6 rounded-3xl text-center flex flex-col items-center gap-4 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-3xl">
              🏆
            </div>
            <h2 className="text-2xl font-black text-slate-100">{t.investigationEnd}</h2>
            <p className="text-sm text-slate-300">
              {gameState.winnerId 
                ? `${gameState.players.find(p => p.id === gameState.winnerId)?.name} ${t.truthRevealed}`
                : t.mysteryUnsolved}
            </p>
            <div className="bg-slate-800/60 p-4 rounded-xl text-xs text-left w-full flex flex-col gap-1 text-slate-300">
              <div className="font-bold text-amber-400 mb-1">{t.secretSolutionTitle}</div>
              <div>• {t.solutionCulprit}: {getCardName(gameState.solution.suspectId)}</div>
              <div>• {t.solutionLocation}: {getRoomName(gameState.solution.locationId)}</div>
              <div>• {t.solutionWeapon}: {getCardName(gameState.solution.weaponId)}</div>
              <div>• {t.solutionMotive}: {getCardName(gameState.solution.motiveId)}</div>
            </div>
            <button
              onClick={() => handleStartGame()}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors"
            >
              {t.playAgain}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
