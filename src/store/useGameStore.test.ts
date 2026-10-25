import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/network/peerManager', () => ({
  peerManager: {
    onMessageReceived: null as unknown,
    onConnectionStateChange: null as unknown,
    createRoom: vi.fn(async () => 'TEST01'),
    joinRoom: vi.fn(async () => undefined),
    getRoomSecret: vi.fn(() => 'mock-secret'),
    isTransportConnected: vi.fn(() => true),
    wasGuestTimedOut: vi.fn(() => false),
    cleanup: vi.fn(),
    sendMessage: vi.fn(),
  },
}));

import { useGameStore } from './useGameStore';
import { peerManager } from '@/network/peerManager';

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(peerManager.isTransportConnected).mockReturnValue(true);
  vi.mocked(peerManager.wasGuestTimedOut).mockReturnValue(false);
  useGameStore.setState({
    playMode: 'solo',
    roomCode: null,
    roomSecret: null,
    isConnected: false,
    guestDisconnected: false,
    isConnecting: false,
    connectionError: null,
    hostSelectedCharacter: null,
    guestSelectedCharacter: null,
    aiPlayerCount: 1,
    currentLocale: 'ko',
    selectedRoomId: null,
    isRollingDice: false,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useGameStore 로컬 게임 흐름', () => {
  it('초기 상태는 솔로 모드이며 로비 단계로 시작한다', () => {
    const s = useGameStore.getState();
    expect(s.playMode).toBe('solo');
    expect(s.gameState.phase).toBe('LOBBY');
  });

  it('setLocale / setAiPlayerCount가 상태를 반영한다', () => {
    useGameStore.getState().setLocale('en');
    useGameStore.getState().setAiPlayerCount(2);
    const s = useGameStore.getState();
    expect(s.currentLocale).toBe('en');
    expect(s.aiPlayerCount).toBe(2);
  });

  it('startNewGame: 솔로는 사람 1명 + AI 1명으로 게임을 시작하고 AI 메모리를 초기화한다', () => {
    useGameStore.getState().startNewGame('suspect_scarlett', 'suspect_mustard', 'ko');
    const { gameState, aiMemories } = useGameStore.getState();

    expect(gameState.phase).toBe('PLAYING_ROLL');
    expect(gameState.players).toHaveLength(2);
    expect(gameState.players[0].type).toBe('human');
    expect(gameState.players[1].type).toBe('ai_logic');
    expect(Object.keys(aiMemories)).toContain(gameState.players[1].id);
    // 결정적 시드 주입 확인
    expect(gameState.seed).toBeGreaterThan(0);
  });

  it('performRollDice: 주사위 합은 2~6이고 이동 단계로 전환한다', () => {
    useGameStore.getState().startNewGame();
    vi.runAllTimers();
    useGameStore.getState().performRollDice();
    vi.advanceTimersByTime(700);

    const { gameState } = useGameStore.getState();
    expect(gameState.currentDiceRoll).toBeGreaterThanOrEqual(2);
    expect(gameState.currentDiceRoll).toBeLessThanOrEqual(6);
    expect(gameState.phase).toBe('PLAYING_MOVE');
    expect(gameState.accessibleRoomIds.length).toBeGreaterThan(0);
    expect(useGameStore.getState().isRollingDice).toBe(false);
  });

  it('performMove: 주사위로 도달 가능한 방으로 이동하고 선택을 해제한다', () => {
    useGameStore.getState().startNewGame();
    vi.runAllTimers();
    useGameStore.getState().performRollDice();
    vi.advanceTimersByTime(700);

    const { gameState } = useGameStore.getState();
    const target = gameState.accessibleRoomIds[0];
    useGameStore.getState().performMove(target);

    const after = useGameStore.getState().gameState;
    expect(after.players[0].currentRoomId).toBe(target);
    expect(after.accessibleRoomIds).toContain(target);
    expect(useGameStore.getState().selectedRoomId).toBeNull();
  });

  it('exitToLobby: 방/연결 정보를 초기화하고 로비 단계로 돌아간다', () => {
    useGameStore.setState({ roomCode: 'ABC', roomSecret: 'sec', isConnected: true });
    useGameStore.getState().exitToLobby();

    const s = useGameStore.getState();
    expect(s.roomCode).toBeNull();
    expect(s.roomSecret).toBeNull();
    expect(s.isConnected).toBe(false);
    expect(s.gameState.phase).toBe('LOBBY');
  });
});

