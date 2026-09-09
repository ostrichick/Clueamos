'use client';

import React, { useMemo } from 'react';
import { 
  BOARD_ROOMS, 
  CENTER_ZONE, 
  generateBoardGrid, 
  calculateReachablePaths, 
  BoardCell 
} from '@/engine/boardGrid';
import { SECRET_PASSAGES, getPlayerDisplayName } from '@/engine/engine';
import { Player } from '@/engine/types';
import { TranslationStrings, SupportedLocale } from '@/i18n/translations';
import { Sparkles, Dices, ArrowRight } from 'lucide-react';

interface GameBoardProps {
  players: Player[];
  currentPlayerIndex: number;
  phase: string;
  currentDiceRoll?: number;
  accessibleRoomIds?: string[];
  isRollingDice: boolean;
  t: TranslationStrings;
  locale: SupportedLocale;
  onRollDice: () => void;
  onMoveToRoom: (roomId: string) => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  players,
  currentPlayerIndex,
  phase,
  currentDiceRoll,
  accessibleRoomIds = [],
  isRollingDice,
  t,
  locale,
  onRollDice,
  onMoveToRoom,
}) => {
  const currentPlayer = players[currentPlayerIndex];
  const isHumanTurn = currentPlayer?.type === 'human';
  const isMovePhase = isHumanTurn && phase === 'PLAYING_MOVE';
  const isRollPhase = isHumanTurn && phase === 'PLAYING_ROLL';

  // Generate grid cells once
  const grid = useMemo(() => generateBoardGrid(), []);

  // Compute BFS pathfinding for the current player's room and dice roll
  const pathResult = useMemo(() => {
    if (!currentPlayer) {
      return { 
        reachableRoomIds: [] as string[], 
        roomDistances: {} as Record<string, number>, 
        reachableTileSteps: new Map<string, number>() 
      };
    }
    const roll = currentDiceRoll || 0;
    return calculateReachablePaths(currentPlayer.currentRoomId, roll);
  }, [currentPlayer, currentDiceRoll]);

  // Extract corridor cells (cells that are not room or center)
  const corridorCells = useMemo(() => {
    const list: BoardCell[] = [];
    grid.forEach(row => {
      row.forEach(cell => {
        if (cell.type === 'corridor') {
          list.push(cell);
        }
      });
    });
    return list;
  }, [grid]);

  // Map of players by current room
  const playersByRoom = useMemo(() => {
    const map: Record<string, Player[]> = {};
    players.forEach(p => {
      if (!p.isEliminated) {
        if (!map[p.currentRoomId]) map[p.currentRoomId] = [];
        map[p.currentRoomId].push(p);
      }
    });
    return map;
  }, [players]);

  // Check if current room has a secret passage
  const currentSecretTarget = currentPlayer ? SECRET_PASSAGES[currentPlayer.currentRoomId] : undefined;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 1. 상단 주사위 굴리기 & 진행 상태 대시보드 */}
      <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
            <Dices className={`w-7 h-7 ${isRollingDice ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-slate-100">
                {isRollPhase ? t.rollDiceBtn : isMovePhase && currentDiceRoll ? `${t.rolledNumber}: ${currentDiceRoll} 🎲` : `${getPlayerDisplayName(currentPlayer, locale)}${t.turn}`}
              </span>
              {currentSecretTarget && (
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/40 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> {t.secretPassageBadge}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isRollPhase
                ? t.adjacentRoomsDesc
                : isMovePhase
                  ? (locale === 'ko' ? '초록색으로 빛나는 방이나 비밀 통로를 클릭하여 입장하세요.' : locale === 'es' ? 'Haz clic en una habitación resaltada en verde o pasaje secreto para entrar.' : 'Click on a green highlighted room or secret passage to enter.')
                  : t.notebookDesc}
            </p>
          </div>
        </div>

        {/* 주사위 굴리기 버튼 */}
        {isRollPhase && (
          <button
            disabled={isRollingDice}
            onClick={onRollDice}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Dices className="w-4 h-4" />
            <span>{isRollingDice ? t.rollingDice : t.rollDiceBtn}</span>
          </button>
        )}
      </div>

      {/* 2. 클래식 Clue 13x13 맨션 보드판 메인 영역 */}
      <div className="bg-[#1a1412] p-3 sm:p-5 rounded-3xl border-4 border-[#3d2b1f] shadow-2xl relative overflow-hidden">
        {/* 원목 보드판 상단 명판 (Brass Plaque) */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-950/60 mb-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <span className="font-serif font-black tracking-widest text-amber-300 uppercase">
              GRAND VELVET HOTEL · MANSION BOARD
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[11px] text-amber-200/60 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-[#cba86e] border border-[#8b6f3d] inline-block" /> {t.legendTiles}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-xs">🚪</span> {t.legendDoors}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-xs">🌀</span> {t.secretPassageBadge}
            </span>
          </div>
        </div>

        {/* 13x13 CSS Grid 컨테이너 */}
        <div 
          className="grid gap-[2px] bg-[#221814] p-2 rounded-2xl border-2 border-[#4a3525] relative aspect-square max-w-[620px] mx-auto select-none"
          style={{
            gridTemplateColumns: 'repeat(13, minmax(0, 1fr))',
            gridTemplateRows: 'repeat(13, minmax(0, 1fr))',
          }}
        >
          {/* A. 50개의 복도 타일들 (Hallway Checkered Squares - 칸) */}
          {corridorCells.map(cell => {
            const key = `${cell.r},${cell.c}`;
            const stepNumber = pathResult.reachableTileSteps.get(key);
            const isReachableTile = isMovePhase && stepNumber !== undefined && stepNumber <= (currentDiceRoll || 0);

            // 체크무늬 색상 교차
            const isAlt = (cell.r + cell.c) % 2 === 0;

            return (
              <div
                key={key}
                style={{
                  gridRowStart: cell.r + 1,
                  gridColumnStart: cell.c + 1,
                }}
                className={`w-full h-full rounded-[3px] flex items-center justify-center text-[10px] font-bold transition-all relative ${
                  isReachableTile
                    ? 'bg-emerald-500/35 border border-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.4)] text-emerald-200 z-10'
                    : isAlt
                      ? 'bg-[#cba86e] border border-[#a2824b] text-[#523d1d]'
                      : 'bg-[#bc9961] border border-[#8e6e37] text-[#423117]'
                }`}
              >
                {/* 돋보이는 걸음 수 및 발자국 */}
                {isReachableTile ? (
                  <span className="font-mono text-[11px] font-black drop-shadow animate-pulse">
                    {stepNumber}
                  </span>
                ) : (
                  <span className="opacity-15 text-[8px]">•</span>
                )}
              </div>
            );
          })}

          {/* B. 중앙 기밀 사건 봉투 구역 (Center Case File - Rows 6..8, Cols 6..8) */}
          <div
            style={{
              gridRowStart: CENTER_ZONE.rowRange[0] + 1,
              gridRowEnd: CENTER_ZONE.rowRange[1] + 2,
              gridColumnStart: CENTER_ZONE.colRange[0] + 1,
              gridColumnEnd: CENTER_ZONE.colRange[1] + 2,
            }}
            className="bg-gradient-to-br from-amber-900/60 via-stone-900/90 to-amber-950/80 rounded-xl border-2 border-amber-600/40 p-2 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
            <div className="w-8 h-8 rounded-full bg-rose-700/80 border border-amber-400/50 flex items-center justify-center text-xs shadow-md mb-1">
              ✉️
            </div>
            <div className="font-serif font-black text-[10px] sm:text-xs tracking-wider text-amber-300 uppercase leading-tight">
              CLUEAMOS
            </div>
            <div className="text-[8px] sm:text-[9px] text-amber-200/70 font-mono tracking-tighter">
              {t.confidentialCaseFile}
            </div>
          </div>

          {/* C. 6개 방 구역들 (Continuous Illustrated Rooms with Walls & Doors) */}
          {Object.values(BOARD_ROOMS).map(roomConfig => {
            const roomId = roomConfig.id;
            const isCurrent = currentPlayer?.currentRoomId === roomId;
            const isAccessible = isMovePhase && (accessibleRoomIds.includes(roomId) || pathResult.reachableRoomIds.includes(roomId));
            const distance = pathResult.roomDistances[roomId];
            const isSecret = currentSecretTarget === roomId;
            const roomPlayers = playersByRoom[roomId] || [];

            return (
              <div
                key={roomId}
                onClick={() => {
                  if (isAccessible) {
                    onMoveToRoom(roomId);
                  }
                }}
                style={{
                  gridRowStart: roomConfig.rowRange[0] + 1,
                  gridRowEnd: roomConfig.rowRange[1] + 2,
                  gridColumnStart: roomConfig.colRange[0] + 1,
                  gridColumnEnd: roomConfig.colRange[1] + 2,
                }}
                className={`rounded-2xl border-2 p-2 sm:p-3 flex flex-col justify-between transition-all relative overflow-hidden ${
                  roomConfig.theme.bgColor
                } ${roomConfig.theme.borderColor} ${
                  isCurrent
                    ? 'ring-4 ring-amber-400 shadow-2xl shadow-amber-500/30 border-amber-400'
                    : isAccessible
                      ? 'ring-4 ring-emerald-400/90 shadow-[0_0_20px_rgba(52,211,153,0.4)] border-emerald-400 cursor-pointer hover:scale-[1.01] z-20 animate-pulse'
                      : 'opacity-85'
                }`}
              >
                {/* 상단: 방 타이틀 명판 & 거리 배지 */}
                <div className="flex items-start justify-between gap-1 z-10">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base sm:text-lg">{roomConfig.theme.icon}</span>
                    <div>
                      <div className={`font-serif font-black text-xs sm:text-sm leading-tight ${roomConfig.theme.textColor}`}>
                        {t.cards[roomId]?.name || roomConfig.nameKey}
                      </div>
                      <div className="text-[9px] text-slate-400/80 hidden sm:block truncate max-w-[120px]">
                        {t.cards[roomId]?.description}
                      </div>
                    </div>
                  </div>

                  {/* 상태 배지: 현재 위치 / 비밀 통로 / 필요 걸음 수 */}
                  {isCurrent ? (
                    <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded shadow">
                      {locale === 'ko' ? '현재 위치' : locale === 'es' ? 'Aquí' : 'YOU'}
                    </span>
                  ) : isSecret ? (
                    <span className="text-[9px] bg-purple-600 text-purple-100 font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" /> 🌀 {t.secretPassageBadge}
                    </span>
                  ) : distance !== undefined ? (
                    <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded border ${
                      isAccessible
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700'
                    }`}>
                      {distance} {t.distanceSteps}
                    </span>
                  ) : null}
                </div>

                {/* 중앙: 이동 가능 시 "클릭하여 입장" 인터랙티브 오버레이 */}
                {isAccessible && !isCurrent && (
                  <div className="my-auto py-1 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] sm:text-xs text-center shadow-lg transition-colors flex items-center justify-center gap-1 z-20">
                    <span>{t.clickToEnter}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                )}

                {/* 하단: 방에 위치한 탐정 말(Pawn / Token)들 & 비밀통로 트랩도어 표시 */}
                <div className="flex items-end justify-between pt-1 z-10">
                  {/* 탐정 미플/말들 */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {roomPlayers.map(p => (
                      <div
                        key={p.id}
                        title={getPlayerDisplayName(p, locale)}
                        style={{ backgroundColor: p.color }}
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs shadow-md border-2 border-white/40 ring-1 ring-black/40 transform hover:scale-110 transition-transform"
                      >
                        {p.avatar}
                      </div>
                    ))}
                  </div>

                  {/* 방 고유 비밀 통로 해치 아이콘 */}
                  {roomConfig.secretPassage && (
                    <div 
                      title={`${t.secretPassageTo} ${t.cards[roomConfig.secretPassage.targetRoomId]?.name}`}
                      className="text-[10px] text-purple-300/80 bg-purple-950/60 border border-purple-800/50 rounded px-1 py-0.5 flex items-center gap-1"
                    >
                      <span className="text-xs">🌀</span>
                      <span className="hidden sm:inline font-mono text-[9px]">Passage</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 하단 안내 캡션 */}
        <div className="text-center pt-3 text-[11px] text-amber-200/50 font-sans">
          {locale === 'ko' 
            ? '💡 주사위를 굴리면 복도 타일에 걸음 수가 표시되며, 도달 가능한 방이 환하게 밝혀집니다.'
            : locale === 'es'
              ? '💡 Al lanzar el dado, se muestran los pasos en las casillas y se iluminan las habitaciones alcanzables.'
              : '💡 Rolling the die illuminates the reachable hallway steps and highlights accessible rooms.'}
        </div>
      </div>
    </div>
  );
};
