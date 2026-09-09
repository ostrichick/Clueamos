import { Card, GameState, Player, Suggestion, Solution } from './types';
import { ALL_CARDS, SUSPECTS, LOCATION_CARDS, WEAPONS, MOTIVES } from './data';

export type DeductionMark = 'UNKNOWN' | 'POSSIBLE' | 'IMPOSSIBLE' | 'CONFIRMED';

export interface AIMemory {
  playerId: string;
  // 각 카드가 정답일 가능성에 대한 판단
  cardStatus: Map<string, DeductionMark>;
  // 다른 플레이어가 가지고 있는 것으로 확인된 카드
  knownPlayerCards: Map<string, Set<string>>; // playerId -> Set<cardId>
  // 질문/반증 히스토리 요약
  pastSuggestions: Suggestion[];
}

/**
 * AI의 두뇌 메모리 초기화
 * 1. 자신이 받은 손패는 'IMPOSSIBLE'(정답이 아님)으로 확정
 * 2. 나머지는 'UNKNOWN'으로 시작
 */
export function initAIMemory(player: Player): AIMemory {
  const cardStatus = new Map<string, DeductionMark>();
  const knownPlayerCards = new Map<string, Set<string>>();

  // 모든 카드를 UNKNOWN으로 설정
  ALL_CARDS.forEach(c => cardStatus.set(c.id, 'UNKNOWN'));

  // 자신의 손패는 확실히 정답이 아니므로 IMPOSSIBLE 마킹
  const myCards = new Set<string>();
  player.hand.forEach(c => {
    cardStatus.set(c.id, 'IMPOSSIBLE');
    myCards.add(c.id);
  });
  knownPlayerCards.set(player.id, myCards);

  return {
    playerId: player.id,
    cardStatus,
    knownPlayerCards,
    pastSuggestions: [],
  };
}

/**
 * AI 메모리 갱신: 다른 플레이어가 자신에게 카드를 보여주었을 때
 */
export function recordShownCard(memory: AIMemory, showerPlayerId: string, cardId: string): void {
  // 특정 플레이어가 이 카드를 가지고 있음을 기억 -> 정답 봉투에 없으므로 IMPOSSIBLE
  memory.cardStatus.set(cardId, 'IMPOSSIBLE');
  
  if (!memory.knownPlayerCards.has(showerPlayerId)) {
    memory.knownPlayerCards.set(showerPlayerId, new Set());
  }
  memory.knownPlayerCards.get(showerPlayerId)?.add(cardId);
}

/**
 * 카테고리별로 아직 배제되지 않은(UNKNOWN / POSSIBLE) 카드 후보 반환
 */
export function getRemainingCandidates(memory: AIMemory, category: 'suspect' | 'location' | 'weapon' | 'motive'): Card[] {
  let sourceList: Card[] = [];
  if (category === 'suspect') sourceList = SUSPECTS;
  else if (category === 'location') sourceList = LOCATION_CARDS;
  else if (category === 'weapon') sourceList = WEAPONS;
  else if (category === 'motive') sourceList = MOTIVES;

  return sourceList.filter(c => memory.cardStatus.get(c.id) !== 'IMPOSSIBLE');
}

/**
 * AI 행동 결정 결과
 */
export type AIAction = 
  | { type: 'MOVE_AND_SUGGEST'; targetRoomId: string; suggestion: Omit<Suggestion, 'askerId'> }
  | { type: 'ACCUSE'; accusation: Solution };

/**
 * 1. 아서(Arthur) - 논리 소거형 AI 알고리즘
 * - 체계적으로 남은 후보군 중 하나를 선택해 질문
 * - 4개 카테고리 중 단 1개의 후보만 남았을 때(확신도 100%) 최종 고발 단행
 */
