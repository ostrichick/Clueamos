import { webcrypto } from 'node:crypto';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { PeerManager } from './peerManager';

const { clients, createClient } = vi.hoisted(() => {
  class FakeMqttClient {
    connected = false;
    deliver = true;
    subscriptions = new Set<string>();
    publications: Array<{ topic: string; body: string }> = [];
    private listeners = new Map<string, Array<(...args: unknown[]) => void>>();

    on(event: string, listener: (...args: unknown[]) => void) {
      const all = this.listeners.get(event) ?? [];
      all.push(listener);
      this.listeners.set(event, all);
      return this;
    }

    emit(event: string, ...args: unknown[]) {
      for (const listener of this.listeners.get(event) ?? []) listener(...args);
    }

    subscribe(topic: string, _options: unknown, callback: (error: Error | null) => void) {
      this.subscriptions.add(topic);
      callback(null);
    }

    publish(topic: string, body: string) {
      this.publications.push({ topic, body });
      if (!this.deliver) return;
      for (const client of clients) {
        if (client.connected && client.subscriptions.has(topic)) {
          client.emit('message', topic, Buffer.from(body));
        }
      }
    }

    open() {
      this.connected = true;
      this.emit('connect');
    }

    close() {
      this.connected = false;
      this.emit('close');
    }

    end() { this.close(); }
  }

  const clients: FakeMqttClient[] = [];
  return {
    clients,
    createClient: () => {
      const client = new FakeMqttClient();
      clients.push(client);
      return client;
    },
  };
});

vi.mock('mqtt', () => ({ default: { connect: () => createClient() } }));

const liveManagers: PeerManager[] = [];

beforeEach(() => {
  clients.length = 0;
  vi.stubGlobal('crypto', webcrypto);
});

afterEach(() => {
  for (const manager of liveManagers.splice(0)) manager.cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function manager(): PeerManager {
  const instance = new PeerManager();
  liveManagers.push(instance);
  return instance;
}

async function openHost(secret?: string): Promise<PeerManager> {
  const host = manager();
  const pending = host.createRoom('1234', secret);
  await vi.waitFor(() => expect(clients.length).toBeGreaterThanOrEqual(1));
  clients.at(-1)!.open();
  await pending;
  return host;
}

async function joinGuest(host: PeerManager): Promise<PeerManager> {
  const guest = manager();
  const count = clients.length;
  const pending = guest.joinRoom(host.getRoomCode()!, host.getRoomSecret()!);
  await vi.waitFor(() => expect(clients).toHaveLength(count + 1));
  clients.at(-1)!.open();
  await pending;
  await vi.waitFor(() => expect(host.isConnected()).toBe(true));
  return guest;
}

async function drain(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 20));
}

