'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { 
  Users, 
  Bot, 
  Compass, 
  HelpCircle, 
  ScrollText, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Sparkles,
  ArrowRight,
  Eye,
  RotateCcw
} from 'lucide-react';
import { SUSPECTS, WEAPONS, MOTIVES } from '@/engine/data';
import confetti from 'canvas-confetti';

export default function Home() {
  const {
    gameState,
    startNewGame,
    performMove,
    performSuggestion,
    performDisprove,
    performAccusation,
  } = useGameStore();

  const [hasStarted, setHasStarted] = useState(false);
  const [selectedSuspect, setSelectedSuspect] = useState(SUSPECTS[0].id);
  const [selectedWeapon, setSelectedWeapon] = useState(WEAPONS[0].id);
  const [selectedMotive, setSelectedMotive] = useState(MOTIVES[0].id);
  const [activeTab, setActiveTab] = useState<'board' | 'notes'>('board');
  const [showHand, setShowHand] = useState(false);
  const [userNotes, setUserNotes] = useState<Record<string, 'UNKNOWN' | 'YES' | 'NO'>>({});

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isHumanTurn = currentPlayer?.type === 'human';

  // 게임 승리 시 컨페티 축하 연출
  useEffect(() => {
    if (gameState.phase === 'GAME_OVER' && gameState.winnerId) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [gameState.phase, gameState.winnerId]);

  const handleStartGame = () => {
    startNewGame('플레이어 1 (나)', '플레이어 2 (아내)');
    setHasStarted(true);
  };

  const toggleNote = (cardId: string) => {
    setUserNotes(prev => {
      const current = prev[cardId] || 'UNKNOWN';
      const next = current === 'UNKNOWN' ? 'NO' : current === 'NO' ? 'YES' : 'UNKNOWN';
      return { ...prev, [cardId]: next };
    });
  };

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-amber-500">
        <div className="max-w-xl w-full bg-slate-900/70 border border-slate-800 p-8 rounded-3xl backdrop-blur-xl flex flex-col items-center text-center gap-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-black text-3xl shadow-xl shadow-amber-500/20">
            C
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
              Clueamos
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              폭풍우 치는 밤의 그랜드 벨벳 호텔 살인사건
            </p>
          </div>

          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 text-left text-xs text-slate-300 flex flex-col gap-2 w-full">
            <div className="flex items-center gap-2 text-amber-400 font-semibold">
              <Sparkles className="w-4 h-4" /> 4인 플레이 규칙 안내
            </div>
            <p>• 사람 2명(부부)과 컴퓨터 탐정 2명(아서, 블레이크)이 함께 수사합니다.</p>
            <p>• AI는 정답을 미리 알지 못하며, 플레이어와 동일한 정보만으로 공정하게 추론합니다.</p>
            <p>• 용의자 6명, 장소 6곳, 도구 6개 외에 <strong>범행 동기 4개</strong>를 밝혀내야 합니다.</p>
          </div>

          <button
            onClick={handleStartGame}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-lg shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98]"
          >
            사건 현장 입장하기
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
            라운드 {gameState.turnCount} / {gameState.maxTurns}
          </div>
        </div>

        {/* 현재 차례 표시기 */}
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full animate-pulse" 
            style={{ backgroundColor: currentPlayer.color }} 
          />
          <span className="text-sm font-bold text-slate-200">
            {currentPlayer.name}의 차례
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            {currentPlayer.type === 'human' ? '플레이어' : 'AI 탐정'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveTab(activeTab === 'board' ? 'notes' : 'board')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center gap-1.5 text-amber-400"
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span>{activeTab === 'board' ? '추리 수첩 보기' : '호텔 맵 보기'}</span>
          </button>
          <button 
            onClick={() => startNewGame()}
            title="새 게임 시작"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 메인 게임 영역 */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 좌측 2열: 맵 또는 추리 노트 */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {activeTab === 'board' ? (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-amber-400" />
                  호텔 층별 평면도 (이동할 방을 클릭하세요)
                </h2>
                <span className="text-xs text-slate-500">
                  현재 방: {gameState.rooms.find(r => r.id === currentPlayer.currentRoomId)?.name}
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
                      onClick={() => performMove(room.id)}
                      className={`h-32 p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all relative overflow-hidden ${
                        isCurrent 
                          ? 'border-amber-500/80 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                          : isAdjacent && isHumanTurn && gameState.phase === 'PLAYING_MOVE'
                            ? 'border-slate-700 bg-slate-800/40 hover:bg-slate-800 hover:border-amber-400/50 cursor-pointer'
                            : 'border-slate-800/60 bg-slate-900/20 opacity-70'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm text-slate-200">{room.name}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{room.description}</div>
                      </div>

                      {/* 방에 위치한 탐정 토큰들 */}
                      <div className="flex items-center gap-1.5">
                        {playersInRoom.map(p => (
                          <div 
                            key={p.id}
                            title={`${p.name}`}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs border border-white/20 shadow"
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

              {/* 플레이어 조작 패널 (이동 완료 후 질문 작성) */}
              {isHumanTurn && gameState.phase === 'PLAYING_SUGGEST' && (
                <div className="mt-2 bg-slate-800/50 border border-amber-500/30 rounded-xl p-4 flex flex-col gap-3">
                  <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4" /> 가설 질문 던지기 (현재 위치: {gameState.rooms.find(r => r.id === currentPlayer.currentRoomId)?.name})
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">용의자</label>
                      <select 
                        value={selectedSuspect} 
                        onChange={e => setSelectedSuspect(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200"
                      >
                        {SUSPECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">도구</label>
                      <select 
                        value={selectedWeapon} 
                        onChange={e => setSelectedWeapon(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200"
                      >
                        {WEAPONS.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">범행 동기</label>
                      <select 
                        value={selectedMotive} 
                        onChange={e => setSelectedMotive(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200"
                      >
                        {MOTIVES.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end mt-2">
                    <button
                      onClick={() => performSuggestion({
                        suspectId: selectedSuspect,
                        locationId: currentPlayer.currentRoomId,
                        weaponId: selectedWeapon,
                        motiveId: selectedMotive,
                      })}
                      className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5"
                    >
                      <span>다른 탐정들에게 질문하기</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* 추리 수첩 (Deduction Sheet) */
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
                  <ScrollText className="w-4 h-4 text-amber-400" />
                  나만의 사건 추리 수첩 (클릭하여 ? / X / O 토글)
                </h2>
                <span className="text-xs text-slate-500">
                  내 손패는 자동으로 X 표시됩니다.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* 용의자 & 장소 */}
                <div className="flex flex-col gap-2">
                  <div className="font-bold text-rose-400 border-b border-slate-800 pb-1">용의자</div>
                  {SUSPECTS.map(s => {
                    const isMyCard = currentPlayer.hand.some(c => c.id === s.id);
                    const mark = isMyCard ? 'NO' : (userNotes[s.id] || 'UNKNOWN');
                    return (
                      <div 
                        key={s.id} 
                        onClick={() => !isMyCard && toggleNote(s.id)}
                        className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                          !isMyCard ? 'cursor-pointer hover:bg-slate-800/50' : 'opacity-80'
                        } border-slate-800 bg-slate-900/40`}
                      >
                        <span className="text-slate-300">{s.name}</span>
                        <span className="font-bold">
                          {mark === 'NO' && <span className="text-rose-500">✕ (배제)</span>}
                          {mark === 'YES' && <span className="text-emerald-400">◯ (정답확신)</span>}
                          {mark === 'UNKNOWN' && <span className="text-slate-600">?</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* 도구 & 동기 */}
                <div className="flex flex-col gap-2">
                  <div className="font-bold text-amber-400 border-b border-slate-800 pb-1">도구</div>
                  {WEAPONS.map(w => {
                    const isMyCard = currentPlayer.hand.some(c => c.id === w.id);
                    const mark = isMyCard ? 'NO' : (userNotes[w.id] || 'UNKNOWN');
                    return (
                      <div 
                        key={w.id} 
                        onClick={() => !isMyCard && toggleNote(w.id)}
                        className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                          !isMyCard ? 'cursor-pointer hover:bg-slate-800/50' : 'opacity-80'
                        } border-slate-800 bg-slate-900/40`}
                      >
                        <span className="text-slate-300">{w.name}</span>
                        <span className="font-bold">
                          {mark === 'NO' && <span className="text-rose-500">✕ (배제)</span>}
                          {mark === 'YES' && <span className="text-emerald-400">◯ (정답확신)</span>}
                          {mark === 'UNKNOWN' && <span className="text-slate-600">?</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 내 비밀 손패 확인 아코디언 */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                {currentPlayer.name}의 비공개 손패 ({currentPlayer.hand.length}장)
              </span>
              <button
                onClick={() => setShowHand(!showHand)}
                className="text-xs text-amber-400 hover:underline"
              >
                {showHand ? '가리기' : '확인하기'}
              </button>
            </div>
            {showHand && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                {currentPlayer.hand.map(card => (
                  <div key={card.id} className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700 text-xs">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">{card.category}</div>
                    <div className="font-bold text-slate-200 mt-0.5">{card.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 우측 1열: 사건 수사 일지 & 탐정 목록 */}
        <div className="flex flex-col gap-4">
          {/* 탐정 현황 */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">탐정 수사관 현황</h3>
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
                    <span className="text-[10px] text-rose-400 font-bold">탈락됨</span>
                  ) : (
                    <span className="text-[11px] text-slate-500">
                      카드 {p.hand.length}장
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 사건 수사 일지 (로그 창) */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3 flex-1 min-h-[300px]">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ScrollText className="w-3.5 h-3.5 text-amber-400" />
              실시간 사건 수사 일지
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
                  <span className="text-[10px] text-slate-500 block">라운드 {log.turn}</span>
                  {log.message}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* 게임 오버 승리/패배 모달 */}
      {gameState.phase === 'GAME_OVER' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full bg-slate-900 border border-amber-500/40 p-6 rounded-3xl text-center flex flex-col items-center gap-4 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-3xl">
              🏆
            </div>
            <h2 className="text-2xl font-black text-slate-100">수사 종료</h2>
            <p className="text-sm text-slate-300">
              {gameState.winnerId 
                ? `${gameState.players.find(p => p.id === gameState.winnerId)?.name}님이 진실을 밝혔습니다!`
                : '범인을 잡지 못하고 사건이 미궁에 빠졌습니다.'}
            </p>
            <div className="bg-slate-800/60 p-4 rounded-xl text-xs text-left w-full flex flex-col gap-1 text-slate-300">
              <div className="font-bold text-amber-400 mb-1">사건의 진실 (Secret Solution)</div>
              <div>• 범인: {SUSPECTS.find(s => s.id === gameState.solution.suspectId)?.name}</div>
              <div>• 장소: {gameState.rooms.find(r => r.id === gameState.solution.locationId)?.name}</div>
              <div>• 도구: {WEAPONS.find(w => w.id === gameState.solution.weaponId)?.name}</div>
              <div>• 동기: {MOTIVES.find(m => m.id === gameState.solution.motiveId)?.name}</div>
            </div>
            <button
              onClick={() => startNewGame()}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors"
            >
              새로운 사건 수사하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
