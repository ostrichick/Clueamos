'use client';

import React from 'react';
import { Bot, Gamepad2 } from 'lucide-react';
import { TranslationStrings } from '@/i18n/translations';

interface AutoPlayBannerProps {
  isActive: boolean;
  onResumeControl: () => void;
  t: TranslationStrings;
}

export const AutoPlayBanner: React.FC<AutoPlayBannerProps> = ({
  isActive,
  onResumeControl,
  t,
}) => {
  if (!isActive) return null;

  return (
    <div className="sticky top-2 z-40 px-3 sm:px-6 w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-top-3 duration-300">
      <div className="bg-gradient-to-r from-amber-950/90 via-slate-900/95 to-amber-950/90 border-2 border-amber-400/80 rounded-2xl sm:rounded-full p-3 sm:px-6 sm:py-3 shadow-2xl shadow-amber-500/25 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* 상태 안내 */}
        <div className="flex items-center gap-3 w-full sm:w-auto text-left">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
            <Bot className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="text-xs sm:text-sm font-extrabold text-amber-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="truncate">{t.autoPlayingBanner}</span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 truncate">
              {t.autoPlayingDesc}
            </p>
          </div>
        </div>

        {/* 제어권 되찾기 (OK) 버튼 */}
        <button
          type="button"
          onClick={onResumeControl}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl sm:rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs sm:text-sm tracking-wide transition-all duration-150 transform active:scale-95 shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 shrink-0 border border-emerald-300 cursor-pointer"
        >
          <Gamepad2 className="w-4 h-4 text-slate-950" />
          <span>{t.autoPlayingResume}</span>
        </button>
      </div>
    </div>
  );
};
