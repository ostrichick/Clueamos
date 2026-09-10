'use client';

import React, { useState } from 'react';
import { Sparkles, ScrollText, ChevronUp, ChevronDown } from 'lucide-react';
import { Solution, Player, LogEntry, GamePhase } from '@/engine/types';
import { SupportedLocale, TranslationStrings } from '@/i18n/translations';
import { getPlayerDisplayName } from '@/engine/engine';

interface GameOverModalProps {
  phase: GamePhase;
  winnerId?: string;
  solution: Solution;
  players: Player[];
  logs: LogEntry[];
  t: TranslationStrings;
  locale: SupportedLocale;
  getCardName: (id: string) => string;
  getRoomName: (id: string) => string;
  onPlayAgain: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  phase,
  winnerId,
  solution,
  players,
  logs,
  t,
  locale,
  getCardName,
  getRoomName,
  onPlayAgain,
}) => {
  const [timelineExpanded, setTimelineExpanded] = useState(false);

  if (phase !== 'GAME_OVER') return null;

  const winner = players.find(p => p.id === winnerId);

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in">
      <div className="max-w-lg w-full bg-slate-900 border border-amber-500/50 p-6 rounded-3xl text-center flex flex-col items-center gap-4 shadow-2xl my-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/10">
          🏆
        </div>
        <h2 className="text-2xl font-black text-slate-100">{t.investigationEnd}</h2>
        <p className="text-sm text-slate-300 font-medium">
          {winner
            ? `${getPlayerDisplayName(winner, locale)} ${t.truthRevealed}`
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
              <span className="font-semibold text-slate-100">{getCardName(solution.suspectId)}</span>
            </div>
            <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-700/80">
              <span className="text-[10px] text-blue-400 block font-bold">{t.solutionLocation}</span>
              <span className="font-semibold text-slate-100">{getRoomName(solution.locationId)}</span>
            </div>
            <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-700/80">
              <span className="text-[10px] text-amber-400 block font-bold">{t.solutionWeapon}</span>
              <span className="font-semibold text-slate-100">{getCardName(solution.weaponId)}</span>
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
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 font-mono">
                {logs.length}
              </span>
            </span>
            {timelineExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {timelineExpanded && (
            <div className="p-3 border-t border-slate-700/60 max-h-56 overflow-y-auto flex flex-col gap-2 text-xs text-slate-300">
              {logs.map((log) => (
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
          onClick={onPlayAgain}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98]"
        >
          {t.playAgain}
        </button>
      </div>
    </div>
  );
};
