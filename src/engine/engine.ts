import { 
  Card, 
  Player, 
  Solution, 
  GameState, 
  Suggestion, 
  DisproveResponse, 
  LogEntry 
} from './types';
import { SUSPECTS, LOCATION_CARDS, WEAPONS, LOCATIONS, ALL_CARDS } from './data';
import { calculateReachablePaths } from './boardGrid';

// 방 간 거리 테이블 (최단 걸음 수 / 복도 칸 수)
// 클래식 Clue 맵처럼 방 사이의 복도 타일 거리 정의
export const ROOM_DISTANCES: Record<string, Record<string, number>> = {
  room_ballroom: {
    room_ballroom: 0,
    room_kitchen: 3,
    room_library: 4,
    room_wine_cellar: 6,
    room_room304: 6,
    room_rooftop: 7,
  },
  room_kitchen: {
    room_ballroom: 3,
    room_kitchen: 0,
    room_library: 5,
    room_wine_cellar: 4,
    room_room304: 7,
    room_rooftop: 5,
  },
  room_library: {
    room_ballroom: 4,
    room_kitchen: 5,
    room_library: 0,
    room_wine_cellar: 7,
    room_room304: 3,
    room_rooftop: 6,
  },
  room_wine_cellar: {
    room_ballroom: 6,
    room_kitchen: 4,
    room_library: 7,
    room_wine_cellar: 0,
    room_room304: 5,
    room_rooftop: 3,
  },
  room_room304: {
    room_ballroom: 6,
    room_kitchen: 7,
    room_library: 3,
    room_wine_cellar: 5,
    room_room304: 0,
    room_rooftop: 4,
  },
  room_rooftop: {
    room_ballroom: 7,
    room_kitchen: 5,
    room_library: 6,
    room_wine_cellar: 3,
    room_room304: 4,
    room_rooftop: 0,
  },
};

// 비밀 통로 (Clue의 대표 요소: 모서리 방 간 직통 통로!)
// 서재 <-> 주방, 연회장 <-> 옥상 정원
export const SECRET_PASSAGES: Record<string, string> = {
  room_library: 'room_kitchen',
  room_kitchen: 'room_library',
  room_ballroom: 'room_rooftop',
  room_rooftop: 'room_ballroom',
};

// Fisher-Yates 셔플 유틸리티
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export interface InitGameOptions {
  player1Name?: string;
  player2Name?: string;
  maxTurns?: number;
}

/**
 * 게임 초기화 함수
 */
export function initGame(options?: InitGameOptions): GameState {
  const p1Name = options?.player1Name || 'Player 1 (Me)';
  const p2Name = options?.player2Name || 'Player 2 (Wife)';
  const maxTurns = options?.maxTurns || 16;

  // 1. 카테고리별 셔플 (용의자, 장소, 흉기 3대 요소)
  const shuffledSuspects = shuffle(SUSPECTS);
  const shuffledLocations = shuffle(LOCATION_CARDS);
  const shuffledWeapons = shuffle(WEAPONS);

  // 정답 봉투 (비밀 격리 3장)
  const solution: Solution = {
    suspectId: shuffledSuspects[0].id,
    locationId: shuffledLocations[0].id,
    weaponId: shuffledWeapons[0].id,
  };

  // 나머지 카드 묶음 (18 - 3 = 15장)
  const remainingCards: Card[] = [
    ...shuffledSuspects.slice(1),
    ...shuffledLocations.slice(1),
    ...shuffledWeapons.slice(1),
  ];

  const shuffledDeck = shuffle(remainingCards);

  // 2. 플레이어 4명 정의
  const initialPlayers: Player[] = [
    {
      id: 'p1',
      name: p1Name,
      type: 'human',
      avatar: '🕵️‍♂️',
      color: '#10b981', // emerald
      currentRoomId: LOCATIONS[0].id, // 연회장 시작
      hand: [],
      isEliminated: false,
      score: 0,
    },
    {
      id: 'p2',
      name: p2Name,
      type: 'human',
      avatar: '🕵️‍♀️',
      color: '#ec4899', // pink
      currentRoomId: LOCATIONS[1].id, // 주방 시작
      hand: [],
      isEliminated: false,
      score: 0,
    },
    {
      id: 'ai_arthur',
      name: 'Arthur (Logical AI)',
      type: 'ai_logic',
      avatar: '🧐',
      color: '#6366f1', // indigo
      currentRoomId: LOCATIONS[2].id, // 서재 시작
      hand: [],
      isEliminated: false,
      score: 0,
    },
    {
      id: 'ai_blake',
      name: 'Blake (Instinct AI)',
      type: 'ai_instinct',
      avatar: '🕶️',
      color: '#f59e0b', // amber
      currentRoomId: LOCATIONS[3].id, // 와인창고 시작
      hand: [],
      isEliminated: false,
      score: 0,
    },
  ];

  // 18장의 카드를 4명에게 분배
  shuffledDeck.forEach((card, index) => {
    const playerIndex = index % initialPlayers.length;
    initialPlayers[playerIndex].hand.push(card);
  });

  const initialLog: LogEntry = {
    id: 'log_0',
    turn: 1,
    message: 'The murder investigation at Grand Velvet Hotel has begun.',
    type: 'event',
    timestamp: Date.now(),
  };

  return {
    phase: 'PLAYING_ROLL', // 주사위를 먼저 굴려야 함!
    turnCount: 1,
    maxTurns,
    currentPlayerIndex: 0,
    players: initialPlayers,
    rooms: LOCATIONS,
    allCards: ALL_CARDS,
    solution,
    logs: [initialLog],
  };
}

