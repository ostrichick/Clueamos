import React from 'react';
import { type Player } from '@/engine/types';
import { type TranslationStrings } from '@/i18n/translations';

interface DetectiveRosterProps {
  t: TranslationStrings;
  players: Player[];
  currentPlayerIndex: number;
  getPlayerName: (p: Player) => string;
}

export const DetectiveRoster: React.FC<DetectiveRosterProps> = ({
  t,
  players,
  currentPlayerIndex,
  getPlayerName,
}) => {
  return (
    <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3 shadow-md">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.detectivesListTitle}</h3>
      <div className="flex flex-col gap-2">
        {players.map((p, idx) => (
          <div 
            key={p.id}
            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
              idx === currentPlayerIndex
                ? 'border-amber-500/60 bg-amber-500/10'
                : 'border-slate-800 bg-slate-900/20'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{p.avatar}</span>
              <span className="font-semibold text-slate-200">{getPlayerName(p)}</span>
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
  );
};