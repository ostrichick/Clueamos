'use client';

import React from 'react';
import { DraggableModalShell } from '@/components/modals/DraggableModalShell';
import type { translations, SupportedLocale } from '@/i18n/translations';

type T = (typeof translations)['en'];

interface ExitConfirmModalProps {
  isOpen: boolean;
  locale: SupportedLocale;
  t: T;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({
  isOpen,
  locale,
  t,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <DraggableModalShell
      isOpen={isOpen}
      overlayClassName="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none"
      cardClassName="max-w-sm w-full bg-slate-900 border border-amber-500/40 p-6 rounded-3xl text-center flex flex-col items-center gap-3.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center text-2xl shadow-inner">
        🚪
      </div>
      <div>
        <h3 className="text-lg font-black text-slate-100">
          {t.exitToLobby}
        </h3>
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
          {t.confirmExitToLobby}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 w-full mt-2">
        <button
          onClick={onCancel}
          className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
        >
          {locale === 'ko' ? '계속 플레이' : locale === 'es' ? 'Continuar' : 'Keep Playing'}
        </button>
        <button
          onClick={onConfirm}
          className="py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer"
        >
          {locale === 'ko' ? '메인 화면으로' : locale === 'es' ? 'Salir al Menú' : 'Exit to Setup'}
        </button>
      </div>
    </DraggableModalShell>
  );
};
