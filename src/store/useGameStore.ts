import { create } from 'zustand';
import { GameState, Solution, Suggestion, Card, Player, HypothesisVisualState } from '@/engine/types';
import { 
  initGame, 
  rollDice, 
  movePlayer, 
  waitInHallway, 
  makeSuggestion, 
  findNextDisprovingPlayer, 
  resolveDisprove, 
  makeAccusation,
  nextTurn
} from '@/engine/engine';
import { 
  AIMemory, 
  initAIMemory, 
  decideArthurAction, 
  decideBlakeAction, 
  recordShownCard,
  recordUndisprovenSuggestion,
  recordObservedDisprove,
  shouldAIAccuse
} from '@/engine/ai';
import { SupportedLocale, translations } from '@/i18n/translations';
import { peerManager, PeerMessage } from '@/network/peerManager';
import { sounds } from '@/utils/sounds';

export type PlayMode = 'solo' | 'local' | 'host' | 'guest';
export type PlayerRole = 'p1' | 'p2';

export interface TurnReviewState {
  active: boolean;
  turnNumber: number;
  lastPlayerName: string;
  summary: string;
  readyRoles: PlayerRole[];
}

export interface ActiveDialogue {
  speakerId: string;
  speakerName: string;
  avatar: string;
  color: string;
  text: string;
}

export interface ActiveEmote {
  playerId: string;
  speakerName: string;
  avatar: string;
  color: string;
  emote: string;
  label: string;
  timestamp: number;
}

export const INITIAL_ROOM_WEAPONS: Record<string, string[]> = {
  room_ballroom: ['weapon_candlestick'],
  room_kitchen: ['weapon_knife'],
  room_library: ['weapon_revolver'],
  room_wine_cellar: ['weapon_rope'],
  room_room304: ['weapon_pipe'],
  room_rooftop: ['weapon_wrench'],
};

const SESSION_KEY = 'clueamos_session_v1';

function saveSession(data: { roomCode: string; playMode: PlayMode; role: PlayerRole }) {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
    } catch {}
  }
}

function clearSession() {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {}
  }
}

interface GameStore {
  gameState: GameState;
  aiMemories: Record<string, AIMemory>;
  selectedRoomId: string | null;
  isRollingDice: boolean;
  currentLocale: SupportedLocale;

  // 멀티플레이어 상태
  playMode: PlayMode;
  myPlayerRole: PlayerRole;
  roomCode: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  peerOnline: boolean;
  guestSelectedCharacter: string | null;
  hostSelectedCharacter: string | null;
  aiPlayerCount: number;

  // AI 대사 및 말풍선 인터랙션
  activeDialogue: ActiveDialogue | null;

  // 피지컬 보드게임 토큰 및 리액션
  roomWeapons: Record<string, string[]>;
  activeEmote: ActiveEmote | null;

  // 비밀 반증 인터랙션 상태
  pendingDisprovePrompt: { availableCards: Card[]; askerId: string } | null;
  lastSecretClue: { card: Card; fromName: string } | null;

  // 가설 추리 및 반증 시각화 오버레이 상태
  activeHypothesisVisual: HypothesisVisualState | null;

  // 액션
  setLocale: (locale: SupportedLocale) => void;
  setAiPlayerCount: (count: number) => void;
  showDialogue: (speaker: Player, text: string) => void;
  dismissDialogue: () => void;
  triggerEmote: (emoteKey: string) => void;
  dismissEmote: () => void;
  setPlayMode: (mode: PlayMode) => void;
  createRoom: (desiredCode?: string) => Promise<string>;
  joinRoom: (code: string) => Promise<void>;
  disconnectRoom: () => void;
  restoreSessionIfNeeded: () => Promise<boolean>;
  startNewGame: (p1CharacterId?: string, p2CharacterId?: string, locale?: SupportedLocale) => void;
  syncGuestCharacterChoice: (charId: string) => void;
  syncHostCharacterChoice: (charId: string) => void;
  selectRoom: (roomId: string) => void;
  performRollDice: () => void;
  performMove: (roomId: string) => void;
  performWaitInHallway: () => void;
  performSuggestion: (suggestion: Omit<Suggestion, 'askerId'>) => void;
  performDisprove: (cardId?: string) => void;
  performAccusation: (accusation: Solution) => boolean;
  performEndTurn: () => void;
  runAITurnIfNeeded: () => Promise<void>;
  dismissSecretClue: () => void;
  dismissHypothesisVisual: () => void;
  exitToLobby: () => void;

  // 턴 종료 확인 및 수첩 작성 대기 상태
  turnReviewState: TurnReviewState | null;
  confirmTurnReview: () => void;
  proceedToNextTurn: () => void;

  // AFK 자동 대리 플레이 상태
  isAutoPlaying: boolean;
  setIsAutoPlaying: (active: boolean) => void;
  executeAutoPlayTurn: () => Promise<void>;
}

