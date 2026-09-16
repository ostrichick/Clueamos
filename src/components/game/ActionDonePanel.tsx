import React from 'react';
import { Flame } from 'lucide-react';
import { type TranslationStrings } from '@/i18n/translations';

interface ActionDonePanelProps {
  t: TranslationStrings;
  isEliminated: boolean;
  onEndTurn: () => void;
  onOpenAccuse: () => void;
}

export const ActionDonePanel: React.FC<ActionDonePanelProps> = ({
  t,
  isEliminated,
  onEndTurn,
  onOpenAccuse,
}) => {
  return (
    <div className="bg-gradient-to-r from-slate-900/95 via-slate-850 to-slate-900/95 border-2 border-amber-500/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-amber-500/10 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex flex-col gap-1">
        <div className="text-sm font-extrabold text-amber-300 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          {t.actionDoneTitle}
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-md">
          {t.actionDoneDesc}
        </p>
      </div>

      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
        <button
          onClick={onEndTurn}
          className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer active:scale-95"
        >
          <span>{t.endTurnBtn}</span>
        </button>

        {!isEliminated && (
          <button
            onClick={onOpenAccuse}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-rose-900/40 cursor-pointer active:scale-95 ring-1 ring-rose-400/50"
          >
            <Flame className="w-4 h-4 text-rose-200" />
            <span>{t.makeAccusationBtn}</span>
          </button>
        )}
      </div>
    </div>
  );
};