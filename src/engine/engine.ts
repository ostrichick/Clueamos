import { 
  Card, 
  Player, 
  Solution, 
  GameState, 
  GamePhase,
  Suggestion, 
  LogEntry 
} from './types';
import { SUSPECTS, LOCATION_CARDS, WEAPONS, LOCATIONS, ALL_CARDS, CHARACTER_PROFILES } from './data';
import { calculateReachablePaths } from './boardGrid';
import { translations, SupportedLocale } from '../i18n/translations';

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
  initialPhase?: GamePhase;
  isSinglePlayer?: boolean;
  player1CharacterId?: string;
  player2CharacterId?: string;
  player1Name?: string;
  player2Name?: string;
  locale?: SupportedLocale;
  maxTurns?: number;
}

/**
 * 플레이어 표시 이름 헬퍼 (로케일별 실시간 포맷팅)
 * 형식: 캐릭터이름+이모지(player 1), (player 2), (AI 1), (AI 2)
 */
export function getPlayerDisplayName(player: Player, locale: SupportedLocale = 'en'): string {
  const t = translations[locale] || translations.en;
  const charCard = t.cards[player.characterId];
  const charName = charCard?.name || player.name;

  if (player.roleType === 'p1') {
    return `${charName} (${t.player} 1)`;
  }
  if (player.roleType === 'p2') {
    return `${charName} (${t.player} 2)`;
  }
  if (player.roleType === 'ai1') {
    return `${charName} (${t.aiLabel} 1)`;
  }
  if (player.roleType === 'ai2') {
    return `${charName} (${t.aiLabel} 2)`;
  }
  if (player.roleType === 'ai3') {
    return `${charName} (${t.aiLabel} 3)`;
  }
  return player.name;
}

/**
 * 게임 초기화 함수
 */
