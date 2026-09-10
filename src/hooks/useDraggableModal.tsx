'use client';

import React, { useState, useRef, useCallback, CSSProperties } from 'react';

interface Position {
  x: number;
  y: number;
}

interface UseDraggableModalOptions {
  resetOnOpen?: boolean;
  isOpen?: boolean;
}

export function useDraggableModal(options: UseDraggableModalOptions = {}) {
  const { resetOnOpen = true, isOpen = true } = options;
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialPosX: number;
    initialPosY: number;
  }>({
    startX: 0,
    startY: 0,
    initialPosX: 0,
    initialPosY: 0,
  });

  // Reset position whenever the modal transitions to open
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (resetOnOpen && isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
    }
  }

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only drag with primary mouse button or single touch
    if (e.button !== 0) return;

    const target = e.target as HTMLElement | null;
    // Don't drag if user is clicking interactive elements
    if (
      target?.closest(
        'button, a, input, select, textarea, [role="button"], [data-no-drag="true"]'
      )
    ) {
      return;
    }

    isDraggingRef.current = true;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: position.x,
      initialPosY: position.y,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = moveEvent.clientX - dragStartRef.current.startX;
      const deltaY = moveEvent.clientY - dragStartRef.current.startY;

      // Restrict offset within screen bounds so modal never gets lost
      const maxW = typeof window !== 'undefined' ? window.innerWidth * 0.9 : 800;
      const maxH = typeof window !== 'undefined' ? window.innerHeight * 0.9 : 800;

      const clampedX = Math.max(-maxW, Math.min(maxW, dragStartRef.current.initialPosX + deltaX));
      const clampedY = Math.max(-maxH, Math.min(maxH, dragStartRef.current.initialPosY + deltaY));

      setPosition({ x: clampedX, y: clampedY });
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  }, [position.x, position.y]);

  const modalStyle: CSSProperties = {
    transform: `translate(${position.x}px, ${position.y}px)`,
    touchAction: 'none',
  };

  return {
    position,
    handlePointerDown,
    modalStyle,
    resetPosition: () => setPosition({ x: 0, y: 0 }),
  };
}

/**
 * Reusable Drag Handle Component for modal headers
 */
export const ModalDragHandle: React.FC<{
  label?: string;
  className?: string;
}> = ({ label = '드래그하여 이동', className = '' }) => {
  return (
    <div
      className={`w-full flex items-center justify-center py-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-200 transition-colors select-none ${className}`}
      title={label}
    >
      <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-[10px] sm:text-[11px] font-medium tracking-wide text-slate-400 hover:text-slate-200 shadow-sm">
        <span className="text-xs">⠿</span>
        <span>{label}</span>
      </div>
    </div>
  );
};
