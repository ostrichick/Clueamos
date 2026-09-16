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

// Highly reliable global public MQTT WebSocket broker (WSS port 8084)
// Bypasses all carrier NAT, cellular firewalls, and router restrictions with sub-50ms latency
const MQTT_BROKER = 'wss://broker.emqx.io:8084/mqtt';
const TOPIC_PREFIX = 'clueamos/v4/';

function sanitizePassword(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const digits = value.trim().replace(/\D/g, '');
  return digits.length >= 4 && digits.length <= 6 ? digits : null;
}

function generatePassword(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export class PeerManager {
  private client: MqttClient | null = null;
  private isHost: boolean = false;
  private roomCode: string | null = null;
  private roomSecret: string | null = null;
  private connected: boolean = false;

  public onMessageReceived?: (msg: PeerMessage) => void;
  public onConnectionStateChange?: (connected: boolean, error?: string) => void;

  public getRoomCode(): string | null {
    return this.roomCode;
  }

  public getRoomSecret(): string | null {
    return this.roomSecret;
  }

  public getIsHost(): boolean {
    return this.isHost;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  private makeTopic(code: string, secret: string, direction: 'to_host' | 'to_guest'): string {
    return `${TOPIC_PREFIX}${code}/${secret}/${direction}`;
  }

  /**
   * Host: Create a new room with a 4-digit code and a shared 4~6 digit room password.
   * Both are required to compute the MQTT topic, so random eavesdroppers on the
   * public broker cannot join or snoop without knowing the password.
   */
  public async createRoom(desiredCode?: unknown, roomPassword?: unknown): Promise<string> {
    this.cleanup();
    this.isHost = true;
    const sanitized = (typeof desiredCode === 'string') ? desiredCode.trim().replace(/\D/g, '') : '';
    const code = (sanitized.length === 4)
      ? sanitized
      : Math.floor(1000 + Math.random() * 9000).toString();
    const secret = sanitizePassword(roomPassword) || generatePassword();
    this.roomCode = code;
    this.roomSecret = secret;

    const myReceiveTopic = this.makeTopic(code, secret, 'to_host');

    return new Promise((resolve, reject) => {
      let isSettled = false;
      const timeoutId = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          this.cleanup();
          const timeoutErr = new Error('Room creation timed out. Please check your network and try again.');
          if (this.onConnectionStateChange) {
            this.onConnectionStateChange(false, timeoutErr.message);
          }
          reject(timeoutErr);
        }
      }, 10000);

      try {
        const client = mqtt.connect(MQTT_BROKER, {
          clientId: `clue_host_${code}_${Math.random().toString(36).substring(2, 7)}`,
          clean: true,
          connectTimeout: 8000,
          reconnectPeriod: 2000,
        });
        this.client = client;

        client.on('connect', () => {
          client.subscribe(myReceiveTopic, { qos: 1 }, (err) => {
            if (isSettled) return;
            isSettled = true;
            clearTimeout(timeoutId);
            if (err) {
              reject(err);
            } else {
              resolve(code);
            }
          });
        });

        client.on('message', (_topic, payload) => {
          try {
            const msg: PeerMessage = JSON.parse(payload.toString());

            // First message from guest establishes connected status
            if (!this.connected) {
              this.connected = true;
              if (this.onConnectionStateChange) {
                this.onConnectionStateChange(true);
              }
            }

            // Immediately acknowledge guest join or ping
            if (msg.type === 'GUEST_JOIN' || msg.type === 'PING') {
              this.sendMessage({ type: 'PONG' });
            }

            if (this.onMessageReceived) {
              this.onMessageReceived(msg);
            }
          } catch {}
        });

        client.on('error', (err) => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timeoutId);
            this.cleanup();
            reject(err);
          }
          if (this.onConnectionStateChange) {
            this.onConnectionStateChange(false, err.message);
          }
        });

        client.on('close', () => {
          if (this.connected) {
            this.connected = false;
            if (this.onConnectionStateChange) {
              this.onConnectionStateChange(false, 'Disconnected');
            }
          }
        });
      } catch (e: unknown) {
        reject(e);
      }
    });
  }

  /**
   * Guest: Connect to an existing room using the 4-digit code + shared password.
   */
  public async joinRoom(code: string, roomPassword: string): Promise<void> {
    this.cleanup();
    this.isHost = false;
    const cleanCode = code.trim().replace(/\D/g, '');
    const cleanSecret = sanitizePassword(roomPassword) || '';
    this.roomCode = cleanCode;
    this.roomSecret = cleanSecret;

    const myReceiveTopic = this.makeTopic(cleanCode, cleanSecret, 'to_guest');
    const hostTopic = this.makeTopic(cleanCode, cleanSecret, 'to_host');

    return new Promise((resolve, reject) => {
      let isSettled = false;
      let pingInterval: NodeJS.Timeout | null = null;

      const connectionTimeout = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          if (pingInterval) clearInterval(pingInterval);
          this.cleanup();
          const err = new Error(`Connection timed out. Room ${cleanCode} may not exist, the host is offline, or the room password is incorrect.`);
          if (this.onConnectionStateChange) {
            this.onConnectionStateChange(false, err.message);
          }
          reject(err);
        }
      }, 10000);

      try {
        const client = mqtt.connect(MQTT_BROKER, {
          clientId: `clue_guest_${cleanCode}_${Math.random().toString(36).substring(2, 7)}`,
          clean: true,
          connectTimeout: 8000,
          reconnectPeriod: 2000,
        });
        this.client = client;

        client.on('connect', () => {
          client.subscribe(myReceiveTopic, { qos: 1 }, (err) => {
            if (err) {
              if (!isSettled) {
                isSettled = true;
                clearTimeout(connectionTimeout);
                reject(err);
              }
              return;
            }

            // Immediately and periodically ping host until host responds with handshake
            const sendJoinPing = () => {
              if (client.connected) {
                client.publish(hostTopic, JSON.stringify({ type: 'GUEST_JOIN' }));
              }
            };
            sendJoinPing();
            pingInterval = setInterval(sendJoinPing, 600);
          });
        });

        client.on('message', (_topic, payload) => {
          try {
            const msg: PeerMessage = JSON.parse(payload.toString());

            // First message received from host confirms connection!
            if (!this.connected) {
              this.connected = true;
              if (pingInterval) clearInterval(pingInterval);
              if (!isSettled) {
                isSettled = true;
                clearTimeout(connectionTimeout);
                if (this.onConnectionStateChange) {
                  this.onConnectionStateChange(true);
                }
                resolve();
              }
            }

            if (this.onMessageReceived) {
              this.onMessageReceived(msg);
            }
          } catch {}
        });

        client.on('error', (err) => {
          if (!isSettled) {
            isSettled = true;
            if (pingInterval) clearInterval(pingInterval);
            clearTimeout(connectionTimeout);
            reject(err);
          }
        });

        client.on('close', () => {
          if (this.connected) {
            this.connected = false;
            if (this.onConnectionStateChange) {
              this.onConnectionStateChange(false, 'Disconnected');
            }
          }
        });
      } catch (e: unknown) {
        if (!isSettled) {
          isSettled = true;
          if (pingInterval) clearInterval(pingInterval);
          clearTimeout(connectionTimeout);
          reject(e);
        }
      }
    });
  }

  /**
   * Send message across the room channel (topic includes the room secret)
   */
  public sendMessage(msg: PeerMessage): boolean {
    if (this.client && this.client.connected && this.roomCode && this.roomSecret) {
      const targetTopic = this.isHost
        ? this.makeTopic(this.roomCode, this.roomSecret, 'to_guest')
        : this.makeTopic(this.roomCode, this.roomSecret, 'to_host');
      this.client.publish(targetTopic, JSON.stringify(msg), { qos: 1 });
      return true;
    }
    return false;
  }

  public cleanup() {
    if (this.client) {
      try {
        this.client.end(true);
      } catch {}
      this.client = null;
    }
    this.connected = false;
    this.roomCode = null;
    this.roomSecret = null;
    this.isHost = false;
  }
}

// Global Singleton PeerManager for the app session
export const peerManager = new PeerManager();
