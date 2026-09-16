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
    const ai = state.players[2];
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

  it('블레이크: 남은 후보 총합이 5 이하이면 승부수 고발을 시도한다', () => {
    const state = makeState();
    const ai = state.players[2];
    const { memory, solution } = memoryWithSingleCandidates(ai);
    // 용의자 1 + 장소 2 + 흉기 2 = 5개
    const handIds = new Set(ai.hand.map(c => c.id));
    const s = pickCardNotInHand('suspect', handIds);
    const l = pickCardNotInHand('location', handIds);
    const w = pickCardNotInHand('weapon', handIds);
    SUSPECTS.forEach(c => { if (c.id !== s.id) memory.cardStatus.set(c.id, 'IMPOSSIBLE'); });
    const l2 = LOCATION_CARDS.find(c => c.id !== l.id && !handIds.has(c.id))!;
    LOCATION_CARDS.forEach(c => {
      if (c.id !== l.id && c.id !== l2.id) memory.cardStatus.set(c.id, 'IMPOSSIBLE');
    });
    const w2 = WEAPONS.find(c => c.id !== w.id && !handIds.has(c.id))!;
    WEAPONS.forEach(c => {
      if (c.id !== w.id && c.id !== w2.id) memory.cardStatus.set(c.id, 'IMPOSSIBLE');
    });

    const action = decideBlakeAction(state, memory);
    expect(action.type).toBe('ACCUSE');
    void solution;
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

  it('아서: 2개 카테고리 확정 + 1개 2장 이하의 경우 4라운드 이후에만 고발한다', () => {
    const state = makeState();
    const ai = state.players[2]; // ai_logic
    const memory = initAIMemory(ai);
    const handIds = new Set(ai.hand.map(c => c.id));

    const s = pickCardNotInHand('suspect', handIds);
    const w = pickCardNotInHand('weapon', handIds);
    SUSPECTS.forEach(c => { if (c.id !== s.id) memory.cardStatus.set(c.id, 'IMPOSSIBLE'); });
    WEAPONS.forEach(c => { if (c.id !== w.id) memory.cardStatus.set(c.id, 'IMPOSSIBLE'); });
    // 장소 후보를 2장으로만 축소 (용의자·흉기 확정 + 장소 2장 => 규칙 2a)
    const remaining = LOCATION_CARDS.filter(c => !handIds.has(c.id)).slice(0, 2);
    LOCATION_CARDS.forEach(c => { if (!remaining.includes(c)) memory.cardStatus.set(c.id, 'IMPOSSIBLE'); });

    // 4라운드 미만 -> 고발 보류
    expect(shouldAIAccuse(ai, memory, 2)).toBeNull();
    // 4라운드 이상 -> 고발 (후보 중 하나를 추리)
    expect(shouldAIAccuse(ai, memory, 4)).not.toBeNull();
  });

  it('블레이크: 남은 후보 총합이 5 이하이면 고발, 아니면 null을 반환한다', () => {
    const state = makeState();
    const ai = state.players[3]; // ai_instinct
    const memory = initAIMemory(ai);

    expect(shouldAIAccuse(ai, memory, 10)).toBeNull();
  });
});