describe('encrypted MQTT transport', () => {
  it('requires a full high-entropy secret and keeps the secret and plaintext out of broker frames', async () => {
    const host = await openHost();
    const secret = host.getRoomSecret()!;
    expect(secret).toMatch(/^[0-9a-f]{32}$/);
    const guest = await joinGuest(host);
    const received: string[] = [];
    guest.onMessageReceived = msg => received.push(JSON.stringify(msg));

    expect(host.sendMessage({ type: 'STATE_SYNC', payload: { privateValue: 'hidden-solution-123' } })).toBe(true);
    await vi.waitFor(() => expect(received).toContain(JSON.stringify({ type: 'STATE_SYNC', payload: { privateValue: 'hidden-solution-123' } })));

    for (const client of clients) {
      for (const packet of client.publications) {
        expect(packet.topic).toMatch(/^clueamos\/v5\/[a-f0-9]{64}\/to_(host|guest)$/);
        expect(packet.topic).not.toContain(secret);
        expect(packet.topic).not.toContain('1234');
        expect(packet.body).not.toContain(secret);
        expect(packet.body).not.toContain('hidden-solution-123');
        const envelope = JSON.parse(packet.body);
        expect(envelope).toMatchObject({ v: 5, d: expect.stringMatching(/^to_(host|guest)$/) });
        expect(envelope.data).toMatch(/^[a-f0-9]+$/);
        expect(envelope).not.toHaveProperty('type');
      }
    }
  });

  it('rejects weak passwords, including legacy 4–6-digit PINs', async () => {
    const host = manager();
    await expect(host.createRoom('1234', '123456')).rejects.toThrow('32 hexadecimal');
    await expect(host.joinRoom('1234', '1234')).rejects.toThrow('32 hexadecimal');
    await expect(host.joinRoom('1234', '0000000000000000000000000000000g')).rejects.toThrow('32 hexadecimal');
    expect(clients).toHaveLength(0);
  });

  it('will not join on a forged plaintext or modified host handshake', async () => {
    const host = await openHost();
    const hostSocket = clients[0];
    hostSocket.deliver = false;
    const guest = manager();
    const pending = guest.joinRoom(host.getRoomCode()!, host.getRoomSecret()!);
    await vi.waitFor(() => expect(clients).toHaveLength(2));
    const guestSocket = clients[1];
    guestSocket.open();
    await vi.waitFor(() => expect(hostSocket.publications).toHaveLength(1));
    const reply = hostSocket.publications[0];
    guestSocket.emit('message', reply.topic, Buffer.from('{"type":"PONG"}'));
    const invalid = { ...JSON.parse(reply.body), iv: '000000000000000000000000' };
    guestSocket.emit('message', reply.topic, Buffer.from(JSON.stringify(invalid)));
    await drain();
    expect(guest.isConnected()).toBe(false);
    guestSocket.emit('message', reply.topic, Buffer.from(reply.body));
    await pending;
    await vi.waitFor(() => expect(host.isConnected()).toBe(true));
  });

  it('rejects plaintext, ciphertext tampering, wrong direction, duplicate and out-of-order frames', async () => {
    const host = await openHost();
    const guest = await joinGuest(host);
    const guestSocket = clients[1];
    const hostSocket = clients[0];
    const received: string[] = [];
    host.onMessageReceived = msg => received.push(String(msg.payload?.id ?? msg.type));

    guestSocket.deliver = false;
    const start = guestSocket.publications.length;
    for (const id of ['first', 'second', 'third']) {
      expect(guest.sendMessage({ type: 'ACTION_MOVE', payload: { id } })).toBe(true);
    }
    await vi.waitFor(() => expect(guestSocket.publications).toHaveLength(start + 3));
    const [first, second, third] = guestSocket.publications.slice(start);

    const inject = (frame: { topic: string; body: string }) => hostSocket.emit('message', frame.topic, Buffer.from(frame.body));
    inject({ topic: first.topic, body: JSON.stringify({ type: 'ACTION_MOVE', payload: { id: 'plaintext' } }) });
    const changedCipher = JSON.parse(first.body);
    changedCipher.data = `${changedCipher.data[0] === 'f' ? '0' : 'f'}${changedCipher.data.slice(1)}`;
    inject({ topic: first.topic, body: JSON.stringify(changedCipher) });
    inject({ topic: first.topic, body: JSON.stringify({ ...JSON.parse(first.body), d: 'to_guest' }) });
    inject({ topic: first.topic, body: JSON.stringify({ ...JSON.parse(first.body), seq: 99 }) });

    inject(third);
    await vi.waitFor(() => expect(received).toEqual(['third']));
    inject(first);
    inject(second);
    inject(third);
    await drain();
    expect(received).toEqual(['third']);
  });

  it('re-authenticates on MQTT reconnect and reports connected again', async () => {
    const host = await openHost();
    const guest = await joinGuest(host);
    const states: boolean[] = [];
    const rejoinRequests: string[] = [];
    host.onMessageReceived = msg => rejoinRequests.push(msg.type);
    guest.onConnectionStateChange = connected => states.push(connected);
    clients[1].close();
    expect(guest.isConnected()).toBe(false);
    clients[1].open();
    await vi.waitFor(() => expect(guest.isConnected()).toBe(true));
    await vi.waitFor(() => expect(rejoinRequests).toEqual(['GUEST_JOIN']));
    expect(states).toEqual([false, true]);
  });

  it('periodically re-introduces a guest to a refreshed host without resyncing duplicates', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const host = await openHost('00112233445566778899aabbccddeeff');
    const guest = await joinGuest(host);
    let joins = 0;
    host.onMessageReceived = msg => { if (msg.type === 'GUEST_JOIN') joins++; };

    vi.advanceTimersByTime(12000);
    await vi.waitFor(() => expect(clients[1].publications.length).toBeGreaterThan(2));
    await drain();
    expect(joins).toBe(0); // Same peer session should not force another state resync.

    const secret = host.getRoomSecret()!;
    host.cleanup();
    const restarted = manager();
    const pending = restarted.createRoom('1234', secret);
    await vi.waitFor(() => expect(clients).toHaveLength(3));
    clients[2].open();
    await pending;
    const seen: string[] = [];
    restarted.onMessageReceived = msg => seen.push(msg.type);
    vi.advanceTimersByTime(12000);
    await vi.waitFor(() => expect(seen).toContain('GUEST_JOIN'));
    expect(guest.isConnected()).toBe(true);
  });
});
