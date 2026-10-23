import { create } from 'zustand';
import { type GameState, type Solution, type Suggestion, type Card, type Player, type HypothesisVisualState } from '@/engine/types';
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
  type AIMemory, 
  initAIMemory, 
  decideArthurAction, 
  decideBlakeAction, 
  recordShownCard,
  recordUndisprovenSuggestion,
  recordObservedDisprove,
  shouldAIAccuse
} from '@/engine/ai';
import { type SupportedLocale, translations } from '@/i18n/translations';
import { SUSPECTS } from '@/engine/data';
import { randomSeed } from '@/utils/rng';
import { peerManager, type PeerMessage } from '@/network/peerManager';
import { guestView } from '@/network/guestView';
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
  room_ballroom: ['weapon_candlestick', 'weapon_trophy'],
  room_kitchen: ['weapon_knife'],
  room_library: ['weapon_revolver'],
  room_wine_cellar: ['weapon_poison'],
  room_room304: ['weapon_rope'],
  room_rooftop: ['weapon_wrench', 'weapon_pipe'],
};

type EmoteKey = 'emoteObserve' | 'emotePonder' | 'emoteEureka' | 'emoteTea';
const EMOTES: Record<string, { icon: string; key: EmoteKey }> = {
  observe: { icon: '🧐', key: 'emoteObserve' },
  ponder: { icon: '🤔', key: 'emotePonder' },
  eureka: { icon: '💡', key: 'emoteEureka' },
  tea: { icon: '☕', key: 'emoteTea' },
};

const SESSION_KEY = 'clueamos_session_v1';
const HOST_STATE_KEY = 'clueamos_host_game_v1';

function saveSession(data: { roomCode: string; roomSecret: string; playMode: PlayMode; role: PlayerRole }) {
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
      sessionStorage.removeItem(HOST_STATE_KEY);
    } catch {}
  }
}

type SavedAIMemory = {
  playerId: string;
  cardStatus: [string, string][];
  knownPlayerCards: [string, string[]][];
  pastSuggestions: Suggestion[];
};

