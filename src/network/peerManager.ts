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

const PEER_PREFIX = 'clueamos-v2-';

const PEER_CONFIG = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
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
   * Host: Create a new room with a random 4-digit code
   */
  public async createRoom(
    desiredCode?: string
  ): Promise<string> {
    this.cleanup();
    this.isHost = true;
    const code = desiredCode || Math.floor(1000 + Math.random() * 9000).toString();
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
   * Guest: Connect to an existing room using 4-digit room code
   */
  public async joinRoom(code: string): Promise<void> {
    this.cleanup();
    this.isHost = false;
    this.roomCode = code.trim();
    const targetPeerId = `${PEER_PREFIX}${this.roomCode}`;
    const guestPeerId = `${PEER_PREFIX}${this.roomCode}-guest-${Math.random().toString(36).substring(2, 7)}`;

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(guestPeerId, PEER_CONFIG);

        this.peer.on('open', () => {
          const connection = this.peer!.connect(targetPeerId, {
            reliable: true,
          });

          this.conn = connection;
          this.setupConnectionHandlers(this.conn);

          connection.on('open', () => {
            resolve();
          });

          connection.on('error', (err) => {
            reject(err);
          });
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
   * Setup DataConnection listeners
   */
  private setupConnectionHandlers(conn: DataConnection) {
    conn.on('open', () => {
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(true);
      }
    });

    conn.on('data', (data: unknown) => {
      if (this.onMessageReceived) {
        this.onMessageReceived(data as PeerMessage);
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
