'use client';

import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { TranslationStrings } from '@/i18n/translations';
import { useDraggableModal, ModalDragHandle } from '@/hooks/useDraggableModal';

interface AfkWarningModalProps {
  isOpen: boolean;
  secondsRemaining: number;
  onDismiss: () => void;
  t: TranslationStrings;
}

export const AfkWarningModal: React.FC<AfkWarningModalProps> = ({
  isOpen,
  secondsRemaining,
  onDismiss,
  t,
}) => {
  const { handlePointerDown, modalStyle } = useDraggableModal({
    isOpen,
  });

  if (!isOpen) return null;

  // 30초 기준 프로그레스 백분율 (30초 -> 100%, 0초 -> 0%)
  const percentage = Math.max(0, Math.min(100, (secondsRemaining / 30) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div 
        onPointerDown={handlePointerDown}
        style={modalStyle}
        className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/40 border-2 border-amber-500/70 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-amber-500/20 text-center flex flex-col items-center gap-3.5 animate-in zoom-in-95 duration-200"
        role="alertdialog"
        aria-modal="true"
      >
        <ModalDragHandle label="드래그하여 이동 (Drag to move)" />
        {/* 경고 아이콘 */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
            <AlertTriangle className="w-9 h-9 animate-bounce" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500" />
          </span>
        </div>

        {/* 타이틀 및 설명 */}
        <div className="flex flex-col gap-1.5">
          <h2 className="text-xl sm:text-2xl font-black text-amber-300 tracking-tight flex items-center justify-center gap-2">
            <span>{t.afkWarningTitle}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xs sm:max-w-sm mx-auto">
            {t.afkWarningDesc}
          </p>
        </div>

        {/* 카운트다운 타이머 & 프로그레스 바 */}
        <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col items-center gap-2.5">
          <div className="flex items-center gap-2 text-2xl sm:text-3xl font-black font-mono text-amber-400">
            <Clock className="w-6 h-6 text-amber-400/80 animate-spin" style={{ animationDuration: '3s' }} />
            <span>{secondsRemaining}</span>
            <span className="text-xs sm:text-sm text-slate-400 font-sans font-medium">{t.afkSecondsRemaining}</span>
          </div>

          {/* 프로그레스 바 */}
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-1000 ease-linear shadow-sm"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* 확인 / 턴 계속하기 버튼 */}
        <button
          type="button"
          onClick={onDismiss}
          className="w-full mt-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm sm:text-base tracking-wide transition-all duration-150 transform active:scale-95 shadow-xl shadow-amber-500/25 cursor-pointer border border-amber-300"
        >
          {t.afkImHere}
        </button>
      </div>
    </div>
  );
};