/**
 * 주사위 굴리기 (1~6 눈금)
 * 13x13 복도 그리드 BFS 경로 탐색으로 도달 가능한 방 목록 및 비밀 통로 계산
 */
export function rollDice(state: GameState): GameState {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const diceValue = Math.floor(Math.random() * 6) + 1;

  const { reachableRoomIds } = calculateReachablePaths(currentPlayer.currentRoomId, diceValue);

  const newLog: LogEntry = {
    id: `log_${Date.now()}_dice`,
    turn: state.turnCount,
    message: `🎲 ${currentPlayer.name} rolled a ${diceValue}! (${reachableRoomIds.length} destinations reachable)`,
    type: 'event',
    timestamp: Date.now(),
  };

  return {
    ...state,
    phase: 'PLAYING_MOVE',
    currentDiceRoll: diceValue,
    accessibleRoomIds: reachableRoomIds,
    logs: [...state.logs, newLog],
  };
}

/**
 * 플레이어 이동 처리 (주사위 눈금으로 도달 가능한 방인지 검증)
 */
export function movePlayer(state: GameState, targetRoomId: string): GameState {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const accessible = state.accessibleRoomIds || [currentPlayer.currentRoomId];

  if (!accessible.includes(targetRoomId)) {
    throw new Error('Not enough dice steps to reach this room!');
  }

  const targetRoom = state.rooms.find(r => r.id === targetRoomId);
  const updatedPlayers = state.players.map((p, idx) => 
    idx === state.currentPlayerIndex 
      ? { ...p, currentRoomId: targetRoomId }
      : p
  );

  const newLog: LogEntry = {
    id: `log_${Date.now()}_move`,
    turn: state.turnCount,
    message: `${currentPlayer.name} moved to [${targetRoom?.name}].`,
    type: 'move',
    timestamp: Date.now(),
  };

  return {
    ...state,
    players: updatedPlayers,
    phase: 'PLAYING_SUGGEST',
    logs: [...state.logs, newLog],
  };
}

/**
 * 질문(Suggestion) 생성
 */
export function makeSuggestion(
  state: GameState, 
  suggestion: Omit<Suggestion, 'askerId'>
): GameState {
  const asker = state.players[state.currentPlayerIndex];
  const fullSuggestion: Suggestion = {
    ...suggestion,
    askerId: asker.id,
  };

  const suspect = state.allCards.find(c => c.id === suggestion.suspectId)?.name;
  const location = state.allCards.find(c => c.id === suggestion.locationId)?.name;
  const weapon = state.allCards.find(c => c.id === suggestion.weaponId)?.name;

  const newLog: LogEntry = {
    id: `log_${Date.now()}_sugg`,
    turn: state.turnCount,
    message: `${asker.name} suggests: "${suspect} in the ${location} with the ${weapon}."`,
    type: 'suggestion',
    timestamp: Date.now(),
  };

  return {
    ...state,
    currentSuggestion: fullSuggestion,
    phase: 'WAITING_DISPROVE',
    logs: [...state.logs, newLog],
  };
}

/**
 * 특정 플레이어가 질문에 대해 반증(Disprove)할 수 있는 카드 목록 추출
 */
export function getDisprovableCards(player: Player, suggestion: Suggestion): Card[] {
  const queriedIds = [
    suggestion.suspectId,
    suggestion.locationId,
    suggestion.weaponId,
  ];

  return player.hand.filter(card => queriedIds.includes(card.id));
}

/**
 * 시계방향으로 다음 반증 가능한 플레이어 찾기
 */
