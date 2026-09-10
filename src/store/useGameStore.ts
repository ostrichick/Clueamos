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
import { sounds } from '@/utils/sounds';

export type PlayMode = 'solo' | 'local' | 'host' | 'guest';
export type PlayerRole = 'p1' | 'p2';

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

  // AI 대사 및 말풍선 인터랙션
  activeDialogue: ActiveDialogue | null;

  // 피지컬 보드게임 토큰 및 리액션
  roomWeapons: Record<string, string[]>;
  activeEmote: ActiveEmote | null;

  // 비밀 반증 인터랙션 상태
  pendingDisprovePrompt: { availableCards: Card[]; askerId: string } | null;
  lastSecretClue: { card: Card; fromName: string } | null;

  // 액션
  setLocale: (locale: SupportedLocale) => void;
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
  runAITurnIfNeeded: () => Promise<void>;
  dismissSecretClue: () => void;
  exitToLobby: () => void;
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
    activeDialogue: null,
    roomWeapons: INITIAL_ROOM_WEAPONS,
    activeEmote: null,
    pendingDisprovePrompt: null,
    lastSecretClue: null,

    setLocale: (loc) => {
      set({ currentLocale: loc });
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
      const isSinglePlayer = playMode === 'solo';
      const newState = initGame({ 
        isSinglePlayer,
        player1CharacterId: p1CharacterId, 
        player2CharacterId: p2CharacterId, 
        locale 
      });
      const p2Player = newState.players.find(p => p.id === 'p2');
      const ai1Player = newState.players.find(p => p.id === 'ai_1');
      const ai2Player = newState.players.find(p => p.id === 'ai_2');
      
      const memories: Record<string, AIMemory> = {};
      if (p2Player && p2Player.type.startsWith('ai_')) {
        memories.p2 = initAIMemory(p2Player);
      }
      if (ai1Player) memories.ai_1 = initAIMemory(ai1Player);
      if (ai2Player) memories.ai_2 = initAIMemory(ai2Player);

      set({
        gameState: newState,
        aiMemories: memories,
        roomWeapons: INITIAL_ROOM_WEAPONS,
        activeEmote: null,
        selectedRoomId: null,
        isRollingDice: false,
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
      const { isConnected, currentLocale, playMode } = get();
      if (isConnected) {
        get().disconnectRoom();
      }
      set({
        gameState: initGame({ initialPhase: 'LOBBY', locale: currentLocale, isSinglePlayer: playMode === 'solo' }),
        aiMemories: {},
        selectedRoomId: null,
        isRollingDice: false,
        roomWeapons: INITIAL_ROOM_WEAPONS,
        activeEmote: null,
        pendingDisprovePrompt: null,
        lastSecretClue: null,
        activeDialogue: null,
        roomCode: null,
        isConnected: false,
        isConnecting: false,
        connectionError: null,
        peerOnline: false,
        guestSelectedCharacter: null,
        hostSelectedCharacter: null,
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

      // Move weapon miniature to suggested room
      const curWeapons = { ...get().roomWeapons };
      Object.keys(curWeapons).forEach(rId => {
        curWeapons[rId] = curWeapons[rId].filter(wId => wId !== suggestion.weaponId);
      });
      if (!curWeapons[suggestion.locationId]) curWeapons[suggestion.locationId] = [];
      curWeapons[suggestion.locationId].push(suggestion.weaponId);
      sounds.playWeaponDrop();

      set({ gameState: nextState, roomWeapons: curWeapons });

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
          payload: { gameState: nextState, roomWeapons: get().roomWeapons },
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
      const { playMode, gameState } = get();
      if (playMode === 'guest') return; // Host/Local/Solo handles AI execution
      if (gameState.phase === 'GAME_OVER') return;

      const currentP = gameState.players[gameState.currentPlayerIndex];
      if (!currentP || !currentP.type.startsWith('ai_')) return;

      // Ensure AI memory is initialized
      let memory = get().aiMemories[currentP.id];
      if (!memory) {
        memory = initAIMemory(currentP);
        set({ aiMemories: { ...get().aiMemories, [currentP.id]: memory } });
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
    },
  };
});
