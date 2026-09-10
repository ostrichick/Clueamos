// Clueamos 코어 타입 정의
// 추리 3요소: 용의자(Suspect), 살인이 일어난 장소(Location), 도구(Weapon)

export type CardCategory = 'suspect' | 'location' | 'weapon';

export interface Card {
  id: string;
  category: CardCategory;
  name: string;
  description: string;
  iconName?: string;
}

export type PlayerType = 'human' | 'ai_logic' | 'ai_instinct';
export type PlayerRoleType = 'p1' | 'p2' | 'ai1' | 'ai2' | 'ai3';

export interface Player {
  id: string;
  characterId: string;
  roleType: PlayerRoleType;
  name: string;
  type: PlayerType;
  avatar: string;
  color: string;
  currentRoomId: string;
  hand: Card[];
  isEliminated: boolean;
  score: number;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  adjacentRoomIds: string[];
  gridCoord: { x: number; y: number };
}

export interface Solution {
  suspectId: string;
  locationId: string;
  weaponId: string;
}

export interface Suggestion {
  askerId: string;
  suspectId: string;
  locationId: string;
  weaponId: string;
}

export interface DisproveResponse {
  responderId: string;
  hasCard: boolean;
  shownCard?: Card; // 오직 질문자(asker)에게만 보임
}

export interface LogMetadata {
  askerId?: string;
  responderId?: string;
  suspectId?: string;
  locationId?: string;
  weaponId?: string;
  shownCardId?: string;
}

export interface LogEntry {
  id: string;
  turn: number;
  message: string;
  type: 'move' | 'suggestion' | 'disprove' | 'accusation' | 'event';
  timestamp: number;
  metadata?: LogMetadata;
}

export type GamePhase = 
  | 'LOBBY'
  | 'PLAYING_ROLL'
  | 'PLAYING_MOVE'
  | 'PLAYING_SUGGEST'
  | 'WAITING_DISPROVE'
  | 'ACCUSATION_MODAL'
  | 'GAME_OVER';

export interface GameState {
  phase: GamePhase;
  turnCount: number;
  maxTurns: number;
  currentPlayerIndex: number;
  players: Player[];
  rooms: Room[];
  allCards: Card[];
  solution: Solution;
  currentSuggestion?: Suggestion;
  currentDiceRoll?: number;
  accessibleRoomIds?: string[];
  logs: LogEntry[];
  winnerId?: string;
}
