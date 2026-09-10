'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  BOARD_ROOMS, 
  CENTER_ZONE, 
  generateBoardGrid, 
  calculateReachablePaths, 
  findShortestCorridorPath,
  BoardCell 
} from '@/engine/boardGrid';
import { SECRET_PASSAGES, getPlayerDisplayName } from '@/engine/engine';
import { Player } from '@/engine/types';
import { TranslationStrings, SupportedLocale } from '@/i18n/translations';
import { Sparkles, Dices, ArrowRight, X, ShieldAlert } from 'lucide-react';
import { sounds } from '@/utils/sounds';
import { haptics } from '@/utils/haptics';
import { OnBoardDiceOverlay } from './OnBoardDiceOverlay';

const WEAPON_ICONS: Record<string, string> = {
  weapon_candlestick: '🕯️',
  weapon_knife: '🔪',
  weapon_revolver: '🔫',
  weapon_rope: '🪢',
  weapon_pipe: '🚰',
  weapon_wrench: '🔧',
};

interface GameBoardProps {
  players: Player[];
  currentPlayerIndex: number;
  phase: string;
  currentDiceRoll?: number;
  accessibleRoomIds?: string[];
  isRollingDice: boolean;
  roomWeapons?: Record<string, string[]>;
  t: TranslationStrings;
  locale: SupportedLocale;
  isMyTurn?: boolean;
  onRollDice: () => void;
  onMoveToRoom: (roomId: string) => void;
  onWaitInHallway?: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  players,
  currentPlayerIndex,
  phase,
  currentDiceRoll,
  accessibleRoomIds = [],
  isRollingDice,
  roomWeapons = {},
  t,
  locale,
  isMyTurn = true,
  onRollDice,
  onMoveToRoom,
  onWaitInHallway,
}) => {
  const currentPlayer = players[currentPlayerIndex];
  const isHumanTurn = currentPlayer?.type === 'human';
  const isMovePhase = isMyTurn && isHumanTurn && phase === 'PLAYING_MOVE';
  const isRollPhase = isMyTurn && isHumanTurn && phase === 'PLAYING_ROLL';

  const [walkingState, setWalkingState] = useState<{
    playerId: string;
    path: Array<{ r: number; c: number }>;
    stepIndex: number;
  } | null>(null);

  // Footstep hover path preview
  const [previewTargetRoomId, setPreviewTargetRoomId] = useState<string | null>(null);

  // Center Confidential Case File Inspection Modal
  const [showCaseFileModal, setShowCaseFileModal] = useState(false);

  // Touch swipe detection for dice roll
  const touchStartY = useRef<number | null>(null);

  // DeviceMotion shake detection on mobile
  useEffect(() => {
    if (!isRollPhase) return;

    let lastX: number | null = null;
    let lastY: number | null = null;
    let lastZ: number | null = null;
    let lastTime = 0;

    const handleDeviceMotion = (event: DeviceMotionEvent) => {
      const current = event.accelerationIncludingGravity;
      if (!current || current.x === null || current.y === null || current.z === null) return;

      const now = Date.now();
      if (now - lastTime > 280) {
        if (lastX !== null && lastY !== null && lastZ !== null) {
          const deltaX = Math.abs(current.x - lastX);
          const deltaY = Math.abs(current.y - lastY);
          const deltaZ = Math.abs(current.z - lastZ);
          const speed = deltaX + deltaY + deltaZ;

          if (speed > 16) {
            haptics.shakeTrigger();
            sounds.playDice();
            onRollDice();
          }
        }
        lastX = current.x;
        lastY = current.y;
        lastZ = current.z;
        lastTime = now;
      }
    };

    window.addEventListener('devicemotion', handleDeviceMotion);
    return () => window.removeEventListener('devicemotion', handleDeviceMotion);
  }, [isRollPhase, onRollDice]);

  const handleRoomClick = (targetRoomId: string) => {
    if (!currentPlayer || walkingState) return;

    // Check if secret passage
    if (SECRET_PASSAGES[currentPlayer.currentRoomId] === targetRoomId) {
      sounds.playSecretPassage();
      onMoveToRoom(targetRoomId);
      return;
    }

    // Corridor path walk
    const path = findShortestCorridorPath(currentPlayer.currentRoomId, targetRoomId);
    if (path.length > 0) {
      setWalkingState({
        playerId: currentPlayer.id,
        path,
        stepIndex: 0,
      });

      let currentStep = 0;
      sounds.playPawnStep();

      const stepInterval = setInterval(() => {
        currentStep++;
        if (currentStep < path.length) {
          sounds.playPawnStep();
          setWalkingState({
            playerId: currentPlayer.id,
            path,
            stepIndex: currentStep,
          });
        } else {
          clearInterval(stepInterval);
          setWalkingState(null);
          onMoveToRoom(targetRoomId);
        }
      }, 70);
    } else {
      onMoveToRoom(targetRoomId);
    }
  };

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

  // Footstep preview path calculation
  const previewPath = useMemo(() => {
    if (!isMovePhase || !previewTargetRoomId || !currentPlayer) return [];
    if (previewTargetRoomId === currentPlayer.currentRoomId) return [];
    return findShortestCorridorPath(currentPlayer.currentRoomId, previewTargetRoomId);
  }, [isMovePhase, previewTargetRoomId, currentPlayer]);

  const previewPathStepMap = useMemo(() => {
    const map = new Map<string, number>();
    previewPath.forEach((pt, idx) => {
      map.set(`${pt.r},${pt.c}`, idx + 1);
    });
    return map;
  }, [previewPath]);

  // Extract corridor cells
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

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isRollPhase || isRollingDice) return;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isRollPhase || isRollingDice || touchStartY.current === null) return;
    const endY = e.changedTouches[0].clientY;
    if (touchStartY.current - endY > 35) {
      // Swiped up!
      sounds.playDice();
      onRollDice();
    }
    touchStartY.current = null;
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 1. 상단 주사위 굴리기 & 진행 상태 대시보드 */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl backdrop-blur-md relative overflow-hidden"
      >
        <div className="flex items-center gap-3.5">
          <div 
            onClick={() => {
              if (isRollPhase && !isRollingDice) onRollDice();
            }}
            className={`w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 cursor-pointer ${
              isRollPhase ? 'ring-2 ring-amber-400 animate-pulse hover:scale-105 transition-transform' : ''
            }`}
          >
            <Dices className={`w-7 h-7 ${isRollingDice ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-slate-100">
                {isRollPhase 
                  ? t.rollDiceBtn 
                  : isMovePhase && currentDiceRoll 
                    ? `${t.rolledNumber}: ${currentDiceRoll} 🎲` 
                    : `${getPlayerDisplayName(currentPlayer, locale)}${t.turn}`}
              </span>
              {currentSecretTarget && (
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/40 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> {t.secretPassageBadge}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {!isHumanTurn
                ? (phase === 'PLAYING_ROLL' 
                    ? `🤖 ${getPlayerDisplayName(currentPlayer, locale)}: ${t.aiRolling}` 
                    : phase === 'PLAYING_MOVE' 
                      ? `🤖 ${getPlayerDisplayName(currentPlayer, locale)}: ${t.aiMoving}` 
                      : `🤖 ${getPlayerDisplayName(currentPlayer, locale)}: ${t.aiSuggesting}`)
                : !isMyTurn && isHumanTurn
                  ? `${getPlayerDisplayName(currentPlayer, locale)} ${t.waitingForOtherPlayer}`
                  : isRollPhase
                    ? t.shakeToRoll
                    : isMovePhase
                      ? (locale === 'ko' ? '도달 가능한 방이나 비밀 통로를 클릭하여 입장하세요. (마우스/터치 시 발자국 경로 미리보기)' : locale === 'es' ? 'Haz clic en una habitación alcanzable o pasaje secreto. (Pasa el cursor para ver las huellas)' : 'Click an accessible room or secret passage. Hover to preview footsteps route.')
                      : t.notebookDesc}
            </p>
          </div>
        </div>

        {/* 주사위 굴리기 및 이동 단계 액션 버튼들 */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
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

          {isMovePhase && onWaitInHallway && (
            <button
              onClick={onWaitInHallway}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs shadow transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <span>🚶</span>
              <span>{t.waitInHallway}</span>
            </button>
          )}
        </div>
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
            <span className="flex items-center gap-1">
              <span className="text-xs">🕯️</span> {t.weaponsHeader.split(' ')[0]}
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
          {/* A. 50개의 복도 타일들 (Hallway Checkered Squares) */}
          {corridorCells.map(cell => {
            const key = `${cell.r},${cell.c}`;
            const stepNumber = pathResult.reachableTileSteps.get(key);
            const isReachableTile = isMovePhase && stepNumber !== undefined && stepNumber <= (currentDiceRoll || 0);

            // Footstep route preview
            const previewStep = previewPathStepMap.get(key);

            // 체크무늬 색상 교차
            const isAlt = (cell.r + cell.c) % 2 === 0;

            // 현재 보행 중인 말이 이 칸 위에 있는지 체크
            const isWalkingHere = walkingState && walkingState.path[walkingState.stepIndex]?.r === cell.r && walkingState.path[walkingState.stepIndex]?.c === cell.c;
            const walkingPlayer = isWalkingHere ? players.find(p => p.id === walkingState.playerId) : null;

            return (
              <div
                key={key}
                style={{
                  gridRowStart: cell.r + 1,
                  gridColumnStart: cell.c + 1,
                }}
                className={`w-full h-full rounded-[3px] flex items-center justify-center text-[10px] font-bold transition-all relative ${
                  isWalkingHere
                    ? 'bg-amber-400/40 border-2 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)] z-30'
                    : previewStep !== undefined
                      ? 'bg-amber-400/50 border border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.7)] text-amber-950 z-20 animate-pulse'
                      : isReachableTile
                        ? 'bg-emerald-500/35 border border-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.4)] text-emerald-200 z-10'
                        : isAlt
                          ? 'bg-[#cba86e] border border-[#a2824b] text-[#523d1d]'
                          : 'bg-[#bc9961] border border-[#8e6e37] text-[#423117]'
                }`}
              >
                {walkingPlayer ? (
                  <div className="z-30 transform animate-bounce filter drop-shadow scale-125">
                    <span className="text-sm">{walkingPlayer.avatar}</span>
                  </div>
                ) : previewStep !== undefined ? (
                  <span className="font-mono text-[10px] font-black drop-shadow text-amber-950">
                    👣{previewStep}
                  </span>
                ) : isReachableTile ? (
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
            onClick={() => {
              sounds.playWaxSealBreak();
              setShowCaseFileModal(true);
            }}
            style={{
              gridRowStart: CENTER_ZONE.rowRange[0] + 1,
              gridRowEnd: CENTER_ZONE.rowRange[1] + 2,
              gridColumnStart: CENTER_ZONE.colRange[0] + 1,
              gridColumnEnd: CENTER_ZONE.colRange[1] + 2,
            }}
            title={t.caseFileTitle}
            className="bg-gradient-to-br from-amber-950 via-stone-900 to-amber-900 rounded-xl border-2 border-amber-600/50 p-2 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden group cursor-pointer hover:border-amber-400 transition-all hover:scale-[1.02] z-20"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent pointer-events-none" />
            
            {/* 붉은 밀랍 인장 (Wax Seal) */}
            <div className="w-8 h-8 rounded-full bg-rose-700 border-2 border-amber-400/80 flex items-center justify-center text-xs shadow-lg mb-1 group-hover:scale-110 transition-transform">
              <span className="drop-shadow">✉️</span>
            </div>
            
            <div className="font-serif font-black text-[10px] sm:text-xs tracking-wider text-amber-300 uppercase leading-tight">
              CLUEAMOS
            </div>
            <div className="text-[7px] sm:text-[8px] text-amber-200/80 font-mono tracking-tighter">
              CASE FILE
            </div>
          </div>

          {/* C. 6개 방 구역들 (Continuous Illustrated Rooms with Walls & Doors) */}
          {Object.entries(BOARD_ROOMS).map(([roomId, roomConfig]) => {
            const isAccessible = isMovePhase && (pathResult.reachableRoomIds.includes(roomId) || accessibleRoomIds.includes(roomId));
            const isCurrent = currentPlayer?.currentRoomId === roomId;
            const distance = pathResult.roomDistances[roomId];
            const isSecret = currentSecretTarget === roomId;
            const roomPlayers = (playersByRoom[roomId] || []).filter(p => p.id !== walkingState?.playerId);
            const weaponsInThisRoom = roomWeapons[roomId] || [];

            return (
              <div
                key={roomId}
                onMouseEnter={() => {
                  if (isAccessible && !isCurrent) setPreviewTargetRoomId(roomId);
                }}
                onMouseLeave={() => setPreviewTargetRoomId(null)}
                onClick={() => {
                  if (isAccessible && !isCurrent) {
                    handleRoomClick(roomId);
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

                {/* 하단: 방에 위치한 탐정 말(Pawn) & 살인 도구 미니어처 토큰 & 비밀통로 트랩도어 */}
                <div className="flex items-end justify-between pt-1 z-10 gap-1 flex-wrap">
                  {/* 탐정 미플 & 도구 미니어처 그룹 */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {/* 탐정 미플들 */}
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

                    {/* 살인 도구 미니어처 토큰 (Weapon Miniatures) */}
                    {weaponsInThisRoom.map(wId => (
                      <div
                        key={wId}
                        title={t.cards[wId]?.name || wId}
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-950/80 border border-amber-500/70 shadow-md flex items-center justify-center text-xs sm:text-sm transform hover:scale-125 transition-transform animate-in zoom-in-75 duration-300"
                      >
                        {WEAPON_ICONS[wId] || '🗡️'}
                      </div>
                    ))}
                  </div>

                  {/* 방 고유 비밀 통로 해치 버튼 (원터치 이동) */}
                  {roomConfig.secretPassage && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRoomClick(roomConfig.secretPassage!.targetRoomId);
                      }}
                      title={`${t.secretPassageTo} ${t.cards[roomConfig.secretPassage.targetRoomId]?.name || roomConfig.secretPassage.targetRoomId}`}
                      className={`text-[10px] rounded px-1.5 py-0.5 flex items-center gap-1 transition-all ${
                        isCurrent && isMovePhase
                          ? 'bg-purple-600 hover:bg-purple-500 text-purple-100 border border-purple-400 font-bold shadow-lg animate-bounce cursor-pointer'
                          : 'text-purple-300/80 bg-purple-950/60 border border-purple-800/50'
                      }`}
                    >
                      <span className="text-xs">🌀</span>
                      <span className="font-mono text-[9px]">
                        {isCurrent ? `${t.secretPassageBadge}` : 'Passage'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* D. 보드판 중앙 3D 입체 주사위 시각화 오버레이 */}
          <OnBoardDiceOverlay
            isRolling={isRollingDice}
            rolledValue={currentDiceRoll}
            currentRollerName={currentPlayer ? getPlayerDisplayName(currentPlayer, locale) : 'Detective'}
            isAITurn={!isHumanTurn}
            t={t}
            canRollManually={isRollPhase && !isRollingDice}
            onManualRoll={onRollDice}
          />
        </div>

        {/* 하단 안내 캡션 */}
        <div className="text-center pt-3 text-[11px] text-amber-200/50 font-sans">
          {locale === 'ko' 
            ? '💡 주사위를 굴리면 복도 타일에 걸음 수가 표시되며, 방에 마우스를 올리면 발자국 경로가 안내됩니다.'
            : locale === 'es'
              ? '💡 Al lanzar el dado, se muestran los pasos en las casillas y las huellas guían el camino.'
              : '💡 Rolling the die illuminates reachable hallway steps and preview footsteps route.'}
        </div>
      </div>

      {/* 비밀 사건 봉투 검사 모달 (Confidential Case File Wax Seal Modal) */}
      {showCaseFileModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-stone-900 via-stone-950 to-amber-950/90 border-2 border-amber-600/60 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowCaseFileModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 대형 밀랍 인장 (Crimson Wax Seal) */}
            <div className="w-16 h-16 rounded-full bg-rose-700 border-4 border-amber-400/90 shadow-2xl flex items-center justify-center text-3xl mb-4">
              ✉️
            </div>

            <h3 className="font-serif font-black text-lg sm:text-xl text-amber-300 mb-2">
              {t.caseFileTitle}
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
              {t.caseFileDesc}
            </p>

            <div className="bg-rose-950/50 border border-rose-800/60 rounded-xl p-3 flex items-center gap-2.5 text-xs text-rose-300 font-bold mb-6">
              <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <span>{t.caseFileSealWarning}</span>
            </div>

            <button
              onClick={() => setShowCaseFileModal(false)}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg transition-all"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
