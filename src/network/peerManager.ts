import mqtt, { MqttClient } from 'mqtt';

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
const TOPIC_PREFIX = 'clueamos/v3/';

export class PeerManager {
  private client: MqttClient | null = null;
  private isHost: boolean = false;
  private roomCode: string | null = null;
  private connected: boolean = false;

  public onMessageReceived?: (msg: PeerMessage) => void;
  public onConnectionStateChange?: (connected: boolean, error?: string) => void;

  public getRoomCode(): string | null {
    return this.roomCode;
  }

  public getIsHost(): boolean {
    return this.isHost;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  /**
   * Host: Create a new room with a 2-digit code (10-99)
   */
  public async createRoom(desiredCode?: string): Promise<string> {
    this.cleanup();
    this.isHost = true;
    const code = desiredCode || Math.floor(10 + Math.random() * 90).toString();
    this.roomCode = code;

    const myReceiveTopic = `${TOPIC_PREFIX}${code}/to_host`;

    return new Promise((resolve, reject) => {
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
   * Guest: Connect to an existing room using 2-digit room code
   */
  public async joinRoom(code: string): Promise<void> {
    this.cleanup();
    this.isHost = false;
    const cleanCode = code.trim().replace(/\D/g, '');
    this.roomCode = cleanCode;

    const myReceiveTopic = `${TOPIC_PREFIX}${cleanCode}/to_guest`;
    const hostTopic = `${TOPIC_PREFIX}${cleanCode}/to_host`;

    return new Promise((resolve, reject) => {
      let isSettled = false;
      let pingInterval: NodeJS.Timeout | null = null;

      const connectionTimeout = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          if (pingInterval) clearInterval(pingInterval);
          this.cleanup();
          const err = new Error(`Connection timed out. Room ${cleanCode} may not exist or host is offline.`);
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
   * Send message across the room channel
   */
  public sendMessage(msg: PeerMessage): boolean {
    if (this.client && this.client.connected && this.roomCode) {
      const targetTopic = this.isHost
        ? `${TOPIC_PREFIX}${this.roomCode}/to_guest`
        : `${TOPIC_PREFIX}${this.roomCode}/to_host`;
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
    this.isHost = false;
  }
}

// Global Singleton PeerManager for the app session
export const peerManager = new PeerManager();
