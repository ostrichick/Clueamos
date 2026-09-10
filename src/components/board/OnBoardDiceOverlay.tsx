'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { TranslationStrings } from '@/i18n/translations';

interface OnBoardDiceOverlayProps {
  isRolling: boolean;
  rolledValue?: number;
  diceRolls?: [number, number];
  currentRollerName: string;
  isAITurn: boolean;
  t: TranslationStrings;
  onManualRoll?: () => void;
  canRollManually?: boolean;
}

// 6면체 주사위 눈금(Pips) 레이아웃 렌더러
const DiceFace: React.FC<{ value: number; size?: number }> = ({ value, size = 64 }) => {
  const pipPositions: Record<number, number[][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[28, 22], [72, 22], [28, 50], [72, 50], [28, 78], [72, 78]],
  };

  const clampedVal = Math.min(6, Math.max(1, value));
  const pips = pipPositions[clampedVal] || pipPositions[1];

  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className="relative bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200 rounded-2xl shadow-2xl border-2 border-amber-300 flex items-center justify-center select-none"
    >
      {/* 3D 주사위 광택 효과 */}
      <div className="absolute top-1 left-1.5 right-1.5 h-1/3 bg-white/60 rounded-t-xl pointer-events-none" />
      
      {/* 눈금들 (Pips) */}
      {pips.map(([x, y], idx) => (
        <span
          key={idx}
          style={{
            top: `${y}%`,
            left: `${x}%`,
            transform: 'translate(-50%, -50%)',
          }}
          className={`absolute rounded-full shadow-inner ${
            clampedVal === 1
              ? 'w-3.5 h-3.5 sm:w-4 sm:h-4 bg-rose-600 shadow-rose-900/60'
              : 'w-2.5 h-2.5 sm:w-3 sm:h-3 bg-slate-900 shadow-slate-950/80'
          }`}
        />
      ))}
    </div>
  );
};