export function findNextDisprovingPlayer(
  players: Player[], 
  askerIndex: number, 
  suggestion: Suggestion
): { playerIndex: number; availableCards: Card[] } | null {
  const total = players.length;

  for (let i = 1; i < total; i++) {
    const targetIdx = (askerIndex + i) % total;
    const targetPlayer = players[targetIdx];
    if (targetPlayer.isEliminated) continue;

    const disprovable = getDisprovableCards(targetPlayer, suggestion);
    if (disprovable.length > 0) {
      return { playerIndex: targetIdx, availableCards: disprovable };
    }
  }

  return null;
}

/**
 * 반증 수행 및 턴 종료/다음 턴 전환
 */
export function resolveDisprove(
  state: GameState, 
  responderId: string, 
  shownCardId?: string
): GameState {
  const responder = state.players.find(p => p.id === responderId);
  const asker = state.players[state.currentPlayerIndex];
  
  let newLog: LogEntry;

  if (shownCardId && responder) {
    newLog = {
      id: `log_${Date.now()}_disprove`,
      turn: state.turnCount,
      message: `${responder.name} secretly showed 1 clue to ${asker.name} to disprove the claim.`,
      type: 'disprove',
      timestamp: Date.now(),
    };
  } else {
    newLog = {
      id: `log_${Date.now()}_disprove_none`,
      turn: state.turnCount,
      message: 'Nobody could disprove this hypothesis! (Very close to truth)',
      type: 'disprove',
      timestamp: Date.now(),
    };
  }

  return nextTurn({
    ...state,
    currentSuggestion: undefined,
    currentDiceRoll: undefined,
    accessibleRoomIds: undefined,
    logs: [...state.logs, newLog],
  });
}

/**
 * 최종 고발(Accusation) 판정
 */
export function makeAccusation(
  state: GameState,
  accusation: Solution
): { state: GameState; isCorrect: boolean } {
  const player = state.players[state.currentPlayerIndex];
  const sol = state.solution;

  const isCorrect = 
    accusation.suspectId === sol.suspectId &&
    accusation.locationId === sol.locationId &&
    accusation.weaponId === sol.weaponId;

  if (isCorrect) {
    const winLog: LogEntry = {
      id: `log_${Date.now()}_win`,
      turn: state.turnCount,
      message: `🎉 [Case Solved!] ${player.name} revealed the truth and won!`,
      type: 'accusation',
      timestamp: Date.now(),
    };

    return {
      isCorrect: true,
      state: {
        ...state,
        phase: 'GAME_OVER',
        winnerId: player.id,
        logs: [...state.logs, winLog],
      },
    };
  } else {
    const updatedPlayers = state.players.map((p, idx) => 
      idx === state.currentPlayerIndex ? { ...p, isEliminated: true } : p
    );

    const failLog: LogEntry = {
      id: `log_${Date.now()}_fail`,
      turn: state.turnCount,
      message: `❌ ${player.name} accusation was incorrect! Eliminated from investigation.`,
      type: 'accusation',
      timestamp: Date.now(),
    };

    const nextState = nextTurn({
      ...state,
      players: updatedPlayers,
      logs: [...state.logs, failLog],
    });

    return {
      isCorrect: false,
      state: nextState,
    };
  }
}

/**
 * 다음 턴으로 전환
 */
export function nextTurn(state: GameState): GameState {
  const activePlayers = state.players.filter(p => !p.isEliminated);
  if (activePlayers.length === 0) {
    return {
      ...state,
      phase: 'GAME_OVER',
      logs: [
        ...state.logs,
        {
          id: `log_${Date.now()}_over`,
          turn: state.turnCount,
          message: 'All detectives failed their deductions. The culprit escaped.',
          type: 'event',
          timestamp: Date.now(),
        },
      ],
    };
  }

  let nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
  while (state.players[nextIndex].isEliminated) {
    nextIndex = (nextIndex + 1) % state.players.length;
  }

  const nextTurnCount = nextIndex === 0 ? state.turnCount + 1 : state.turnCount;

  if (nextTurnCount > state.maxTurns) {
    return {
      ...state,
      phase: 'GAME_OVER',
      logs: [
        ...state.logs,
        {
          id: `log_${Date.now()}_timeout`,
          turn: state.turnCount,
          message: 'Time out: The storm cleared and the murderer slipped away.',
          type: 'event',
          timestamp: Date.now(),
        },
      ],
    };
  }

  return {
    ...state,
    turnCount: nextTurnCount,
    currentPlayerIndex: nextIndex,
    phase: 'PLAYING_ROLL', // 다음 차례는 주사위 굴리기부터 시작
    currentDiceRoll: undefined,
    accessibleRoomIds: undefined,
  };
}