describe('useGameStore 방 생성/접속 (peerManager mock)', () => {
  it('호스트 브로커 장애와 확인된 게스트 이탈을 구분하고 재접속 시 대행 상태를 지운다', async () => {
    useGameStore.setState({ playMode: 'host', aiPlayerCount: 2, turnReviewState: null });
    await useGameStore.getState().createRoom();
    useGameStore.getState().startNewGame();
    const game = useGameStore.getState().gameState;
    useGameStore.setState({ gameState: { ...game, currentPlayerIndex: 1, phase: 'PLAYING_ACTION_DONE' } });
    const report = peerManager.onConnectionStateChange!;

    report(true);
    vi.mocked(peerManager.isTransportConnected).mockReturnValue(false);
    report(false, 'Disconnected');
    vi.advanceTimersByTime(700);
    expect(useGameStore.getState().guestDisconnected).toBe(false);
    expect(useGameStore.getState().turnReviewState).toBeNull();

    vi.mocked(peerManager.isTransportConnected).mockReturnValue(true);
    vi.mocked(peerManager.wasGuestTimedOut).mockReturnValue(true);
    report(false, 'Guest disconnected');
    expect(useGameStore.getState().guestDisconnected).toBe(true);
    vi.advanceTimersByTime(700);
    expect(useGameStore.getState().turnReviewState?.readyRoles).toContain('p2');

    vi.mocked(peerManager.wasGuestTimedOut).mockReturnValue(false);
    report(true);
    expect(useGameStore.getState().guestDisconnected).toBe(false);
  });

  it('createRoom: 호스트로 방을 만들면 코드와 비밀 키가 저장된다', async () => {
    const code = await useGameStore.getState().createRoom('TEST01', '1234');

    expect(code).toBe('TEST01');
    const s = useGameStore.getState();
    expect(s.playMode).toBe('host');
    expect(s.myPlayerRole).toBe('p1');
    expect(s.roomCode).toBe('TEST01');
    expect(s.roomSecret).toBe('mock-secret');
    expect(s.isConnecting).toBe(false);
  });

  it('joinRoom: 게스트로 참가하면 연결됨 상태로 전환된다', async () => {
    await useGameStore.getState().joinRoom('TEST01', '1234');

    const s = useGameStore.getState();
    expect(s.playMode).toBe('guest');
    expect(s.myPlayerRole).toBe('p2');
    expect(s.roomCode).toBe('TEST01');
    expect(s.isConnected).toBe(true);
    expect(s.roomSecret).toBe('mock-secret');
  });

  it('restoreSessionIfNeeded: 브라우저 외(Node) 환경에서는 세션이 없다고 판단한다', async () => {
    await expect(useGameStore.getState().restoreSessionIfNeeded()).resolves.toBe(false);
  });
});

