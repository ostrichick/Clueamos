'use client';

import React, { useState } from 'react';
import { Card } from '@/engine/types';
import { ClueCard } from './ClueCard';
import { Eye, EyeOff, Layers } from 'lucide-react';
import { sounds } from '@/utils/sounds';
import { TranslationStrings } from '@/i18n/translations';

export interface CardHandTrayProps {
  cards: Card[];
  playerName: string;
  getCardName: (id: string) => string;
  t: TranslationStrings;
  className?: string;
}

export const CardHandTray: React.FC<CardHandTrayProps> = ({
  cards,
  playerName,
  getCardName,
  t,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [inspectedCardId, setInspectedCardId] = useState<string | null>(null);

  const toggleOpen = () => {
    sounds.playCardSlide();
    setIsOpen(!isOpen);
  };

  const handleCardClick = (cardId: string) => {
    sounds.playCardSlide();
    setInspectedCardId(inspectedCardId === cardId ? null : cardId);
  };

  return (
    <div
      className={`rounded-2xl border border-amber-500/20 bg-gradient-to-b from-slate-900/80 via-slate-950/90 to-slate-950/95 shadow-xl backdrop-blur-md overflow-hidden ${className}`}
    >
      {/* Tray Header */}
      <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-black text-slate-200 flex items-center gap-1.5">
              <span>{playerName}</span>
              <span className="text-slate-400 font-medium">{t.secretHand}</span>
            </div>
            <div className="text-[10px] text-amber-400/80 font-mono">
              {cards.length} {t.cardsCount}
            </div>
          </div>
        </div>

        <button
          onClick={toggleOpen}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-xs font-bold text-amber-400 flex items-center gap-1.5 transition-all active:scale-95"
        >
          {isOpen ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>{t.hideHand}</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>{t.showHand}</span>
            </>
          )}
        </button>
      </div>

      {/* Tray Body / Card Rack */}
      {isOpen ? (
        <div className="p-4 sm:p-5">
          {cards.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-mono">
              No cards in hand
            </div>
          ) : (
            <div className="relative">
              {/* Tabletop felt card rack mat */}
              <div className="rounded-2xl p-3 sm:p-4 bg-slate-950/80 border border-slate-800 shadow-inner flex items-center justify-center min-h-[200px] overflow-x-auto">
                <div className="flex items-center justify-center gap-2 sm:gap-4 py-2 px-1">
                  {cards.map((card, idx) => {
                    // Slight fan angles for natural tabletop feel: -3deg, 0deg, +3deg, etc.
                    const total = cards.length;
                    const rotationOffset = total > 1 ? (idx - (total - 1) / 2) * 2.5 : 0;
                    const isInspected = inspectedCardId === card.id;

                    return (
                      <div
                        key={card.id}
                        className="transition-transform duration-200"
                        style={{
                          transform: isInspected ? 'translateY(-14px) scale(1.06)' : undefined,
                          zIndex: isInspected ? 30 : 10 + idx,
                        }}
                      >
                        <ClueCard
                          cardId={card.id}
                          size="md"
                          rotation={isInspected ? 0 : rotationOffset}
                          isSelected={isInspected}
                          isSelectable={true}
                          onClick={() => handleCardClick(card.id)}
                          getCardName={getCardName}
                          className="shadow-2xl hover:shadow-amber-500/20"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="text-center mt-2.5 text-[11px] text-slate-500 font-medium">
                🔒 Private to your device. Opponents cannot see these cards.
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Collapsed summary strip */
        <div
          onClick={toggleOpen}
          className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-900/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="flex -space-x-4">
              {cards.map((c, i) => (
                <div
                  key={c.id}
                  className="w-7 h-10 rounded-md border border-amber-500/40 bg-indigo-950 shadow flex items-center justify-center text-[10px]"
                  style={{ zIndex: i }}
                >
                  🔍
                </div>
              ))}
            </div>
            <span className="text-xs text-slate-400 ml-2">
              {cards.length} {t.cardsCount} hidden for privacy
            </span>
          </div>
          <span className="text-xs font-bold text-amber-400">
            {t.showHand} →
          </span>
        </div>
      )}
    </div>
  );
};
