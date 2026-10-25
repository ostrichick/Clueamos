import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  loadCareerStats,
  recordGameResult,
  getDetectiveRank,
  getTwoHumanMatchStats,
  generateShareReport
} from './stats';
import type { LogEntry, Player } from '@/engine/types';

describe('Career Stats Utility', () => {
  let store: Record<string, string> = {};

  beforeAll(() => {
    const storageMock = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      clear: () => {
        store = {};
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: storageMock,
      writable: true,
    });
    // Ensure window is defined for loadCareerStats window check
    if (typeof window === 'undefined') {
      (globalThis as unknown as { window: unknown }).window = globalThis;
    }
  });

  beforeEach(() => {
    store = {};
  });

  it('loads default career stats when storage is empty', () => {
    const stats = loadCareerStats();
    expect(stats.totalGames).toBe(0);
    expect(stats.totalWins).toBe(0);
    expect(stats.bestTurnsToWin).toBeNull();
  });

  it('records a winning game and updates stats correctly', () => {
    const stats1 = recordGameResult(true, 7, 'character_scarlet');
    expect(stats1.totalGames).toBe(1);
    expect(stats1.totalWins).toBe(1);
    expect(stats1.totalLosses).toBe(0);
    expect(stats1.currentStreak).toBe(1);
    expect(stats1.maxStreak).toBe(1);
    expect(stats1.bestTurnsToWin).toBe(7);
    expect(stats1.characterWins['character_scarlet']).toBe(1);

    // Record another faster win
    const stats2 = recordGameResult(true, 5, 'character_scarlet');
    expect(stats2.totalGames).toBe(2);
    expect(stats2.totalWins).toBe(2);
    expect(stats2.currentStreak).toBe(2);
    expect(stats2.bestTurnsToWin).toBe(5);

    // Record a loss
    const stats3 = recordGameResult(false, 15);
    expect(stats3.totalGames).toBe(3);
    expect(stats3.totalWins).toBe(2);
    expect(stats3.totalLosses).toBe(1);
    expect(stats3.currentStreak).toBe(0);
    expect(stats3.maxStreak).toBe(2);
    expect(stats3.bestTurnsToWin).toBe(5);
  });

  it('calculates detective rank accurately based on win count', () => {
    expect(getDetectiveRank(0).rank).toBe('ROOKIE');
    expect(getDetectiveRank(1).rank).toBe('ROOKIE');
    expect(getDetectiveRank(2).rank).toBe('JUNIOR');
    expect(getDetectiveRank(4).rank).toBe('JUNIOR');
    expect(getDetectiveRank(5).rank).toBe('VETERAN');
    expect(getDetectiveRank(9).rank).toBe('VETERAN');
    expect(getDetectiveRank(10).rank).toBe('MASTER');
    expect(getDetectiveRank(25).rank).toBe('MASTER');
  });

  it('generates share report formatted for clipboard across languages', () => {
    const koReport = generateShareReport({
      isWin: true,
      winnerName: '셜록 홈즈',
      turns: 5,
      suspectName: '미스 스칼렛',
      locationName: '온실',
      weaponName: '단검',
      locale: 'ko',
    });
    expect(koReport).toContain('Clueamos 사건 수사 종결 보고서');
    expect(koReport).toContain('⚡ 전설의 직감');
    expect(koReport).toContain('5턴');
    expect(koReport).toContain('미스 스칼렛');

    const enReport = generateShareReport({
      isWin: false,
      winnerName: 'Arthur',
      turns: 12,
      suspectName: 'Col. Mustard',
      locationName: 'Kitchen',
      weaponName: 'Revolver',
      locale: 'en',
    });
    expect(enReport).toContain('Clueamos Murder Investigation Report');
    expect(enReport).toContain('Culprit Escaped');
  });

  it('compares only two human players using structured logs from the match', () => {
    const makePlayer = (id: string, type: Player['type'], isEliminated = false): Player => ({
      id, type, isEliminated, roleType: id as Player['roleType'], characterId: id,
      name: id, avatar: '🔎', color: '', currentRoomId: '', hand: [], score: 0,
    });
    const players = [makePlayer('p1', 'human'), makePlayer('p2', 'human', true), makePlayer('ai1', 'ai_logic')];
    const log = (type: LogEntry['type'], metadata?: LogEntry['metadata']): LogEntry => ({
      id: 'fixture', turn: 1, message: 'unreliable localized message',
      type, metadata, timestamp: 0,
    });
    const logs = [
      log('suggestion', { askerId: 'p1' }),
      log('suggestion', { askerId: 'p1' }),
      log('suggestion', { askerId: 'p2' }),
      log('suggestion', { askerId: 'ai1' }),
      log('suggestion'),
      log('disprove', { askerId: 'p1', responderId: 'none' }),
      log('disprove', { askerId: 'p1', responderId: 'p2' }),
      log('disprove', { askerId: 'ai1', responderId: 'p1' }),
      log('disprove', { askerId: 'p2', responderId: 'none' }),
      log('disprove'),
      log('accusation'),
    ];

    const result = getTwoHumanMatchStats(players, logs, 'p1');
    expect(result).toHaveLength(2);
    expect(result.map(({ player, ...stats }) => ({ id: player.id, ...stats }))).toEqual([
      { id: 'p1', result: 'winner', suggestions: 2, cardsShown: 1, unrefutedSuggestions: 1 },
      { id: 'p2', result: 'eliminated', suggestions: 1, cardsShown: 1, unrefutedSuggestions: 1 },
    ]);
    expect(getTwoHumanMatchStats(players.slice(0, 1), logs, 'p1')).toEqual([]);
    expect(getTwoHumanMatchStats(players, [], undefined)[0].result).toBe('participated');
  });
});
