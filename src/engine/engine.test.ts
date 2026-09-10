import { describe, it, expect } from 'vitest';
import { 
  initGame, 
  rollDice,
  movePlayer, 
  makeSuggestion, 
  findNextDisprovingPlayer, 
  makeAccusation 
} from './engine';

describe('Clueamos Core Game Engine', () => {
  it('게임 초기화 시 정답 봉투(4요소)와 4인 플레이어에게 카드가 정상 분배되어야 한다', () => {
    const state = initGame({ 
      player1CharacterId: 'suspect_scarlett', 
      player2CharacterId: 'suspect_mustard',
      locale: 'ko',
    });

    // 1. 4인 플레이어 존재 검증
    expect(state.players).toHaveLength(4);
    expect(state.players[0].name).toContain('미스 스칼렛');
    expect(state.players[0].name).toContain('플레이어 1');
    expect(state.players[1].name).toContain('커널 머스타드');
    expect(state.players[1].name).toContain('플레이어 2');
    expect(state.players[2].type).toBe('ai_logic');
    expect(state.players[3].type).toBe('ai_instinct');
    expect(state.players[2].name).toContain('AI 1');
    expect(state.players[3].name).toContain('AI 2');

    // 2. 정답 봉투 검증 (각 카테고리 1장씩 총 3장)
    expect(state.solution.suspectId).toBeDefined();
    expect(state.solution.locationId).toBeDefined();
    expect(state.solution.weaponId).toBeDefined();

    // 3. 전체 카드 분배 검증 (18장 - 3장 = 15장이 4명에게 분배됨)
    const totalDistributedCards = state.players.reduce((sum, p) => sum + p.hand.length, 0);
    expect(totalDistributedCards).toBe(15);

    // 4. 정답 카드는 어떤 플레이어의 손패에도 없어야 함
    const allHandCardIds = state.players.flatMap(p => p.hand.map(c => c.id));
    expect(allHandCardIds).not.toContain(state.solution.suspectId);
    expect(allHandCardIds).not.toContain(state.solution.locationId);
    expect(allHandCardIds).not.toContain(state.solution.weaponId);
  });

  it('AI 0명 설정 시 1:1 진검승부(2인 플레이)로 카드가 8장/7장 분배되어야 한다', () => {
    const state = initGame({
      player1CharacterId: 'suspect_scarlett',
      player2CharacterId: 'suspect_mustard',
      aiPlayerCount: 0,
      locale: 'ko',
    });

    expect(state.players).toHaveLength(2);
    expect(state.players[0].roleType).toBe('p1');
    expect(state.players[1].roleType).toBe('p2');
    expect(state.players[0].type).toBe('human');
    expect(state.players[1].type).toBe('human');

    const totalDistributed = state.players.reduce((sum, p) => sum + p.hand.length, 0);
    expect(totalDistributed).toBe(15);
    expect(state.players[0].hand.length).toBe(8);
    expect(state.players[1].hand.length).toBe(7);
  });

  it('AI 4명 설정 시 6인 풀파티로 모든 용의자가 참여해야 한다', () => {
    const state = initGame({
      player1CharacterId: 'suspect_scarlett',
      player2CharacterId: 'suspect_mustard',
      aiPlayerCount: 4,
      locale: 'ko',
    });

    expect(state.players).toHaveLength(6);
    expect(state.players[0].roleType).toBe('p1');
    expect(state.players[1].roleType).toBe('p2');
    expect(state.players[2].roleType).toBe('ai1');
    expect(state.players[3].roleType).toBe('ai2');
    expect(state.players[4].roleType).toBe('ai3');
    expect(state.players[5].roleType).toBe('ai4');

    const totalDistributed = state.players.reduce((sum, p) => sum + p.hand.length, 0);
    expect(totalDistributed).toBe(15);
  });

  it('싱글 플레이 기본 옵션은 1 Player vs 1 AI (총 2인, 8장/7장 분배)이어야 한다', () => {
    const state = initGame({
      isSinglePlayer: true,
      player1CharacterId: 'suspect_scarlett',
      locale: 'ko',
    });

    expect(state.players).toHaveLength(2);
    expect(state.players[0].roleType).toBe('p1');
    expect(state.players[0].type).toBe('human');
    expect(state.players[1].roleType).toBe('ai1');
    expect(state.players[1].type.startsWith('ai_')).toBe(true);

    const totalDistributed = state.players.reduce((sum, p) => sum + p.hand.length, 0);
    expect(totalDistributed).toBe(15);
    expect(state.players[0].hand.length).toBe(8);
    expect(state.players[1].hand.length).toBe(7);
  });

  it('싱글 플레이에서 AI 5명 설정 시 1 Player vs 5 AIs (총 6인 풀파티)로 생성되어야 한다', () => {
    const state = initGame({
      isSinglePlayer: true,
      player1CharacterId: 'suspect_scarlett',
      aiPlayerCount: 5,
      locale: 'ko',
    });

    expect(state.players).toHaveLength(6);
    expect(state.players[0].roleType).toBe('p1');
    expect(state.players[0].type).toBe('human');
    for (let i = 1; i <= 5; i++) {
      expect(state.players[i].roleType).toBe(`ai${i}`);
      expect(state.players[i].type.startsWith('ai_')).toBe(true);
    }

    const totalDistributed = state.players.reduce((sum, p) => sum + p.hand.length, 0);
    expect(totalDistributed).toBe(15);
  });

  it('주사위를 굴리고 도달 가능한 방으로 이동할 수 있어야 한다', () => {
    const state = initGame();
    expect(state.phase).toBe('PLAYING_ROLL');

    // 주사위 굴리기 (주사위 2개, 1~3 눈금, 합계 2~6)
    const rolledState = rollDice(state);
    expect(rolledState.phase).toBe('PLAYING_MOVE');
    expect(rolledState.currentDiceRoll).toBeGreaterThanOrEqual(2);
    expect(rolledState.currentDiceRoll).toBeLessThanOrEqual(6);
    expect(rolledState.diceRolls).toHaveLength(2);
    expect(rolledState.diceRolls![0]).toBeGreaterThanOrEqual(1);
    expect(rolledState.diceRolls![0]).toBeLessThanOrEqual(3);
    expect(rolledState.diceRolls![1]).toBeGreaterThanOrEqual(1);
    expect(rolledState.diceRolls![1]).toBeLessThanOrEqual(3);
    expect(rolledState.currentDiceRoll).toBe(rolledState.diceRolls![0] + rolledState.diceRolls![1]);
    expect(rolledState.accessibleRoomIds?.length).toBeGreaterThan(0);

    // 도달 가능한 첫 번째 방으로 이동
    const targetRoomId = rolledState.accessibleRoomIds![0];
    const movedState = movePlayer(rolledState, targetRoomId);
    expect(movedState.players[0].currentRoomId).toBe(targetRoomId);
    expect(movedState.phase).toBe('PLAYING_SUGGEST');
  });

  it('질문(Suggestion) 생성 시 반증 플레이어가 감지되어야 한다', () => {
    const state = initGame();

    // 질문 가설 생성
    const suggestState = makeSuggestion(state, {
      suspectId: state.allCards.find(c => c.category === 'suspect')!.id,
      locationId: state.allCards.find(c => c.category === 'location')!.id,
      weaponId: state.allCards.find(c => c.category === 'weapon')!.id,
    });

    expect(suggestState.currentSuggestion).toBeDefined();
    expect(suggestState.phase).toBe('WAITING_DISPROVE');

    // 반증 검사
    const disprover = findNextDisprovingPlayer(
      suggestState.players, 
      0, 
      suggestState.currentSuggestion!
    );
    // 15장의 카드가 분배되어 있으므로 누군가 소지하거나 아무도 없을 수 있음
    if (disprover) {
      expect(disprover.playerIndex).toBeGreaterThan(0);
      expect(disprover.availableCards.length).toBeGreaterThan(0);
    }
  });

  it('정답을 정확히 맞힌 최종 고발(Accusation)은 승리로 끝나야 한다', () => {
    const state = initGame();
    const result = makeAccusation(state, state.solution);

    expect(result.isCorrect).toBe(true);
    expect(result.state.phase).toBe('GAME_OVER');
    expect(result.state.winnerId).toBe(state.players[0].id);
  });

  it('오답인 최종 고발은 플레이어가 탈락 처리되고 다음 턴으로 넘어가야 한다', () => {
    const state = initGame();
    const fakeAccusation = {
      suspectId: 'wrong_suspect',
      locationId: 'wrong_location',
      weaponId: 'wrong_weapon',
    };

    const result = makeAccusation(state, fakeAccusation);
    expect(result.isCorrect).toBe(false);
    expect(result.state.players[0].isEliminated).toBe(true);
    // 다음 플레이어 턴으로 전환
    expect(result.state.currentPlayerIndex).toBe(1);
  });
});
