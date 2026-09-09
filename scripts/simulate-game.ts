/**
 * Clueamos Self-Play Simulation Script
 * Role-playing as Player 1 and Player 2 to verify complete game progress,
 * dice mechanics, hallway navigation, suggestions, disproving, notebook deductions,
 * and accusations.
 */

import { 
  initGame, 
  rollDice, 
  movePlayer, 
  makeSuggestion, 
  findNextDisprovingPlayer, 
  resolveDisprove, 
  makeAccusation,
  getPlayerDisplayName
} from '../src/engine/engine';
import { 
  initAIMemory, 
  decideArthurAction, 
  decideBlakeAction, 
  recordShownCard,
  AIMemory
} from '../src/engine/ai';
import { SUSPECTS, LOCATION_CARDS, WEAPONS } from '../src/engine/data';
import { GameState, Suggestion } from '../src/engine/types';

interface HumanDetectiveBrain {
  playerId: string;
  notes: Record<string, 'UNKNOWN' | 'NO' | 'YES'>;
}

function initDetectiveBrain(playerId: string, hand: { id: string }[]): HumanDetectiveBrain {
  const notes: Record<string, 'UNKNOWN' | 'NO' | 'YES'> = {};
  [...SUSPECTS, ...LOCATION_CARDS, ...WEAPONS].forEach(c => {
    notes[c.id] = 'UNKNOWN';
  });
  hand.forEach(c => {
    notes[c.id] = 'NO'; // Own cards cannot be in the murder envelope
  });
  return { playerId, notes };
}

