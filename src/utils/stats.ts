import type { LogEntry, Player } from '@/engine/types';

export interface CareerStats {
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  currentStreak: number;
  maxStreak: number;
  bestTurnsToWin: number | null;
  characterWins: Record<string, number>;
  lastPlayedTimestamp: number;
}

export type DetectiveRank = 'ROOKIE' | 'JUNIOR' | 'VETERAN' | 'MASTER';

export const STATS_STORAGE_KEY = 'clueamos_career_stats_v1';

export const DEFAULT_CAREER_STATS: CareerStats = {
  totalGames: 0,
  totalWins: 0,
  totalLosses: 0,
  currentStreak: 0,
  maxStreak: 0,
  bestTurnsToWin: null,
  characterWins: {},
  lastPlayedTimestamp: 0,
};

export interface HumanMatchStats {
  player: Player;
  result: 'winner' | 'eliminated' | 'participated';
  suggestions: number;
  cardsShown: number;
  unrefutedSuggestions: number;
}

/** Counts only actions attributable to a human in this match's structured logs. */
export function getTwoHumanMatchStats(
  players: Player[],
  logs: LogEntry[],
  winnerId?: string
): HumanMatchStats[] {
  const humans = players.filter(player => player.type === 'human');
  if (humans.length !== 2) return [];

  return humans.map(player => ({
    player,
    result: winnerId === player.id
      ? 'winner'
      : player.isEliminated ? 'eliminated' : 'participated',
    suggestions: logs.filter(log =>
      log.type === 'suggestion' && log.metadata?.askerId === player.id
    ).length,
    cardsShown: logs.filter(log =>
      log.type === 'disprove' && log.metadata?.responderId === player.id
    ).length,
    unrefutedSuggestions: logs.filter(log =>
      log.type === 'disprove' &&
      log.metadata?.askerId === player.id &&
      log.metadata.responderId === 'none'
    ).length,
  }));
}

export function loadCareerStats(): CareerStats {
  if (typeof window === 'undefined') return DEFAULT_CAREER_STATS;
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return DEFAULT_CAREER_STATS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CAREER_STATS,
      ...parsed,
    };
  } catch {
    return DEFAULT_CAREER_STATS;
  }
}

export function saveCareerStats(stats: CareerStats): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch {}
}

export function recordGameResult(
  isWin: boolean,
  turns: number,
  characterId?: string
): CareerStats {
  const current = loadCareerStats();
  const totalGames = current.totalGames + 1;
  const totalWins = current.totalWins + (isWin ? 1 : 0);
  const totalLosses = current.totalLosses + (isWin ? 0 : 1);
  const currentStreak = isWin ? current.currentStreak + 1 : 0;
  const maxStreak = Math.max(current.maxStreak, currentStreak);

  let bestTurnsToWin = current.bestTurnsToWin;
  if (isWin) {
    if (bestTurnsToWin === null || turns < bestTurnsToWin) {
      bestTurnsToWin = turns;
    }
  }

  const characterWins = { ...current.characterWins };
  if (isWin && characterId) {
    characterWins[characterId] = (characterWins[characterId] || 0) + 1;
  }

  const updated: CareerStats = {
    totalGames,
    totalWins,
    totalLosses,
    currentStreak,
    maxStreak,
    bestTurnsToWin,
    characterWins,
    lastPlayedTimestamp: Date.now(),
  };

  saveCareerStats(updated);
  return updated;
}

export function getDetectiveRank(totalWins: number): {
  rank: DetectiveRank;
  level: number;
  nextTierWins: number;
} {
  if (totalWins >= 10) {
    return { rank: 'MASTER', level: 4, nextTierWins: 10 };
  }
  if (totalWins >= 5) {
    return { rank: 'VETERAN', level: 3, nextTierWins: 10 };
  }
  if (totalWins >= 2) {
    return { rank: 'JUNIOR', level: 2, nextTierWins: 5 };
  }
  return { rank: 'ROOKIE', level: 1, nextTierWins: 2 };
}

export interface ShareReportParams {
  isWin: boolean;
  winnerName: string;
  turns: number;
  suspectName: string;
  locationName: string;
  weaponName: string;
  locale: 'ko' | 'en' | 'es';
}

export function generateShareReport({
  isWin,
  winnerName,
  turns,
  suspectName,
  locationName,
  weaponName,
  locale,
}: ShareReportParams): string {
  // Determine accolade based on turns
  let accolade = '';
  if (isWin) {
    if (turns <= 5) {
      accolade = locale === 'ko' ? '⚡ 전설의 직감' : locale === 'es' ? '⚡ Intuición Legendaria' : '⚡ Legendary Intuition';
    } else if (turns <= 8) {
      accolade = locale === 'ko' ? '🧠 냉철한 명탐정' : locale === 'es' ? '🧠 Maestro Detective' : '🧠 Master Detective';
    } else {
      accolade = locale === 'ko' ? '🔍 집념의 수사관' : locale === 'es' ? '🔍 Investigador Tenaz' : '🔍 Persistent Sleuth';
    }
  } else {
    accolade = locale === 'ko' ? '🌧️ 미결 사건' : locale === 'es' ? '🌧️ Caso No Resuelto' : '🌧️ Unsolved Cold Case';
  }

  const url = 'https://clueamos.vercel.app';

  if (locale === 'ko') {
    return [
      `🕵️‍♂️ [Clueamos 사건 수사 종결 보고서]`,
      `🏆 결말: ${isWin ? `수사 성공 (${winnerName})` : '범인 도주'}`,
      `⏱️ 소요 턴: ${turns}턴 | 🏅 칭호: ${accolade}`,
      `🔍 사건의 진상: 👤 ${suspectName} / 🏛️ ${locationName} / 🗡️ ${weaponName}`,
      `👉 사건 현장 바로가기: ${url}`,
    ].join('\n');
  }

  if (locale === 'es') {
    return [
      `🕵️‍♂️ [Informe de Investigación - Clueamos]`,
      `🏆 Resultado: ${isWin ? `Caso Resuelto (${winnerName})` : 'El Asesino Escapó'}`,
      `⏱️ Turnos: ${turns} | 🏅 Título: ${accolade}`,
      `🔍 La Verdad: 👤 ${suspectName} / 🏛️ ${locationName} / 🗡️ ${weaponName}`,
      `👉 Jugar Clueamos: ${url}`,
    ].join('\n');
  }

  return [
    `🕵️‍♂️ [Clueamos Murder Investigation Report]`,
    `🏆 Outcome: ${isWin ? `Case Solved (${winnerName})` : 'Culprit Escaped'}`,
    `⏱️ Turns Taken: ${turns} | 🏅 Accolade: ${accolade}`,
    `🔍 Confidential File: 👤 ${suspectName} / 🏛️ ${locationName} / 🗡️ ${weaponName}`,
    `👉 Solve the Mystery: ${url}`,
  ].join('\n');
}
