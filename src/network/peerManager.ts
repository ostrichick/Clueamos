import mqtt, { type MqttClient } from 'mqtt';

export type PeerMessageType =
  | 'LOBBY_UPDATE'
  | 'GUEST_JOIN'
  | 'GUEST_SELECT_CHAR'
  | 'START_GAME'
  | 'STATE_SYNC'
  | 'ACTION_ROLL'
  | 'ACTION_MOVE'
  | 'ACTION_WAIT_HALLWAY'
  | 'ACTION_SUGGEST'
  | 'ACTION_DISPROVE'
  | 'DISPROVE_REQUEST'
  | 'PRIVATE_CLUE_REVEALED'
  | 'ACTION_ACCUSE'
  | 'ACTION_END_TURN'
  | 'EVENT_DIALOGUE'
  | 'EVENT_EMOTE'
  | 'HYPOTHESIS_VISUAL'
  | 'TURN_REVIEW_UPDATE'
  | 'TURN_REVIEW_CONFIRM'
  | 'HEARTBEAT'
  | 'PING'
  | 'PONG';

export interface PeerMessage {
  type: PeerMessageType;
  payload?: Record<string, unknown>;
}

type Direction = 'to_host' | 'to_guest';

interface SecureEnvelope {
  v: 5;
  d: Direction;
  s: string;
  seq: number;
  iv: string;
  data: string;
}

interface RoomKeys {
  topicId: string;
  to_host: CryptoKey;
  to_guest: CryptoKey;
}

const MQTT_BROKER = 'wss://broker.emqx.io:8084/mqtt';
const TOPIC_PREFIX = 'clueamos/v5/';
const SECRET_PATTERN = /^[a-f0-9]{32}$/i;
const SESSION_PATTERN = /^[a-f0-9]{32}$/;
const IV_PATTERN = /^[a-f0-9]{24}$/;
const HEX_DATA_PATTERN = /^(?:[a-f0-9]{2})+$/;
const JOIN_INTERVAL_MS = 12000;
// Three missed guest check-ins allow for brief packet loss and background tab throttling.
const GUEST_TIMEOUT_MS = JOIN_INTERVAL_MS * 3;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const MESSAGE_TYPES = new Set<PeerMessageType>([
  'LOBBY_UPDATE', 'GUEST_JOIN', 'GUEST_SELECT_CHAR', 'START_GAME', 'STATE_SYNC',
  'ACTION_ROLL', 'ACTION_MOVE', 'ACTION_WAIT_HALLWAY', 'ACTION_SUGGEST',
  'ACTION_DISPROVE', 'DISPROVE_REQUEST', 'PRIVATE_CLUE_REVEALED',
  'ACTION_ACCUSE', 'ACTION_END_TURN', 'EVENT_DIALOGUE', 'EVENT_EMOTE',
  'HYPOTHESIS_VISUAL', 'TURN_REVIEW_UPDATE', 'TURN_REVIEW_CONFIRM',
  'HEARTBEAT', 'PING', 'PONG',
]);

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function randomHex(length: number): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(length)));
}

function normalizeSecret(value: unknown): string {
  if (typeof value !== 'string' || !SECRET_PATTERN.test(value.trim())) {
    throw new Error('Room password must be exactly 32 hexadecimal characters (128 random bits).');
  }
  return value.trim().toLowerCase();
}