describe('게임 권한과 턴 전환 회귀', () => {
  it('다른 플레이어 턴의 게스트 고발/주사위 요청을 무시한다', () => {
    useGameStore.setState({ playMode: 'host', turnReviewState: null });
    useGameStore.getState().startNewGame();
    const before = useGameStore.getState().gameState;
    peerManager.onMessageReceived?.({ type: 'ACTION_ACCUSE', payload: { accusation: before.solution } });
    peerManager.onMessageReceived?.({ type: 'ACTION_ROLL' });
    vi.advanceTimersByTime(700);
    expect(useGameStore.getState().gameState).toBe(before);
    expect(useGameStore.getState().gameState.phase).toBe('PLAYING_ROLL');
  });

  it('게임 시작 메시지에서 상대 손패와 정답을 전송하지 않는다', () => {
    useGameStore.setState({ playMode: 'host', turnReviewState: null });
    useGameStore.getState().startNewGame();
    const game = useGameStore.getState().gameState;
    const messages = vi.mocked(peerManager.sendMessage).mock.calls.map(([message]) => message);
    const start = messages.find(message => message.type === 'START_GAME');
    const remoteGame = start?.payload?.gameState as typeof game;
    expect(remoteGame.solution).not.toEqual(game.solution);
    expect(remoteGame.players[0].hand).toHaveLength(0);
    expect(remoteGame.players[1].hand).toEqual(game.players[1].hand);
  });

  it('같은 상태의 연속 주사위 요청을 한 번만 수행하고 새 게임의 상태를 보존한다', () => {
    useGameStore.setState({ playMode: 'solo', turnReviewState: null });
    useGameStore.getState().startNewGame();
    useGameStore.getState().performRollDice();
    useGameStore.getState().performRollDice();
    vi.advanceTimersByTime(650);
    expect(useGameStore.getState().gameState.rngCounter).toBe(1);

    useGameStore.getState().startNewGame();
    const replacement = useGameStore.getState().gameState;
    useGameStore.getState().performRollDice();
    useGameStore.getState().startNewGame();
    const newest = useGameStore.getState().gameState;
    vi.advanceTimersByTime(650);
    expect(replacement).not.toBe(newest);
    expect(useGameStore.getState().gameState).toBe(newest);
  });

  it('로컬 2인 게임에서는 P2 턴 종료 후 확인 한 번으로 다음 턴이 열린다', () => {
    useGameStore.setState({ playMode: 'local', aiPlayerCount: 0, turnReviewState: null });
    useGameStore.getState().startNewGame();
    const initial = useGameStore.getState().gameState;
    useGameStore.setState({ gameState: { ...initial, currentPlayerIndex: 1, phase: 'PLAYING_ACTION_DONE' } });
    useGameStore.getState().performEndTurn();
    expect(useGameStore.getState().turnReviewState?.active).toBe(true);
    useGameStore.getState().confirmTurnReview();
    expect(useGameStore.getState().turnReviewState).toBeNull();
    expect(useGameStore.getState().gameState.currentPlayerIndex).toBe(0);
  });

  it('게스트 재참가 요청에 현재 게임의 비공개 정보를 제외한 상태를 재전송한다', () => {
    useGameStore.setState({ playMode: 'host', turnReviewState: null });
    useGameStore.getState().startNewGame();
    const game = useGameStore.getState().gameState;
    vi.mocked(peerManager.sendMessage).mockClear();
    peerManager.onMessageReceived?.({ type: 'GUEST_JOIN' });
    const stateMessage = vi.mocked(peerManager.sendMessage).mock.calls.map(([m]) => m).find(m => m.type === 'START_GAME');
    const visible = stateMessage?.payload?.gameState as typeof game;
    expect(visible.solution).not.toEqual(game.solution);
    expect(visible.players[1].hand).toEqual(game.players[1].hand);
    expect(visible.players[0].hand).toEqual([]);
  });

  it('재접속 시 진행 중인 반증 연출은 재전송하되 무관한 비공개 카드는 숨긴다', () => {
    useGameStore.setState({ playMode: 'host', turnReviewState: null });
    useGameStore.getState().startNewGame();
    const game = useGameStore.getState().gameState;
    useGameStore.setState({ activeHypothesisVisual: {
      askerId: game.players[0].id, askerName: game.players[0].name,
      askerAvatar: game.players[0].avatar,
      responderId: game.players[2].id, responderName: game.players[2].name,
      responderAvatar: game.players[2].avatar,
      suggestion: game.solution, phase: 'disproved', shownCardId: game.players[0].hand[0].id,
    } });
    vi.mocked(peerManager.sendMessage).mockClear();
    peerManager.onMessageReceived?.({ type: 'GUEST_JOIN' });
    const packets = vi.mocked(peerManager.sendMessage).mock.calls.map(([message]) => message);
    expect(packets.map(packet => packet.type).slice(0, 2)).toEqual(['START_GAME', 'HYPOTHESIS_VISUAL']);
    expect((packets[1].payload?.visual as { shownCardId?: string }).shownCardId).toBeUndefined();
  });

  it('재접속한 게스트의 이전 반증 팝업과 턴 리뷰를 현재 게임 상태로 초기화한다', () => {
    useGameStore.setState({ playMode: 'host', turnReviewState: null });
    useGameStore.getState().startNewGame();
    const game = useGameStore.getState().gameState;
    useGameStore.setState({
      playMode: 'guest',
      pendingDisprovePrompt: { askerId: game.players[0].id, availableCards: game.players[1].hand },
      lastSecretClue: { card: game.players[1].hand[0], fromName: game.players[0].name },
      turnReviewState: { active: true, turnNumber: 1, lastPlayerName: 'Old', summary: 'Old', readyRoles: [] },
    });
    peerManager.onMessageReceived?.({ type: 'START_GAME', payload: { gameState: game } });
    const current = useGameStore.getState();
    expect(current.pendingDisprovePrompt).toBeNull();
    expect(current.lastSecretClue).toBeNull();
    expect(current.turnReviewState).toBeNull();
  });

  it('호스트의 새로고침 후 게임과 AI 메모리를 복구한다', async () => {
    const data = new Map<string, string>();
    vi.stubGlobal('window', {});
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => { data.set(key, value); },
      removeItem: (key: string) => { data.delete(key); },
    });
    useGameStore.setState({ playMode: 'host', roomCode: null, turnReviewState: null });
    await useGameStore.getState().createRoom();
    useGameStore.getState().startNewGame();
    const oldGame = useGameStore.getState().gameState;
    const oldMemoryIds = Object.keys(useGameStore.getState().aiMemories);
    expect(oldMemoryIds.length).toBeGreaterThan(0);
    useGameStore.setState({ gameState: { ...oldGame, phase: 'LOBBY' }, aiMemories: {}, roomCode: null, roomSecret: null });

    expect(await useGameStore.getState().restoreSessionIfNeeded()).toBe(true);
    expect(useGameStore.getState().gameState.solution).toEqual(oldGame.solution);
    expect(useGameStore.getState().gameState.phase).toBe(oldGame.phase);
    expect(Object.keys(useGameStore.getState().aiMemories)).toEqual(oldMemoryIds);
  });
});