export const useGameStore = create<GameStore>((set, get) => {
  // Setup peer message handler
  const handleIncomingPeerMessage = (msg: PeerMessage) => {
    const { playMode } = get();

    switch (msg.type) {
      case 'LOBBY_UPDATE': {
        if (msg.payload?.p1Character) {
          set({ hostSelectedCharacter: msg.payload.p1Character as string });
        }
        if (msg.payload?.p2Character) {
          set({ guestSelectedCharacter: msg.payload.p2Character as string });
        }
        if (typeof msg.payload?.aiCount === 'number') {
          set({ aiPlayerCount: msg.payload.aiCount });
        }
        break;
      }

      case 'GUEST_SELECT_CHAR': {
        if (playMode === 'host' && msg.payload?.characterId) {
          set({ guestSelectedCharacter: msg.payload.characterId as string });
          // Broadcast back to guest
          peerManager.sendMessage({
            type: 'LOBBY_UPDATE',
            payload: {
              p1Character: get().hostSelectedCharacter,
              p2Character: msg.payload.characterId as string,
              aiCount: get().aiPlayerCount,
            },
          });
        }
        break;
      }

      case 'START_GAME': {
        if (playMode === 'guest' && msg.payload?.gameState) {
          set({
            gameState: msg.payload.gameState as GameState,
            roomWeapons: (msg.payload.roomWeapons as Record<string, string[]>) || INITIAL_ROOM_WEAPONS,
            selectedRoomId: null,
            isRollingDice: false,
          });
        }
        break;
      }

      case 'STATE_SYNC': {
        if (playMode === 'guest' && msg.payload?.gameState) {
          set({
            gameState: msg.payload.gameState as GameState,
            roomWeapons: (msg.payload.roomWeapons as Record<string, string[]>) || get().roomWeapons,
            isRollingDice: false,
          });
        }
        break;
      }

      // Guest requests an action to Host
      case 'ACTION_ROLL': {
        if (playMode === 'host') {
          get().performRollDice();
        }
        break;
      }

      case 'ACTION_MOVE': {
        if (playMode === 'host' && msg.payload?.roomId) {
          get().performMove(msg.payload.roomId as string);
        }
        break;
      }

      case 'ACTION_SUGGEST': {
        if (playMode === 'host' && msg.payload?.suggestion) {
          get().performSuggestion(msg.payload.suggestion as Omit<Suggestion, 'askerId'>);
        }
        break;
      }

      case 'ACTION_DISPROVE': {
        if (playMode === 'host') {
          get().performDisprove(msg.payload?.cardId as string | undefined);
        }
        break;
      }

      case 'ACTION_ACCUSE': {
        if (playMode === 'host' && msg.payload?.accusation) {
          get().performAccusation(msg.payload.accusation as Solution);
        }
        break;
      }

      case 'ACTION_WAIT_HALLWAY': {
        if (playMode === 'host') {
          get().performWaitInHallway();
        }
        break;
      }

      case 'ACTION_END_TURN': {
        if (playMode === 'host') {
          get().performEndTurn();
        }
        break;
      }

      case 'HEARTBEAT': {
        set({ peerOnline: true });
        break;
      }

      // Disprove prompt sent from Host to Guest
      case 'DISPROVE_REQUEST': {
        if (playMode === 'guest' && msg.payload?.availableCards) {
          set({
            pendingDisprovePrompt: {
              availableCards: msg.payload.availableCards as Card[],
              askerId: msg.payload.askerId as string,
            },
          });
        }
        break;
      }

      // Private Clue revealed to the asker
      case 'PRIVATE_CLUE_REVEALED': {
        if (msg.payload?.card && msg.payload?.fromName) {
          set({
            lastSecretClue: {
              card: msg.payload.card as Card,
              fromName: msg.payload.fromName as string,
            },
          });
        }
        break;
      }

      case 'EVENT_DIALOGUE': {
        if (msg.payload) {
          const dialogue = msg.payload as unknown as ActiveDialogue;
          set({ activeDialogue: dialogue });
          setTimeout(() => {
            const cur = get().activeDialogue;
            if (cur && cur.text === dialogue.text) {
              set({ activeDialogue: null });
            }
          }, 4000);
        }
        break;
      }

      case 'EVENT_EMOTE': {
        if (msg.payload) {
          const emoteData = msg.payload as unknown as ActiveEmote;
          sounds.playEmote();
          set({ activeEmote: emoteData });
          setTimeout(() => {
            const cur = get().activeEmote;
            if (cur && cur.timestamp === emoteData.timestamp) {
              set({ activeEmote: null });
            }
          }, 3200);
        }
        break;
      }

      case 'HYPOTHESIS_VISUAL': {
        set({ activeHypothesisVisual: (msg.payload?.visual as HypothesisVisualState) || null });
        break;
      }

      case 'TURN_REVIEW_UPDATE': {
        set({ turnReviewState: (msg.payload?.turnReview as unknown as TurnReviewState) || null });
        break;
      }

      case 'TURN_REVIEW_CONFIRM': {
        if (playMode === 'host') {
          const { turnReviewState } = get();
          if (turnReviewState) {
            const incomingRole = (msg.payload?.role as PlayerRole) || 'p2';
            const updatedRoles = Array.from(new Set([...turnReviewState.readyRoles, incomingRole]));
            if (updatedRoles.includes('p1') && updatedRoles.includes('p2')) {
              get().proceedToNextTurn();
            } else {
              const updatedState = { ...turnReviewState, readyRoles: updatedRoles };
              set({ turnReviewState: updatedState });
              peerManager.sendMessage({
                type: 'TURN_REVIEW_UPDATE',
                payload: { turnReview: updatedState as unknown as Record<string, unknown> },
              });
            }
          }
        }
        break;
      }

      default:
        break;
    }
  };

  peerManager.onMessageReceived = handleIncomingPeerMessage;

  const triggerAIDialogue = (player: Player, type: 'move' | 'suggest' | 'disprove' | 'cannotDisprove' | 'summoned') => {
    if (!player.type.startsWith('ai_')) return;
    const { currentLocale } = get();
    const dict = translations[currentLocale]?.aiDialogue || translations.en.aiDialogue;
    const characterKey = player.type === 'ai_logic' ? 'arthur' : 'blake';
    const lines = dict[characterKey]?.[type] || [];
    if (lines.length > 0) {
      const text = lines[Math.floor(Math.random() * lines.length)];
      get().showDialogue(player, text);
    }
  };

  return {
    gameState: initGame({ initialPhase: 'LOBBY' }),
    aiMemories: {},
    selectedRoomId: null,
    isRollingDice: false,
    currentLocale: 'en',

    playMode: 'host',
    myPlayerRole: 'p1',
    roomCode: null,
    isConnected: false,
    isConnecting: false,
    connectionError: null,
    peerOnline: false,
    guestSelectedCharacter: null,
    hostSelectedCharacter: null,
    aiPlayerCount: 2,
    activeDialogue: null,
    roomWeapons: INITIAL_ROOM_WEAPONS,
    activeEmote: null,
    pendingDisprovePrompt: null,
    lastSecretClue: null,
    activeHypothesisVisual: null,
    isAutoPlaying: false,
    setIsAutoPlaying: (active: boolean) => set({ isAutoPlaying: active }),
    turnReviewState: null,

    setLocale: (loc) => {
      set({ currentLocale: loc });
    },

    setAiPlayerCount: (count: number) => {
      set({ aiPlayerCount: count });
      if (get().playMode === 'host') {
        peerManager.sendMessage({
          type: 'LOBBY_UPDATE',
          payload: {
            p1Character: get().hostSelectedCharacter,
            p2Character: get().guestSelectedCharacter,
            aiCount: count,
          },
        });
      }
    },

    triggerEmote: (emoteKey: string) => {
      const { gameState, playMode, currentLocale } = get();
      const myPlayer = playMode === 'guest'
        ? gameState.players[1]
        : playMode === 'host'
          ? gameState.players[0]
          : gameState.players[gameState.currentPlayerIndex];

      if (!myPlayer) return;

      type EmoteKey = 'emoteObserve' | 'emotePonder' | 'emoteEureka' | 'emoteTea';
      const emoteLabels: Record<string, { icon: string; key: EmoteKey }> = {
        observe: { icon: '🧐', key: 'emoteObserve' },
        ponder: { icon: '🤔', key: 'emotePonder' },
        eureka: { icon: '💡', key: 'emoteEureka' },
        tea: { icon: '☕', key: 'emoteTea' },
      };

      const meta = emoteLabels[emoteKey] || { icon: '🧐', key: 'emoteObserve' };
      const currentDict = translations[currentLocale] || translations.en;
      const label = currentDict[meta.key] || meta.icon;

      const emoteData: ActiveEmote = {
        playerId: myPlayer.id,
        speakerName: myPlayer.name,
        avatar: myPlayer.avatar,
        color: myPlayer.color,
        emote: meta.icon,
        label,
        timestamp: Date.now(),
      };

      sounds.playEmote();
      set({ activeEmote: emoteData });

      if (playMode !== 'local') {
        peerManager.sendMessage({
          type: 'EVENT_EMOTE',
          payload: emoteData as unknown as Record<string, unknown>,
        });
      }

      setTimeout(() => {
        const cur = get().activeEmote;
        if (cur && cur.timestamp === emoteData.timestamp) {
          set({ activeEmote: null });
        }
      }, 3200);
    },

    dismissEmote: () => {
      set({ activeEmote: null });
    },

    showDialogue: (speaker, text) => {
      const dialogue = {
        speakerId: speaker.id,
        speakerName: speaker.name,
        avatar: speaker.avatar,
        color: speaker.color,
        text,
      };
      set({ activeDialogue: dialogue });

      if (get().playMode === 'host') {
        peerManager.sendMessage({
          type: 'EVENT_DIALOGUE',
          payload: dialogue,
        });
      }

      setTimeout(() => {
        const cur = get().activeDialogue;
        if (cur && cur.text === text) {
          set({ activeDialogue: null });
        }
      }, 4000);
    },

    dismissDialogue: () => {
      set({ activeDialogue: null });
    },

    setPlayMode: (mode) => {
      const currentAiCount = get().aiPlayerCount;
      let newAiCount = currentAiCount;
      if (mode === 'solo') {
        // Solo mode: default to 1 AI (1 human vs 1 AI) if currently 0 or 2
        if (currentAiCount === 0 || currentAiCount === 2) {
          newAiCount = 1;
        } else {
          newAiCount = Math.max(1, Math.min(5, currentAiCount));
        }
      } else {
        // Multiplayer (host/guest/local): default to 2 AIs if currently 1 or 5
        if (currentAiCount === 1 || currentAiCount === 5) {
          newAiCount = 2;
        } else {
          newAiCount = Math.max(0, Math.min(4, currentAiCount));
        }
      }

      set({ 
        playMode: mode, 
        myPlayerRole: mode === 'guest' ? 'p2' : 'p1',
        aiPlayerCount: newAiCount,
      });
    },

    createRoom: async (desiredCode?: unknown) => {
      const codeParam = typeof desiredCode === 'string' ? desiredCode : undefined;
      set({ isConnecting: true, connectionError: null });
      peerManager.onConnectionStateChange = (connected, error) => {
        set({ 
          isConnected: connected, 
          isConnecting: false,
          connectionError: error || null 
        });

        if (connected) {
          // Send current lobby state
          peerManager.sendMessage({
            type: 'LOBBY_UPDATE',
            payload: {
              p1Character: get().hostSelectedCharacter || 'suspect_scarlett',
              p2Character: get().guestSelectedCharacter || 'suspect_mustard',
              aiCount: get().aiPlayerCount,
            },
          });
        }
      };

      try {
        const code = await peerManager.createRoom(codeParam);
        const codeStr = String(code);
        saveSession({ roomCode: codeStr, playMode: 'host', role: 'p1' });
        set({
          roomCode: codeStr,
          playMode: 'host',
          myPlayerRole: 'p1',
          isConnecting: false,
        });
        return codeStr;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create room';
        set({ isConnecting: false, connectionError: message });
        return '';
      }
    },

    joinRoom: async (code: string) => {
      const cleanCode = typeof code === 'string' ? code.trim() : '';
      set({ isConnecting: true, connectionError: null });
      peerManager.onConnectionStateChange = (connected, error) => {
        set({ 
          isConnected: connected, 
          isConnecting: false,
          connectionError: error || null 
        });
      };

      try {
        await peerManager.joinRoom(cleanCode);
        saveSession({ roomCode: cleanCode, playMode: 'guest', role: 'p2' });
        set({
          roomCode: cleanCode,
          playMode: 'guest',
          myPlayerRole: 'p2',
          isConnecting: false,
          isConnected: true,
        });

        // Immediately inform host of player 2 presence
        peerManager.sendMessage({
          type: 'GUEST_SELECT_CHAR',
          payload: {
            characterId: get().guestSelectedCharacter || 'suspect_mustard',
          },
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to join room';
        set({ isConnecting: false, connectionError: message });
      }
    },

    disconnectRoom: () => {
      clearSession();
      peerManager.cleanup();
      const curMode = get().playMode;
      set({
        roomCode: null,
        isConnected: false,
        isConnecting: false,
        connectionError: null,
        peerOnline: false,
        playMode: curMode === 'guest' ? 'host' : curMode,
        myPlayerRole: 'p1',
      });
    },

    restoreSessionIfNeeded: async () => {
      if (typeof window === 'undefined') return false;
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      try {
        const session = JSON.parse(raw);
        if (session.roomCode && session.playMode) {
          if (session.playMode === 'guest') {
            await get().joinRoom(session.roomCode);
            return true;
          } else if (session.playMode === 'host') {
            await get().createRoom(session.roomCode);
            return true;
          }
        }
      } catch {}
      return false;
    },

    syncGuestCharacterChoice: (charId: string) => {
      set({ guestSelectedCharacter: charId });
      const { playMode } = get();
      if (playMode === 'guest') {
        peerManager.sendMessage({
          type: 'GUEST_SELECT_CHAR',
          payload: { characterId: charId },
        });
      }
    },

    syncHostCharacterChoice: (charId: string) => {
      set({ hostSelectedCharacter: charId });
      const { playMode, guestSelectedCharacter, aiPlayerCount } = get();
      if (playMode === 'host') {
        peerManager.sendMessage({
          type: 'LOBBY_UPDATE',
          payload: {
            p1Character: charId,
            p2Character: guestSelectedCharacter,
            aiCount: aiPlayerCount,
          },
        });
      }
    },

    startNewGame: (p1CharacterId, p2CharacterId, locale) => {
      const { playMode, aiPlayerCount } = get();
      const isSinglePlayer = playMode === 'solo';
      const newState = initGame({ 
        isSinglePlayer,
        player1CharacterId: p1CharacterId, 
        player2CharacterId: p2CharacterId, 
        locale,
        aiPlayerCount,
      });
      
      const memories: Record<string, AIMemory> = {};
      newState.players.forEach(p => {
        if (p.type.startsWith('ai_')) {
          memories[p.id] = initAIMemory(p);
        }
      });

      set({
        gameState: newState,
        aiMemories: memories,
        roomWeapons: INITIAL_ROOM_WEAPONS,
        activeEmote: null,
        selectedRoomId: null,
        isRollingDice: false,
        activeHypothesisVisual: null,
        isAutoPlaying: false,
        turnReviewState: null,
      });

      if (playMode === 'host') {
        peerManager.sendMessage({
          type: 'START_GAME',
          payload: { gameState: newState, roomWeapons: INITIAL_ROOM_WEAPONS },
        });
      }
    },

    exitToLobby: () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(SESSION_KEY);
      }
      const { isConnected, currentLocale, playMode, aiPlayerCount } = get();
      if (isConnected) {
        get().disconnectRoom();
      }
      set({
        gameState: initGame({ initialPhase: 'LOBBY', locale: currentLocale, isSinglePlayer: playMode === 'solo', aiPlayerCount }),
        aiMemories: {},
        selectedRoomId: null,
        isRollingDice: false,
        roomWeapons: INITIAL_ROOM_WEAPONS,
        activeEmote: null,
        pendingDisprovePrompt: null,
        lastSecretClue: null,
        activeHypothesisVisual: null,
        activeDialogue: null,
        roomCode: null,
        isConnected: false,
        isConnecting: false,
        connectionError: null,
        peerOnline: false,
        guestSelectedCharacter: null,
        hostSelectedCharacter: null,
        isAutoPlaying: false,
        turnReviewState: null,
      });
    },

    selectRoom: (roomId: string) => {
      set({ selectedRoomId: roomId });
    },

    performRollDice: () => {
      const { playMode } = get();

      if (playMode === 'guest') {
        peerManager.sendMessage({ type: 'ACTION_ROLL' });
        return;
      }

      const { gameState } = get();
      set({ isRollingDice: true });

      setTimeout(() => {
        const nextState = rollDice(gameState);
        set({ gameState: nextState, isRollingDice: false });

        if (playMode === 'host') {
          peerManager.sendMessage({
            type: 'STATE_SYNC',
            payload: { gameState: nextState },
          });
        }
      }, 600);
    },

    performMove: (roomId: string) => {
      const { playMode } = get();

      if (playMode === 'guest') {
        peerManager.sendMessage({
          type: 'ACTION_MOVE',
          payload: { roomId },
        });
        return;
      }

      const { gameState } = get();
      try {
        const nextState = movePlayer(gameState, roomId);
        set({ gameState: nextState, selectedRoomId: null });

        if (playMode === 'host') {
          peerManager.sendMessage({
            type: 'STATE_SYNC',
            payload: { gameState: nextState, roomWeapons: get().roomWeapons },
          });
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Cannot move to this room.';
        alert(msg);
      }
    },

    performWaitInHallway: () => {
      const { playMode } = get();

      if (playMode === 'guest') {
        peerManager.sendMessage({ type: 'ACTION_WAIT_HALLWAY' });
        return;
      }

      const { gameState } = get();
      const nextState = waitInHallway(gameState);
      set({ gameState: nextState, selectedRoomId: null });

      if (playMode === 'host') {
        peerManager.sendMessage({
          type: 'STATE_SYNC',
          payload: { gameState: nextState, roomWeapons: get().roomWeapons },
        });
      }

      // If active player is AI, trigger AI decision in PLAYING_ACTION_DONE
      const currentP = nextState.players[nextState.currentPlayerIndex];
      if (currentP && currentP.type.startsWith('ai_')) {
        setTimeout(() => {
          get().runAITurnIfNeeded();
        }, 800);
      }
    },

    performSuggestion: (suggestion) => {
      const { playMode } = get();

      if (playMode === 'guest') {
        peerManager.sendMessage({
          type: 'ACTION_SUGGEST',
          payload: { suggestion },
        });
        return;
      }

      const { gameState, aiMemories } = get();
      const nextState = makeSuggestion(gameState, suggestion);

      // Move weapon miniature to suggested room
      const curWeapons = { ...get().roomWeapons };
      Object.keys(curWeapons).forEach(rId => {
        curWeapons[rId] = curWeapons[rId].filter(wId => wId !== suggestion.weaponId);
      });
      if (!curWeapons[suggestion.locationId]) curWeapons[suggestion.locationId] = [];
      curWeapons[suggestion.locationId].push(suggestion.weaponId);
      sounds.playWeaponDrop();

      const asker = nextState.players[nextState.currentPlayerIndex];

      // 가설 발표 시각화 상태 생성
      const initialVisual: HypothesisVisualState = {
        askerId: asker.id,
        askerName: asker.name,
        askerAvatar: asker.avatar,
        suggestion,
        phase: 'asking',
      };

      set({ 
        gameState: nextState, 
        roomWeapons: curWeapons,
        activeHypothesisVisual: initialVisual,
      });

      // If an AI suspect was summoned to the room for questioning, trigger dialogue reaction
      const summonedP = nextState.players.find(p => p.characterId === suggestion.suspectId);
      if (summonedP && summonedP.type.startsWith('ai_') && summonedP.currentRoomId === suggestion.locationId) {
        setTimeout(() => triggerAIDialogue(summonedP, 'summoned'), 500);
      }

      if (playMode === 'host') {
        peerManager.sendMessage({
          type: 'STATE_SYNC',
          payload: { gameState: nextState, roomWeapons: curWeapons },
        });
        peerManager.sendMessage({
          type: 'HYPOTHESIS_VISUAL',
          payload: { visual: initialVisual as unknown as Record<string, unknown> },
        });
      }

      // Check disprover clockwise
      const disprover = findNextDisprovingPlayer(
        nextState.players,
        nextState.currentPlayerIndex,
        nextState.currentSuggestion!
      );

      if (disprover) {
        const player = nextState.players[disprover.playerIndex];

        // Case 1: AI disproves
        if (player.type.startsWith('ai_')) {
          setTimeout(() => {
            const shownCard = disprover.availableCards[0];
            if (aiMemories[asker.id]) {
              recordShownCard(aiMemories[asker.id], player.id, shownCard.id);
            }
            nextState.players.forEach(p => {
              if (p.type.startsWith('ai_') && p.id !== asker.id && p.id !== player.id && aiMemories[p.id]) {
                recordObservedDisprove(aiMemories[p.id], { ...suggestion, askerId: asker.id }, player.id, p.hand);
              }
            });

            const disprovedVisual: HypothesisVisualState = {
              askerId: asker.id,
              askerName: asker.name,
              askerAvatar: asker.avatar,
              suggestion,
              phase: 'disproved',
              responderId: player.id,
              responderName: player.name,
              responderAvatar: player.avatar,
              shownCardId: shownCard.id,
            };

            set({ activeHypothesisVisual: disprovedVisual });

            if (playMode === 'host') {
              peerManager.sendMessage({
                type: 'HYPOTHESIS_VISUAL',
                payload: { visual: disprovedVisual as unknown as Record<string, unknown> },
              });
            }

            // When activeHypothesisVisual is displayed, it already visualizes the revealed card
            // and provides 1-click note recording. Do not set lastSecretClue which creates a redundant 2nd 5s modal.

            get().performDisprove(shownCard.id);
          }, 1500);
        }
        // Case 2: Guest (Player 2) must disprove
        else if (playMode === 'host' && player.roleType === 'p2') {
          peerManager.sendMessage({
            type: 'DISPROVE_REQUEST',
            payload: {
              availableCards: disprover.availableCards,
              askerId: asker.id,
            },
          });
        }
        // Case 3: Host (Player 1) or Local human player must disprove
        else if (player.roleType === 'p1' || playMode === 'local') {
          set({
            pendingDisprovePrompt: {
              availableCards: disprover.availableCards,
              askerId: asker.id,
            },
          });
        }
      } else {
        // Nobody could disprove
        setTimeout(() => {
          const undisprovenVisual: HypothesisVisualState = {
            askerId: asker.id,
            askerName: asker.name,
            askerAvatar: asker.avatar,
            suggestion,
            phase: 'undisproven',
          };

          set({ activeHypothesisVisual: undisprovenVisual });

          // 아무도 반증하지 못한 카드는 100% 정답 봉투 속 카드로 AI 메모리에 각인!
          const { aiMemories: curMemories } = get();
          nextState.players.forEach(p => {
            if (p.type.startsWith('ai_') && curMemories[p.id]) {
              recordUndisprovenSuggestion(curMemories[p.id], { ...suggestion, askerId: asker.id }, p.hand);
            }
          });

          if (playMode === 'host') {
            peerManager.sendMessage({
              type: 'HYPOTHESIS_VISUAL',
              payload: { visual: undisprovenVisual as unknown as Record<string, unknown> },
            });
          }

          get().performDisprove(undefined);
        }, 1500);
      }
    },

    performDisprove: (cardId) => {
      const { playMode, gameState } = get();

      if (playMode === 'guest') {
        peerManager.sendMessage({
          type: 'ACTION_DISPROVE',
          payload: { cardId },
        });
        set({ pendingDisprovePrompt: null });
        return;
      }

      set({ pendingDisprovePrompt: null });

      const disprover = findNextDisprovingPlayer(
        gameState.players,
        gameState.currentPlayerIndex,
        gameState.currentSuggestion!
      );

      const responderId = disprover ? gameState.players[disprover.playerIndex].id : 'none';
      const responder = disprover ? gameState.players[disprover.playerIndex] : undefined;
      const asker = gameState.players[gameState.currentPlayerIndex];

      if (responder && responder.type.startsWith('ai_')) {
        triggerAIDialogue(responder, cardId ? 'disprove' : 'cannotDisprove');
      }

      if (cardId && responder) {
        const { aiMemories } = get();
        if (aiMemories[asker.id]) {
          recordShownCard(aiMemories[asker.id], responder.id, cardId);
        }
        if (gameState.currentSuggestion) {
          gameState.players.forEach(p => {
            if (p.type.startsWith('ai_') && p.id !== asker.id && p.id !== responder.id && aiMemories[p.id]) {
              recordObservedDisprove(aiMemories[p.id], gameState.currentSuggestion!, responder.id, p.hand);
            }
          });
        }

        const shownCard = responder.hand.find(c => c.id === cardId);
        if (shownCard) {
          if (asker.roleType === 'p2' && playMode === 'host') {
            // When activeHypothesisVisual handles the reveal, lastSecretClue is not needed
          } else if (asker.roleType === 'p1' || (playMode === 'local' && asker.type === 'human')) {
            // activeHypothesisVisual will be set below with disprovedVisual
          }

          // If human responder disproved: update activeHypothesisVisual
          if (!responder.type.startsWith('ai_') && gameState.currentSuggestion) {
            const disprovedVisual: HypothesisVisualState = {
              askerId: asker.id,
              askerName: asker.name,
              askerAvatar: asker.avatar,
              suggestion: gameState.currentSuggestion,
              phase: 'disproved',
              responderId: responder.id,
              responderName: responder.name,
              responderAvatar: responder.avatar,
              shownCardId: cardId,
            };
            set({ activeHypothesisVisual: disprovedVisual });
            if (playMode === 'host') {
              peerManager.sendMessage({
                type: 'HYPOTHESIS_VISUAL',
                payload: { visual: disprovedVisual as unknown as Record<string, unknown> },
              });
            }
          }
        }
      }

      const nextState = resolveDisprove(gameState, responderId, cardId);
      set({ gameState: nextState });

      if (playMode === 'host') {
        peerManager.sendMessage({
          type: 'STATE_SYNC',
          payload: { gameState: nextState, roomWeapons: get().roomWeapons },
        });
      }

      // If activeHypothesisVisual is displayed, wait until dismissed before triggering AI turn
      if (!get().activeHypothesisVisual && !get().lastSecretClue) {
        setTimeout(() => {
          get().runAITurnIfNeeded();
        }, 1000);
      }
    },

    performAccusation: (accusation) => {
      const { playMode } = get();

      if (playMode === 'guest') {
        peerManager.sendMessage({
          type: 'ACTION_ACCUSE',
          payload: { accusation },
        });
        return false;
      }

      const { gameState } = get();
      const { state: nextState, isCorrect } = makeAccusation(gameState, accusation);
      set({ gameState: nextState });

      if (playMode === 'host') {
        peerManager.sendMessage({
          type: 'STATE_SYNC',
          payload: { gameState: nextState },
        });
      }

      if (!isCorrect && nextState.phase !== 'GAME_OVER') {
        setTimeout(() => {
          get().runAITurnIfNeeded();
        }, 1000);
      }
      return isCorrect;
    },

    performEndTurn: () => {
      const { playMode, gameState } = get();

      if (playMode === 'guest') {
        peerManager.sendMessage({ type: 'ACTION_END_TURN' });
        const lastLog = gameState.logs[gameState.logs.length - 1];
        set({
          turnReviewState: {
            active: true,
            turnNumber: gameState.turnCount,
            lastPlayerName: gameState.players[gameState.currentPlayerIndex]?.name || 'Player',
            summary: lastLog ? lastLog.message : '',
            readyRoles: ['p2'],
          },
          selectedRoomId: null,
        });
        return;
      }

      if (gameState.phase === 'GAME_OVER') return;

      const lastPlayer = gameState.players[gameState.currentPlayerIndex];
      const isLastPlayerHuman = lastPlayer?.type === 'human';

      // 1) Solo mode: if human just ended their turn, proceed immediately without asking to confirm
      if (playMode === 'solo' && isLastPlayerHuman) {
        get().proceedToNextTurn();
        return;
      }

      // 2) Multiplayer: the player who just took their turn is already ready!
      const initialReadyRoles: PlayerRole[] = [];
      if (isLastPlayerHuman && lastPlayer?.roleType) {
        if (lastPlayer.roleType === 'p1' || lastPlayer.roleType === 'p2') {
          initialReadyRoles.push(lastPlayer.roleType as PlayerRole);
        }
      }

      // If in Host mode and no guest exists, proceed immediately
      if (playMode === 'host') {
        const hasGuest = gameState.players.some(p => p.roleType === 'p2');
        if (!hasGuest && initialReadyRoles.includes('p1')) {
          get().proceedToNextTurn();
          return;
        }
      }

      const lastLog = gameState.logs[gameState.logs.length - 1];
      const summary = lastLog ? lastLog.message : `${lastPlayer?.name || 'Player'} turn finished`;

      const reviewState: TurnReviewState = {
        active: true,
        turnNumber: gameState.turnCount,
        lastPlayerName: lastPlayer?.name || '',
        summary,
        readyRoles: initialReadyRoles,
      };

      set({ turnReviewState: reviewState, selectedRoomId: null });

      if (playMode === 'host') {
        peerManager.sendMessage({
          type: 'TURN_REVIEW_UPDATE',
          payload: { turnReview: reviewState as unknown as Record<string, unknown> },
        });
      }
    },

    confirmTurnReview: () => {
      const { playMode, turnReviewState, myPlayerRole, gameState } = get();
      if (!turnReviewState || !turnReviewState.active) return;

      if (playMode === 'guest') {
        peerManager.sendMessage({
          type: 'TURN_REVIEW_CONFIRM',
          payload: { role: myPlayerRole },
        });
        set({
          turnReviewState: {
            ...turnReviewState,
            readyRoles: Array.from(new Set([...turnReviewState.readyRoles, myPlayerRole])),
          },
        });
        return;
      }

      if (playMode === 'host') {
        const updatedRoles = Array.from(new Set([...turnReviewState.readyRoles, 'p1' as PlayerRole]));
        const hasGuest = gameState.players.some(p => p.roleType === 'p2');
        if (!hasGuest || updatedRoles.includes('p2')) {
          get().proceedToNextTurn();
        } else {
          const updatedState = { ...turnReviewState, readyRoles: updatedRoles };
          set({ turnReviewState: updatedState });
          peerManager.sendMessage({
            type: 'TURN_REVIEW_UPDATE',
            payload: { turnReview: updatedState as unknown as Record<string, unknown> },
          });
        }
      } else if (playMode === 'local') {
        const humanPlayers = gameState.players.filter(p => p.type === 'human');
        if (humanPlayers.length <= 1) {
          get().proceedToNextTurn();
        } else {
          if (!turnReviewState.readyRoles.includes('p1')) {
            set({
              turnReviewState: {
                ...turnReviewState,
                readyRoles: ['p1'],
              },
            });
          } else {
            get().proceedToNextTurn();
          }
        }
      } else {
        // Solo mode: immediate proceed
        get().proceedToNextTurn();
      }
    },

    proceedToNextTurn: () => {
      const { playMode, gameState } = get();
      if (playMode === 'guest') return;

      set({ turnReviewState: null, selectedRoomId: null });

      if (playMode === 'host') {
        peerManager.sendMessage({
          type: 'TURN_REVIEW_UPDATE',
          payload: { turnReview: null },
        });
      }

      const nextState = nextTurn(gameState);
      set({ gameState: nextState });

      if (playMode === 'host') {
        peerManager.sendMessage({
          type: 'STATE_SYNC',
          payload: { gameState: nextState, roomWeapons: get().roomWeapons },
        });
      }

      // Trigger AI turn if next player is AI
      setTimeout(() => {
        get().runAITurnIfNeeded();
      }, 800);
    },

    runAITurnIfNeeded: async () => {
      const { playMode, gameState, lastSecretClue, activeHypothesisVisual, turnReviewState, isAutoPlaying } = get();
      if (playMode === 'guest') return; // Host/Local/Solo handles AI execution
      if (gameState.phase === 'GAME_OVER') return;
      if (lastSecretClue || activeHypothesisVisual || (turnReviewState && turnReviewState.active)) return; // Wait until human player dismisses visual modal and confirms review

      const currentP = gameState.players[gameState.currentPlayerIndex];
      if (!currentP) return;

      // If current player is human: if in AutoPlay (AFK), let AI take over
      if (currentP.type === 'human') {
        if (isAutoPlaying) {
          get().executeAutoPlayTurn();
        }
        return;
      }

      // Ensure AI memory is initialized
      let memory = get().aiMemories[currentP.id];
      if (!memory) {
        memory = initAIMemory(currentP);
        set({ aiMemories: { ...get().aiMemories, [currentP.id]: memory } });
      }

      // If in PLAYING_ACTION_DONE phase: AI evaluates final accusation or ends turn
      if (gameState.phase === 'PLAYING_ACTION_DONE') {
        const accusation = shouldAIAccuse(currentP, memory);
        if (accusation) {
          get().performAccusation(accusation);
        } else {
          setTimeout(() => {
            get().performEndTurn();
          }, 800);
        }
        return;
      }

      // If already in PLAYING_SUGGEST phase:
      if (gameState.phase === 'PLAYING_SUGGEST') {
        try {
          const action = currentP.type === 'ai_logic'
            ? decideArthurAction(gameState, memory)
            : decideBlakeAction(gameState, memory);
          if (action.type === 'MOVE_AND_SUGGEST') {
            get().performSuggestion(action.suggestion);
            triggerAIDialogue(currentP, 'suggest');
          }
        } catch (err) {
          console.error('AI suggest error:', err);
        }
        return;
      }

      if (gameState.phase !== 'PLAYING_ROLL') return;

      // 1. AI rolls dice
      sounds.playDice();
      get().performRollDice();

      // Wait for dice roll animation (600ms roll + 500ms result impact = 1100ms)
      setTimeout(() => {
        try {
          const stateAfterRoll = get().gameState;
          if (stateAfterRoll.phase !== 'PLAYING_MOVE') return;

          const action = currentP.type === 'ai_logic' 
            ? decideArthurAction(stateAfterRoll, memory)
            : decideBlakeAction(stateAfterRoll, memory);

          if (action.type === 'ACCUSE') {
            get().performAccusation(action.accusation);
          } else {
            const accessible = stateAfterRoll.accessibleRoomIds || [currentP.currentRoomId];
            if (accessible.length === 0 || !action.targetRoomId) {
              get().performWaitInHallway();
              return;
            }

            get().performMove(action.targetRoomId);
            triggerAIDialogue(currentP, 'move');

            setTimeout(() => {
              try {
                const stateAfterMove = get().gameState;
                if (stateAfterMove.phase === 'PLAYING_SUGGEST') {
                  get().performSuggestion(action.suggestion);
                  triggerAIDialogue(currentP, 'suggest');
                }
              } catch (err) {
                console.error('AI suggestion error:', err);
              }
            }, 900);
          }
        } catch (err) {
          console.error('AI turn decision error:', err);
          get().performWaitInHallway();
        }
      }, 1100);
    },

    dismissSecretClue: () => {
      set({ lastSecretClue: null });
      setTimeout(() => {
        if (!get().activeHypothesisVisual && !get().turnReviewState?.active) {
          if (get().isAutoPlaying) {
            get().executeAutoPlayTurn();
          } else {
            get().runAITurnIfNeeded();
          }
        }
      }, 400);
    },

    dismissHypothesisVisual: () => {
      set({ activeHypothesisVisual: null });
      if (get().playMode === 'host') {
        peerManager.sendMessage({
          type: 'HYPOTHESIS_VISUAL',
          payload: { visual: null },
        });
      }
      setTimeout(() => {
        if (!get().lastSecretClue && !get().turnReviewState?.active) {
          if (get().isAutoPlaying) {
            get().executeAutoPlayTurn();
          } else {
            get().runAITurnIfNeeded();
          }
        }
      }, 400);
    },

    executeAutoPlayTurn: async () => {
      const { playMode, gameState, myPlayerRole, isRollingDice, pendingDisprovePrompt, lastSecretClue, activeHypothesisVisual, turnReviewState } = get();
      if (gameState.phase === 'GAME_OVER') return;

      // 0. 턴 검토 대기 중인 경우 자동 확인
      if (turnReviewState && turnReviewState.active) {
        get().confirmTurnReview();
        return;
      }

      // 1. 비밀 반증 요청이 온 경우 즉시 첫 번째 카드로 자동 반증
      if (pendingDisprovePrompt && pendingDisprovePrompt.availableCards.length > 0) {
        get().performDisprove(pendingDisprovePrompt.availableCards[0].id);
        return;
      }

      // 2. 팝업이 열려 있는 경우 닫기
      if (lastSecretClue) {
        get().dismissSecretClue();
      }
      if (activeHypothesisVisual) {
        get().dismissHypothesisVisual();
      }

      // 3. 현재 턴 플레이어 확인
      const currentP = gameState.players[gameState.currentPlayerIndex];
      if (!currentP) return;

      const isHuman = currentP.type === 'human';
      const isMyTurn = (playMode === 'solo' || playMode === 'local')
        ? isHuman
        : (myPlayerRole === 'p1' && currentP.roleType === 'p1') ||
          (myPlayerRole === 'p2' && currentP.roleType === 'p2');

      if (!isMyTurn) return;

      // AI 메모리 확보
      let memory = get().aiMemories[currentP.id];
      if (!memory) {
        memory = initAIMemory(currentP);
        set({ aiMemories: { ...get().aiMemories, [currentP.id]: memory } });
      }

      // 4. 행동 완료 단계: 최종 고발 가능 여부 확인 후 턴 넘기기
      if (gameState.phase === 'PLAYING_ACTION_DONE') {
        if (lastSecretClue) {
          get().dismissSecretClue();
          return;
        }
        if (activeHypothesisVisual) {
          get().dismissHypothesisVisual();
          return;
        }

        const accusation = shouldAIAccuse(currentP, memory);
        if (accusation) {
          get().performAccusation(accusation);
        } else {
          get().performEndTurn();
        }
        return;
      }

      // 5. 가설 제기 단계
      if (gameState.phase === 'PLAYING_SUGGEST') {
        try {
          const action = decideArthurAction(gameState, memory);
          if (action.type === 'MOVE_AND_SUGGEST') {
            get().performSuggestion(action.suggestion);
          } else {
            get().performEndTurn();
          }
        } catch (err) {
          console.error('AutoPlay suggest error:', err);
          get().performEndTurn();
        }
        return;
      }

      // 6. 이동 단계
      if (gameState.phase === 'PLAYING_MOVE') {
        try {
          const action = decideArthurAction(gameState, memory);
          if (action.type === 'ACCUSE') {
            get().performAccusation(action.accusation);
          } else {
            const accessible = gameState.accessibleRoomIds || [currentP.currentRoomId];
            const targetRoomId = (action.targetRoomId && accessible.includes(action.targetRoomId))
              ? action.targetRoomId
              : accessible[0];
            if (!targetRoomId) {
              get().performWaitInHallway();
              return;
            }
            get().performMove(targetRoomId);
            setTimeout(() => {
              try {
                const stateAfterMove = get().gameState;
                if (stateAfterMove.phase === 'PLAYING_SUGGEST') {
                  get().performSuggestion(action.suggestion);
                }
              } catch (e) {
                console.error('AutoPlay after move suggest error:', e);
              }
            }, 900);
          }
        } catch (err) {
          console.error('AutoPlay move error:', err);
          get().performWaitInHallway();
        }
        return;
      }

      // 7. 주사위 굴리기 단계
      if (gameState.phase === 'PLAYING_ROLL') {
        if (isRollingDice) return;
        sounds.playDice();
        get().performRollDice();

        setTimeout(() => {
          try {
            const stateAfterRoll = get().gameState;
            if (stateAfterRoll.phase !== 'PLAYING_MOVE') return;

            const action = decideArthurAction(stateAfterRoll, memory);
            if (action.type === 'ACCUSE') {
              get().performAccusation(action.accusation);
            } else {
              const accessible = stateAfterRoll.accessibleRoomIds || [currentP.currentRoomId];
              const targetRoomId = (action.targetRoomId && accessible.includes(action.targetRoomId))
                ? action.targetRoomId
                : accessible[0];
              if (!targetRoomId) {
                get().performWaitInHallway();
                return;
              }
              get().performMove(targetRoomId);

              setTimeout(() => {
                try {
                  const stateAfterMove = get().gameState;
                  if (stateAfterMove.phase === 'PLAYING_SUGGEST') {
                    get().performSuggestion(action.suggestion);
                  }
                } catch (err) {
                  console.error('AutoPlay suggestion error:', err);
                }
              }, 900);
            }
          } catch (err) {
            console.error('AutoPlay turn decision error:', err);
            get().performWaitInHallway();
          }
        }, 1100);
      }
    },
  };
});