export const OnBoardDiceOverlay: React.FC<OnBoardDiceOverlayProps> = ({
  isRolling,
  rolledValue,
  diceRolls,
  currentRollerName,
  isAITurn,
  t,
  onManualRoll,
  canRollManually = false,
}) => {
  const [rollingValues, setRollingValues] = useState<[number, number]>([1, 1]);
  const [showResultBanner, setShowResultBanner] = useState<boolean>(false);
  const [rollingRotation1, setRollingRotation1] = useState<{ x: number; y: number; z: number }>({
    x: 0,
    y: 0,
    z: 0,
  });
  const [rollingRotation2, setRollingRotation2] = useState<{ x: number; y: number; z: number }>({
    x: 0,
    y: 0,
    z: 0,
  });

  // 주사위 2개를 굴리는 동안 독립적인 면 회전 및 난수 사이클링
  useEffect(() => {
    if (isRolling) {
      const interval = setInterval(() => {
        setRollingValues([
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1,
        ]);
        setRollingRotation1({
          x: Math.floor(Math.random() * 360),
          y: Math.floor(Math.random() * 360),
          z: Math.floor(Math.random() * 360),
        });
        setRollingRotation2({
          x: Math.floor(Math.random() * 360),
          y: Math.floor(Math.random() * 360),
          z: Math.floor(Math.random() * 360),
        });
      }, 70);
      return () => clearInterval(interval);
    } else if (rolledValue) {
      const startTimer = setTimeout(() => {
        setShowResultBanner(true);
      }, 10);
      const endTimer = setTimeout(() => {
        setShowResultBanner(false);
      }, 1600);
      return () => {
        clearTimeout(startTimer);
        clearTimeout(endTimer);
      };
    }
  }, [isRolling, rolledValue]);

  // 확정된 2개 주사위 눈금 계산 (diceRolls 우선, 없으면 rolledValue 분할)
  const resolvedRolls: [number, number] = diceRolls 
    ? diceRolls 
    : rolledValue 
      ? [Math.max(1, Math.min(6, Math.ceil(rolledValue / 2))), Math.max(1, Math.min(6, Math.floor(rolledValue / 2)))]
      : [1, 1];

  const displayDie1 = isRolling ? rollingValues[0] : resolvedRolls[0];
  const displayDie2 = isRolling ? rollingValues[1] : resolvedRolls[1];
  const totalSum = isRolling ? (displayDie1 + displayDie2) : (rolledValue ?? (resolvedRolls[0] + resolvedRolls[1]));

  const tumble1 = isRolling ? rollingRotation1 : { x: 0, y: 0, z: 0 };
  const tumble2 = isRolling ? rollingRotation2 : { x: 0, y: 0, z: 0 };

  // 아무 동작도 없고 결과도 표시할 필요가 없으면 렌더링 생략
  if (!isRolling && !showResultBanner) {
    if (!canRollManually) return null;

    // 수동으로 주사위를 굴릴 수 있는 상태일 때 보드판 중앙에 2개 주사위 힌트 제공
    return (
      <div 
        onClick={onManualRoll}
        className="absolute inset-0 flex items-center justify-center z-25 pointer-events-none"
      >
        <div className="pointer-events-auto cursor-pointer p-2.5 rounded-2xl bg-amber-500/25 hover:bg-amber-500/35 border-2 border-amber-400/50 backdrop-blur-xs transition-all hover:scale-105 active:scale-95 shadow-2xl group">
          <div className="flex items-center gap-2.5 px-3 py-1.5">
            <div className="flex items-center text-xl animate-bounce gap-0.5">
              <span>🎲</span>
              <span className="-ml-1">🎲</span>
            </div>
            <span className="text-xs font-black text-amber-300 tracking-wide font-sans group-hover:text-amber-100">
              {t.rollDiceBtn}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none">
      {/* 어두운 배경 조명 효과 */}
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] rounded-2xl transition-opacity duration-300" />

      <div className="relative flex flex-col items-center justify-center gap-3.5 transform transition-all">
        {/* 상단 롤러 알림 배너 */}
        <div className="px-4 py-1.5 rounded-full bg-slate-900/90 border border-amber-400/60 shadow-2xl flex items-center gap-2 text-xs font-bold text-amber-200 animate-fadeIn">
          {isAITurn ? (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>🤖 {currentRollerName}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>🎲 {currentRollerName}</span>
            </span>
          )}
          <span className="text-slate-400 text-[11px]">
            {isRolling ? t.rollingDice : `${t.rolledResultOnBoard}:`}
          </span>
        </div>

        {/* 3D 굴러가는 2개 주사위 본체 및 바닥 그림자 */}
        <div className="relative flex items-center justify-center gap-3 sm:gap-4 my-2">
          {/* 바닥 충격파 및 그림자 (주사위 2개용 확장형) */}
          <div
            className={`absolute -bottom-4 w-44 h-7 bg-black/60 rounded-full blur-md transition-all ${
              isRolling ? 'scale-75 opacity-40 animate-pulse' : 'scale-110 opacity-90'
            }`}
          />

          {/* 착지 충격파 링 (Landing Shockwave Ring) */}
          {!isRolling && showResultBanner && (
            <div className="absolute w-44 h-28 rounded-full border-4 border-amber-400/80 animate-ping pointer-events-none" />
          )}

          {/* 주사위 1 */}
          <div
            style={{
              transform: isRolling
                ? `rotateX(${tumble1.x}deg) rotateY(${tumble1.y}deg) rotateZ(${tumble1.z}deg) scale(1.05)`
                : 'rotate(0deg) scale(1.15)',
              transition: isRolling ? 'transform 0.07s linear' : 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
            className="filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
          >
            <DiceFace value={displayDie1} size={64} />
          </div>

          {/* 중간 연산자 '+' 기호 */}
          <div className="text-amber-400 font-black text-2xl sm:text-3xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] animate-pulse">
            +
          </div>

          {/* 주사위 2 */}
          <div
            style={{
              transform: isRolling
                ? `rotateX(${tumble2.x}deg) rotateY(${tumble2.y}deg) rotateZ(${tumble2.z}deg) scale(1.05)`
                : 'rotate(0deg) scale(1.15)',
              transition: isRolling ? 'transform 0.07s linear' : 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
            className="filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
          >
            <DiceFace value={displayDie2} size={64} />
          </div>
        </div>

        {/* 결과 배너 (눈금 확정 시 [d1 + d2 = 합계] 강조) */}
        {!isRolling && showResultBanner && (
          <div className="px-5 py-2 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 font-black text-sm sm:text-base shadow-2xl flex items-center gap-2 animate-bounce">
            <Sparkles className="w-4 h-4 text-slate-950 animate-spin" />
            <span className="font-mono text-base sm:text-lg">
              {displayDie1} + {displayDie2} = {totalSum}
            </span>
            <span className="text-xs font-bold opacity-90 font-mono">
              ({totalSum} {t.distanceSteps || 'steps'})
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
