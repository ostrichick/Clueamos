'use client';

import React from 'react';
import { useDraggableModal, ModalDragHandle } from '@/hooks/useDraggableModal';

interface DraggableModalShellProps {
  /** 위치 리셋 추적용. 생략 시 훅 기본값(true)으로 항상 열린 것으로 간주한다. */
  isOpen?: boolean;
  overlayClassName: string;
  cardClassName: string;
  /** 카드 role (예: alertdialog). 필요 시 aria-modal은 호출자가 cardClassName과 함께 관리한다. */
  cardRole?: string;
  /** 카드 앞에 렌더할 오버레이 레벨 장식 (예: 배경 광원). */
  beforeCard?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * 드래그 가능 모달 공용 셸: 오버레이 + 드래그 배선된 카드 + 드래그 핸들.
 * 카드별 시각적 클래스만 호출자가 지정하고 구조는 통일한다.
 */
export const DraggableModalShell: React.FC<DraggableModalShellProps> = ({
  isOpen = true,
  overlayClassName,
  cardClassName,
  cardRole,
  beforeCard,
  children,
}) => {
  const { handlePointerDown, modalStyle } = useDraggableModal({ isOpen });

  return (
    <div className={overlayClassName}>
      {beforeCard}
      <div
        onPointerDown={handlePointerDown}
        style={modalStyle}
        className={cardClassName}
        role={cardRole}
        aria-modal={cardRole ? true : undefined}
      >
        <ModalDragHandle label="드래그하여 이동 (Drag to move)" />
        {children}
      </div>
    </div>
  );
};