export function initGame(options?: InitGameOptions): GameState {
  const isSingle = Boolean(options?.isSinglePlayer);
  const locale = options?.locale || 'en';
  const t = translations[locale] || translations.en;
  const p1CharId = options?.player1CharacterId || 'suspect_scarlett';
  let p2CharId = options?.player2CharacterId;
  if (!p2CharId || p2CharId === p1CharId) {
    p2CharId = p1CharId === 'suspect_mustard' ? 'suspect_scarlett' : 'suspect_mustard';
  }
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

  // 2. 플레이어 캐릭터 및 AI 무작위 캐릭터 할당
  // 남은 4명의 용의자 중 2명을 AI 1, AI 2로 무작위 선발
  const remainingSuspects = shuffle(
    SUSPECTS.filter(s => s.id !== p1CharId && s.id !== p2CharId)
  );
  const ai1CharId = remainingSuspects[0].id;
  const ai2CharId = remainingSuspects[1].id;

  const p1Profile = CHARACTER_PROFILES[p1CharId] || CHARACTER_PROFILES.suspect_scarlett;
  const p2Profile = CHARACTER_PROFILES[p2CharId] || CHARACTER_PROFILES.suspect_mustard;
  const ai1Profile = CHARACTER_PROFILES[ai1CharId] || CHARACTER_PROFILES.suspect_green;
  const ai2Profile = CHARACTER_PROFILES[ai2CharId] || CHARACTER_PROFILES.suspect_peacock;

  const rawPlayers: Omit<Player, 'name'>[] = [
    {
      id: 'p1',
      characterId: p1CharId,
      roleType: 'p1',
      type: 'human',
      avatar: p1Profile.avatar,
      color: p1Profile.color,
      currentRoomId: p1Profile.defaultRoomId,
      hand: [],
      isEliminated: false,
      score: 0,
    },
    {
      id: 'p2',
      characterId: p2CharId,
      roleType: isSingle ? 'ai1' : 'p2',
      type: isSingle ? 'ai_logic' : 'human',
      avatar: p2Profile.avatar,
      color: p2Profile.color,
      currentRoomId: p2Profile.defaultRoomId,
      hand: [],
      isEliminated: false,
      score: 0,
    },
    {
      id: 'ai_1',
      characterId: ai1CharId,
      roleType: isSingle ? 'ai2' : 'ai1',
      type: 'ai_logic',
      avatar: ai1Profile.avatar,
      color: ai1Profile.color,
      currentRoomId: ai1Profile.defaultRoomId,
      hand: [],
      isEliminated: false,
      score: 0,
    },
    {
      id: 'ai_2',
      characterId: ai2CharId,
      roleType: isSingle ? 'ai3' : 'ai2',
      type: 'ai_instinct',
      avatar: ai2Profile.avatar,
      color: ai2Profile.color,
      currentRoomId: ai2Profile.defaultRoomId,
      hand: [],
      isEliminated: false,
      score: 0,
    },
  ];

  const initialPlayers: Player[] = rawPlayers.map(p => ({
    ...p,
    name: getPlayerDisplayName(p as Player, locale),
  }));

  // 18장의 카드를 4명에게 분배
  shuffledDeck.forEach((card, index) => {
    const playerIndex = index % initialPlayers.length;
    initialPlayers[playerIndex].hand.push(card);
  });

  const initialLog: LogEntry = {
    id: 'log_0',
    turn: 1,
    message: t.logMessages?.start || 'The murder investigation at Grand Velvet Hotel has begun.',
    type: 'event',
    timestamp: Date.now(),
  };

  return {
    phase: options?.initialPhase || 'PLAYING_ROLL',
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

/** 각 주사위의 최대 눈금 (1~3 눈금, 주사위 2개 합산 2~6으로 맨션 도달 거리 밸런스 최적화) */
export const DIE_MAX_VALUE = 3;

/**
 * 주사위 굴리기 (주사위 2개, 2~6 눈금 합산)
 * 13x13 복도 그리드 BFS 경로 탐색으로 도달 가능한 방 목록 및 비밀 통로 계산
 */
export function rollDice(state: GameState, maxVal: number = DIE_MAX_VALUE): GameState {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const d1 = Math.floor(Math.random() * maxVal) + 1;
  const d2 = Math.floor(Math.random() * maxVal) + 1;
  const diceValue = d1 + d2;

  const { reachableRoomIds } = calculateReachablePaths(currentPlayer.currentRoomId, diceValue);

  const newLog: LogEntry = {
    id: `log_${Date.now()}_dice`,
    turn: state.turnCount,
    message: `🎲 ${currentPlayer.name} rolled [${d1}, ${d2}] = ${diceValue}! (${reachableRoomIds.length} destinations reachable)`,
    type: 'event',
    timestamp: Date.now(),
  };

  return {
    ...state,
    phase: 'PLAYING_MOVE',
    currentDiceRoll: diceValue,
    diceRolls: [d1, d2],
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
    metadata: {
      askerId: asker.id,
      suspectId: suggestion.suspectId,
      locationId: suggestion.locationId,
      weaponId: suggestion.weaponId,
    },
  };

  const logs = [...state.logs, newLog];

  // Classic Clue Rule: If a player is playing the suggested suspect, summon them to this room!
  const updatedPlayers = state.players.map(p => {
    if (p.characterId === suggestion.suspectId && p.currentRoomId !== suggestion.locationId) {
      logs.push({
        id: `log_${Date.now()}_summon_${p.id}`,
        turn: state.turnCount,
        message: `🚨 [Summoned] ${p.name} was summoned to the ${location} for questioning!`,
        type: 'event',
        timestamp: Date.now() + 1,
      });
      return { ...p, currentRoomId: suggestion.locationId };
    }
    return p;
  });

  return {
    ...state,
    players: updatedPlayers,
    currentSuggestion: fullSuggestion,
    phase: 'WAITING_DISPROVE',
    logs,
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
 * 정통 클루 룰: 오답으로 탈락한 플레이어라도 손패의 카드는 여전히 유효하므로 반증 의무를 수행함!
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

    const disprovable = getDisprovableCards(targetPlayer, suggestion);
    if (disprovable.length > 0) {
      return { playerIndex: targetIdx, availableCards: disprovable };
    }
  }

  return null;
}

/**
 * 주사위 굴림 후 방에 진입하지 않고 복도에서 대기(턴 넘기기)
 */
export function waitInHallway(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex];
  const waitLog: LogEntry = {
    id: `log_${Date.now()}_wait`,
    turn: state.turnCount,
    message: `🚶 ${player.name} waited in the hallway.`,
    type: 'event',
    timestamp: Date.now(),
  };

  return {
    ...state,
    phase: 'PLAYING_ACTION_DONE',
    currentDiceRoll: undefined,
    diceRolls: undefined,
    accessibleRoomIds: undefined,
    logs: [...state.logs, waitLog],
  };
}

/**
 * 반증 수행 및 행동 완료(PLAYING_ACTION_DONE) 전환
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
      metadata: {
        askerId: asker.id,
        responderId: responder.id,
        shownCardId,
        suspectId: state.currentSuggestion?.suspectId,
        locationId: state.currentSuggestion?.locationId,
        weaponId: state.currentSuggestion?.weaponId,
      },
    };
  } else {
    newLog = {
      id: `log_${Date.now()}_disprove_none`,
      turn: state.turnCount,
      message: 'Nobody could disprove this hypothesis! (Very close to truth)',
      type: 'disprove',
      timestamp: Date.now(),
      metadata: {
        askerId: asker.id,
        responderId: 'none',
        suspectId: state.currentSuggestion?.suspectId,
        locationId: state.currentSuggestion?.locationId,
        weaponId: state.currentSuggestion?.weaponId,
      },
    };
  }

  return {
    ...state,
    phase: 'PLAYING_ACTION_DONE',
    currentSuggestion: undefined,
    currentDiceRoll: undefined,
    diceRolls: undefined,
    accessibleRoomIds: undefined,
    logs: [...state.logs, newLog],
  };
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

  const nextTurnCount = nextIndex <= state.currentPlayerIndex ? state.turnCount + 1 : state.turnCount;

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
    diceRolls: undefined,
    accessibleRoomIds: undefined,
  };
}
