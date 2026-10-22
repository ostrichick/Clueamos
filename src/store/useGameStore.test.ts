import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/network/peerManager', () => ({
  peerManager: {
    onMessageReceived: null as unknown,
    onConnectionStateChange: null as unknown,
    createRoom: vi.fn(async () => 'TEST01'),
    joinRoom: vi.fn(async () => undefined),
    getRoomSecret: vi.fn(() => 'mock-secret'),
    cleanup: vi.fn(),
    sendMessage: vi.fn(),
  },
}));

import { useGameStore } from './useGameStore';
import { peerManager } from '@/network/peerManager';

beforeEach(() => {
  vi.useFakeTimers();
  useGameStore.setState({
    playMode: 'solo',
    roomCode: null,
    roomSecret: null,
    isConnected: false,
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
