import { Peer, DataConnection } from 'peerjs';

export type PeerMessageType =
  | 'LOBBY_UPDATE'
  | 'GUEST_SELECT_CHAR'
  | 'START_GAME'
  | 'STATE_SYNC'
  | 'ACTION_ROLL'
  | 'ACTION_MOVE'
  | 'ACTION_SUGGEST'
  | 'ACTION_DISPROVE'
  | 'DISPROVE_REQUEST'
  | 'PRIVATE_CLUE_REVEALED'
  | 'ACTION_ACCUSE'
  | 'PING'
  | 'PONG';

export interface PeerMessage {
  type: PeerMessageType;
  payload?: Record<string, unknown>;
}

const PEER_PREFIX = 'clueamos-room-';

// OpenRelay STUN + TURN (Metered.ca free tier with UDP/TCP support on 80 & 443)
// This ensures WebRTC NAT traversal works between mobile cellular networks (LTE/5G) and home Wi-Fi
const PEER_CONFIG = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:openrelay.metered.ca:80' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
  },
};

export class PeerManager {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private isHost: boolean = false;
  private roomCode: string | null = null;

  public onMessageReceived?: (msg: PeerMessage) => void;
  public onConnectionStateChange?: (connected: boolean, error?: string) => void;

  public getRoomCode(): string | null {
    return this.roomCode;
  }

  public getIsHost(): boolean {
    return this.isHost;
  }

  public isConnected(): boolean {
    return this.conn !== null && this.conn.open;
  }

  /**
   * Host: Create a new room with a 2-digit code (10-99)
   */
  public async createRoom(
    desiredCode?: string
  ): Promise<string> {
    this.cleanup();
    this.isHost = true;
    const code = desiredCode || Math.floor(10 + Math.random() * 90).toString();
    this.roomCode = code;
    const peerId = `${PEER_PREFIX}${code}`;

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(peerId, PEER_CONFIG);

        this.peer.on('open', () => {
          resolve(code);
        });

        this.peer.on('connection', (connection) => {
          this.conn = connection;
          this.setupConnectionHandlers(this.conn);
        });

        this.peer.on('error', (err) => {
          if (this.onConnectionStateChange) {
            this.onConnectionStateChange(false, err.message);
          }
          reject(err);
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
    const targetPeerId = `${PEER_PREFIX}${cleanCode}`;

    return new Promise((resolve, reject) => {
      let isSettled = false;

      // 12-second timeout to avoid infinite hanging if host is offline or code is invalid
      const connectionTimeout = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          this.cleanup();
          const err = new Error(`Connection timed out. Room #${cleanCode} may not exist or host is offline.`);
          if (this.onConnectionStateChange) {
            this.onConnectionStateChange(false, err.message);
          }
          reject(err);
        }
      }, 12000);

      try {
        // Guest creates an anonymous peer without fixed ID to avoid ID collision
        this.peer = new Peer(PEER_CONFIG);

        this.peer.on('open', () => {
          const connection = this.peer!.connect(targetPeerId, {
            reliable: true,
          });

          this.conn = connection;
          this.setupConnectionHandlers(this.conn);

          const onConnected = () => {
            if (!isSettled) {
              isSettled = true;
              clearTimeout(connectionTimeout);
              if (this.onConnectionStateChange) {
                this.onConnectionStateChange(true);
              }
              resolve();
            }
          };

          if (connection.open) {
            onConnected();
          } else {
            connection.on('open', onConnected);
          }

          connection.on('error', (err) => {
            if (!isSettled) {
              isSettled = true;
              clearTimeout(connectionTimeout);
              reject(err);
            }
          });
        });

        this.peer.on('error', (err) => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(connectionTimeout);
            const errType = (err as { type?: string }).type;
            let displayMsg = err.message || 'Connection failed';
            if (errType === 'peer-unavailable') {
              displayMsg = `Room #${cleanCode} not found. Please verify Player 1 has created the room.`;
            }
            if (this.onConnectionStateChange) {
              this.onConnectionStateChange(false, displayMsg);
            }
            reject(new Error(displayMsg));
          }
        });
      } catch (e: unknown) {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(connectionTimeout);
          reject(e);
        }
      }
    });
  }

  /**
   * Setup DataConnection listeners
   */
  private setupConnectionHandlers(conn: DataConnection) {
    const notifyOpen = () => {
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(true);
      }
      // Send handshake ping
      this.sendMessage({ type: 'PING' });
    };

    if (conn.open) {
      notifyOpen();
    } else {
      conn.on('open', notifyOpen);
    }

    conn.on('data', (data: unknown) => {
      const msg = data as PeerMessage;
      // Respond to ping with pong
      if (msg?.type === 'PING') {
        this.sendMessage({ type: 'PONG' });
        return;
      }
      if (this.onMessageReceived) {
        this.onMessageReceived(msg);
      }
    });

    conn.on('close', () => {
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(false, 'Connection closed');
      }
    });

    conn.on('error', (err) => {
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(false, err.message);
      }
    });
  }

  /**
   * Send a message across the DataConnection
   */
  public sendMessage(msg: PeerMessage): boolean {
    if (this.conn && this.conn.open) {
      this.conn.send(msg);
      return true;
    }
    return false;
  }

  /**
   * Cleanup connections
   */
  public cleanup() {
    if (this.conn) {
      try {
        this.conn.close();
      } catch {}
      this.conn = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
      this.peer = null;
    }
    this.roomCode = null;
    this.isHost = false;
  }
}

// Global Singleton PeerManager for the app session
export const peerManager = new PeerManager();
