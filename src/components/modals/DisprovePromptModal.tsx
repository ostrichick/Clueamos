'use client';

import React from 'react';
import { Eye, ArrowRight } from 'lucide-react';
import { Card } from '@/engine/types';
import { ClueCard } from '@/components/cards/ClueCard';
import { TranslationStrings } from '@/i18n/translations';
import { sounds } from '@/utils/sounds';
import { useDraggableModal, ModalDragHandle } from '@/hooks/useDraggableModal';

interface DisprovePromptModalProps {
  prompt: { availableCards: Card[]; askerId: string } | null;
  isPassingCard: boolean;
  selectedCard: string | null;
  onSelectCard: (cardId: string) => void;
  onConfirm: (cardId: string) => void;
  getCardName: (id: string) => string;
  t: TranslationStrings;
}

export const DisprovePromptModal: React.FC<DisprovePromptModalProps> = ({
  prompt,
  isPassingCard,
  selectedCard,
  onSelectCard,
  onConfirm,
  getCardName,
  t,
}) => {
  const { handlePointerDown, modalStyle } = useDraggableModal({
    isOpen: !!prompt && !isPassingCard,
  });

  if (!prompt || isPassingCard) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in select-none">
      <div 
        onPointerDown={handlePointerDown}
        style={modalStyle}
        className="max-w-md w-full bg-slate-900 border border-indigo-500/50 p-6 rounded-3xl flex flex-col gap-3 shadow-2xl text-center"
      >
        <ModalDragHandle label="드래그하여 이동 (Drag to move)" />
        <div className="flex items-center justify-center gap-2 text-indigo-400">
          <Eye className="w-5 h-5" />
          <h2 className="text-lg font-black text-slate-100">{t.disprovePromptTitle}</h2>
        </div>
        <p className="text-xs text-slate-300">
          {t.disproveCardSelectionPrompt}
        </p>

        {/* 촉각적인 실물 카드 선택 영역 */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 py-3 min-h-[190px] overflow-x-auto">
          {prompt.availableCards.map(card => (
            <div key={card.id} className="transition-transform duration-200">
              <ClueCard
                cardId={card.id}
                size="md"
                isSelected={selectedCard === card.id}
                isSelectable={true}
                onClick={() => {
                  sounds.playCardSlide();
                  onSelectCard(card.id);
                }}
                getCardName={getCardName}
                className="shadow-xl cursor-pointer"
              />
            </div>
          ))}
        </div>

        <button
          disabled={!selectedCard}
          onClick={() => {
            if (selectedCard) {
              onConfirm(selectedCard);
            }
          }}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-40 text-white font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-[0.98]"
        >
          <span>{t.submitDisproveBtn}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
