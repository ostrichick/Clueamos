import { describe, it, expect } from 'vitest';
import { initGame, rollDice } from './engine';
import { ALL_CARDS, SUSPECTS, LOCATION_CARDS, WEAPONS } from './data';
import {
  initAIMemory,
  recordShownCard,
  getRemainingCandidates,
  recordUndisprovenSuggestion,
  recordObservedDisprove,
  decideArthurAction,
  decideBlakeAction,
  shouldAIAccuse,
} from './ai';

function makeState() {
  return initGame({
    player1CharacterId: 'suspect_scarlett',
    player2CharacterId: 'suspect_mustard',
    locale: 'ko',
  });
}

function pickCardNotInHand(
  category: 'suspect' | 'location' | 'weapon',
  handIds: Set<string>
): { id: string; category: 'suspect' | 'location' | 'weapon' } {
  if (category === 'suspect') return { id: SUSPECTS.find(c => !handIds.has(c.id))!.id, category };
  if (category === 'location') return { id: LOCATION_CARDS.find(c => !handIds.has(c.id))!.id, category };
  return { id: WEAPONS.find(c => !handIds.has(c.id))!.id, category };
}

describe('AI 메모리', () => {
  it('initAIMemory: 자신의 손패는 IMPOSSIBLE, 나머지는 UNKNOWN으로 초기화된다', () => {
    const state = makeState();
    const ai = state.players[2];
    const memory = initAIMemory(ai);

    for (const card of ai.hand) {
      expect(memory.cardStatus.get(card.id)).toBe('IMPOSSIBLE');
    }
    for (const card of ALL_CARDS) {
      if (!ai.hand.some(h => h.id === card.id)) {
        expect(memory.cardStatus.get(card.id)).toBe('UNKNOWN');
      }
    }
  });

  it('recordShownCard: 보여준 카드는 IMPOSSIBLE로 마킹되고 해당 플레이어 소지 기록이 남는다', () => {
    const state = makeState();
    const ai = state.players[2];
    const memory = initAIMemory(ai);
    const other = state.players[1];

    const handIds = new Set(ai.hand.map(c => c.id));
    const card = pickCardNotInHand('weapon', handIds);

    recordShownCard(memory, other.id, card.id);

    expect(memory.cardStatus.get(card.id)).toBe('IMPOSSIBLE');
    expect(memory.knownPlayerCards.get(other.id)?.has(card.id)).toBe(true);
  });

  it('getRemainingCandidates: CONFIRMED 카드가 있으면 단독 후보, 없으면 미배제 후보 목록을 반환한다', () => {
    const state = makeState();
    const ai = state.players[2];
    const memory = initAIMemory(ai);

    const candidates = getRemainingCandidates(memory, 'weapon');
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every(c => c.category === 'weapon')).toBe(true);

    memory.cardStatus.set(candidates[0].id, 'CONFIRMED');
    const narrowed = getRemainingCandidates(memory, 'weapon');
    expect(narrowed).toHaveLength(1);
    expect(narrowed[0].id).toBe(candidates[0].id);
  });

  it('recordUndisprovenSuggestion: 내가 질문하고 아무도 반증 못 하면 3요소가 CONFIRMED로 확정되고 나머지는 소거된다', () => {
    const state = makeState();
    const ai = state.players[2];
    const memory = initAIMemory(ai);
    const handIds = new Set(ai.hand.map(c => c.id));

    const s = pickCardNotInHand('suspect', handIds);
    const l = pickCardNotInHand('location', handIds);
    const w = pickCardNotInHand('weapon', handIds);

    recordUndisprovenSuggestion(
      memory,
      { askerId: ai.id, suspectId: s.id, locationId: l.id, weaponId: w.id },
      ai.hand,
      'ai_logic'
    );

    expect(memory.cardStatus.get(s.id)).toBe('CONFIRMED');
    expect(memory.cardStatus.get(l.id)).toBe('CONFIRMED');
    expect(memory.cardStatus.get(w.id)).toBe('CONFIRMED');

    // 같은 카테고리의 다른 카드는 IMPOSSIBLE
    expect(SUSPECTS.every(c => c.id === s.id || memory.cardStatus.get(c.id) === 'IMPOSSIBLE')).toBe(true);
    expect(LOCATION_CARDS.every(c => c.id === l.id || memory.cardStatus.get(c.id) === 'IMPOSSIBLE')).toBe(true);
    expect(WEAPONS.every(c => c.id === w.id || memory.cardStatus.get(c.id) === 'IMPOSSIBLE')).toBe(true);
  });

  it('내 질문에 손패의 카드를 포함했다면 무반증이어도 그 카드는 정답으로 확정하지 않는다', () => {
    const state = makeState();
    const asker = { ...state.players[2], hand: [LOCATION_CARDS[0]] };
    const memory = initAIMemory(asker);
    const suggestion = {
      askerId: asker.id,
      suspectId: SUSPECTS[0].id,
      locationId: LOCATION_CARDS[0].id,
      weaponId: WEAPONS[0].id,
    };

    recordUndisprovenSuggestion(memory, suggestion, asker.hand, 'ai_logic');

    expect(memory.cardStatus.get(suggestion.locationId)).toBe('IMPOSSIBLE');
    expect(memory.cardStatus.get(suggestion.suspectId)).toBe('CONFIRMED');
    expect(memory.cardStatus.get(suggestion.weaponId)).toBe('CONFIRMED');
  });

  it('다른 논리형 AI의 무반증 질문도 질문자 손패 가능성 때문에 확정할 수 없다', () => {
    const state = makeState();
    const observer = { ...state.players[3], hand: [WEAPONS[1]] };
    const memory = initAIMemory(observer);
    const suggestion = {
      askerId: state.players[2].id,
      suspectId: SUSPECTS[0].id,
      locationId: LOCATION_CARDS[0].id,
      weaponId: WEAPONS[0].id,
    };
    // 질문자가 LOCATION_CARDS[0]을 소유하고 있고, 다른 누구도 제시한 카드를
    // 갖고 있지 않다면 무반증이더라도 LOCATION_CARDS[0]은 정답이 될 수 없다.
    recordUndisprovenSuggestion(memory, suggestion, observer.hand, 'ai_logic');

    expect(memory.cardStatus.get(suggestion.locationId)).toBe('POSSIBLE');
    expect(memory.cardStatus.get(LOCATION_CARDS[1].id)).toBe('UNKNOWN');
    expect(getRemainingCandidates(memory, 'location')).toContainEqual(LOCATION_CARDS[1]);
    expect(memory.cardStatus.get(suggestion.suspectId)).toBe('POSSIBLE');
    expect(memory.cardStatus.get(suggestion.weaponId)).toBe('POSSIBLE');

    // 이미 확정한 사실을 다른 사람의 질문만으로 약화시키지 않는다.
    memory.cardStatus.set(suggestion.suspectId, 'CONFIRMED');
    recordUndisprovenSuggestion(memory, suggestion, observer.hand, 'ai_logic');
    expect(memory.cardStatus.get(suggestion.suspectId)).toBe('CONFIRMED');
  });

  it('recordUndisprovenSuggestion: 블러핑 가능성이 있는 상대의 무반증은 POSSIBLE 처리한다', () => {
    const state = makeState();
    const ai = state.players[2];
    const memory = initAIMemory(ai);
    const handIds = new Set(ai.hand.map(c => c.id));

    const s = pickCardNotInHand('suspect', handIds);

    recordUndisprovenSuggestion(
      memory,
      { askerId: state.players[1].id, suspectId: s.id, locationId: s.id, weaponId: s.id },
      ai.hand,
      'human'
    );

    expect(memory.cardStatus.get(s.id)).toBe('POSSIBLE');
  });

  it('recordObservedDisprove: 후보가 1장으로 좁혀지면 반증자의 보유 카드로 확정한다', () => {
    const state = makeState();
    const ai = { ...state.players[2], hand: [WEAPONS[0], LOCATION_CARDS[0]] };
    const memory = initAIMemory(ai);
    const responder = state.players[1];
    const handIds = new Set(ai.hand.map(c => c.id));

    // AI 손패에 있는 흉기 + 장소, 그리고 손패에 없는 용의자
    const weaponInHand = WEAPONS.find(c => handIds.has(c.id))!;
    const locationInHand = LOCATION_CARDS.find(c => handIds.has(c.id))!;
    const suspectNotInHand = SUSPECTS.find(c => !handIds.has(c.id))!;

    recordObservedDisprove(
      memory,
      { askerId: state.players[1].id, suspectId: suspectNotInHand.id, locationId: locationInHand.id, weaponId: weaponInHand.id },
      responder.id,
      ai.hand
    );

    expect(memory.cardStatus.get(suspectNotInHand.id)).toBe('IMPOSSIBLE');
    expect(memory.knownPlayerCards.get(responder.id)?.has(suspectNotInHand.id)).toBe(true);
  });
});

