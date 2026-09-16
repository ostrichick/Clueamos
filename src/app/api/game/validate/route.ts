import { initGame, rollDice } from '@/engine/engine';
import { type GameState } from '@/engine/types';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 512 * 1024;

function fingerprint(state: GameState): string {
  const seed = state.seed ?? 0;
  const rngCounter = state.rngCounter ?? 0;
  const solution = `${state.solution.suspectId}|${state.solution.locationId}|${state.solution.weaponId}`;
  const hands = state.players.map(p => p.id + ':' + p.hand.map(c => c.id).join(',')).sort().join(';');
  const id = `${seed}|${rngCounter}|${solution}|${hands}`;
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export async function POST(request: Request) {
  const contentLength = request.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return Response.json(
      { valid: false, error: 'Payload too large' },
      { status: 413 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ valid: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action } = (body ?? {}) as { action?: string };

  try {
    if (action === 'initGame') {
      const seed = (body as { seed?: number }).seed;
      if (typeof seed !== 'number') {
        return Response.json({ valid: false, error: 'seed is required' }, { status: 400 });
      }
      const state = initGame({ seed });
      return Response.json({
        valid: true,
        seed,
        fingerprint: fingerprint(state),
        playerCount: state.players.length,
        totalCards: state.players.reduce((sum, p) => sum + p.hand.length, 0) + 3,
      });
    }

    if (action === 'rollDice' || action === 'validate-roll') {
      const state = (body as { state?: GameState }).state;
      if (!state || typeof state.seed !== 'number') {
        return Response.json({ valid: false, error: 'state with seed is required' }, { status: 400 });
      }
      const rolled = rollDice(state);
      return Response.json({
        valid: true,
        diceRolls: rolled.diceRolls,
        currentDiceRoll: rolled.currentDiceRoll,
        rngCounter: rolled.rngCounter,
        accessibleRoomIds: rolled.accessibleRoomIds,
      });
    }

    if (action === 'validate-critical') {
      const state = (body as { state?: GameState }).state;
      if (!state || typeof state.seed !== 'number') {
        return Response.json({ valid: false, error: 'state with seed is required' }, { status: 400 });
      }
      const replayed = initGame({ seed: state.seed });
      return Response.json({
        valid: fingerprint(replayed) === fingerprint(state),
        fingerprint: fingerprint(state),
        expectedFingerprint: fingerprint(replayed),
      });
    }

    return Response.json({ valid: false, error: 'Unsupported action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Validation failed';
    return Response.json({ valid: false, error: message }, { status: 400 });
  }
}