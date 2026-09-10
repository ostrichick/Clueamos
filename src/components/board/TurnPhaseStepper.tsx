'use client';

import React from 'react';
import { Dices, Footprints, Search, Hourglass } from 'lucide-react';
import { TranslationStrings } from '@/i18n/translations';

interface TurnPhaseStepperProps {
  phase: string;
  isMyTurn: boolean;
  t: TranslationStrings;
  activePlayerName?: string;
  isAITurn?: boolean;
  className?: string;
}

export const TurnPhaseStepper: React.FC<TurnPhaseStepperProps> = ({
  phase,
  isMyTurn,
  t,
  activePlayerName,
  isAITurn = false,
  className = '',
}) => {
  // Determine current active step index (1, 2, or 3)
  let currentStep = 1;
  if (phase === 'PLAYING_ROLL') currentStep = 1;
  else if (phase === 'PLAYING_MOVE') currentStep = 2;
  else if (phase === 'PLAYING_SUGGEST' || phase === 'WAITING_DISPROVE') currentStep = 3;

  const steps = [
    { num: 1, label: t.stepRollDice, icon: Dices },
    { num: 2, label: t.stepMoveRoom, icon: Footprints },
    { num: 3, label: t.stepSuggest, icon: Search },
  ];

  return (
    <div
      className={`bg-slate-900/80 border border-amber-500/20 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-md shadow-lg flex items-center justify-between gap-2 select-none ${className}`}
    >
      <div className="flex items-center gap-1.5 sm:gap-2">
        {isAITurn ? (
          <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-[11px] sm:text-xs text-cyan-200 truncate max-w-[200px] sm:max-w-none">
              🤖 {activePlayerName}: {phase === 'PLAYING_ROLL' ? t.aiRolling : phase === 'PLAYING_MOVE' ? t.aiMoving : t.aiSuggesting}
            </span>
          </div>
        ) : !isMyTurn ? (
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
            <Hourglass className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span className="text-[11px] sm:text-xs text-amber-200/90">{t.stepWaiting}</span>
          </div>
        ) : (
          <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-amber-400 uppercase font-mono">
            PHASE {currentStep}/3
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          const isCurrentActive = currentStep === s.num;
          const isPassed = currentStep > s.num;
          const isActive = (isMyTurn || isAITurn) && isCurrentActive;
          const isDone = (isMyTurn || isAITurn) && isPassed;

          return (
            <React.Fragment key={s.num}>
              {idx > 0 && (
                <div
                  className={`w-3 sm:w-6 h-0.5 rounded-full transition-colors ${
                    isDone ? 'bg-amber-400' : isActive ? 'bg-amber-500/50' : 'bg-slate-800'
                  }`}
                />
              )}
              <div
                className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 scale-105'
                    : isDone
                      ? 'bg-amber-950/40 text-amber-300 border border-amber-700/50'
                      : 'bg-slate-800/60 text-slate-500 border border-slate-700/40'
                }`}
              >
                <Icon className={`w-3 h-3 ${isActive ? 'animate-pulse' : ''}`} />
                <span className="hidden md:inline whitespace-nowrap">{s.label}</span>
                <span className="md:hidden font-mono">{s.num}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
