// Live two-browser smoke test. Requires a running Next server and access to the MQTT broker.
// Usage: node scripts/e2e-multiplayer.mjs [http://localhost:3000]
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const baseUrl = process.argv[2] || 'http://localhost:3000';

async function state(page) {
  return page.evaluate(() => {
    const store = window.__gameStore;
    if (!store) return null;
    const { playMode, roomCode, roomSecret, gameState, isConnected, guestDisconnected } = store.getState();
    return { playMode, roomCode, roomSecret, phase: gameState.phase, isConnected,
      guestDisconnected, players: gameState.players.map(p => ({ roleType: p.roleType, hand: p.hand.length })) };
  });
}

async function waitFor(page, check, timeout = 25000) {
  await page.waitForFunction(check, null, { timeout });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  const errors = [];
  for (const [role, page] of [['host', host], ['guest', guest]]) {
    page.on('pageerror', error => errors.push(`${role}: ${error.message}`));
  }
  try {
    await host.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await host.getByRole('button', { name: '방 만들기', exact: true }).click();
    await waitFor(host, () => /^\d{4}$/.test(window.__gameStore?.getState().roomCode || ''));
    const room = await state(host);
    assert.match(room.roomSecret, /^[a-f0-9]{32}$/);

    const url = `${baseUrl}?room=${room.roomCode}#key=${room.roomSecret}`;
    await guest.goto(url, { waitUntil: 'domcontentloaded' });
    await waitFor(guest, () => Boolean(window.__gameStore));
    await guest.getByRole('button', { name: '방 참여하기', exact: true }).waitFor({ state: 'visible' });
    await waitFor(guest, () => {
      const button = [...document.querySelectorAll('button')].find(element => element.textContent?.trim() === '방 참여하기');
      return button && !button.disabled;
    });
    await guest.getByRole('button', { name: '방 참여하기', exact: true }).click();
    await waitFor(guest, () => window.__gameStore?.getState().isConnected === true);
    await waitFor(host, () => window.__gameStore?.getState().isConnected === true);
    console.log('PASS: two-browser room join and encrypted handshake');

    await host.getByRole('button', { name: /사건 수사 시작/ }).click();
    await waitFor(guest, () => window.__gameStore?.getState().gameState.phase !== 'LOBBY');
    const guestGame = await guest.evaluate(() => window.__gameStore.getState().gameState);
    assert.equal(guestGame.players[0].hand.length, 0);
    assert.ok(guestGame.players[1].hand.length > 0);
    assert.notDeepEqual(guestGame.solution, (await host.evaluate(() => window.__gameStore.getState().gameState.solution)));
    console.log('PASS: host game start and private hand/solution redaction');

    await guest.reload({ waitUntil: 'domcontentloaded' });
    await waitFor(guest, () => window.__gameStore?.getState().isConnected === true, 30000);
    await waitFor(guest, () => window.__gameStore?.getState().gameState.phase !== 'LOBBY', 30000);
    assert.equal((await state(host)).isConnected, true);
    console.log('PASS: guest browser refresh and state synchronization');

    await guestContext.close();
    await waitFor(host, () => window.__gameStore?.getState().guestDisconnected === true, 65000);
    assert.equal((await state(host)).isConnected, false);
    console.log('PASS: absent guest detected without closing host socket');

    const returningContext = await browser.newContext();
    const returningGuest = await returningContext.newPage();
    returningGuest.on('pageerror', error => errors.push(`returning guest: ${error.message}`));
    await returningGuest.goto(url, { waitUntil: 'domcontentloaded' });
    await returningGuest.getByRole('button', { name: '방 참여하기', exact: true }).click();
    await waitFor(returningGuest, () => window.__gameStore?.getState().isConnected === true);
    await waitFor(host, () => window.__gameStore?.getState().isConnected === true &&
      window.__gameStore?.getState().guestDisconnected === false);
    await waitFor(returningGuest, () => window.__gameStore?.getState().gameState.phase !== 'LOBBY');
    console.log('PASS: guest rejoins after timeout and host cancels fallback');
    await returningContext.close();

    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
