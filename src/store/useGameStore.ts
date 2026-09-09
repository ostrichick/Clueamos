import { create } from 'zustand';
import { GameState, Solution, Suggestion } from '@/engine/types';
import { 
  initGame, 
  rollDice, 
  movePlayer, 
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

import { SupportedLocale } from '@/i18n/translations';

interface GameStore {
  gameState: GameState;
  aiMemories: Record<string, AIMemory>;
  selectedRoomId: string | null;
  isRollingDice: boolean;
  
  // 액션
  startNewGame: (p1CharacterId?: string, p2CharacterId?: string, locale?: SupportedLocale) => void;
  selectRoom: (roomId: string) => void;
  performRollDice: () => void;
  performMove: (roomId: string) => void;
  performSuggestion: (suggestion: Omit<Suggestion, 'askerId'>) => void;
  performDisprove: (cardId?: string) => void;
  performAccusation: (accusation: Solution) => boolean;
  runAITurnIfNeeded: () => Promise<void>;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: initGame(),
  aiMemories: {},
  selectedRoomId: null,
  isRollingDice: false,

  startNewGame: (p1CharacterId, p2CharacterId, locale) => {
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
  },

  selectRoom: (roomId: string) => {
    set({ selectedRoomId: roomId });
  },

  performRollDice: () => {
    const { gameState } = get();
    set({ isRollingDice: true });

    setTimeout(() => {
      const nextState = rollDice(gameState);
      set({ gameState: nextState, isRollingDice: false });
    }, 600);
  },

  performMove: (roomId: string) => {
    const { gameState } = get();
    try {
      const nextState = movePlayer(gameState, roomId);
      set({ gameState: nextState, selectedRoomId: null });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Cannot move to this room.';
      alert(msg);
    }
  },

  performSuggestion: (suggestion) => {
    const { gameState, aiMemories } = get();
    const nextState = makeSuggestion(gameState, suggestion);
    set({ gameState: nextState });

    // 반증 플레이어 자동 체크
    const disprover = findNextDisprovingPlayer(
      nextState.players,
      nextState.currentPlayerIndex,
      nextState.currentSuggestion!
    );

    // AI가 반증하는 경우 자동으로 첫 번째 소지 카드를 보여줌
    if (disprover) {
      const player = nextState.players[disprover.playerIndex];
      if (player.type.startsWith('ai_')) {
        setTimeout(() => {
          const shownCard = disprover.availableCards[0];
          // 질문자가 AI라면 해당 AI의 메모리 갱신
          const asker = nextState.players[nextState.currentPlayerIndex];
          if (aiMemories[asker.id]) {
            recordShownCard(aiMemories[asker.id], player.id, shownCard.id);
          }
          get().performDisprove(shownCard.id);
        }, 1200);
      }
    } else {
      // 아무도 반증 못함
      setTimeout(() => {
        get().performDisprove(undefined);
      }, 1200);
    }
  },

  performDisprove: (cardId) => {
    const { gameState } = get();
    const disprover = findNextDisprovingPlayer(
      gameState.players,
      gameState.currentPlayerIndex,
      gameState.currentSuggestion!
    );

    const responderId = disprover ? gameState.players[disprover.playerIndex].id : 'none';
    const nextState = resolveDisprove(gameState, responderId, cardId);
    set({ gameState: nextState });

    // 다음 턴이 AI 차례인지 확인하고 실행
    setTimeout(() => {
      get().runAITurnIfNeeded();
    }, 1000);
  },

  performAccusation: (accusation) => {
    const { gameState } = get();
    const { state: nextState, isCorrect } = makeAccusation(gameState, accusation);
    set({ gameState: nextState });

    if (!isCorrect && nextState.phase !== 'GAME_OVER') {
      setTimeout(() => {
        get().runAITurnIfNeeded();
      }, 1000);
    }
    return isCorrect;
  },

  runAITurnIfNeeded: async () => {
    const { gameState, aiMemories } = get();
    if (gameState.phase === 'GAME_OVER') return;

    const currentP = gameState.players[gameState.currentPlayerIndex];
    if (!currentP.type.startsWith('ai_')) return;

    const memory = aiMemories[currentP.id];
    if (!memory) return;

    // AI의 턴 1: 주사위 굴리기
    get().performRollDice();

    // 0.8초 후 AI 의사결정 및 이동
    setTimeout(() => {
      const stateAfterRoll = get().gameState;
      const action = currentP.type === 'ai_logic' 
        ? decideArthurAction(stateAfterRoll, memory)
        : decideBlakeAction(stateAfterRoll, memory);

      if (action.type === 'ACCUSE') {
        get().performAccusation(action.accusation);
      } else {
        get().performMove(action.targetRoomId);
        // 질문 던지기
        setTimeout(() => {
          get().performSuggestion(action.suggestion);
        }, 800);
      }
    }, 800);
  },
}));
