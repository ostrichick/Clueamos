import { describe, expect, it } from 'vitest';
import { initGame, rollDice } from '@/engine/engine';
import { POST } from './route';

function request(body: unknown): Request {
  return new Request('http://localhost/api/game/validate', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('game validation API', () => {
  it('recreates games with a custom player count and after dice rolls', async () => {
    const game = initGame({ seed: 731, aiPlayerCount: 3, player1CharacterId: 'suspect_green', player2CharacterId: 'suspect_mustard' });
    const rolled = rollDice(game);
    const response = await POST(request({ action: 'validate-critical', state: rolled }));
    expect(response.status).toBe(200);
    expect((await response.json()).valid).toBe(true);
  });

  it('enforces payload cap even without a Content-Length header', async () => {
    const oversized = new TextEncoder().encode(JSON.stringify({ action: 'initGame', garbage: 'x'.repeat(600000) }));
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(oversized.subarray(0, 300000));
        controller.enqueue(oversized.subarray(300000));
        controller.close();
      },
    });
    const response = await POST(new Request('http://localhost/api/game/validate', {
      method: 'POST', body: stream, duplex: 'half',
    } as RequestInit & { duplex: string }));
    expect(response.status).toBe(413);
  });
});
