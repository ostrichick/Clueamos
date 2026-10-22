import { describe, expect, it } from 'vitest';
import { initGame } from '@/engine/engine';
import { guestView } from './guestView';

describe('guestView', () => {
  it('never sends the answer, opponent hands, RNG seed or private card logs during play', () => {
    const game = initGame({ seed: 1337 });
    const cardId = game.players[0].hand[0].id;
    game.logs.push({
      id: 'private', turn: 1, type: 'disprove', timestamp: 1,
      message: 'Card shown', metadata: { responderId: game.players[0].id, shownCardId: cardId },
    });

    const view = guestView(game);
    expect(view.solution).not.toEqual(game.solution);
    expect(view.players[1].hand).toEqual(game.players[1].hand);
    expect(view.players[0].hand).toEqual([]);
    expect(view.players.slice(2).every(p => p.hand.length === 0)).toBe(true);
    expect(view.seed).toBeUndefined();
    expect(view.rngCounter).toBeUndefined();
    expect(view.logs.at(-1)?.metadata?.shownCardId).toBeUndefined();
    expect(JSON.stringify(view.logs)).not.toContain(cardId);
  });

  it('reveals the solution only after the match ends', () => {
    const game = initGame({ seed: 1337 });
    expect(guestView({ ...game, phase: 'GAME_OVER' }).solution).toEqual(game.solution);
  });
});
