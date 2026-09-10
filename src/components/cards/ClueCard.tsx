'use client';

import React from 'react';
import Image from 'next/image';
import { CHARACTER_PROFILES, LOCATIONS, WEAPONS } from '@/engine/data';

export type CardCategory = 'suspect' | 'location' | 'weapon';

export interface ClueCardProps {
  cardId: string;
  category?: CardCategory;
  isFacedown?: boolean;
  isFlipped?: boolean; // For 3D flip animation (false = show back, true = show front)
  size?: 'sm' | 'md' | 'lg';
  isSelected?: boolean;
  isSelectable?: boolean;
  onClick?: () => void;
  rotation?: number;
  elevation?: boolean;
  getCardName?: (id: string) => string;
  className?: string;
}

export const ClueCard: React.FC<ClueCardProps> = ({
  cardId,
  category,
  isFacedown = false,
  isFlipped,
  size = 'md',
  isSelected = false,
  isSelectable = false,
  onClick,
  rotation = 0,
  elevation = false,
  getCardName,
  className = '',
}) => {
  // Determine card category if not provided
  let detectedCategory: CardCategory = category || 'suspect';
  if (cardId.startsWith('room_')) {
    detectedCategory = 'location';
  } else if (cardId.startsWith('weapon_')) {
    detectedCategory = 'weapon';
  } else if (cardId.startsWith('suspect_')) {
    detectedCategory = 'suspect';
  }

  // Extract display icon and name
  let icon = '❓';
  const displayName = getCardName ? getCardName(cardId) : cardId;
  let accentColor = '#64748b';
  let categoryLabel = 'CLUE';
  let portraitUrl: string | undefined = undefined;

  if (detectedCategory === 'suspect') {
    const profile = CHARACTER_PROFILES[cardId];
    icon = profile?.avatar || '👤';
    accentColor = profile?.color || '#ef4444';
    categoryLabel = 'SUSPECT';
    portraitUrl = profile?.portraitUrl;
  } else if (detectedCategory === 'location') {
    const loc = LOCATIONS.find(l => l.id === cardId);
    if (loc) {
      const match = loc.name.match(/^(\S+)/);
      icon = match ? match[1] : '🏛️';
    } else {
      icon = '🏛️';
    }
    accentColor = '#f59e0b';
    categoryLabel = 'LOCATION';
  } else if (detectedCategory === 'weapon') {
    const weap = WEAPONS.find(w => w.id === cardId);
    if (weap) {
      const match = weap.name.match(/^(\S+)/);
      icon = match ? match[1] : '⚔️';
    } else {
      icon = '⚔️';
    }
    accentColor = '#94a3b8';
    categoryLabel = 'WEAPON';
  }

  // Size configurations
  const sizeStyles = {
    sm: {
      card: 'w-[90px] h-[132px] rounded-xl text-[10px]',
      icon: 'text-2xl',
      title: 'text-[11px] leading-tight',
      badge: 'text-[8px] py-0.5 px-1.5',
      filigree: 'p-1.5',
    },
    md: {
      card: 'w-[124px] h-[180px] rounded-2xl text-xs',
      icon: 'text-4xl',
      title: 'text-xs font-black leading-tight',
      badge: 'text-[9px] py-0.5 px-2',
      filigree: 'p-2',
    },
    lg: {
      card: 'w-[190px] h-[276px] rounded-3xl text-sm',
      icon: 'text-6xl',
      title: 'text-base font-black leading-snug',
      badge: 'text-[11px] py-1 px-3 font-mono font-bold',
      filigree: 'p-3',
    },
  }[size];

  const effectiveRotation = rotation;
  const isInteractive = isSelectable || !!onClick;

  // Render front of the card
  const renderCardFront = () => (
    <div
      style={{
        borderColor: isSelected ? '#fbbf24' : accentColor,
        boxShadow: isSelected
          ? `0 0 20px ${accentColor}80, 0 10px 25px -5px rgba(0, 0, 0, 0.7)`
          : '0 8px 20px -4px rgba(0, 0, 0, 0.6)',
      }}
      className={`relative w-full h-full rounded-[inherit] overflow-hidden flex flex-col justify-between select-none border-2 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 ${sizeStyles.filigree}`}
    >
      {/* Vintage linen texture overlay */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '8px 8px',
        }}
      />

      {/* Subtle corner ornamental accents */}
      <div className="absolute top-1 left-1.5 text-[8px] opacity-40 font-serif">♠</div>
      <div className="absolute top-1 right-1.5 text-[8px] opacity-40 font-serif">♠</div>
      <div className="absolute bottom-1 left-1.5 text-[8px] opacity-40 font-serif">♠</div>
      <div className="absolute bottom-1 right-1.5 text-[8px] opacity-40 font-serif">♠</div>

      {/* Top: Category Stamp */}
      <div className="flex items-center justify-between z-10">
        <span
          style={{ backgroundColor: `${accentColor}25`, borderColor: `${accentColor}60`, color: accentColor }}
          className={`font-mono font-black uppercase tracking-wider rounded-md border ${sizeStyles.badge}`}
        >
          {categoryLabel}
        </span>
        <span className="opacity-80 text-[11px]">{icon}</span>
      </div>

      {/* Center: Cameo portrait frame */}
      <div className="flex-1 flex flex-col items-center justify-center my-1 z-10">
        <div
          style={{
            borderColor: `${accentColor}70`,
            boxShadow: `inset 0 0 12px rgba(0,0,0,0.8), 0 2px 10px ${accentColor}30`,
          }}
          className="w-4/5 aspect-square rounded-full border-2 flex items-center justify-center shadow-inner relative group overflow-hidden bg-slate-950"
        >
          {portraitUrl ? (
            <Image
              src={portraitUrl}
              alt={displayName}
              width={160}
              height={160}
              className="w-full h-full object-cover object-center transform transition-transform duration-500 group-hover:scale-115"
            />
          ) : (
            /* Cameo inner glow with icon for rooms and weapons */
            <span className={`${sizeStyles.icon} drop-shadow-md transform transition-transform duration-300 group-hover:scale-110`}>
              {icon}
            </span>
          )}
        </div>
      </div>

      {/* Bottom: Card Name & Decorative line */}
      <div className="text-center z-10 mt-0.5">
        <div className="w-10 h-0.5 mx-auto mb-1 rounded-full opacity-40" style={{ backgroundColor: accentColor }} />
        <div className={`font-black text-slate-100 ${sizeStyles.title} tracking-tight drop-shadow`}>
          {displayName}
        </div>
      </div>
    </div>
  );

  // Render back of the card (authentic luxury vintage Clue card back)
  const renderCardBack = () => (
    <div
      style={{
        boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.7)',
      }}
      className={`relative w-full h-full rounded-[inherit] overflow-hidden flex flex-col items-center justify-center select-none border-2 border-amber-500/40 bg-gradient-to-br from-indigo-950 via-slate-950 to-amber-950 ${sizeStyles.filigree}`}
    >
      {/* Decorative lattice pattern */}
      <div
        className="absolute inset-1.5 rounded-[inherit] border border-amber-400/30 opacity-60 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, rgba(217, 119, 6, 0.08) 0, rgba(217, 119, 6, 0.08) 2px, transparent 0, transparent 10px),
                            repeating-linear-gradient(-45deg, rgba(217, 119, 6, 0.08) 0, rgba(217, 119, 6, 0.08) 2px, transparent 0, transparent 10px)`,
        }}
      />

      {/* Center ornate medallion */}
      <div className="z-10 flex flex-col items-center justify-center p-2 rounded-full border border-amber-400/50 bg-slate-900/90 shadow-xl">
        <span className="text-xl sm:text-2xl drop-shadow">🔍</span>
      </div>

      <div className="z-10 mt-1.5 font-serif font-black tracking-widest text-[9px] sm:text-[10px] text-amber-300/80 uppercase">
        CLUEAMOS
      </div>
    </div>
  );

  // If 3D flip animation is requested (isFlipped !== undefined)
  if (isFlipped !== undefined) {
    return (
      <div
        onClick={onClick}
        style={{
          perspective: 1000,
          transform: `rotate(${effectiveRotation}deg) ${elevation ? 'translateY(-12px)' : ''}`,
        }}
        className={`${sizeStyles.card} ${isInteractive ? 'cursor-pointer' : ''} transition-all duration-300 ${className}`}
      >
        <div
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(0deg)' : 'rotateY(180deg)',
            transition: 'transform 0.75s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          className="relative w-full h-full"
        >
          {/* Front Face (0deg) */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
            className="absolute inset-0 w-full h-full rounded-[inherit]"
          >
            {renderCardFront()}
          </div>

          {/* Back Face (180deg) */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
            className="absolute inset-0 w-full h-full rounded-[inherit]"
          >
            {renderCardBack()}
          </div>
        </div>
      </div>
    );
  }

  // Standard static or single-faced card
  return (
    <div
      onClick={onClick}
      style={{
        transform: `rotate(${effectiveRotation}deg) ${elevation ? 'translateY(-10px)' : ''}`,
      }}
      className={`${sizeStyles.card} relative ${
        isInteractive
          ? 'cursor-pointer hover:-translate-y-2 hover:scale-105 hover:z-20 transition-all duration-200'
          : ''
      } ${isSelected ? 'ring-4 ring-amber-400 -translate-y-2.5 z-30' : ''} ${className}`}
    >
      {isFacedown ? renderCardBack() : renderCardFront()}
    </div>
  );
};