describe('AI 행동 결정', () => {
  function memoryWithSingleCandidates(ai): ReturnType<typeof initAIMemory> {
    const memory = initAIMemory(ai);
    const handIds = new Set(ai.hand.map(c => c.id));
    const s = pickCardNotInHand('suspect', handIds);
    const l = pickCardNotInHand('location', handIds);
    const w = pickCardNotInHand('weapon', handIds);

    SUSPECTS.forEach(c => { if (c.id !== s.id) memory.cardStatus.set(c.id, 'IMPOSSIBLE'); });
    LOCATION_CARDS.forEach(c => { if (c.id !== l.id) memory.cardStatus.set(c.id, 'IMPOSSIBLE'); });
    WEAPONS.forEach(c => { if (c.id !== w.id) memory.cardStatus.set(c.id, 'IMPOSSIBLE'); });

    return { memory, solution: { suspectId: s.id, locationId: l.id, weaponId: w.id } };
  }

  it('아서: 3개 카테고리 후보가 모두 1장씩 남으면 최종 고발한다', () => {
    const state = makeState();
    const ai = state.players[2];
    const { memory, solution } = memoryWithSingleCandidates(ai);

    const action = decideArthurAction(state, memory);
    expect(action.type).toBe('ACCUSE');
    if (action.type === 'ACCUSE') {
      expect(action.accusation).toEqual(solution);
    }
  });

  it('아서: 고발 조건이 아니면 MOVE_AND_SUGGEST와 유효한 질문 조합을 반환한다', () => {
    const state = makeState();
    const ai = state.players[2];
    const memory = initAIMemory(ai);

    const action = decideArthurAction(state, memory);
    expect(action.type).toBe('MOVE_AND_SUGGEST');
    if (action.type === 'MOVE_AND_SUGGEST') {
      expect(action.targetRoomId).toBeTruthy();
      expect(action.suggestion.suspectId).toBeTruthy();
      expect(action.suggestion.weaponId).toBeTruthy();
    }
  });

  it('아서: 주사위를 굴린 후 결정된 방은 도달 가능한 후보에서 선택된다', () => {
    const state = initGame({ seed: 4242 });
    const ai = state.players[2];
    const rolledState = rollDice({ ...state, currentPlayerIndex: 2 });
    const memory = initAIMemory(ai);

    const action = decideArthurAction(rolledState, memory);
    expect(action.type).toBe('MOVE_AND_SUGGEST');
    if (action.type === 'MOVE_AND_SUGGEST') {
      const candidates = rolledState.accessibleRoomIds ?? [rolledState.players[2].currentRoomId];
      expect(candidates).toContain(action.targetRoomId);
    }
  });

  it('AI가 이동을 마친 상태에서 재결정해도 실제 현재 방으로만 질문한다', () => {
    const state = makeState();
    const currentRoomId = state.players[2].currentRoomId;
    const otherRoomId = LOCATION_CARDS.find(c => c.id !== currentRoomId)!.id;
    const moved = {
      ...state,
      currentPlayerIndex: 2,
      phase: 'PLAYING_SUGGEST' as const,
      accessibleRoomIds: [otherRoomId, currentRoomId],
    };
    const memory = initAIMemory(state.players[2]);

    const arthur = decideArthurAction(moved, memory);
    expect(arthur.type).toBe('MOVE_AND_SUGGEST');
    if (arthur.type === 'MOVE_AND_SUGGEST') {
      expect(arthur.targetRoomId).toBe(currentRoomId);
      expect(arthur.suggestion.locationId).toBe(currentRoomId);
    }

    const blake = decideBlakeAction(moved, initAIMemory(state.players[2]));
    expect(blake.type).toBe('MOVE_AND_SUGGEST');
    if (blake.type === 'MOVE_AND_SUGGEST') {
      expect(blake.targetRoomId).toBe(currentRoomId);
      expect(blake.suggestion.locationId).toBe(currentRoomId);
    }
  });

  it('블레이크: 정답 확률이 1/3 이상이면 초반에도 승부수 고발을 시도한다', () => {
    const state = makeState();
    const ai = state.players[2];
    const memory = narrowedMemory(ai, 1, 1, 3); // 1 × 1 × 3 => 1/3

    const action = decideBlakeAction(state, memory);
    expect(action.type).toBe('ACCUSE');
  });

  it('블레이크: 후보가 넉넉하면 MOVE_AND_SUGGEST를 반환한다', () => {
    const state = makeState();
    const ai = state.players[3];
    const memory = initAIMemory(ai);

    const action = decideBlakeAction(state, memory);
    expect(action.type).toBe('MOVE_AND_SUGGEST');
  });
});

