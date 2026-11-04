'use client';

import { useEffect } from 'react';
import type { PlayMode } from '@/store/useGameStore';

interface LobbyQueryParams {
  isConnected: boolean;
  roomCode: string | null;
  setPlayMode: (mode: PlayMode) => void;
  setInputRoomCode: (code: string) => void;
  setInputRoomPassword: (password: string) => void;
}

/**
 * 초대 링크(`?room=XXXX#key=...`) 처리:
 * 1. 입장 코드/비밀번호 입력칸을 미리 채운다 (rAF로 SSR 첫 렌더와 일치 유지).
 * 2. `?room=` 감지 시 게스트 모드로 전환한다.
 */
export function useLobbyQueryParams({
  isConnected,
  roomCode,
  setPlayMode,
  setInputRoomCode,
  setInputRoomPassword,
}: LobbyQueryParams) {
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const code = new URLSearchParams(window.location.search).get('room')?.trim().replace(/\D/g, '').slice(0, 4);
      const key = new URLSearchParams(window.location.hash.slice(1)).get('key');
      if (code) setInputRoomCode(code);
      if (key && /^[a-f0-9]{32}$/i.test(key)) setInputRoomPassword(key.toLowerCase());
    });
    return () => window.cancelAnimationFrame(frame);
  }, [setInputRoomCode, setInputRoomPassword]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isConnected || roomCode) return;
    const roomParam = new URLSearchParams(window.location.search).get('room');
    if (roomParam) {
      setPlayMode('guest');
    }
  }, [isConnected, roomCode, setPlayMode]);
}