function readHostSnapshot(): {
  gameState: GameState;
  roomWeapons: Record<string, string[]>;
  turnReviewState: TurnReviewState | null;
  aiMemories: Record<string, SavedAIMemory>;
} | null {
  try {
    const raw = sessionStorage.getItem(HOST_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
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
  roomSecret: string | null;
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
  createRoom: (desiredCode?: string, desiredPassword?: string) => Promise<string>;
  joinRoom: (code: string, password?: string) => Promise<void>;
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
  const sendGuestState = (type: 'START_GAME' | 'STATE_SYNC', state: GameState, weapons = get().roomWeapons) => {
    peerManager.sendMessage({ type, payload: { gameState: guestView(state), roomWeapons: weapons } });
  };

  const guestTurn = (phase?: GameState['phase']) => {
    const { gameState, turnReviewState } = get();
    const actor = gameState.players[gameState.currentPlayerIndex];
    return actor?.roleType === 'p2' && actor.type === 'human' && !actor.isEliminated &&
      !turnReviewState?.active && (phase === undefined || gameState.phase === phase);
  };

  const guestDisprover = () => {
    const { gameState } = get();
    if (gameState.phase !== 'WAITING_DISPROVE' || !gameState.currentSuggestion) return false;
    const next = findNextDisprovingPlayer(gameState.players, gameState.currentPlayerIndex, gameState.currentSuggestion);
    return Boolean(next && gameState.players[next.playerIndex].roleType === 'p2');
  };

  // Setup peer message handler
  const handleIncomingPeerMessage = (msg: PeerMessage) => {
    const { playMode } = get();

    switch (msg.type) {
      case 'LOBBY_UPDATE': {
        if (playMode !== 'guest') break;
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
        const characterId = msg.payload?.characterId;
        if (playMode === 'host' && get().gameState.phase === 'LOBBY' &&
            SUSPECTS.some(s => s.id === characterId)) {
          set({ guestSelectedCharacter: characterId as string });
          // Broadcast back to guest
          peerManager.sendMessage({
            type: 'LOBBY_UPDATE',
            payload: {
              p1Character: get().hostSelectedCharacter,
              p2Character: characterId as string,
              aiCount: get().aiPlayerCount,
            },
          });
        }
        break;
      }

      case 'GUEST_JOIN': {
        if (playMode === 'host') {
          const { gameState, roomWeapons, turnReviewState } = get();
          if (gameState.phase !== 'LOBBY') {
            sendGuestState('START_GAME', gameState, roomWeapons);
            if (turnReviewState?.active) {
              peerManager.sendMessage({ type: 'TURN_REVIEW_UPDATE', payload: { turnReview: turnReviewState as unknown as Record<string, unknown> } });
            }
            if (gameState.phase === 'WAITING_DISPROVE' && gameState.currentSuggestion) {
              const next = findNextDisprovingPlayer(gameState.players, gameState.currentPlayerIndex, gameState.currentSuggestion);
              if (next && gameState.players[next.playerIndex].roleType === 'p2') {
                peerManager.sendMessage({ type: 'DISPROVE_REQUEST', payload: { availableCards: next.availableCards, askerId: gameState.currentSuggestion.askerId } });
              }
            }
          } else {
            peerManager.sendMessage({
              type: 'LOBBY_UPDATE',
              payload: { p1Character: get().hostSelectedCharacter || 'suspect_scarlett', p2Character: get().guestSelectedCharacter || 'suspect_mustard', aiCount: get().aiPlayerCount },
            });
          }
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
        if (playMode === 'host' && guestTurn('PLAYING_ROLL') && !get().isRollingDice) {
          get().performRollDice();
        }
        break;
      }

      case 'ACTION_MOVE': {
        if (playMode === 'host' && guestTurn('PLAYING_MOVE') && typeof msg.payload?.roomId === 'string' &&
            get().gameState.accessibleRoomIds?.includes(msg.payload.roomId)) {
          get().performMove(msg.payload.roomId as string);
        }
        break;
      }

      case 'ACTION_SUGGEST': {
        const s = msg.payload?.suggestion as Partial<Suggestion> | undefined;
        if (playMode === 'host' && guestTurn('PLAYING_SUGGEST') && s &&
            typeof s.suspectId === 'string' && typeof s.locationId === 'string' && typeof s.weaponId === 'string' &&
            s.locationId === get().gameState.players[get().gameState.currentPlayerIndex].currentRoomId) {
          get().performSuggestion(s as Omit<Suggestion, 'askerId'>);
        }
        break;
      }

      case 'ACTION_DISPROVE': {
        if (playMode === 'host' && guestDisprover() && typeof msg.payload?.cardId === 'string') {
          get().performDisprove(msg.payload?.cardId as string | undefined);
        }
        break;
      }

      case 'ACTION_ACCUSE': {
        const a = msg.payload?.accusation as Partial<Solution> | undefined;
        if (playMode === 'host' && guestTurn() && get().gameState.phase.startsWith('PLAYING_') && a &&
            typeof a.suspectId === 'string' && typeof a.locationId === 'string' && typeof a.weaponId === 'string' &&
            get().gameState.allCards.some(c => c.category === 'suspect' && c.id === a.suspectId) &&
            get().gameState.allCards.some(c => c.category === 'location' && c.id === a.locationId) &&
            get().gameState.allCards.some(c => c.category === 'weapon' && c.id === a.weaponId)) {
          get().performAccusation(a as Solution);
        }
        break;
      }

      case 'ACTION_WAIT_HALLWAY': {
        if (playMode === 'host' && guestTurn('PLAYING_MOVE')) {
          get().performWaitInHallway();
        }
        break;
      }

      case 'ACTION_END_TURN': {
        if (playMode === 'host' && guestTurn('PLAYING_ACTION_DONE')) {
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
        if (playMode === 'guest' && msg.payload?.card && msg.payload?.fromName) {
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
        // Only the host speaks for AI detectives; ignore dialogue a guest tries to inject.
        if (playMode === 'guest' && msg.payload) {
          const p = msg.payload;
          const speaker = get().gameState.players.find(pl => pl.id === p.speakerId);
          if (!speaker || typeof p.text !== 'string') break;
          const dialogue: ActiveDialogue = {
            speakerId: speaker.id, speakerName: speaker.name, avatar: speaker.avatar, color: speaker.color,
            text: p.text.slice(0, 300),
          };
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
        // Emotes always come from the other human; never trust the sender's claimed identity or label.
        const sender = get().gameState.players.find(pl => pl.roleType === (playMode === 'host' ? 'p2' : 'p1'));
        const meta = Object.values(EMOTES).find(e => e.icon === msg.payload?.emote);
        if ((playMode === 'host' || playMode === 'guest') && sender && meta) {
          const dict = translations[get().currentLocale] || translations.en;
          const emoteData: ActiveEmote = {
            playerId: sender.id, speakerName: sender.name, avatar: sender.avatar, color: sender.color,
            emote: meta.icon, label: dict[meta.key] || meta.icon, timestamp: Date.now(),
          };
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
        if (playMode === 'guest') set({ activeHypothesisVisual: (msg.payload?.visual as HypothesisVisualState) || null });
        break;
      }

      case 'TURN_REVIEW_UPDATE': {
        if (playMode === 'guest') set({ turnReviewState: (msg.payload?.turnReview as unknown as TurnReviewState) || null });
        break;
      }

      case 'TURN_REVIEW_CONFIRM': {
        if (playMode === 'host') {
          const { turnReviewState } = get();
          if (turnReviewState?.active && msg.payload?.role === 'p2' && msg.payload?.turnNumber === turnReviewState.turnNumber) {
            const incomingRole: PlayerRole = 'p2';
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

  // 반증 차례인 플레이어를 호출한다. 질문 직후와 호스트 새로고침 복원 시 함께 사용한다.
  const dispatchDisprove = (state: GameState) => {
    const current = state.currentSuggestion;
    if (state.phase !== 'WAITING_DISPROVE' || !current) return;
    const { playMode } = get();
    const asker = state.players[state.currentPlayerIndex];
    const suggestion = { suspectId: current.suspectId, locationId: current.locationId, weaponId: current.weaponId };
    const disprover = findNextDisprovingPlayer(state.players, state.currentPlayerIndex, current);

    if (disprover) {
      const player = state.players[disprover.playerIndex];

      // Case 1: AI disproves (AI memories are updated once, inside performDisprove)
      if (player.type.startsWith('ai_')) {
        setTimeout(() => {
          if (get().gameState !== state) return;
          const shownCard = disprover.availableCards[0];
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
            const guestPlayer = state.players.find(p => p.roleType === 'p2');
            const isGuestInvolved = guestPlayer && (guestPlayer.id === asker.id || guestPlayer.id === player.id);
            peerManager.sendMessage({
              type: 'HYPOTHESIS_VISUAL',
              payload: {
                visual: {
                  ...disprovedVisual,
                  shownCardId: isGuestInvolved ? disprovedVisual.shownCardId : undefined,
                } as unknown as Record<string, unknown>,
              },
            });
          }

          get().performDisprove(shownCard.id);
        }, 1500);
      }
      // Case 2: Guest (Player 2) must disprove
      else if (playMode === 'host' && player.roleType === 'p2') {
        peerManager.sendMessage({
          type: 'DISPROVE_REQUEST',
          payload: { availableCards: disprover.availableCards, askerId: asker.id },
        });
      }
      // Case 3: Host (Player 1) or Local human player must disprove
      else if (player.roleType === 'p1' || playMode === 'local') {
        set({ pendingDisprovePrompt: { availableCards: disprover.availableCards, askerId: asker.id } });
      }
      return;
    }

    // Nobody could disprove
    setTimeout(() => {
      if (get().gameState !== state) return;
      const undisprovenVisual: HypothesisVisualState = {
        askerId: asker.id,
        askerName: asker.name,
        askerAvatar: asker.avatar,
        suggestion,
        phase: 'undisproven',
      };

      set({ activeHypothesisVisual: undisprovenVisual });

      // 아무도 반증하지 못한 카드는 100% 정답 봉투 속 카드로 AI 메모리에 각인!
      const { aiMemories } = get();
      state.players.forEach(p => {
        if (p.type.startsWith('ai_') && aiMemories[p.id]) {
          recordUndisprovenSuggestion(aiMemories[p.id], current, p.hand, asker.type);
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
    roomSecret: null,
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

      const meta = EMOTES[emoteKey] || EMOTES.observe;
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

    createRoom: async (desiredCode?: string, desiredPassword?: string) => {
      const codeParam = typeof desiredCode === 'string' ? desiredCode : undefined;
      const passwordParam = typeof desiredPassword === 'string' ? desiredPassword : undefined;
      set({ isConnecting: true, connectionError: null, playMode: 'host', myPlayerRole: 'p1' });
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
        const code = await peerManager.createRoom(codeParam, passwordParam);
        const codeStr = String(code);
        const secret = peerManager.getRoomSecret() || '';
        saveSession({ roomCode: codeStr, roomSecret: secret, playMode: 'host', role: 'p1' });
        set({
          roomCode: codeStr,
          roomSecret: secret,
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

    joinRoom: async (code: string, password?: string) => {
      const cleanCode = typeof code === 'string' ? code.trim() : '';
      const cleanPassword = typeof password === 'string' ? password.trim() : '';
      set({ isConnecting: true, connectionError: null, playMode: 'guest', myPlayerRole: 'p2' });
      peerManager.onConnectionStateChange = (connected, error) => {
        set({ 
          isConnected: connected, 
          isConnecting: false,
          connectionError: error || null 
        });
      };

      try {
        await peerManager.joinRoom(cleanCode, cleanPassword);
        const secret = peerManager.getRoomSecret() || '';
        saveSession({ roomCode: cleanCode, roomSecret: secret, playMode: 'guest', role: 'p2' });
        set({
          roomCode: cleanCode,
          roomSecret: secret,
          playMode: 'guest',
          myPlayerRole: 'p2',
          isConnecting: false,
          isConnected: true,
        });

        // A reconnecting player keeps the host's existing character selection.
        if (get().gameState.phase === 'LOBBY') {
          peerManager.sendMessage({
            type: 'GUEST_SELECT_CHAR',
            payload: { characterId: get().guestSelectedCharacter || 'suspect_mustard' },
          });
        }
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
        roomSecret: null,
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
      let raw: string | null = null;
      try { raw = sessionStorage.getItem(SESSION_KEY); } catch { return false; }
      if (!raw) return false;
      try {
        const session = JSON.parse(raw);
        if (session.roomCode && session.playMode) {
          if (session.playMode === 'guest') {
            await get().joinRoom(session.roomCode, session.roomSecret || '');
            return get().isConnected;
          } else if (session.playMode === 'host') {
            const saved = readHostSnapshot();
            if (saved?.gameState && saved.aiMemories) {
              const memories: Record<string, AIMemory> = {};
              for (const [id, memory] of Object.entries(saved.aiMemories)) {
                memories[id] = {
                  playerId: memory.playerId,
                  cardStatus: new Map(memory.cardStatus) as AIMemory['cardStatus'],
                  knownPlayerCards: new Map(memory.knownPlayerCards.map(([playerId, cards]) => [playerId, new Set(cards)])),
                  pastSuggestions: memory.pastSuggestions,
                };
              }
              set({ gameState: saved.gameState, aiMemories: memories, roomWeapons: saved.roomWeapons, turnReviewState: saved.turnReviewState, playMode: 'host', myPlayerRole: 'p1' });
              // 반증 요청 창과 AI 반증 타이머는 저장되지 않으므로 다시 호출해야 게임이 멈추지 않는다.
              dispatchDisprove(saved.gameState);
            }
            await get().createRoom(session.roomCode, session.roomSecret || undefined);
            return Boolean(get().roomCode);
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
      if (playMode === 'guest') return;
      const isSinglePlayer = playMode === 'solo';
      const seed = randomSeed();
      const newState = initGame({ 
        isSinglePlayer,
        player1CharacterId: p1CharacterId, 
        player2CharacterId: p2CharacterId, 
        locale,
        aiPlayerCount,
        seed,
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
        pendingDisprovePrompt: null,
        lastSecretClue: null,
        activeDialogue: null,
        activeHypothesisVisual: null,
        isAutoPlaying: false,
        turnReviewState: null,
      });

      if (playMode === 'host') {
        sendGuestState('START_GAME', newState, INITIAL_ROOM_WEAPONS);
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
        roomSecret: null,
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
      if (gameState.phase !== 'PLAYING_ROLL' || get().isRollingDice || get().turnReviewState?.active) return;
      set({ isRollingDice: true });

      setTimeout(() => {
        if (get().gameState !== gameState || !get().isRollingDice) return;
        const nextState = rollDice(gameState);
        set({ gameState: nextState, isRollingDice: false });

        if (playMode === 'host') {
          sendGuestState('STATE_SYNC', nextState);
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
          sendGuestState('STATE_SYNC', nextState);
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
      if (gameState.phase !== 'PLAYING_MOVE') return;
      const nextState = waitInHallway(gameState);
      set({ gameState: nextState, selectedRoomId: null });

      if (playMode === 'host') {
        sendGuestState('STATE_SYNC', nextState);
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

      const { gameState } = get();
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
        sendGuestState('STATE_SYNC', nextState, curWeapons);
        peerManager.sendMessage({
          type: 'HYPOTHESIS_VISUAL',
          payload: { visual: initialVisual as unknown as Record<string, unknown> },
        });
      }

      dispatchDisprove(nextState);
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

      const disprover = findNextDisprovingPlayer(
        gameState.players,
        gameState.currentPlayerIndex,
        gameState.currentSuggestion!
      );

      const responderId = disprover ? gameState.players[disprover.playerIndex].id : 'none';
      const responder = disprover ? gameState.players[disprover.playerIndex] : undefined;
      const asker = gameState.players[gameState.currentPlayerIndex];
      // Validate the card and responding player before updating any AI memory.
      const nextState = resolveDisprove(gameState, responderId, cardId);
      set({ pendingDisprovePrompt: null });

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
              const guestPlayer = gameState.players.find(p => p.roleType === 'p2');
              const isGuestInvolved = guestPlayer && (guestPlayer.id === asker.id || guestPlayer.id === responder.id);
              peerManager.sendMessage({
                type: 'HYPOTHESIS_VISUAL',
                payload: { 
                  visual: {
                    ...disprovedVisual,
                    shownCardId: isGuestInvolved ? disprovedVisual.shownCardId : undefined,
                  } as unknown as Record<string, unknown> 
                },
              });
            }
          }
        }
      }

      set({ gameState: nextState });

      if (playMode === 'host') {
        sendGuestState('STATE_SYNC', nextState);
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
      let result: ReturnType<typeof makeAccusation>;
      try {
        result = makeAccusation(gameState, accusation);
      } catch {
        return false; // Not this player's turn phase (e.g. waiting for a disproof).
      }
      const { state: nextState, isCorrect } = result;
      set({ gameState: nextState });

      if (playMode === 'host') {
        sendGuestState('STATE_SYNC', nextState);
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
      if (get().turnReviewState?.active) return;

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
          payload: { role: myPlayerRole, turnNumber: turnReviewState.turnNumber },
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
        // Pass-and-play: one confirmation on the shared device completes the review.
        get().proceedToNextTurn();
      } else {
        // Solo mode: immediate proceed
        get().proceedToNextTurn();
      }
    },

    proceedToNextTurn: () => {
      const { playMode, gameState } = get();
      if (playMode === 'guest') return;

      let nextState: GameState;
      try {
        nextState = nextTurn(gameState);
      } catch {
        return; // Turn cannot end during a disproof, in the lobby, or after game over.
      }

      set({ turnReviewState: null, selectedRoomId: null });

      if (playMode === 'host') {
        peerManager.sendMessage({
          type: 'TURN_REVIEW_UPDATE',
          payload: { turnReview: null },
        });
      }

      set({ gameState: nextState });

      if (playMode === 'host') {
        sendGuestState('STATE_SYNC', nextState);
      }

      // Trigger AI turn if next player is AI
      setTimeout(() => {
        if (get().gameState === nextState) get().runAITurnIfNeeded();
      }, 800);
    },

    runAITurnIfNeeded: async () => {
      const { playMode, gameState, lastSecretClue, activeHypothesisVisual, turnReviewState, isAutoPlaying } = get();
      if (playMode === 'guest') return; // Host/Local/Solo handles AI execution
      if (gameState.phase === 'GAME_OVER') return;
      if (lastSecretClue || activeHypothesisVisual || (turnReviewState && turnReviewState.active)) return; // Wait until human player dismisses visual modal and confirms review

      const currentP = gameState.players[gameState.currentPlayerIndex];
      if (!currentP) return;
      const sameTurn = () => {
        const current = get().gameState;
        return current.seed === gameState.seed && current.turnCount === gameState.turnCount &&
          current.players[current.currentPlayerIndex]?.id === currentP.id;
      };

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
        const accusation = shouldAIAccuse(currentP, memory, gameState.turnCount, gameState.maxTurns);
        if (accusation) {
          get().performAccusation(accusation);
        } else {
          setTimeout(() => {
            if (sameTurn() && get().gameState.phase === 'PLAYING_ACTION_DONE') get().performEndTurn();
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
          } else if (action.type === 'ACCUSE') {
            get().performAccusation(action.accusation);
          } else {
            get().performEndTurn();
          }
        } catch (err) {
          console.error('AI suggest error:', err);
          get().performEndTurn();
        }
        return;
      }

      // If in PLAYING_MOVE phase (dice was rolled, need to decide move):
      if (gameState.phase === 'PLAYING_MOVE') {
        try {
          const action = currentP.type === 'ai_logic'
            ? decideArthurAction(gameState, memory)
            : decideBlakeAction(gameState, memory);

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
            triggerAIDialogue(currentP, 'move');

            setTimeout(() => {
              if (!sameTurn()) return;
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
          console.error('AI turn move decision error:', err);
          get().performWaitInHallway();
        }
        return;
      }

      if (gameState.phase !== 'PLAYING_ROLL') return;
      if (get().isRollingDice) return;

      // 1. AI rolls dice
      sounds.playDice();
      get().performRollDice();

      // Wait for dice roll animation (600ms roll + 500ms result impact = 1100ms)
      setTimeout(() => {
        if (!sameTurn()) return;
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
            const targetRoomId = (action.targetRoomId && accessible.includes(action.targetRoomId))
              ? action.targetRoomId
              : accessible[0];

            if (!targetRoomId) {
              get().performWaitInHallway();
              return;
            }

            get().performMove(targetRoomId);
            triggerAIDialogue(currentP, 'move');

            setTimeout(() => {
              if (!sameTurn()) return;
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

        const accusation = shouldAIAccuse(currentP, memory, gameState.turnCount, gameState.maxTurns);
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
              if (!get().isAutoPlaying) return;
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
          if (!get().isAutoPlaying) return;
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
                if (!get().isAutoPlaying) return;
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

// Keep the authoritative host's in-progress game available across browser refreshes.
useGameStore.subscribe((state, previous) => {
  if (typeof window === 'undefined' || state.playMode !== 'host' || !state.roomCode || state.gameState.phase === 'LOBBY') return;
  if (state.gameState === previous.gameState && state.aiMemories === previous.aiMemories &&
      state.roomWeapons === previous.roomWeapons && state.turnReviewState === previous.turnReviewState) return;
  try {
    const aiMemories: Record<string, SavedAIMemory> = {};
    for (const [id, memory] of Object.entries(state.aiMemories)) {
      aiMemories[id] = {
        playerId: memory.playerId,
        cardStatus: [...memory.cardStatus.entries()],
        knownPlayerCards: [...memory.knownPlayerCards.entries()].map(([playerId, cards]) => [playerId, [...cards]]),
        pastSuggestions: memory.pastSuggestions,
      };
    }
    sessionStorage.setItem(HOST_STATE_KEY, JSON.stringify({
      gameState: state.gameState, roomWeapons: state.roomWeapons,
      turnReviewState: state.turnReviewState, aiMemories,
    }));
  } catch { /* Storage may be disabled or full; the live session continues. */ }
});
