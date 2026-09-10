'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/engine/types';
import { ClueCard } from './ClueCard';
import { Sparkles, CheckCheck, X } from 'lucide-react';
import { sounds } from '@/utils/sounds';
import { TranslationStrings } from '@/i18n/translations';
import { useDraggableModal, ModalDragHandle } from '@/hooks/useDraggableModal';

export interface CardPassModalProps {
  secretClue?: {
    card: Card;
    fromName: string;
  } | null;
  isPassing?: boolean;
  passingToName?: string;
  passingCardId?: string | null;
  getCardName: (id: string) => string;
  onDismiss: () => void;
  onMarkNotebookAndDismiss?: (cardId: string) => void;
  t: TranslationStrings;
}

// Sender Passing View
const PassingCardView: React.FC<{
  passingToName?: string;
  passingCardId: string;
  getCardName: (id: string) => string;
  t: TranslationStrings;
}> = ({ passingToName, passingCardId, getCardName, t }) => {
  const { handlePointerDown, modalStyle } = useDraggableModal();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div 
        onPointerDown={handlePointerDown}
        style={modalStyle}
        className="flex flex-col items-center gap-6 text-center max-w-sm w-full animate-in fade-in zoom-in-95 duration-300"
      >
        <ModalDragHandle label="드래그하여 이동 (Drag to move)" />
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-xs font-bold animate-pulse">
          <Sparkles className="w-4 h-4" />
          <span>{t.cardPassingTo} {passingToName || '...'}</span>
        </div>

        <div className="transition-all duration-700 transform -translate-y-8 scale-95 opacity-90">
          <ClueCard
            cardId={passingCardId}
            size="lg"
            isFacedown={false}
            getCardName={getCardName}
            className="shadow-2xl shadow-indigo-500/30"
          />
        </div>

        <p className="text-xs text-slate-400 font-mono">
          Secretly sliding across the table...
        </p>
      </div>
    </div>
  );
};

// Receiver Secret Clue Reveal View
const SecretClueRevealView: React.FC<{
  secretClue: { card: Card; fromName: string };
  getCardName: (id: string) => string;
  onDismiss: () => void;
  onMarkNotebookAndDismiss?: (cardId: string) => void;
  t: TranslationStrings;
}> = ({ secretClue, getCardName, onDismiss, onMarkNotebookAndDismiss, t }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [slideIn, setSlideIn] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(5.0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    sounds.playCardSlide();
    const timer = setTimeout(() => {
      setSlideIn(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // 5.0초 카운트다운 타이머: 뒤집은 후 시간이 다 되면 자동으로 수첩에 마크하고 닫기
  useEffect(() => {
    if (!isFlipped) return;

    const interval = 100;
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        const next = prev - 0.1;
        if (next <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (onMarkNotebookAndDismiss) {
            sounds.playDisprove();
            onMarkNotebookAndDismiss(secretClue.card.id);
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
  }, [isFlipped, onMarkNotebookAndDismiss, onDismiss, secretClue.card.id]);

  const handleCardFlip = () => {
    if (!isFlipped) {
      setIsFlipped(true);
      setSecondsLeft(5.0);
      sounds.playCardFlip();
      setTimeout(() => {
        sounds.playClue();
      }, 200);
    }
  };

  const { handlePointerDown, modalStyle } = useDraggableModal();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md select-none">
      {/* Background glow effects */}
      <div className="absolute w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      <div 
        onPointerDown={handlePointerDown}
        style={modalStyle}
        className="relative flex flex-col items-center gap-4 max-w-md w-full text-center"
      >
        <ModalDragHandle label="드래그하여 이동 (Drag to move)" />

        {/* Close Button Top Right */}
        <button
          onClick={onDismiss}
          className="absolute -top-3 -right-2 sm:top-0 sm:right-0 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors z-20 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Sender Attribution Header */}
        <div className="flex flex-col items-center gap-1.5 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-xs text-indigo-300 font-bold shadow-md">
            <span>🤫</span>
            <span>
              <strong className="text-amber-300">{secretClue.fromName}</strong> {t.cardPassedFrom}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {isFlipped ? 'This card was revealed only to you' : t.tapToFlip}
          </p>
        </div>

        {/* Physical 3D Card with Glide and Flip Animation */}
        <div
          className={`transition-all duration-500 transform ${
            slideIn ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-16 opacity-0 scale-90'
          }`}
        >
          <div
            onClick={handleCardFlip}
            className="cursor-pointer group relative"
          >
            <ClueCard
              cardId={secretClue.card.id}
              size="lg"
              isFlipped={isFlipped}
              getCardName={getCardName}
              className={`shadow-2xl transition-all duration-300 ${
                isFlipped
                  ? 'shadow-amber-500/25 ring-2 ring-amber-400/50'
                  : 'shadow-indigo-900/50 hover:scale-105'
              }`}
            />

            {!isFlipped && (
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black tracking-wider uppercase shadow-lg animate-bounce pointer-events-none">
                👆 {t.tapToFlip}
              </div>
            )}
          </div>
        </div>

        {/* Post-reveal Actions */}
        {isFlipped && (
          <div className="flex flex-col items-center gap-2.5 w-full max-w-xs mt-2 animate-in fade-in slide-in-from-bottom-2 duration-300 z-10">
            {/* Progress line */}
            <div className="w-full bg-slate-800/80 rounded-full h-1 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-500 to-indigo-500 h-full transition-all duration-100 ease-linear rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, (secondsLeft / 5.0) * 100))}%` }}
              />
            </div>

            <div className="flex items-center gap-2 w-full">
              {onMarkNotebookAndDismiss ? (
                <>
                  <button
                    onClick={() => {
                      sounds.playDisprove();
                      onMarkNotebookAndDismiss(secretClue.card.id);
                    }}
                    className="flex-1 py-3 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCheck className="w-4 h-4 text-slate-950" />
                    <span>{t.markInNotesAndClose} ({Math.max(1, Math.ceil(secondsLeft))}s)</span>
                  </button>

                  <button
                    onClick={onDismiss}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    OK
                  </button>
                </>
              ) : (
                <button
                  onClick={onDismiss}
                  className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold transition-colors"
                >
                  OK ({Math.max(1, Math.ceil(secondsLeft))}s)
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const CardPassModal: React.FC<CardPassModalProps> = ({
  secretClue,
  isPassing = false,
  passingToName,
  passingCardId,
  getCardName,
  onDismiss,
  onMarkNotebookAndDismiss,
  t,
}) => {
  if (isPassing && passingCardId) {
    return (
      <PassingCardView
        passingToName={passingToName}
        passingCardId={passingCardId}
        getCardName={getCardName}
        t={t}
      />
    );
  }

  if (secretClue) {
    return (
      <SecretClueRevealView
        key={secretClue.card.id}
        secretClue={secretClue}
        getCardName={getCardName}
        onDismiss={onDismiss}
        onMarkNotebookAndDismiss={onMarkNotebookAndDismiss}
        t={t}
      />
    );
  }

  return null;
};
