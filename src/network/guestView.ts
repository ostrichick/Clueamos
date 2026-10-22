import type { GameState } from '@/engine/types';

/** State delivered to player 2. The host retains the complete case file. */
export function guestView(state: GameState): GameState {
  const finished = state.phase === 'GAME_OVER';
  return {
    ...state,
    solution: finished ? state.solution : { suspectId: '', locationId: '', weaponId: '' },
    seed: undefined,
    rngCounter: undefined,
    players: state.players.map(player => ({
      ...player,
      hand: player.roleType === 'p2' ? player.hand : [],
    })),
    logs: state.logs.map(log => {
      if (!log.metadata?.shownCardId) return log;
      const { shownCardId: _privateCard, ...publicMetadata } = log.metadata;
      void _privateCard;
      return { ...log, metadata: publicMetadata };
    }),
  };
}
