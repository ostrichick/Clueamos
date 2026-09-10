'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { TranslationStrings } from '@/i18n/translations';

interface OnBoardDiceOverlayProps {
  isRolling: boolean;
  rolledValue?: number;
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

  const pips = pipPositions[value] || pipPositions[1];

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
            value === 1
              ? 'w-4 h-4 bg-rose-600 shadow-rose-900/60'
              : 'w-3 h-3 bg-slate-900 shadow-slate-950/80'
          }`}
        />
      ))}
    </div>
  );
};

export const OnBoardDiceOverlay: React.FC<OnBoardDiceOverlayProps> = ({
  isRolling,
  rolledValue,
  currentRollerName,
  isAITurn,
  t,
  onManualRoll,
  canRollManually = false,
}) => {
  const [rollingValue, setRollingValue] = useState<number>(1);
  const [showResultBanner, setShowResultBanner] = useState<boolean>(false);
  const [rollingRotation, setRollingRotation] = useState<{ x: number; y: number; z: number }>({
    x: 0,
    y: 0,
    z: 0,
  });

  // 주사위 굴리는 동안 빠른 면 회전 및 난수 사이클링
  useEffect(() => {
    if (isRolling) {
      const interval = setInterval(() => {
        setRollingValue(Math.floor(Math.random() * 6) + 1);
        setRollingRotation({
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
      }, 1400);
      return () => {
        clearTimeout(startTimer);
        clearTimeout(endTimer);
      };
    }
  }, [isRolling, rolledValue]);

  const displayValue = isRolling ? rollingValue : (rolledValue || 1);
  const tumbleRotation = isRolling ? rollingRotation : { x: 0, y: 0, z: 0 };

  // 아무 동작도 없고 결과도 표시할 필요가 없으면 렌더링 생략
  if (!isRolling && !showResultBanner) {
    if (!canRollManually) return null;

    // 수동으로 주사위를 굴릴 수 있는 상태일 때 보드판 중앙에 은은한 힌트 제공
    return (
      <div 
        onClick={onManualRoll}
        className="absolute inset-0 flex items-center justify-center z-25 pointer-events-none"
      >
        <div className="pointer-events-auto cursor-pointer p-2 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 backdrop-blur-xs transition-all hover:scale-105 active:scale-95 shadow-xl group">
          <div className="flex items-center gap-2 px-3 py-1.5">
            <span className="text-xl animate-bounce">🎲</span>
            <span className="text-xs font-black text-amber-300 tracking-wide font-sans group-hover:text-amber-200">
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
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] rounded-2xl transition-opacity duration-300" />

      <div className="relative flex flex-col items-center justify-center gap-3 transform transition-all">
        {/* 상단 롤러 알림 배너 */}
        <div className="px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-amber-400/60 shadow-2xl flex items-center gap-2 text-xs font-bold text-amber-200 animate-fadeIn">
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

        {/* 3D 굴러가는 주사위 본체 및 바닥 그림자 */}
        <div className="relative flex items-center justify-center my-2">
          {/* 바닥 충격파 및 그림자 */}
          <div
            className={`absolute -bottom-4 w-20 h-6 bg-black/60 rounded-full blur-md transition-all ${
              isRolling ? 'scale-75 opacity-40 animate-pulse' : 'scale-110 opacity-90'
            }`}
          />

          {/* 착지 충격파 링 (Landing Shockwave Ring) */}
          {!isRolling && showResultBanner && (
            <div className="absolute w-28 h-28 rounded-full border-4 border-amber-400/80 animate-ping pointer-events-none" />
          )}

          {/* 주사위 면 (Tumbling or Slam Landing) */}
          <div
            style={{
              transform: isRolling
                ? `rotateX(${tumbleRotation.x}deg) rotateY(${tumbleRotation.y}deg) rotateZ(${tumbleRotation.z}deg) scale(1.15)`
                : 'rotate(0deg) scale(1.25)',
              transition: isRolling ? 'transform 0.07s linear' : 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
            className="filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
          >
            <DiceFace value={displayValue} size={72} />
          </div>
        </div>

        {/* 결과 배너 (눈금 확정 시 강조) */}
        {!isRolling && showResultBanner && (
          <div className="px-4 py-1.5 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 font-black text-sm sm:text-base shadow-2xl flex items-center gap-1.5 animate-bounce">
            <Sparkles className="w-4 h-4 text-slate-950 animate-spin" />
            <span>{displayValue}</span>
            <span className="text-xs font-bold opacity-90 font-mono">
              ({displayValue}{t.distanceSteps || ' steps'})
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
