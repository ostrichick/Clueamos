import { create } from 'zustand';
import { GameState, Solution, Suggestion, Card, Player } from '@/engine/types';
import { 
  initGame, 
  rollDice, 
  movePlayer, 
  waitInHallway, 
  makeSuggestion, 
  findNextDisprovingPlayer, 
  resolveDisprove, 
  makeAccusation 
} from '@/engine/engine';
import { 
  AIMemory, 
  initAIMemory, 
  decideArthurAction, 
  decideBlakeAction, 
  recordShownCard 
} from '@/engine/ai';
import { SupportedLocale, translations } from '@/i18n/translations';
import { peerManager, PeerMessage } from '@/network/peerManager';

export type PlayMode = 'local' | 'host' | 'guest';
export type PlayerRole = 'p1' | 'p2';

export interface ActiveDialogue {
  speakerId: string;
  speakerName: string;
  avatar: string;
  color: string;
  text: string;
}

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

  // AI 대사 및 말풍선 인터랙션
  activeDialogue: ActiveDialogue | null;

  // 비밀 반증 인터랙션 상태
  pendingDisprovePrompt: { availableCards: Card[]; askerId: string } | null;
  lastSecretClue: { card: Card; fromName: string } | null;

  // 액션
  setLocale: (locale: SupportedLocale) => void;
  showDialogue: (speaker: Player, text: string) => void;
  dismissDialogue: () => void;
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
  runAITurnIfNeeded: () => Promise<void>;
  dismissSecretClue: () => void;
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
            },
          });
        }
        break;
      }

      case 'START_GAME': {
        if (playMode === 'guest' && msg.payload?.gameState) {
          set({
            gameState: msg.payload.gameState as GameState,
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
    gameState: initGame(),
    aiMemories: {},
    selectedRoomId: null,
    isRollingDice: false,
    currentLocale: 'en',

    playMode: 'local',
    myPlayerRole: 'p1',
    roomCode: null,
    isConnected: false,
    isConnecting: false,
    connectionError: null,
    peerOnline: false,
    guestSelectedCharacter: null,
    hostSelectedCharacter: null,
    activeDialogue: null,
    pendingDisprovePrompt: null,
    lastSecretClue: null,

    setLocale: (loc) => {
      set({ currentLocale: loc });
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
      set({ 
        playMode: mode, 
        myPlayerRole: mode === 'guest' ? 'p2' : 'p1' 
      });
    },

    createRoom: async (desiredCode?: string) => {
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
            },
          });
        }
      };

      try {
        const code = await peerManager.createRoom(desiredCode);
        saveSession({ roomCode: code, playMode: 'host', role: 'p1' });
        set({
          roomCode: code,
          playMode: 'host',
          myPlayerRole: 'p1',
          isConnecting: false,
        });
        return code;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create room';
        set({ isConnecting: false, connectionError: message });
        throw err;
      }
    },

    joinRoom: async (code: string) => {
      set({ isConnecting: true, connectionError: null });
      peerManager.onConnectionStateChange = (connected, error) => {
        set({ 
          isConnected: connected, 
          isConnecting: false,
          connectionError: error || null 
        });
      };

      try {
        await peerManager.joinRoom(code);
        saveSession({ roomCode: code, playMode: 'guest', role: 'p2' });
        set({
          roomCode: code,
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
        throw err;
      }
    },

    disconnectRoom: () => {
      clearSession();
      peerManager.cleanup();
      set({
        roomCode: null,
        isConnected: false,
        isConnecting: false,
        connectionError: null,
        peerOnline: false,
        playMode: 'local',
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
      const { playMode, guestSelectedCharacter } = get();
      if (playMode === 'host') {
        peerManager.sendMessage({
          type: 'LOBBY_UPDATE',
          payload: {
            p1Character: charId,
            p2Character: guestSelectedCharacter,
          },
        });
      }
    },

    startNewGame: (p1CharacterId, p2CharacterId, locale) => {
      const { playMode } = get();
      const newState = initGame({ 
        player1CharacterId: p1CharacterId, 
        player2CharacterId: p2CharacterId, 
        locale 
      });
      const ai1Player = newState.players.find(p => p.id === 'ai_1');
      const ai2Player = newState.players.find(p => p.id === 'ai_2');
      const ai1Mem = ai1Player ? initAIMemory(ai1Player) : ({} as AIMemory);
      const ai2Mem = ai2Player ? initAIMemory(ai2Player) : ({} as AIMemory);

      set({
        gameState: newState,
        aiMemories: {
          ai_1: ai1Mem,
          ai_2: ai2Mem,
        },
        selectedRoomId: null,
        isRollingDice: false,
      });

      if (playMode === 'host') {
        peerManager.sendMessage({
          type: 'START_GAME',
          payload: { gameState: newState },
        });
      }
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
            payload: { gameState: nextState },
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
          payload: { gameState: nextState },
        });
      }

      // Trigger AI turn if next
      setTimeout(() => {
        get().runAITurnIfNeeded();
      }, 1000);
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
      set({ gameState: nextState });

      // If an AI suspect was summoned to the room for questioning, trigger dialogue reaction
      const summonedP = nextState.players.find(p => p.characterId === suggestion.suspectId);
      if (summonedP && summonedP.type.startsWith('ai_') && summonedP.currentRoomId === suggestion.locationId) {
        setTimeout(() => triggerAIDialogue(summonedP, 'summoned'), 500);
      }

      if (playMode === 'host') {
        peerManager.sendMessage({
          type: 'STATE_SYNC',
          payload: { gameState: nextState },
        });
      }

      // Check disprover clockwise
      const disprover = findNextDisprovingPlayer(
        nextState.players,
        nextState.currentPlayerIndex,
        nextState.currentSuggestion!
      );

      const asker = nextState.players[nextState.currentPlayerIndex];

      if (disprover) {
        const player = nextState.players[disprover.playerIndex];

        // Case 1: AI disproves
        if (player.type.startsWith('ai_')) {
          setTimeout(() => {
            const shownCard = disprover.availableCards[0];
            if (aiMemories[asker.id]) {
              recordShownCard(aiMemories[asker.id], player.id, shownCard.id);
            }

            // If asker is Guest (Player 2 in multi-device), send private clue
            if (playMode === 'host' && asker.roleType === 'p2') {
              peerManager.sendMessage({
                type: 'PRIVATE_CLUE_REVEALED',
                payload: { card: shownCard, fromName: player.name },
              });
            } else if (asker.roleType === 'p1' || (playMode === 'local' && asker.type === 'human')) {
              set({
                lastSecretClue: { card: shownCard, fromName: player.name },
              });
            }

            get().performDisprove(shownCard.id);
          }, 1200);
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
          get().performDisprove(undefined);
        }, 1200);
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
        const shownCard = responder.hand.find(c => c.id === cardId);
        if (shownCard) {
          if (asker.roleType === 'p2' && playMode === 'host') {
            peerManager.sendMessage({
              type: 'PRIVATE_CLUE_REVEALED',
              payload: { card: shownCard, fromName: responder.name },
            });
          } else if (asker.roleType === 'p1' || (playMode === 'local' && asker.type === 'human')) {
            set({
              lastSecretClue: { card: shownCard, fromName: responder.name },
            });
          }
        }
      }

      const nextState = resolveDisprove(gameState, responderId, cardId);
      set({ gameState: nextState });

      if (playMode === 'host') {
        peerManager.sendMessage({
          type: 'STATE_SYNC',
          payload: { gameState: nextState },
        });
      }

      // Trigger AI turn if next
      setTimeout(() => {
        get().runAITurnIfNeeded();
      }, 1000);
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

    runAITurnIfNeeded: async () => {
      const { playMode, gameState, aiMemories } = get();
      if (playMode === 'guest') return; // Host handles AI execution
      if (gameState.phase === 'GAME_OVER') return;

      const currentP = gameState.players[gameState.currentPlayerIndex];
      if (!currentP.type.startsWith('ai_')) return;

      const memory = aiMemories[currentP.id];
      if (!memory) return;

      // AI roll
      get().performRollDice();

      setTimeout(() => {
        const stateAfterRoll = get().gameState;
        const action = currentP.type === 'ai_logic' 
          ? decideArthurAction(stateAfterRoll, memory)
          : decideBlakeAction(stateAfterRoll, memory);

        if (action.type === 'ACCUSE') {
          get().performAccusation(action.accusation);
        } else {
          get().performMove(action.targetRoomId);
          triggerAIDialogue(currentP, 'move');
          setTimeout(() => {
            get().performSuggestion(action.suggestion);
            triggerAIDialogue(currentP, 'suggest');
          }, 800);
        }
      }, 800);
    },

    dismissSecretClue: () => {
      set({ lastSecretClue: null });
    },
  };
});
