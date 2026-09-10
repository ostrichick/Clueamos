'use client';

import React from 'react';
import { ActiveEmote } from '@/store/useGameStore';
import { TranslationStrings } from '@/i18n/translations';

interface TableEmotesBarProps {
  activeEmote: ActiveEmote | null;
  onTriggerEmote: (key: string) => void;
  onDismissEmote: () => void;
  t: TranslationStrings;
  className?: string;
}

export const TableEmotesBar: React.FC<TableEmotesBarProps> = ({
  activeEmote,
  onTriggerEmote,
  onDismissEmote,
  t,
  className = '',
}) => {
  const emoteOptions = [
    { key: 'observe', icon: '🧐', tooltip: t.emoteObserve },
    { key: 'ponder', icon: '🤔', tooltip: t.emotePonder },
    { key: 'eureka', icon: '💡', tooltip: t.emoteEureka },
    { key: 'tea', icon: '☕', tooltip: t.emoteTea },
  ];

  return (
    <div className={`relative flex items-center justify-between gap-2 select-none ${className}`}>
      {/* 4 Emote Quick Buttons */}
      <div className="flex items-center gap-1.5 bg-slate-900/80 border border-amber-500/20 rounded-2xl p-1.5 shadow-lg backdrop-blur-md">
        <span className="text-[10px] font-black text-amber-400/80 px-1 font-mono hidden sm:inline uppercase">
          Reactions
        </span>
        {emoteOptions.map(opt => (
          <button
            key={opt.key}
            onClick={() => onTriggerEmote(opt.key)}
            title={opt.tooltip}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800/80 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-400 text-sm sm:text-base flex items-center justify-center transition-all hover:scale-110 active:scale-90 shadow"
          >
            {opt.icon}
          </button>
        ))}
      </div>

      {/* Floating Active Emote Reaction Bubble */}
      {activeEmote && (
        <div
          onClick={onDismissEmote}
          className="absolute -top-12 left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 z-50 animate-bounce cursor-pointer"
        >
          <div
            style={{ borderColor: activeEmote.color }}
            className="bg-slate-950/95 border-2 rounded-2xl px-3 py-1.5 shadow-2xl shadow-black/80 flex items-center gap-2 backdrop-blur-md"
          >
            <div
              style={{ backgroundColor: activeEmote.color }}
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs shadow border border-white/40"
            >
              {activeEmote.avatar}
            </div>
            <div className="text-xl sm:text-2xl animate-pulse">{activeEmote.emote}</div>
            <div className="text-left">
              <div className="text-[10px] font-black text-slate-300 leading-tight">
                {activeEmote.speakerName}
              </div>
              <div className="text-[11px] font-bold text-amber-300 leading-tight">
                {activeEmote.label}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
