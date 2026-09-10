'use client';

import React from 'react';
import { MessageSquareQuote, X } from 'lucide-react';

export interface ActiveDialogue {
  speakerId: string;
  speakerName: string;
  avatar: string;
  color: string;
  text: string;
}

interface SpeechBubbleProps {
  dialogue: ActiveDialogue | null;
  onDismiss?: () => void;
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({ dialogue, onDismiss }) => {
  if (!dialogue) return null;

  return (
    <div className="w-full max-w-lg mx-auto transition-all duration-300 animate-in fade-in slide-in-from-top-2">
      <div 
        className="relative bg-slate-900/95 border-2 p-3 sm:p-3.5 rounded-2xl shadow-xl backdrop-blur-md flex items-start gap-3 text-left overflow-hidden"
        style={{ borderColor: dialogue.color }}
      >
        {/* Subtle radial glow matching character color */}
        <div 
          className="absolute -right-8 -bottom-8 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-20"
          style={{ backgroundColor: dialogue.color }}
        />

        {/* Character Avatar */}
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border shadow-md"
          style={{ 
            backgroundColor: `${dialogue.color}20`,
            borderColor: dialogue.color 
          }}
        >
          {dialogue.avatar}
        </div>

        {/* Dialogue Content */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span 
              className="text-xs font-black tracking-wide"
              style={{ color: dialogue.color }}
            >
              {dialogue.speakerName}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              (AI)
            </span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed italic flex items-start gap-1 font-serif">
            <MessageSquareQuote className="w-3.5 h-3.5 text-amber-400/80 shrink-0 mt-0.5 inline-block" />
            <span>&ldquo;{dialogue.text}&rdquo;</span>
          </p>
        </div>

        {/* Close / Dismiss */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-slate-500 hover:text-slate-300 p-1 rounded-lg transition-colors absolute top-2 right-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
