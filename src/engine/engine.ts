import { 
  Card, 
  Player, 
  Solution, 
  GameState, 
  Suggestion, 
  DisproveResponse, 
  LogEntry 
} from './types';
import { SUSPECTS, LOCATION_CARDS, WEAPONS, MOTIVES, LOCATIONS, ALL_CARDS } from './data';

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
 * 게임 초기화 함수:
 * 1. 4개 카테고리(용의자, 장소, 도구, 동기)에서 각각 1장씩 뽑아 비밀 정답 봉투(Solution)에 격리
 * 2. 나머지 카드를 섞어 4명의 플레이어에게 공평하게 분배
 * 3. 4명의 플레이어(사람 2명 + AI 2명) 생성 및 초기 방 배치
 */
export function initGame(options?: InitGameOptions): GameState {
  const p1Name = options?.player1Name || '플레이어 1 (나)';
  const p2Name = options?.player2Name || '플레이어 2 (아내)';
  const maxTurns = options?.maxTurns || 16;

  // 1. 카테고리별 셔플
  const shuffledSuspects = shuffle(SUSPECTS);
  const shuffledLocations = shuffle(LOCATION_CARDS);
  const shuffledWeapons = shuffle(WEAPONS);
  const shuffledMotives = shuffle(MOTIVES);

  // 정답 봉투 (비밀 격리)
  const solution: Solution = {
    suspectId: shuffledSuspects[0].id,
    locationId: shuffledLocations[0].id,
    weaponId: shuffledWeapons[0].id,
    motiveId: shuffledMotives[0].id,
  };

  // 나머지 카드 묶음 (22 - 4 = 18장)
  const remainingCards: Card[] = [
    ...shuffledSuspects.slice(1),
    ...shuffledLocations.slice(1),
    ...shuffledWeapons.slice(1),
    ...shuffledMotives.slice(1),
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
      name: '아서 (논리형 탐정)',
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
      name: '블레이크 (직감형 탐정)',
      type: 'ai_instinct',
      avatar: '🕶️',
      color: '#f59e0b', // amber
      currentRoomId: LOCATIONS[3].id, // 와인창고 시작
      hand: [],
      isEliminated: false,
      score: 0,
    },
  ];

  // 18장의 카드를 4명에게 분배 (4장, 5장 등)
  shuffledDeck.forEach((card, index) => {
    const playerIndex = index % initialPlayers.length;
    initialPlayers[playerIndex].hand.push(card);
  });

  const initialLog: LogEntry = {
    id: 'log_0',
    turn: 1,
    message: '사건이 발생했습니다. 그랜드 벨벳 호텔의 조사가 시작됩니다.',
    type: 'event',
    timestamp: Date.now(),
  };

  return {
    phase: 'PLAYING_MOVE',
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
 * 플레이어 이동 처리
 */
export function movePlayer(state: GameState, targetRoomId: string): GameState {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const currentRoom = state.rooms.find(r => r.id === currentPlayer.currentRoomId);

  // 이동 가능 여부 검증 (인접한 방이거나 현재 방인 경우)
  if (!currentRoom?.adjacentRoomIds.includes(targetRoomId) && targetRoomId !== currentRoom?.id) {
    throw new Error('이동할 수 없는 방입니다.');
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
    message: `${currentPlayer.name}님이 [${targetRoom?.name}] (으)로 이동했습니다.`,
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
  const motive = state.allCards.find(c => c.id === suggestion.motiveId)?.name;

  const newLog: LogEntry = {
    id: `log_${Date.now()}_sugg`,
    turn: state.turnCount,
    message: `${asker.name}님의 질문: "범인은 ${suspect}, 장소는 ${location}, 도구는 ${weapon}, 동기는 ${motive}일 것이다."`,
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
    suggestion.motiveId,
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

  return null; // 아무도 반증할 수 없음
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
    const card = state.allCards.find(c => c.id === shownCardId);
    newLog = {
      id: `log_${Date.now()}_disprove`,
      turn: state.turnCount,
      message: `${responder.name}님이 ${asker.name}님에게 증거 1장을 은밀히 제시하여 반증했습니다.`,
      type: 'disprove',
      timestamp: Date.now(),
    };
  } else {
    newLog = {
      id: `log_${Date.now()}_disprove_none`,
      turn: state.turnCount,
      message: '아무도 이 가설을 반증하지 못했습니다! (정답에 매우 근접)',
      type: 'disprove',
      timestamp: Date.now(),
    };
  }

  // 다음 플레이어로 턴 넘기기
  return nextTurn({
    ...state,
    currentSuggestion: undefined,
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
    accusation.weaponId === sol.weaponId &&
    accusation.motiveId === sol.motiveId;

  if (isCorrect) {
    const winLog: LogEntry = {
      id: `log_${Date.now()}_win`,
      turn: state.turnCount,
      message: `🎉 [사건 해결!] ${player.name}님이 진실을 밝혀냈습니다! 승리!`,
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
    // 오답 시 탈락(더 이상 질문 불가, 반증만 참여)
    const updatedPlayers = state.players.map((p, idx) => 
      idx === state.currentPlayerIndex ? { ...p, isEliminated: true } : p
    );

    const failLog: LogEntry = {
      id: `log_${Date.now()}_fail`,
      turn: state.turnCount,
      message: `❌ ${player.name}님의 최종 고발이 빗나갔습니다! 현장에서 배제됩니다.`,
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
  // 살아있는 플레이어가 있는지 검사
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
          message: '모든 탐정의 추리가 실패하여 사건이 미궁에 빠졌습니다.',
          type: 'event',
          timestamp: Date.now(),
        },
      ],
    };
  }

  let nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
  // 탈락한 플레이어는 건너뜀
  while (state.players[nextIndex].isEliminated) {
    nextIndex = (nextIndex + 1) % state.players.length;
  }

  const nextTurnCount = nextIndex === 0 ? state.turnCount + 1 : state.turnCount;

  // 최대 턴 초과 검사
  if (nextTurnCount > state.maxTurns) {
    return {
      ...state,
      phase: 'GAME_OVER',
      logs: [
        ...state.logs,
        {
          id: `log_${Date.now()}_timeout`,
          turn: state.turnCount,
          message: '시간 초과: 폭풍이 걷히고 범인이 영원히 도주했습니다.',
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
    phase: 'PLAYING_MOVE',
  };
}