describe('shouldAIAccuse', () => {
  it('3개 카테고리가 모두 1장씩 남으면 어떤 AI든 즉시 고발한다', () => {
    const state = makeState();
    const ai = state.players[3];
    const { memory, solution } = (() => {
      const memory = initAIMemory(ai);
      const handIds = new Set(ai.hand.map(c => c.id));
      const s = pickCardNotInHand('suspect', handIds);
      const l = pickCardNotInHand('location', handIds);
      const w = pickCardNotInHand('weapon', handIds);
      SUSPECTS.forEach(c => { if (c.id !== s.id) memory.cardStatus.set(c.id, 'IMPOSSIBLE'); });
      LOCATION_CARDS.forEach(c => { if (c.id !== l.id) memory.cardStatus.set(c.id, 'IMPOSSIBLE'); });
      WEAPONS.forEach(c => { if (c.id !== w.id) memory.cardStatus.set(c.id, 'IMPOSSIBLE'); });
      return { memory, solution: { suspectId: s.id, locationId: l.id, weaponId: w.id } };
    })();

    const result = shouldAIAccuse(ai, memory);
    expect(result).toEqual(solution);
  });

  it('아서: 정답 확률 1/2이면 막판(남은 라운드 4 이하)에만 고발한다', () => {
    const ai = makeState().players[2]; // ai_logic
    const memory = narrowedMemory(ai, 1, 2, 1);

    expect(shouldAIAccuse(ai, memory, 4, 16)).toBeNull();
    expect(shouldAIAccuse(ai, memory, 11, 16)).toBeNull();
    expect(shouldAIAccuse(ai, memory, 12, 16)).not.toBeNull();
  });

  it('아서: 정답 확률 1/3은 마지막 라운드에만 고발한다', () => {
    const ai = makeState().players[2]; // ai_logic
    const memory = narrowedMemory(ai, 1, 1, 3);

    expect(shouldAIAccuse(ai, memory, 15, 16)).toBeNull();
    expect(shouldAIAccuse(ai, memory, 16, 16)).not.toBeNull();
  });

  it('블레이크: 평소 1/3, 막판(남은 라운드 3 이하)에는 1/4 확률이면 고발한다', () => {
    const ai = makeState().players[3]; // ai_instinct
    expect(shouldAIAccuse(ai, initAIMemory(ai), 10, 16)).toBeNull();

    const quarter = narrowedMemory(ai, 1, 2, 2);
    expect(shouldAIAccuse(ai, quarter, 12, 16)).toBeNull();
    expect(shouldAIAccuse(ai, quarter, 13, 16)).not.toBeNull();
  });

  it('후보가 여럿이면 아무도 반증하지 못한(POSSIBLE) 카드를 우선 고발한다', () => {
    const ai = makeState().players[2];
    const memory = narrowedMemory(ai, 1, 2, 1);
    const locations = LOCATION_CARDS.filter(c => memory.cardStatus.get(c.id) !== 'IMPOSSIBLE');
    memory.cardStatus.set(locations[1].id, 'POSSIBLE');

    expect(shouldAIAccuse(ai, memory, 16, 16)?.locationId).toBe(locations[1].id);
  });
});

/** AI 손패에 없는 카드만 카테고리별로 지정한 수만큼 후보로 남긴 메모리 */
function narrowedMemory(ai: ReturnType<typeof makeState>['players'][number], suspects: number, locations: number, weapons: number) {
  const memory = initAIMemory(ai);
  const handIds = new Set(ai.hand.map(c => c.id));
  const keep = (cards: typeof SUSPECTS, count: number) => {
    const kept = new Set(cards.filter(c => !handIds.has(c.id)).slice(0, count).map(c => c.id));
    cards.forEach(c => { if (!kept.has(c.id)) memory.cardStatus.set(c.id, 'IMPOSSIBLE'); });
  };
  keep(SUSPECTS, suspects);
  keep(LOCATION_CARDS, locations);
  keep(WEAPONS, weapons);
  return memory;
}
