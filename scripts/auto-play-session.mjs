import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/gip4k/.gemini/antigravity/brain/0f47a8c8-dc5e-4ebc-85e4-cf5bedf62a5f';

async function playSingleGame(page, totalPlayerCount) {
  console.log(`\n========================================`);
  console.log(`🎮 Starting ${totalPlayerCount}-Player Game Playthrough`);
  console.log(`========================================`);

  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // Select Korean if available
  const koButton = page.locator('button:has-text("KO")');
  if (await koButton.isVisible()) {
    await koButton.click();
    await page.waitForTimeout(200);
  }

  // Select Solo mode
  const soloButton = page.locator('button:has-text("2. 싱글 플레이")');
  await soloButton.click();
  await page.waitForTimeout(200);

  // In Solo mode:
  // 3 players = 1 human + 2 AIs -> button "🤖 2명"
  // 4 players = 1 human + 3 AIs -> button "🤖 3명"
  const aiCount = totalPlayerCount - 1;
  const aiButton = page.locator(`button:has-text("🤖 ${aiCount}명")`);
  await aiButton.click();
  await page.waitForTimeout(200);

  // Click start game
  const startButton = page.locator('button:has-text("사건 수사 시작")');
  await startButton.click();
  await page.waitForTimeout(1200);

  const startTime = Date.now();
  let midGameCaptured = false;
  const midGamePath = path.join(ARTIFACT_DIR, `playthrough_${totalPlayerCount}p_midgame.png`);
  const resultPath = path.join(ARTIFACT_DIR, `playthrough_${totalPlayerCount}p_result.png`);

  let lastStateLog = '';
  let loopCount = 0;
  const maxWaitLoops = 800; // up to ~6 minutes safety limit

  while (loopCount++ < maxWaitLoops) {
    // Check if game is over
    const isGameOver = await page.evaluate(() => {
      const store = window.__gameStore?.getState?.();
      return store?.gameState?.phase === 'GAME_OVER';
    });

    if (isGameOver) {
      console.log(`\n🏆 [GAME OVER] ${totalPlayerCount}-Player Game Finished!`);
      break;
    }

    // Inspect current store state
    const gameInfo = await page.evaluate(() => {
      const store = window.__gameStore?.getState?.();
      if (!store) return null;
      const gs = store.gameState;
      const curP = gs.players[gs.currentPlayerIndex];
      return {
        phase: gs.phase,
        turnCount: gs.turnCount,
        logCount: gs.logs?.length || 0,
        currentPlayerIndex: gs.currentPlayerIndex,
        currentPlayerName: curP?.name || curP?.id,
        isHuman: curP?.type === 'human',
        isRollingDice: store.isRollingDice,
        hasTurnReview: !!store.turnReviewState?.active,
        hasDisprovePrompt: !!store.pendingDisprovePrompt,
        hasSecretClue: !!store.lastSecretClue,
        hasHypothesisVisual: !!store.activeHypothesisVisual,
      };
    });

    if (!gameInfo) {
      await page.waitForTimeout(400);
      continue;
    }

    const elapsedSecNow = Math.round((Date.now() - startTime) / 1000);
    const stateDesc = `[${elapsedSecNow}s] Round ${gameInfo.turnCount} | P${gameInfo.currentPlayerIndex} (${gameInfo.currentPlayerName}) | Phase: ${gameInfo.phase} | Review: ${gameInfo.hasTurnReview} | DisprovePrompt: ${gameInfo.hasDisprovePrompt}`;
    if (stateDesc !== lastStateLog) {
      lastStateLog = stateDesc;
      console.log(stateDesc);
    }

    // Capture mid-game screenshot around Round 3 (or when logCount >= 6)
    if (!midGameCaptured && (gameInfo.turnCount >= 3 || gameInfo.logCount >= 6)) {
      await page.waitForTimeout(500);
      await page.screenshot({ path: midGamePath, fullPage: false });
      console.log(`📸 [Screenshot] Captured mid-game screenshot: ${midGamePath}`);
      midGameCaptured = true;
    }

    // Interactive step handling:
    // 1. Turn review banner (Notes Ready)
    if (gameInfo.hasTurnReview) {
      await page.waitForTimeout(350);
      await page.evaluate(() => {
        window.__gameStore?.getState?.().confirmTurnReview();
      });
      await page.waitForTimeout(250);
      continue;
    }

    // 2. Modals (secret clue / hypothesis visual)
    if (gameInfo.hasSecretClue || gameInfo.hasHypothesisVisual) {
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        const store = window.__gameStore?.getState?.();
        store?.dismissSecretClue?.();
        store?.dismissHypothesisVisual?.();
      });
      await page.waitForTimeout(250);
      continue;
    }

    // 3. Human disprove prompt (when an AI asks a question)
    if (gameInfo.hasDisprovePrompt) {
      await page.waitForTimeout(350);
      await page.evaluate(() => {
        window.__gameStore?.getState?.().executeAutoPlayTurn();
      });
      await page.waitForTimeout(300);
      continue;
    }

    // 4. Human player's active turn
    if (gameInfo.isHuman) {
      if (gameInfo.phase === 'PLAYING_ROLL') {
        if (!gameInfo.isRollingDice) {
          await page.evaluate(() => {
            window.__gameStore?.getState?.().executeAutoPlayTurn();
          });
        }
        await page.waitForTimeout(1100);
        continue;
      }

      if (gameInfo.phase === 'PLAYING_MOVE') {
        await page.evaluate(() => {
          window.__gameStore?.getState?.().executeAutoPlayTurn();
        });
        await page.waitForTimeout(900);
        continue;
      }

      if (gameInfo.phase === 'PLAYING_SUGGEST') {
        await page.evaluate(() => {
          window.__gameStore?.getState?.().executeAutoPlayTurn();
        });
        await page.waitForTimeout(900);
        continue;
      }

      if (gameInfo.phase === 'PLAYING_ACTION_DONE') {
        await page.evaluate(() => {
          window.__gameStore?.getState?.().executeAutoPlayTurn();
        });
        await page.waitForTimeout(600);
        continue;
      }
    }

    // AI's turn is driven naturally by the engine in page.tsx with realistic animations
    await page.waitForTimeout(350);
  }

  const endTime = Date.now();
  const elapsedMs = endTime - startTime;
  const elapsedSec = Math.round(elapsedMs / 100) / 10;
  const minutes = Math.floor(elapsedSec / 60);
  const remSec = Math.round(elapsedSec % 60);

  // Wait 1.5 seconds for game over modal and confetti to display clearly
  await page.waitForTimeout(1800);
  await page.screenshot({ path: resultPath, fullPage: false });
  console.log(`📸 [Screenshot] Captured game-over result screenshot: ${resultPath}`);

  // Extract game results
  const finalReport = await page.evaluate(() => {
    const store = window.__gameStore?.getState?.();
    const gs = store?.gameState;
    const winner = gs?.players?.find(p => p.id === gs?.winnerId);
    return {
      turnCount: gs?.turnCount,
      totalTurns: gs?.logs?.length,
      winnerId: gs?.winnerId,
      winnerName: winner?.name || gs?.winnerId,
      winnerAvatar: winner?.avatar,
      winnerRole: winner?.roleType,
      solution: gs?.solution,
      players: gs?.players?.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        role: p.roleType,
        cardsRemaining: p.hand?.length,
      })),
    };
  });

  const summary = {
    playerCount: totalPlayerCount,
    elapsedSec,
    formattedTime: `${minutes > 0 ? `${minutes}분 ` : ''}${remSec}초 (${elapsedSec}초)`,
    turnCount: finalReport?.turnCount,
    totalTurns: finalReport?.totalTurns,
    winner: `${finalReport?.winnerAvatar || ''} ${finalReport?.winnerName || finalReport?.winnerId}`,
    winnerRole: finalReport?.winnerRole,
    solution: finalReport?.solution,
    players: finalReport?.players,
    midGameScreenshot: midGamePath,
    resultScreenshot: resultPath,
  };

  console.log(`\n========================================`);
  console.log(`📊 Result Summary for ${totalPlayerCount}-Player Game:`);
  console.log(`⏱️ Total Time: ${summary.formattedTime}`);
  console.log(`🔄 Total Rounds: ${summary.turnCount} (${summary.totalTurns} action logs)`);
  console.log(`👑 Winner: ${summary.winner} (${summary.winnerRole})`);
  console.log(`🔍 Solution:`, summary.solution);
  console.log(`========================================\n`);

  return summary;
}

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    // 1. Play 3-Player Game
    const res3p = await playSingleGame(page, 3);

    // Brief breather between games
    await page.waitForTimeout(2000);

    // 2. Play 4-Player Game
    const res4p = await playSingleGame(page, 4);

    console.log(`\n🎉 BOTH PLAYTHROUGHS COMPLETED SUCCESSFULLY!`);
    console.log(JSON.stringify({ game3p: res3p, game4p: res4p }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Playthrough execution error:', err);
  process.exit(1);
});
