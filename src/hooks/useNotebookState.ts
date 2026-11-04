'use client';

import { useEffect, useRef, useState } from 'react';
import type { LogEntry, Player } from '@/engine/types';
import type { translations } from '@/i18n/translations';
import type { NoteMark, MatrixMark } from '@/components/notebook/DeductionNotebook';
import { SUSPECTS, WEAPONS } from '@/engine/data';
import { sounds } from '@/utils/sounds';

type T = (typeof translations)['en'];

interface NotebookState {
  myPlayer: Player | undefined;
  t: T;
  logs: LogEntry[];
}

/**
 * 개인 추리 수첩 상태: 체크리스트/매트릭스 마킹, 가설 초안 선택, 손패 연동 상태 판별.
 * 새 게임 시작(log_0 교체) 시 자동 초기화한다. 상태 소유권은 이 훅에 있다.
 */
export function useNotebookState({ myPlayer, t, logs }: NotebookState) {
  const [userNotes, setUserNotes] = useState<Record<string, NoteMark>>({});
  const [matrixNotes, setMatrixNotes] = useState<Record<string, Record<string, MatrixMark>>>({});
  const [selectedSuspect, setSelectedSuspect] = useState(SUSPECTS[0].id);
  const [selectedWeapon, setSelectedWeapon] = useState(WEAPONS[0].id);

  // 새 게임 시작 시 이전 메모 자동 초기화
  const lastGameTimestampRef = useRef<number | null>(null);
  useEffect(() => {
    const initialLog = logs[0];
    if (initialLog && initialLog.id === 'log_0') {
      if (lastGameTimestampRef.current !== initialLog.timestamp) {
        lastGameTimestampRef.current = initialLog.timestamp;
        setUserNotes({});
        setMatrixNotes({});
      }
    }
  }, [logs]);

  const resetNotes = () => {
    setUserNotes({});
    setMatrixNotes({});
  };

  const toggleNote = (cardId: string) => {
    sounds.playDisprove();
    setUserNotes(prev => {
      const current = prev[cardId] || 'EMPTY';
      // Cycle: EMPTY (-) -> NO (x) -> UNKNOWN (?) -> YES (v) -> EMPTY (-)
      let next: NoteMark;
      if (current === 'EMPTY') {
        next = 'NO';
      } else if (current === 'NO') {
        next = 'UNKNOWN';
      } else if (current === 'UNKNOWN') {
        next = 'YES';
      } else {
        next = 'EMPTY';
      }
      return { ...prev, [cardId]: next };
    });
  };

  const toggleMatrixCell = (cardId: string, playerId: string) => {
    sounds.playDisprove();
    setMatrixNotes(prev => {
      const cardMap = prev[cardId] || {};
      const current = cardMap[playerId] || '-';
      // Cycle: - -> X -> ? -> O -> -
      let next: MatrixMark;
      if (current === '-') {
        next = 'X';
      } else if (current === 'X') {
        next = '?';
      } else if (current === '?') {
        next = 'O';
      } else {
        next = '-';
      }
      return {
        ...prev,
        [cardId]: {
          ...cardMap,
          [playerId]: next,
        },
      };
    });
  };

  // 카드 추리 상태 판별 (스마트 수첩 및 내 손패와 드롭다운 동기화)
  const getEffectiveCardStatus = (cardId: string): { mark: NoteMark; tag: string; label: string } => {
    const isMyCard = myPlayer?.hand?.some(c => c.id === cardId);
    const note = userNotes[cardId] || 'EMPTY';
    if (note === 'NO') {
      return { mark: 'NO', tag: isMyCard ? ` [${t.handBadge} ✕]` : ' [✕ 제외]', label: isMyCard ? `✕ (${t.handBadge})` : '✕ 제외됨' };
    }
    if (note === 'YES') {
      return { mark: 'YES', tag: ' [✓ 확정]', label: '✓ 확정' };
    }
    if (note === 'UNKNOWN') {
      return { mark: 'UNKNOWN', tag: ' [? 미확인]', label: '? 미확인' };
    }
    if (isMyCard) {
      return { mark: 'EMPTY', tag: ` [${t.handBadge}]`, label: `- (${t.handBadge})` };
    }
    return { mark: 'EMPTY', tag: '', label: '- 미작성' };
  };

  // 이미 배제된(X 표시) 카드가 기본 선택되어 있을 경우 미제외 후보로 자동 전환
  const activeSuspect = (getEffectiveCardStatus(selectedSuspect).mark === 'NO')
    ? (SUSPECTS.find(s => getEffectiveCardStatus(s.id).mark !== 'NO')?.id || selectedSuspect)
    : selectedSuspect;

  const activeWeapon = (getEffectiveCardStatus(selectedWeapon).mark === 'NO')
    ? (WEAPONS.find(w => getEffectiveCardStatus(w.id).mark !== 'NO')?.id || selectedWeapon)
    : selectedWeapon;

  return {
    userNotes,
    setUserNotes,
    matrixNotes,
    setMatrixNotes,
    resetNotes,
    toggleNote,
    toggleMatrixCell,
    selectedSuspect,
    setSelectedSuspect,
    selectedWeapon,
    setSelectedWeapon,
    activeSuspect,
    activeWeapon,
    getEffectiveCardStatus,
  };
}