describe('AI 턴 진행', () => {
  it('호스트 MQTT 연결 장애는 게스트 이탈로 판단해 대리 행동하지 않는다', async () => {
    useGameStore.setState({ playMode: 'host', aiPlayerCount: 2, isConnected: false, guestDisconnected: true, turnReviewState: null });
    useGameStore.getState().startNewGame();
    const initial = useGameStore.getState().gameState;
    useGameStore.setState({ gameState: { ...initial, currentPlayerIndex: 1, phase: 'PLAYING_ACTION_DONE' } });
    vi.mocked(peerManager.isTransportConnected).mockReturnValue(false);

    await useGameStore.getState().executeAutoPlayTurn('p2');
    expect(useGameStore.getState().turnReviewState).toBeNull();

    vi.mocked(peerManager.isTransportConnected).mockReturnValue(true);
    await useGameStore.getState().executeAutoPlayTurn('p2');
    expect(useGameStore.getState().turnReviewState?.readyRoles).toContain('p2');
  });

  it('기존 P2 대리 주사위 타이머는 새 게임에서 동일 P2에게 영향을 주지 않는다', async () => {
    useGameStore.setState({ playMode: 'host', aiPlayerCount: 2, isConnected: false, guestDisconnected: true, turnReviewState: null });
    useGameStore.getState().startNewGame();
    const first = useGameStore.getState().gameState;
    useGameStore.setState({ gameState: { ...first, currentPlayerIndex: 1 } });
    await useGameStore.getState().executeAutoPlayTurn('p2');
    vi.advanceTimersByTime(650);

    useGameStore.getState().startNewGame();
    const nextGame = useGameStore.getState().gameState;
    const newTurn = { ...nextGame, currentPlayerIndex: 1, phase: 'PLAYING_MOVE' as const };
    useGameStore.setState({ gameState: newTurn });
    vi.advanceTimersByTime(1100);
    expect(useGameStore.getState().gameState).toBe(newTurn);
  });

  it('연결이 끊긴 P2의 주사위·이동·질문을 호스트에서 이어서 실행한다', async () => {
    useGameStore.setState({ playMode: 'host', aiPlayerCount: 2, isConnected: false, guestDisconnected: true, turnReviewState: null });
    useGameStore.getState().startNewGame();
    const game = useGameStore.getState().gameState;
    useGameStore.setState({ gameState: { ...game, currentPlayerIndex: 1 } });
    await useGameStore.getState().executeAutoPlayTurn('p2');
    vi.advanceTimersByTime(600 + 1100 + 900);

    const result = useGameStore.getState().gameState;
    const suggestion = result.logs.find(log => log.type === 'suggestion' && log.metadata?.askerId === game.players[1].id);
    expect(result.currentDiceRoll).toBeGreaterThanOrEqual(2);
    if (suggestion) {
      expect(suggestion.metadata?.locationId).toBe(result.players[1].currentRoomId);
    } else {
      expect(['PLAYING_ACTION_DONE', 'WAITING_DISPROVE', 'GAME_OVER']).toContain(result.phase);
    }
  });

  it('접속이 끊긴 게스트의 턴을 호스트가 대신 종료하고 재접속 시 위임을 거부한다', async () => {
    useGameStore.setState({ playMode: 'host', aiPlayerCount: 2, isConnected: false, guestDisconnected: true, turnReviewState: null });
    useGameStore.getState().startNewGame();
    const game = useGameStore.getState().gameState;
    expect(game.players[1].roleType).toBe('p2');
    useGameStore.setState({ gameState: { ...game, currentPlayerIndex: 1, phase: 'PLAYING_ACTION_DONE' } });

    await useGameStore.getState().executeAutoPlayTurn('p2');
    expect(useGameStore.getState().turnReviewState?.readyRoles).toContain('p2');

    useGameStore.setState({ isConnected: true, turnReviewState: null });
    await useGameStore.getState().executeAutoPlayTurn('p2');
    expect(useGameStore.getState().turnReviewState).toBeNull();
  });

  it('게스트 연결이 끊긴 상태의 반증은 실제 P2 손패에서 처리한다', async () => {
    useGameStore.setState({ playMode: 'host', aiPlayerCount: 2, isConnected: false, guestDisconnected: true, turnReviewState: null });
    useGameStore.getState().startNewGame();
    const game = useGameStore.getState().gameState;
    const card = game.players[1].hand[0];
    const currentSuggestion = {
      askerId: game.players[0].id,
      suspectId: card.category === 'suspect' ? card.id : game.solution.suspectId,
      locationId: card.category === 'location' ? card.id : game.solution.locationId,
      weaponId: card.category === 'weapon' ? card.id : game.solution.weaponId,
    };
    useGameStore.setState({ gameState: { ...game, phase: 'WAITING_DISPROVE', currentSuggestion } });
    await useGameStore.getState().executeAutoPlayTurn('p2');

    const after = useGameStore.getState().gameState;
    expect(after.phase).toBe('PLAYING_ACTION_DONE');
    expect(after.logs.at(-1)?.metadata?.shownCardId).toBe(card.id);
  });

  it('AI 턴은 주사위·이동·질문까지 진행되고, 질문은 실제로 도착한 방에서 한 번만 기록된다', () => {
    useGameStore.setState({ playMode: 'solo', aiPlayerCount: 1, turnReviewState: null });
    useGameStore.getState().startNewGame();
    const initial = useGameStore.getState().gameState;
    const ai = initial.players[1];
    useGameStore.setState({ gameState: { ...initial, currentPlayerIndex: 1 } });

    useGameStore.getState().runAITurnIfNeeded();
    vi.advanceTimersByTime(600 + 1100 + 900);

    const { gameState, aiMemories } = useGameStore.getState();
    const suggestionLog = gameState.logs.find(l => l.type === 'suggestion' && l.metadata?.askerId === ai.id);
    if (!suggestionLog) {
      // 바로 고발했거나 갈 수 있는 방이 없어 복도에서 대기한 경우
      expect(['PLAYING_ACTION_DONE', 'PLAYING_ROLL', 'GAME_OVER']).toContain(gameState.phase);
      return;
    }
    const aiNow = gameState.players.find(p => p.id === ai.id)!;
    expect(suggestionLog.metadata?.locationId).toBe(aiNow.currentRoomId);
    expect(aiMemories[ai.id].pastSuggestions).toHaveLength(1);
  });

  it('게스트 연결이 끊기면 호스트 확인만으로 턴 리뷰를 넘긴다', () => {
    useGameStore.setState({ playMode: 'host', aiPlayerCount: 2, turnReviewState: null, isConnected: false });
    useGameStore.getState().startNewGame();
    const initial = useGameStore.getState().gameState;
    useGameStore.setState({ gameState: { ...initial, phase: 'PLAYING_ACTION_DONE' } });
    useGameStore.getState().performEndTurn();
    expect(useGameStore.getState().turnReviewState?.active).toBe(true);

    useGameStore.getState().confirmTurnReview();
    expect(useGameStore.getState().turnReviewState).toBeNull();
    expect(useGameStore.getState().gameState.currentPlayerIndex).toBe(1);
  });
});