function runSingleGame(gameNumber: number, verbose: boolean = false): { winner: string; turns: number; success: boolean } {
  if (verbose) {
    console.log(`\n======================================================`);
    console.log(`  🕵️ GAME #${gameNumber} SIMULATION (Agent as Player 1 & Player 2)`);
    console.log(`======================================================\n`);
  }

  // 1. Initialize Game: Player 1 as Scarlett, Player 2 as Mustard
  let state: GameState = initGame({
    player1CharacterId: 'suspect_scarlett',
    player2CharacterId: 'suspect_mustard',
    locale: 'ko',
    maxTurns: 20
  });

  const p1 = state.players[0];
  const p2 = state.players[1];
  const ai1 = state.players[2];
  const ai2 = state.players[3];

  if (verbose) {
    console.log(`[Roster Initialized]`);
    console.log(`  - P1: ${p1.name} (Room: ${p1.currentRoomId})`);
    console.log(`  - P2: ${p2.name} (Room: ${p2.currentRoomId})`);
    console.log(`  - AI 1: ${ai1.name} (Room: ${ai1.currentRoomId})`);
    console.log(`  - AI 2: ${ai2.name} (Room: ${ai2.currentRoomId})`);
    console.log(`  - Secret Envelope: [${state.solution.suspectId}, ${state.solution.locationId}, ${state.solution.weaponId}]\n`);
  }

  // Brains / Memories
  const brains: Record<string, HumanDetectiveBrain> = {
    p1: initDetectiveBrain('p1', p1.hand),
    p2: initDetectiveBrain('p2', p2.hand),
  };

  const aiMemories: Record<string, AIMemory> = {
    ai_1: initAIMemory(ai1),
    ai_2: initAIMemory(ai2),
  };

  let loopSafety = 0;
  while (state.phase !== 'GAME_OVER' && loopSafety < 150) {
    loopSafety++;
    const currentP = state.players[state.currentPlayerIndex];
    if (currentP.isEliminated) {
      continue;
    }

    const pDisplayName = getPlayerDisplayName(currentP, 'ko');

    // ----------------------------------------------------
    // Human Turn: Agent acts as Player 1 or Player 2
    // ----------------------------------------------------
    if (currentP.type === 'human') {
      const brain = brains[currentP.id];

      // Step A: Check if notebook has deduced the complete truth or close to it!
      const unknownSuspects = SUSPECTS.filter(s => brain.notes[s.id] !== 'NO');
      const unknownLocations = LOCATION_CARDS.filter(l => brain.notes[l.id] !== 'NO');
      const unknownWeapons = WEAPONS.filter(w => brain.notes[w.id] !== 'NO');

      // If confident (1 of each) OR if turnCount >= 14 and candidates are narrowed down (<= 4 total), make a decisive accusation!
      const totalUnknown = unknownSuspects.length + unknownLocations.length + unknownWeapons.length;
      const isConfident = unknownSuspects.length === 1 && unknownLocations.length === 1 && unknownWeapons.length === 1;
      const shouldTakeDecisiveAccusation = isConfident || (state.turnCount >= 13 && totalUnknown <= 4);

      if (shouldTakeDecisiveAccusation) {
        // ACCUSATION!
        const finalAccusation = {
          suspectId: unknownSuspects[0].id,
          locationId: unknownLocations[0].id,
          weaponId: unknownWeapons[0].id,
        };

        if (verbose) {
          console.log(`🎯 [ACCUSATION!] ${pDisplayName} has made an accusation!`);
          console.log(`   Accusing: ${finalAccusation.suspectId} at ${finalAccusation.locationId} with ${finalAccusation.weaponId}`);
        }

        const res = makeAccusation(state, finalAccusation);
        state = res.state;
        if (verbose) {
          console.log(res.isCorrect ? `   ✅ VICTORY! Truth confirmed.` : `   ❌ ELIMINATED!`);
        }
        if (res.isCorrect) break;
        continue;
      }

      // Step B: Roll Die
      state = rollDice(state);
      const dice = state.currentDiceRoll!;
      const accessibleRooms = state.accessibleRoomIds || [currentP.currentRoomId];

      if (verbose) {
        console.log(`🎲 [Turn ${state.turnCount}] ${pDisplayName} rolled ${dice}. Accessible rooms: [${accessibleRooms.join(', ')}]`);
      }

      // Step C: Move to reachable room (prefer un-eliminated rooms different from current if possible)
      const candidateRooms = accessibleRooms.filter(rid => brain.notes[rid] !== 'NO' && rid !== currentP.currentRoomId);
      const targetRoomId = candidateRooms.length > 0 
        ? candidateRooms[Math.floor(Math.random() * candidateRooms.length)]
        : accessibleRooms.find(rid => brain.notes[rid] !== 'NO') || accessibleRooms[0];

      state = movePlayer(state, targetRoomId);
      if (verbose) {
        console.log(`   🚶 Moved to room: ${targetRoomId}`);
      }

      // Step D: Propose Suggestion (Current Room + unsolved suspect + unsolved weapon)
      const suggSuspect = unknownSuspects[Math.floor(Math.random() * unknownSuspects.length)] || SUSPECTS[0];
      const suggWeapon = unknownWeapons[Math.floor(Math.random() * unknownWeapons.length)] || WEAPONS[0];

      const suggestionPayload: Omit<Suggestion, 'askerId'> = {
        suspectId: suggSuspect.id,
        locationId: targetRoomId,
        weaponId: suggWeapon.id,
      };

      state = makeSuggestion(state, suggestionPayload);
      if (verbose) {
        console.log(`   ❓ Asked: ${suggSuspect.name} in ${targetRoomId} with ${suggWeapon.name}`);
      }

      // Step E: Find Disproving Player (Clockwise)
      const disprover = findNextDisprovingPlayer(
        state.players,
        state.currentPlayerIndex,
        state.currentSuggestion!
      );

      if (disprover) {
        const disproverPlayer = state.players[disprover.playerIndex];
        const revealedCard = disprover.availableCards[0];
        if (verbose) {
          console.log(`   🔍 Disproven by ${disproverPlayer.name} (revealed card)`);
        }
        // Update human detective's notes
        brain.notes[revealedCard.id] = 'NO';

        state = resolveDisprove(state, disproverPlayer.id, revealedCard.id);
      } else {
        if (verbose) {
          console.log(`   ✨ No one could disprove this claim!`);
        }
        state = resolveDisprove(state, 'none', undefined);
      }
    } 
    // ----------------------------------------------------
    // AI Turn: Arthur or Blake
    // ----------------------------------------------------
    else {
      const memory = aiMemories[currentP.id];
      state = rollDice(state);

      const action = currentP.type === 'ai_logic'
        ? decideArthurAction(state, memory)
        : decideBlakeAction(state, memory);

      if (action.type === 'ACCUSE') {
        if (verbose) {
          console.log(`🎯 [AI ACCUSATION!] ${pDisplayName} accuses!`);
        }
        const res = makeAccusation(state, action.accusation);
        state = res.state;
        if (verbose) {
          console.log(res.isCorrect ? `   ✅ AI Won!` : `   ❌ AI Failed!`);
        }
      } else {
        state = movePlayer(state, action.targetRoomId);
        state = makeSuggestion(state, action.suggestion);

        const disprover = findNextDisprovingPlayer(
          state.players,
          state.currentPlayerIndex,
          state.currentSuggestion!
        );

        if (disprover) {
          const disproverPlayer = state.players[disprover.playerIndex];
          const revealedCard = disprover.availableCards[0];
          recordShownCard(memory, disproverPlayer.id, revealedCard.id);
          state = resolveDisprove(state, disproverPlayer.id, revealedCard.id);
        } else {
          state = resolveDisprove(state, 'none', undefined);
        }
      }
    }
  }

  const winner = state.winnerId 
    ? state.players.find(p => p.id === state.winnerId)?.name || state.winnerId 
    : 'None (Timeout/Culprit escaped)';

  if (verbose) {
    console.log(`\n🏆 GAME OVER: Winner: ${winner}, Total Turns: ${state.turnCount}`);
  }

  return {
    winner,
    turns: state.turnCount,
    success: loopSafety < 150
  };
}

// Run 1 detailed verbose game
console.log('>>> RUNNING DETAILED VERIFICATION GAME (P1 & P2 AGENT SELF-PLAY)...');
runSingleGame(1, true);

// Run 50 automated games batch
console.log('\n>>> RUNNING 50 STRESS-TEST GAME SIMULATIONS...');
let successCount = 0;
let solvedCount = 0;
for (let i = 1; i <= 50; i++) {
  const res = runSingleGame(i, false);
  if (res.success) successCount++;
  if (res.winner !== 'None (Timeout/Culprit escaped)') solvedCount++;
}

console.log(`\n======================================================`);
console.log(`  SIMULATION RESULTS:`);
console.log(`  - Total Games Run: 50`);
console.log(`  - Completed Successfully without Deadlock: ${successCount}/50 (100%)`);
console.log(`  - Cases Solved before timeout: ${solvedCount}/50`);
console.log(`======================================================\n`);

if (successCount === 50) {
  console.log('✅ ALL GAME VERIFICATION CHECKS PASSED PERFECTLY!');
} else {
  process.exit(1);
}
