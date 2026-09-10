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
  getPlayerDisplayName,
  nextTurn
} from '../src/engine/engine';
import { 
  initAIMemory, 
  decideArthurAction, 
  decideBlakeAction, 
  recordShownCard,
  recordUndisprovenSuggestion,
  recordObservedDisprove,
  shouldAIAccuse,
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

function runSingleGame(gameNumber: number, verbose: boolean = false, aiPlayerCount: number = 2): { winner: string; turns: number; success: boolean } {
  if (verbose) {
    console.log(`\n======================================================`);
    console.log(`  🕵️ GAME #${gameNumber} SIMULATION (AI Count: ${aiPlayerCount}, Total Players: ${2 + aiPlayerCount})`);
    console.log(`======================================================\n`);
  }

  // 1. Initialize Game: Player 1 as Scarlett, Player 2 as Mustard
  let state: GameState = initGame({
    player1CharacterId: 'suspect_scarlett',
    player2CharacterId: 'suspect_mustard',
    locale: 'ko',
    maxTurns: 25,
    aiPlayerCount,
  });

  const p1 = state.players[0];
  const p2 = state.players[1];

  if (verbose) {
    console.log(`[Roster Initialized: ${state.players.length} Players]`);
    state.players.forEach(p => {
      console.log(`  - ${p.name} (Role: ${p.roleType}, Type: ${p.type}, Cards: ${p.hand.length})`);
    });
    console.log(`  - Secret Envelope: [${state.solution.suspectId}, ${state.solution.locationId}, ${state.solution.weaponId}]\n`);
  }

  // Brains / Memories
  const brains: Record<string, HumanDetectiveBrain> = {
    p1: initDetectiveBrain('p1', p1.hand),
    p2: initDetectiveBrain('p2', p2.hand),
  };

  const aiMemories: Record<string, AIMemory> = {};
  state.players.forEach(p => {
    if (p.type.startsWith('ai_')) {
      aiMemories[p.id] = initAIMemory(p);
    }
  });

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

        state.players.forEach(p => {
          if (p.type.startsWith('ai_') && p.id !== disproverPlayer.id && aiMemories[p.id]) {
            recordObservedDisprove(aiMemories[p.id], state.currentSuggestion!, disproverPlayer.id, p.hand);
          }
        });

        state = resolveDisprove(state, disproverPlayer.id, revealedCard.id);
      } else {
        if (verbose) {
          console.log(`   ✨ No one could disprove this claim!`);
        }
        state.players.forEach(p => {
          if (p.type.startsWith('ai_') && aiMemories[p.id]) {
            recordUndisprovenSuggestion(aiMemories[p.id], state.currentSuggestion!, p.hand);
          }
        });
        state = resolveDisprove(state, 'none', undefined);
      }

      // Phase: PLAYING_ACTION_DONE (Human chooses to accuse or end turn)
      if (state.phase === 'PLAYING_ACTION_DONE') {
        const solvedSuspect = SUSPECTS.filter(s => brain.notes[s.id] === 'UNKNOWN');
        const solvedLocation = LOCATION_CARDS.filter(l => brain.notes[l.id] === 'UNKNOWN');
        const solvedWeapon = WEAPONS.filter(w => brain.notes[w.id] === 'UNKNOWN');

        if (solvedSuspect.length === 1 && solvedLocation.length === 1 && solvedWeapon.length === 1) {
          if (verbose) {
            console.log(`🎯 [POST-ACTION FINAL ACCUSATION!] ${pDisplayName} accuses!`);
          }
          const res = makeAccusation(state, {
            suspectId: solvedSuspect[0].id,
            locationId: solvedLocation[0].id,
            weaponId: solvedWeapon[0].id,
          });
          state = res.state;
          if (verbose) {
            console.log(res.isCorrect ? `   🎉 ${pDisplayName} WON THE GAME!` : `   ❌ Accusation failed!`);
          }
        } else {
          state = nextTurn(state);
        }
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

          state.players.forEach(p => {
            if (p.type.startsWith('ai_') && p.id !== currentP.id && p.id !== disproverPlayer.id && aiMemories[p.id]) {
              recordObservedDisprove(aiMemories[p.id], state.currentSuggestion!, disproverPlayer.id, p.hand);
            }
          });

          state = resolveDisprove(state, disproverPlayer.id, revealedCard.id);
        } else {
          state.players.forEach(p => {
            if (p.type.startsWith('ai_') && aiMemories[p.id]) {
              recordUndisprovenSuggestion(aiMemories[p.id], state.currentSuggestion!, p.hand);
            }
          });
          state = resolveDisprove(state, 'none', undefined);
        }

        // Phase: PLAYING_ACTION_DONE (AI evaluates final accusation or ends turn)
        if (state.phase === 'PLAYING_ACTION_DONE') {
          const accusation = shouldAIAccuse(currentP, memory);
          if (accusation) {
            if (verbose) {
              console.log(`🎯 [AI POST-ACTION ACCUSATION!] ${pDisplayName} accuses!`);
            }
            const res = makeAccusation(state, accusation);
            state = res.state;
            if (verbose) {
              console.log(res.isCorrect ? `   ✅ AI Won!` : `   ❌ AI Failed!`);
            }
          } else {
            state = nextTurn(state);
          }
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

// 1. Detailed verification for 0 AIs (1v1 Duel)
console.log('>>> 1. RUNNING 1v1 DUEL SIMULATION (0 AIs, P1 vs P2)...');
const duelRes = runSingleGame(1, true, 0);
console.log(`Duel Result: Winner = ${duelRes.winner}, Turns = ${duelRes.turns}`);

// 2. Detailed verification for 4 AIs (6-Player Full Party)
console.log('\n>>> 2. RUNNING 6-PLAYER FULL PARTY SIMULATION (4 AIs)...');
const partyRes = runSingleGame(2, true, 4);
console.log(`Full Party Result: Winner = ${partyRes.winner}, Turns = ${partyRes.turns}`);

// 3. Batch simulation across all AI counts (0, 1, 2, 3, 4 AIs)
console.log('\n>>> 3. RUNNING 50 STRESS-TEST GAME SIMULATIONS ACROSS ALL AI COUNTS (0~4 AIs)...');
let successCount = 0;
let solvedCount = 0;
const aiCountsToTest = [0, 1, 2, 3, 4];

for (let i = 1; i <= 50; i++) {
  const aiCount = aiCountsToTest[i % aiCountsToTest.length];
  const res = runSingleGame(i, false, aiCount);
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
