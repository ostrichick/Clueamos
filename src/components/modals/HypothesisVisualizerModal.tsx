'use client';

import React, { useState, useEffect, useRef } from 'react';
import { HypothesisVisualState } from '@/engine/types';
import { TranslationStrings } from '@/i18n/translations';
import { ClueCard } from '@/components/cards/ClueCard';
import { sounds } from '@/utils/sounds';
import { ShieldCheck, HelpCircle, AlertTriangle, ArrowRight, BookMarked, X } from 'lucide-react';
import { useDraggableModal, ModalDragHandle } from '@/hooks/useDraggableModal';

export interface HypothesisVisualizerModalProps {
  visual: HypothesisVisualState | null;
  getCardName: (id: string) => string;
  getRoomName: (id: string) => string;
  onDismiss: () => void;
  onMarkNotebookAndDismiss?: (cardId: string) => void;
  t: TranslationStrings;
  myPlayerId?: string;
}

export const HypothesisVisualizerModal: React.FC<HypothesisVisualizerModalProps> = ({
  visual,
  getCardName,
  getRoomName,
  onDismiss,
  onMarkNotebookAndDismiss,
  t,
  myPlayerId,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(5.0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const soundPlayedRef = useRef<string>('');
  const { handlePointerDown, modalStyle } = useDraggableModal({
    isOpen: !!visual,
  });

  // Sounds & Timers based on phase
  useEffect(() => {
    if (!visual) return;

    if (visual.phase === 'asking' && soundPlayedRef.current !== 'asking') {
      sounds.playQuestion();
      soundPlayedRef.current = 'asking';
      setSecondsLeft(5.0);
    } else if (visual.phase === 'disproved' && soundPlayedRef.current !== 'disproved') {
      sounds.playDisprove();
      soundPlayedRef.current = 'disproved';
      setSecondsLeft(5.0);
    } else if (visual.phase === 'undisproven' && soundPlayedRef.current !== 'undisproven') {
      sounds.playFail();
      soundPlayedRef.current = 'undisproven';
      setSecondsLeft(5.0);
    }
  }, [visual?.phase, visual]);

  // Countdown timer for completed phases: default action is auto-mark if card is shown!
  useEffect(() => {
    if (!visual) return;
    if (visual.phase === 'asking') return; // Don't auto-dismiss while still waiting for disprove response

    const interval = 100; // tick every 100ms
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        const next = prev - 0.1;
        if (next <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (visual.shownCardId && onMarkNotebookAndDismiss) {
            onMarkNotebookAndDismiss(visual.shownCardId);
          } else {
            onDismiss();
          }
          return 0;
        }
        return next;
      });
    }, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visual, onDismiss, onMarkNotebookAndDismiss]);

  if (!visual) return null;

  const isAsking = visual.phase === 'asking';
  const isDisproved = visual.phase === 'disproved';
  const isUndisproven = visual.phase === 'undisproven';

  const roomDisplayName = getRoomName(visual.suggestion.locationId);
  const shownCardName = visual.shownCardId ? getCardName(visual.shownCardId) : '';

  // Calculate timer percentage (5.0s -> 0%)
  const progressPercent = Math.max(0, Math.min(100, (secondsLeft / 5.0) * 100));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      {/* Background ambient lighting */}
      <div 
        className={`absolute w-80 sm:w-96 h-80 sm:h-96 rounded-full blur-3xl pointer-events-none transition-colors duration-700 ${
          isDisproved 
            ? 'bg-indigo-500/20' 
            : isUndisproven 
              ? 'bg-rose-500/20' 
              : 'bg-amber-500/15'
        }`} 
      />

      <div
        onPointerDown={handlePointerDown}
        style={modalStyle}
        className="relative max-w-lg w-full bg-slate-900/95 border-2 border-amber-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col gap-3 text-center overflow-hidden"
      >
        {/* 상단 드래그 핸들 */}
        <ModalDragHandle label="드래그하여 이동 (Drag to move)" />

        {/* Top Close Button (for user override anytime) */}
        {!isAsking && (
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors z-20 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* 1. Header: Asker Avatar & Title */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wide">
            <span className="text-base">{visual.askerAvatar}</span>
            <span>{visual.askerName} {t.hypothesisTitle}</span>
          </div>
          <p className="text-xs text-slate-400">
            {t.hypothesisSubtitle.replace('{room}', roomDisplayName)}
          </p>
        </div>

        {/* 2. Center: 3 Hypothesis Cards (Suspect, Location, Weapon) */}
        <div className="flex items-center justify-center gap-2 sm:gap-3.5 py-1">
          {/* Suspect Card */}
          <div className={`relative transition-all duration-300 transform ${
            visual.shownCardId === visual.suggestion.suspectId 
              ? 'scale-105 z-10' 
              : isDisproved ? 'opacity-50 scale-95' : 'scale-100'
          }`}>
            {visual.shownCardId === visual.suggestion.suspectId && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded-full bg-indigo-500 text-white font-extrabold text-[9px] shadow-lg shadow-indigo-500/50 whitespace-nowrap animate-bounce flex items-center gap-1">
                <span>🛡️ {t.presentedClue}</span>
              </div>
            )}
            <ClueCard
              cardId={visual.suggestion.suspectId}
              size="sm"
              getCardName={getCardName}
              isSelected={visual.shownCardId === visual.suggestion.suspectId}
              className={visual.shownCardId === visual.suggestion.suspectId ? 'ring-2 ring-indigo-400 shadow-indigo-500/40' : ''}
            />
          </div>

          {/* Location Card */}
          <div className={`relative transition-all duration-300 transform ${
            visual.shownCardId === visual.suggestion.locationId 
              ? 'scale-105 z-10' 
              : isDisproved ? 'opacity-50 scale-95' : 'scale-100'
          }`}>
            {visual.shownCardId === visual.suggestion.locationId && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded-full bg-indigo-500 text-white font-extrabold text-[9px] shadow-lg shadow-indigo-500/50 whitespace-nowrap animate-bounce flex items-center gap-1">
                <span>🛡️ {t.presentedClue}</span>
              </div>
            )}
            <ClueCard
              cardId={visual.suggestion.locationId}
              size="sm"
              getCardName={getCardName}
              isSelected={visual.shownCardId === visual.suggestion.locationId}
              className={visual.shownCardId === visual.suggestion.locationId ? 'ring-2 ring-indigo-400 shadow-indigo-500/40' : ''}
            />
          </div>

          {/* Weapon Card */}
          <div className={`relative transition-all duration-300 transform ${
            visual.shownCardId === visual.suggestion.weaponId 
              ? 'scale-105 z-10' 
              : isDisproved ? 'opacity-50 scale-95' : 'scale-100'
          }`}>
            {visual.shownCardId === visual.suggestion.weaponId && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded-full bg-indigo-500 text-white font-extrabold text-[9px] shadow-lg shadow-indigo-500/50 whitespace-nowrap animate-bounce flex items-center gap-1">
                <span>🛡️ {t.presentedClue}</span>
              </div>
            )}
            <ClueCard
              cardId={visual.suggestion.weaponId}
              size="sm"
              getCardName={getCardName}
              isSelected={visual.shownCardId === visual.suggestion.weaponId}
              className={visual.shownCardId === visual.suggestion.weaponId ? 'ring-2 ring-indigo-400 shadow-indigo-500/40' : ''}
            />
          </div>
        </div>

        {/* 3. Disprove Status & Explanations */}
        <div className="min-h-[64px] flex flex-col items-center justify-center">
          {isAsking && (
            <div className="flex flex-col items-center gap-2 animate-pulse">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <HelpCircle className="w-4 h-4 animate-spin" />
                <span>{t.checkingDisprovers}</span>
              </div>
              <div className="w-32 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="w-1/2 h-full bg-amber-500 rounded-full animate-pulse" />
              </div>
            </div>
          )}

          {isDisproved && (
            <div className="flex flex-col items-center gap-1.5 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-full">
                <ShieldCheck className="w-4 h-4" />
                <span>{visual.responderName} {t.disprovedBy}</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 leading-snug max-w-sm">
                {visual.askerId === myPlayerId ? (
                  <span className="text-indigo-300 font-bold">
                    {visual.responderName} {t.cardShownToYou} [{shownCardName}]
                  </span>
                ) : visual.responderId === myPlayerId ? (
                  <span className="text-amber-300 font-bold">
                    {visual.askerName} {t.youShowedCard} [{shownCardName}]
                  </span>
                ) : (
                  <span>
                    {visual.responderName} {t.cardShownNotice} <strong className="text-amber-300">[{shownCardName}]</strong>
                    <span className="text-[10px] text-slate-500 block mt-0.5">({t.secretClueExchange})</span>
                  </span>
                )}
              </p>
            </div>
          )}

          {isUndisproven && (
            <div className="flex flex-col items-center gap-1 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-rose-400 bg-rose-950/40 border border-rose-500/30 px-3 py-1 rounded-full">
                <AlertTriangle className="w-4 h-4" />
                <span>{t.nobodyDisproved}</span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-tight max-w-xs mt-0.5">
                {t.nobodyDisprovedSub}
              </p>
            </div>
          )}
        </div>

        {/* 4. Controls & Pacing Progress Bar */}
        {!isAsking && (
          <div className="flex flex-col gap-2.5 pt-1">
            {/* Countdown progress line */}
            <div className="w-full bg-slate-800/80 rounded-full h-1 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-500 to-indigo-500 h-full transition-all duration-100 ease-linear rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-center gap-2">
              {/* If a card was shown and can be marked: PRIMARY default action is auto-mark with countdown timer */}
              {isDisproved && visual.shownCardId && onMarkNotebookAndDismiss ? (
                <>
                  <button
                    onClick={() => {
                      if (visual.shownCardId && onMarkNotebookAndDismiss) {
                        onMarkNotebookAndDismiss(visual.shownCardId);
                      } else {
                        onDismiss();
                      }
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <BookMarked className="w-3.5 h-3.5 text-slate-950" />
                    <span>{t.markNotebookAndClose} ({Math.max(1, Math.ceil(secondsLeft))}s)</span>
                  </button>

                  <button
                    onClick={onDismiss}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                  >
                    <span>OK</span>
                  </button>
                </>
              ) : (
                /* No card shown (e.g. undisproven) -> Normal continue button */
                <button
                  onClick={onDismiss}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <span>{t.continueBtn} ({Math.max(1, Math.ceil(secondsLeft))}s)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