export function decideArthurAction(state: GameState, memory: AIMemory): AIAction {
  const me = state.players[state.currentPlayerIndex];
  const suspectCandidates = getRemainingCandidates(memory, 'suspect');
  const locationCandidates = getRemainingCandidates(memory, 'location');
  const weaponCandidates = getRemainingCandidates(memory, 'weapon');
  const motiveCandidates = getRemainingCandidates(memory, 'motive');

  // 확신도 검사: 모든 카테고리 후보가 1개씩만 남았다면 즉시 최종 고발!
  if (
    suspectCandidates.length === 1 &&
    locationCandidates.length === 1 &&
    weaponCandidates.length === 1 &&
    motiveCandidates.length === 1
  ) {
    return {
      type: 'ACCUSE',
      accusation: {
        suspectId: suspectCandidates[0].id,
        locationId: locationCandidates[0].id,
        weaponId: weaponCandidates[0].id,
        motiveId: motiveCandidates[0].id,
      },
    };
  }

  // 이동할 방 결정: 주사위로 도달 가능한 방(state.accessibleRoomIds) 중 미지의 방 선호
  const accessible = state.accessibleRoomIds || [me.currentRoomId];

  // 도달 가능한 방 중 아직 용의선상에 있는 방 우선 선택
  const targetRoomId = accessible.find(roomId => 
    locationCandidates.some(c => c.id === roomId)
  ) || accessible[Math.floor(Math.random() * accessible.length)];

  // 질문할 카드 조합: 아직 모르는 후보 중에서 선별
  const suspect = suspectCandidates[Math.floor(Math.random() * suspectCandidates.length)] || SUSPECTS[0];
  const weapon = weaponCandidates[Math.floor(Math.random() * weaponCandidates.length)] || WEAPONS[0];
  const motive = motiveCandidates[Math.floor(Math.random() * motiveCandidates.length)] || MOTIVES[0];

  return {
    type: 'MOVE_AND_SUGGEST',
    targetRoomId,
    suggestion: {
      suspectId: suspect.id,
      locationId: targetRoomId,
      weaponId: weapon.id,
      motiveId: motive.id,
    },
  };
}

/**
 * 2. 블레이크(Blake) - 직감 & 블러핑형 AI 알고리즘
 * - 3개 카테고리가 1개씩 남고 나머지 1개가 2개 이하일 때 과감하게 고발(확률 50~60% 승부수)
 * - 25% 확률로 자신이 가진 카드를 질문에 섞어 블러핑 시도
 */
export function decideBlakeAction(state: GameState, memory: AIMemory): AIAction {
  const me = state.players[state.currentPlayerIndex];
  const suspectCandidates = getRemainingCandidates(memory, 'suspect');
  const locationCandidates = getRemainingCandidates(memory, 'location');
  const weaponCandidates = getRemainingCandidates(memory, 'weapon');
  const motiveCandidates = getRemainingCandidates(memory, 'motive');

  // 과감한 승부수: 총 후보 수 합이 5 이하(거의 좁혀짐)면 바로 최종 고발 시도!
  const totalCandidates = suspectCandidates.length + locationCandidates.length + weaponCandidates.length + motiveCandidates.length;
  if (totalCandidates <= 5) {
    return {
      type: 'ACCUSE',
      accusation: {
        suspectId: suspectCandidates[0].id,
        locationId: locationCandidates[0].id,
        weaponId: weaponCandidates[0].id,
        motiveId: motiveCandidates[0].id,
      },
    };
  }

  // 이동 결정 (도달 가능한 방 중 선택)
  const accessible = state.accessibleRoomIds || [me.currentRoomId];
  const targetRoomId = accessible[Math.floor(Math.random() * accessible.length)];

  // 블러핑 기법: 25% 확률로 자신의 손패에 있는 카드를 질문에 섞음
  const isBluffing = Math.random() < 0.25 && me.hand.length > 0;
  let weapon = weaponCandidates[Math.floor(Math.random() * weaponCandidates.length)] || WEAPONS[0];
  
  if (isBluffing) {
    const myWeapon = me.hand.find(c => c.category === 'weapon');
    if (myWeapon) weapon = myWeapon;
  }

  const suspect = suspectCandidates[Math.floor(Math.random() * suspectCandidates.length)] || SUSPECTS[0];
  const motive = motiveCandidates[Math.floor(Math.random() * motiveCandidates.length)] || MOTIVES[0];

  return {
    type: 'MOVE_AND_SUGGEST',
    targetRoomId,
    suggestion: {
      suspectId: suspect.id,
      locationId: targetRoomId,
      weaponId: weapon.id,
      motiveId: motive.id,
    },
  };
}