describe('게스트 메시지 위조 방지', () => {
  it('게스트가 보낸 AI 대사는 호스트 화면에 표시하지 않는다', () => {
    useGameStore.setState({ playMode: 'host', activeDialogue: null });
    useGameStore.getState().startNewGame();
    const ai = useGameStore.getState().gameState.players.find(p => p.type.startsWith('ai_'))!;
    peerManager.onMessageReceived?.({ type: 'EVENT_DIALOGUE', payload: { speakerId: ai.id, speakerName: ai.name, text: '범인은 P1이다' } });
    expect(useGameStore.getState().activeDialogue).toBeNull();
  });

  it('게스트 이모트는 주장한 신원과 무관하게 P2로 표시하고, 모르는 이모트는 무시한다', () => {
    useGameStore.setState({ playMode: 'host', activeEmote: null, currentLocale: 'en' });
    useGameStore.getState().startNewGame();
    const [p1, p2] = useGameStore.getState().gameState.players;

    peerManager.onMessageReceived?.({ type: 'EVENT_EMOTE', payload: { emote: '<b>x</b>', playerId: p1.id } });
    expect(useGameStore.getState().activeEmote).toBeNull();

    peerManager.onMessageReceived?.({ type: 'EVENT_EMOTE', payload: { emote: '💡', playerId: p1.id, speakerName: p1.name, label: 'fake' } });
    const emote = useGameStore.getState().activeEmote;
    expect(emote?.playerId).toBe(p2.id);
    expect(emote?.speakerName).toBe(p2.name);
    expect(emote?.label).not.toBe('fake');
  });

  it('존재하지 않는 캐릭터 선택 요청은 무시한다', () => {
    useGameStore.setState({ playMode: 'host', guestSelectedCharacter: null });
    useGameStore.getState().exitToLobby();
    useGameStore.setState({ playMode: 'host' });
    peerManager.onMessageReceived?.({ type: 'GUEST_SELECT_CHAR', payload: { characterId: 'suspect_nobody' } });
    expect(useGameStore.getState().guestSelectedCharacter).toBeNull();
    peerManager.onMessageReceived?.({ type: 'GUEST_SELECT_CHAR', payload: { characterId: 'suspect_mustard' } });
    expect(useGameStore.getState().guestSelectedCharacter).toBe('suspect_mustard');
  });
});