async function deriveRoomKeys(code: string, secret: string): Promise<RoomKeys> {
  const material = await crypto.subtle.importKey('raw', hexToBytes(secret), 'HKDF', false, ['deriveKey', 'deriveBits']);
  const salt = encoder.encode(`clueamos/v5/room/${code}`);
  const params = (purpose: string): HkdfParams => ({
    name: 'HKDF', hash: 'SHA-256', salt, info: encoder.encode(purpose),
  });
  const [topicBits, toHost, toGuest] = await Promise.all([
    crypto.subtle.deriveBits(params('topic-id'), material, 256),
    crypto.subtle.deriveKey(params('to_host'), material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']),
    crypto.subtle.deriveKey(params('to_guest'), material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']),
  ]);
  return { topicId: bytesToHex(new Uint8Array(topicBits)), to_host: toHost, to_guest: toGuest };
}

function isSecureEnvelope(value: unknown): value is SecureEnvelope {
  if (!value || typeof value !== 'object') return false;
  const msg = value as Partial<SecureEnvelope>;
  return msg.v === 5 && (msg.d === 'to_host' || msg.d === 'to_guest') &&
    typeof msg.s === 'string' && SESSION_PATTERN.test(msg.s) &&
    typeof msg.seq === 'number' && Number.isSafeInteger(msg.seq) && msg.seq > 0 &&
    typeof msg.iv === 'string' && IV_PATTERN.test(msg.iv) &&
    typeof msg.data === 'string' && msg.data.length <= 2 * 1024 * 1024 &&
    HEX_DATA_PATTERN.test(msg.data);
}

function isPeerMessage(value: unknown): value is PeerMessage {
  if (!value || typeof value !== 'object') return false;
  const msg = value as Partial<PeerMessage>;
  return typeof msg.type === 'string' && MESSAGE_TYPES.has(msg.type as PeerMessageType) &&
    (msg.payload === undefined || (msg.payload !== null && typeof msg.payload === 'object' && !Array.isArray(msg.payload)));
}

function authenticatedHeader(topicId: string, message: SecureEnvelope): Uint8Array<ArrayBuffer> {
  return encoder.encode(`${TOPIC_PREFIX}${topicId}|${message.v}|${message.d}|${message.s}|${message.seq}`);
}

export class PeerManager {
  private client: MqttClient | null = null;
  private isHost = false;
  private roomCode: string | null = null;
  private roomSecret: string | null = null;
  private keys: RoomKeys | null = null;
  private connected = false;
  private generation = 0;
  private sendSequence = 0;
  private sessionId = '';
  private inboundSequences = new Map<string, number>();
  private sendQueue: Promise<void> = Promise.resolve();
  private receiveQueue: Promise<void> = Promise.resolve();
  private joinInterval: ReturnType<typeof setInterval> | null = null;
  private guestWatchInterval: ReturnType<typeof setInterval> | null = null;
  private lastGuestSeenAt = 0;
  private guestTimedOut = false;
  private transportInterrupted = false;
  private guestChallenge: string | null = null;
  private hostSession: string | null = null;
  private activeGuestSession: string | null = null;
  private pendingGuest: { session: string; challenge: string; response: string; resync: boolean } | null = null;
  private finishGuestJoin: (() => void) | null = null;

  public onMessageReceived?: (msg: PeerMessage) => void;
  public onConnectionStateChange?: (connected: boolean, error?: string) => void;

  public getRoomCode(): string | null { return this.roomCode; }
  public getRoomSecret(): string | null { return this.roomSecret; }
  public getIsHost(): boolean { return this.isHost; }
  public isConnected(): boolean { return this.connected; }
  public isTransportConnected(): boolean { return Boolean(this.client?.connected); }
  public wasGuestTimedOut(): boolean { return this.guestTimedOut; }

  private makeTopic(direction: Direction): string {
    return `${TOPIC_PREFIX}${this.keys!.topicId}/${direction}`;
  }

  private reportConnected(connected: boolean, error?: string): void {
    if (this.connected !== connected || error) {
      this.connected = connected;
      this.onConnectionStateChange?.(connected, error);
    }
  }

  private async initialize(code: string, secret: string, isHost: boolean): Promise<number> {
    this.cleanup();
    const generation = this.generation;
    this.isHost = isHost;
    this.roomCode = code;
    this.roomSecret = secret;
    this.sessionId = randomHex(16);
    const keys = await deriveRoomKeys(code, secret);
    if (this.generation !== generation) throw new Error('Room connection was replaced.');
    this.keys = keys;
    return generation;
  }

  /** Creates a room with a cryptographically random printable 128-bit room password. */
  public async createRoom(desiredCode?: unknown, roomPassword?: unknown): Promise<string> {
    const suppliedCode = typeof desiredCode === 'string' ? desiredCode.trim() : '';
    const code = /^[0-9]{4}$/.test(suppliedCode) ? suppliedCode : String(crypto.getRandomValues(new Uint32Array(1))[0] % 9000 + 1000);
    const secret = roomPassword === undefined ? randomHex(16) : normalizeSecret(roomPassword);
    const generation = await this.initialize(code, secret, true);

    return new Promise<string>((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => fail(new Error('Room creation timed out. Please check your network and try again.')), 10000);
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        this.cleanup();
        this.onConnectionStateChange?.(false, error.message);
        reject(error);
      };

      try {
        const client = mqtt.connect(MQTT_BROKER, {
          clientId: `clue_${randomHex(16)}`, clean: true,
          connectTimeout: 8000, reconnectPeriod: 2000,
        });
        this.client = client;
        client.on('connect', () => {
          if (this.generation !== generation) return;
          // Count guest absence only while the host can actually observe the broker.
          if (this.transportInterrupted && this.lastGuestSeenAt) this.lastGuestSeenAt = Date.now();
          this.transportInterrupted = false;
          client.subscribe(this.makeTopic('to_host'), { qos: 1 }, err => {
            if (err) { fail(err); return; }
            if (!settled) {
              settled = true;
              clearTimeout(timeout);
              this.guestWatchInterval = setInterval(() => {
                // Broker outages do not prove the guest left; wait until transport is restored.
                if (this.client !== client || !client.connected || !this.lastGuestSeenAt) return;
                if (Date.now() - this.lastGuestSeenAt >= GUEST_TIMEOUT_MS) {
                  this.activeGuestSession = null;
                  this.pendingGuest = null;
                  this.lastGuestSeenAt = 0;
                  this.guestTimedOut = true;
                  this.reportConnected(false, 'Guest disconnected');
                }
              }, JOIN_INTERVAL_MS);
              resolve(code);
            }
          });
        });
        client.on('message', (topic, payload) => this.enqueueReceived(client, topic, payload, 'to_host'));
        client.on('error', err => {
          if (!settled) fail(err);
          else if (this.client === client) this.reportConnected(false, err.message);
        });
        client.on('close', () => {
          if (this.client === client) {
            this.transportInterrupted = true;
            this.reportConnected(false, 'Disconnected');
          }
        });
      } catch (error) {
        fail(error instanceof Error ? error : new Error('Room connection failed.'));
      }
    });
  }

  /** Joins only with the complete 128-bit password supplied by the host. */
  public async joinRoom(code: string, roomPassword: string): Promise<void> {
    if (typeof code !== 'string' || !/^[0-9]{4}$/.test(code.trim())) {
      throw new Error('Room code must be exactly 4 digits.');
    }
    const secret = normalizeSecret(roomPassword);
    const generation = await this.initialize(code.trim(), secret, false);

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => fail(new Error(`Connection timed out. Room ${code.trim()} may not exist, the host is offline, or the room password is incorrect.`)), 10000);
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        this.cleanup();
        this.onConnectionStateChange?.(false, error.message);
        reject(error);
      };
      this.finishGuestJoin = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        this.finishGuestJoin = null;
        resolve();
      };

      try {
        const client = mqtt.connect(MQTT_BROKER, {
          clientId: `clue_${randomHex(16)}`, clean: true,
          connectTimeout: 8000, reconnectPeriod: 2000,
        });
        this.client = client;
        client.on('connect', () => {
          if (this.generation !== generation) return;
          client.subscribe(this.makeTopic('to_guest'), { qos: 1 }, err => {
            if (err) { fail(err); return; }
            this.sendGuestJoin(true);
          });
        });
        client.on('message', (topic, payload) => this.enqueueReceived(client, topic, payload, 'to_guest'));
        client.on('error', err => {
          if (!settled) fail(err);
          else if (this.client === client) this.reportConnected(false, err.message);
        });
        client.on('close', () => {
          if (this.client !== client) return;
          this.hostSession = null;
          this.reportConnected(false, 'Disconnected');
        });
        // A still-connected guest must discover a host whose browser has restarted.
        this.joinInterval = setInterval(() => {
          if (this.client === client && client.connected) this.sendGuestJoin(false);
        }, JOIN_INTERVAL_MS);
      } catch (error) {
        fail(error instanceof Error ? error : new Error('Room connection failed.'));
      }
    });
  }

  private sendGuestJoin(resync: boolean): void {
    this.guestChallenge = randomHex(16);
    this.queueSend({ type: 'GUEST_JOIN', payload: { challenge: this.guestChallenge, resync } });
  }

  private enqueueReceived(client: MqttClient, topic: string, payload: Buffer, direction: Direction): void {
    if (this.client !== client || topic !== this.makeTopic(direction)) return;
    const generation = this.generation;
    this.receiveQueue = this.receiveQueue.then(async () => {
      if (this.generation !== generation || this.client !== client || !this.keys) return;
      let envelope: unknown;
      try { envelope = JSON.parse(payload.toString()); } catch { return; }
      if (!isSecureEnvelope(envelope) || envelope.d !== direction) return;
      const sequenceKey = `${direction}:${envelope.s}`;
      if (envelope.seq <= (this.inboundSequences.get(sequenceKey) ?? 0)) return;

      let message: unknown;
      try {
        const raw = await crypto.subtle.decrypt({
          name: 'AES-GCM', iv: hexToBytes(envelope.iv),
          additionalData: authenticatedHeader(this.keys.topicId, envelope),
        }, this.keys[direction], hexToBytes(envelope.data));
        message = JSON.parse(decoder.decode(raw));
      } catch { return; } // Also rejects malformed, unauthenticated and tampered messages.
      if (!isPeerMessage(message)) return;
      if (this.generation !== generation || this.client !== client) return;
      this.inboundSequences.set(sequenceKey, envelope.seq);
      this.handleAuthenticatedMessage(message, envelope.s);
    }).catch(() => { /* Ignore malformed broker traffic and application callback failures. */ });
  }

  private handleAuthenticatedMessage(message: PeerMessage, sender: string): void {
    if (this.isHost) {
      if (message.type === 'GUEST_JOIN') {
        const challenge = message.payload?.challenge;
        if (typeof challenge !== 'string' || !SESSION_PATTERN.test(challenge)) return;
        if (this.pendingGuest?.session !== sender || this.pendingGuest.challenge !== challenge) {
          this.pendingGuest = { session: sender, challenge, response: randomHex(16), resync: message.payload?.resync === true };
        }
        this.queueSend({ type: 'PONG', payload: { challenge, response: this.pendingGuest.response } });
        return;
      }
      if (message.type === 'PING') {
        if (this.pendingGuest?.session !== sender || message.payload?.response !== this.pendingGuest.response) return;
        const notifyJoin = this.activeGuestSession !== sender || !this.connected || this.pendingGuest.resync;
        this.activeGuestSession = sender;
        this.lastGuestSeenAt = Date.now();
        this.guestTimedOut = false;
        this.reportConnected(true);
        if (notifyJoin) this.onMessageReceived?.({ type: 'GUEST_JOIN' });
        return;
      }
      if (!this.connected || sender !== this.activeGuestSession) return;
      // Any authenticated guest action is evidence of presence, even if its tab timers are throttled.
      this.lastGuestSeenAt = Date.now();
      this.onMessageReceived?.(message);
      return;
    }

    if (message.type === 'PONG') {
      const challenge = message.payload?.challenge;
      const response = message.payload?.response;
      if (challenge !== this.guestChallenge || typeof response !== 'string' || !SESSION_PATTERN.test(response)) return;
      this.hostSession = sender;
      this.queueSend({ type: 'PING', payload: { response } });
      this.reportConnected(true);
      this.finishGuestJoin?.();
      return;
    }
    if (!this.connected || sender !== this.hostSession) return;
    this.onMessageReceived?.(message);
  }

  private queueSend(message: PeerMessage): boolean {
    const client = this.client;
    const keys = this.keys;
    if (!client?.connected || !keys) return false;
    const generation = this.generation;
    const direction: Direction = this.isHost ? 'to_guest' : 'to_host';
    const topic = this.makeTopic(direction);
    this.sendQueue = this.sendQueue.then(async () => {
      if (this.client !== client || this.generation !== generation || !client.connected) return;
      const envelope: SecureEnvelope = {
        v: 5, d: direction, s: this.sessionId,
        seq: ++this.sendSequence, iv: randomHex(12), data: '',
      };
      const encrypted = await crypto.subtle.encrypt({
        name: 'AES-GCM', iv: hexToBytes(envelope.iv),
        additionalData: authenticatedHeader(keys.topicId, envelope),
      }, keys[direction], encoder.encode(JSON.stringify(message)));
      envelope.data = bytesToHex(new Uint8Array(encrypted));
      if (this.client === client && this.generation === generation && client.connected) {
        client.publish(topic, JSON.stringify(envelope), { qos: 1 });
      }
    }).catch(() => {
      if (this.client === client && this.generation === generation) {
        this.reportConnected(false, 'Unable to encrypt outgoing message.');
      }
    });
    return true;
  }

  public sendMessage(message: PeerMessage): boolean {
    return this.queueSend(message);
  }

  public cleanup(): void {
    this.generation++;
    if (this.joinInterval) clearInterval(this.joinInterval);
    this.joinInterval = null;
    if (this.guestWatchInterval) clearInterval(this.guestWatchInterval);
    this.guestWatchInterval = null;
    this.lastGuestSeenAt = 0;
    this.guestTimedOut = false;
    this.transportInterrupted = false;
    const oldClient = this.client;
    this.client = null;
    if (oldClient) {
      try { oldClient.end(true); } catch { /* Best-effort socket close. */ }
    }
    this.connected = false;
    this.roomCode = null;
    this.roomSecret = null;
    this.keys = null;
    this.isHost = false;
    this.sessionId = '';
    this.sendSequence = 0;
    this.inboundSequences.clear();
    this.sendQueue = Promise.resolve();
    this.receiveQueue = Promise.resolve();
    this.guestChallenge = null;
    this.hostSession = null;
    this.activeGuestSession = null;
    this.pendingGuest = null;
    this.finishGuestJoin = null;
  }
}

export const peerManager = new PeerManager();