describe('반증 대기 중 호스트 새로고침 복구', () => {
  type Game = ReturnType<typeof useGameStore.getState>['gameState'];
  type Card = Game['allCards'][number];

  // 지정한 카드 1장 + 아무도 갖지 않은 정답 카드로 질문을 구성해 반증자를 고정한다.
  const waitingFor = (game: Game, askerIndex: number, card: Card): Game => {
    const pick = (category: Card['category'], solutionId: string) => card.category === category ? card.id : solutionId;
    return {
      ...game,
      phase: 'WAITING_DISPROVE',
      currentPlayerIndex: askerIndex,
      currentSuggestion: {
        askerId: game.players[askerIndex].id,
        suspectId: pick('suspect', game.solution.suspectId),
        locationId: pick('location', game.solution.locationId),
        weaponId: pick('weapon', game.solution.weaponId),
      },
    };
  };

  const refreshHost = async (makeState: (game: Game) => Game) => {
    const data = new Map<string, string>();
    vi.stubGlobal('window', {});
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => { data.set(key, value); },
      removeItem: (key: string) => { data.delete(key); },
    });
    useGameStore.setState({ playMode: 'host', aiPlayerCount: 2, roomCode: null, turnReviewState: null });
    await useGameStore.getState().createRoom();
    useGameStore.getState().startNewGame();
    vi.runAllTimers();
    const saved = makeState(useGameStore.getState().gameState);
    useGameStore.setState({ gameState: saved });
    // 새로고침: 메모리 상의 상태와 타이머는 모두 사라진다.
    vi.clearAllTimers();
    useGameStore.setState({
      gameState: { ...saved, phase: 'LOBBY' }, aiMemories: {}, roomCode: null, roomSecret: null,
      pendingDisprovePrompt: null, activeHypothesisVisual: null,
    });
    expect(await useGameStore.getState().restoreSessionIfNeeded()).toBe(true);
    return saved;
  };

  it('P1이 반증할 차례면 반증 선택 창을 다시 띄운다', async () => {
    const saved = await refreshHost(game => waitingFor(game, 1, game.players[0].hand[0]));
    const prompt = useGameStore.getState().pendingDisprovePrompt;
    expect(prompt?.availableCards.map(c => c.id)).toEqual([saved.players[0].hand[0].id]);
    expect(prompt?.askerId).toBe(saved.players[1].id);
  });

  it('AI가 반증할 차례면 반증을 이어서 진행한다', async () => {
    await refreshHost(game => waitingFor(game, 0, game.players[2].hand[0]));
    expect(useGameStore.getState().gameState.phase).toBe('WAITING_DISPROVE');
    vi.advanceTimersByTime(1500);
    const s = useGameStore.getState();
    expect(s.gameState.phase).toBe('PLAYING_ACTION_DONE');
    expect(s.activeHypothesisVisual?.phase).toBe('disproved');
  });
});
