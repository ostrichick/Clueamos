'use client';

import React from 'react';
import type { GameState, Player } from '@/engine/types';
import type { PlayMode, PlayerRole, TurnReviewState } from '@/store/useGameStore';
import type { translations, SupportedLocale } from '@/i18n/translations';
import type { NoteMark, MatrixMark } from '@/components/notebook/DeductionNotebook';
import { GameBoard } from '@/components/board/GameBoard';
import { CardHandTray } from '@/components/cards/CardHandTray';
import { TurnPhaseStepper } from '@/components/board/TurnPhaseStepper';
import { AskHypothesisPanel } from '@/components/game/AskHypothesisPanel';
import { ActionDonePanel } from '@/components/game/ActionDonePanel';
import { DetectiveRoster } from '@/components/game/DetectiveRoster';
import { GameLogPanel } from '@/components/game/GameLogPanel';
import { DeductionNotebook } from '@/components/notebook/DeductionNotebook';
import { getPlayerDisplayName } from '@/engine/engine';

type T = (typeof translations)['en'];

interface InGameDashboardProps {
  gameState: GameState;
  isRollingDice: boolean;
  roomWeapons: Record<string, string[]>;
  t: T;
  locale: SupportedLocale;
  isMyTurn: boolean;
  isHumanTurn: boolean;
  currentPlayer: Player;
  myPlayer: Player | undefined;
  myPlayerRole: PlayerRole;
  playMode: PlayMode;
  isAutoPlaying: boolean;
  turnReviewState: TurnReviewState | null;
  userNotes: Record<string, NoteMark>;
  matrixNotes: Record<string, Record<string, MatrixMark>>;
  selectedSuspect: string;
  selectedWeapon: string;
  onRollDice: () => void;
  onMoveToRoom: (roomId: string) => void;
  onWaitInHallway: () => void;
  onEndTurn: () => void;
  onOpenAccuse: () => void;
  onConfirmTurnReview: () => void;
  onSelectSuspect: (id: string) => void;
  onSelectWeapon: (id: string) => void;
  onSuggest: () => void;
  onToggleNote: (cardId: string) => void;
  onToggleMatrixCell: (cardId: string, playerId: string) => void;
  onResetNotes: () => void;
  getCardName: (id: string) => string;
  getRoomName: (id: string) => string;
  getEffectiveCardStatus: (cardId: string) => { mark: NoteMark; tag: string; label: string };
}

/**
 * 인게임 3열 대시보드 레이아웃 (보드 / 추리 스테이션 / 로스터+로그).
 * 배치만 담당하고 상태 소유권은 page.tsx에 둔다.
 */
export const InGameDashboard: React.FC<InGameDashboardProps> = ({
  gameState,
  isRollingDice,
  roomWeapons,
  t,
  locale,
  isMyTurn,
  isHumanTurn,
  currentPlayer,
  myPlayer,
  myPlayerRole,
  playMode,
  isAutoPlaying,
  turnReviewState,
  userNotes,
  matrixNotes,
  selectedSuspect,
  selectedWeapon,
  onRollDice,
  onMoveToRoom,
  onWaitInHallway,
  onEndTurn,
  onOpenAccuse,
  onConfirmTurnReview,
  onSelectSuspect,
  onSelectWeapon,
  onSuggest,
  onToggleNote,
  onToggleMatrixCell,
  onResetNotes,
  getCardName,
  getRoomName,
  getEffectiveCardStatus,
}) => {
  return (
    <div className="flex-1 max-w-[1700px] w-full mx-auto p-3 sm:p-5 grid grid-cols-1 xl:grid-cols-12 gap-6">
      {/* 1. 보드판 영역 (모바일 1순위 / 데스크톱 1행 1~7열) */}
      <div className="xl:col-start-1 xl:col-span-7 xl:row-start-1 flex flex-col gap-4 order-1">
        <TurnPhaseStepper
          phase={gameState.phase}
          isMyTurn={isMyTurn}
          t={t}
          activePlayerName={currentPlayer ? getPlayerDisplayName(currentPlayer, locale) : undefined}
          isAITurn={!isHumanTurn}
        />

        <GameBoard
          players={gameState.players}
          currentPlayerIndex={gameState.currentPlayerIndex}
          phase={gameState.phase}
          currentDiceRoll={gameState.currentDiceRoll}
          diceRolls={gameState.diceRolls}
          accessibleRoomIds={gameState.accessibleRoomIds}
          isRollingDice={isRollingDice}
          roomWeapons={roomWeapons}
          t={t}
          locale={locale}
          isMyTurn={isMyTurn}
          onRollDice={onRollDice}
          onMoveToRoom={onMoveToRoom}
          onWaitInHallway={onWaitInHallway}
          onEndTurn={onEndTurn}
          onOpenAccuse={onOpenAccuse}
          turnReview={turnReviewState}
          onConfirmTurnReview={onConfirmTurnReview}
          myPlayerRole={myPlayerRole}
          playMode={playMode}
          isAutoPlaying={isAutoPlaying}
        />
      </div>

      {/* 2. 추리 스테이션 (모바일 2순위 / 데스크톱 우측 8~12열) */}
      <div className="xl:col-start-8 xl:col-span-5 xl:row-start-1 xl:row-span-2 flex flex-col gap-4 order-2">
        {isHumanTurn && isMyTurn && gameState.phase === 'PLAYING_SUGGEST' && (
          <AskHypothesisPanel
            t={t}
            currentRoomName={getRoomName(currentPlayer.currentRoomId)}
            getCardName={getCardName}
            getEffectiveCardStatus={getEffectiveCardStatus}
            selectedSuspect={selectedSuspect}
            onSelectSuspect={onSelectSuspect}
            selectedWeapon={selectedWeapon}
            onSelectWeapon={onSelectWeapon}
            onSuggest={onSuggest}
          />
        )}

        {isHumanTurn && isMyTurn && gameState.phase === 'PLAYING_ACTION_DONE' && (
          <ActionDonePanel
            t={t}
            isEliminated={currentPlayer.isEliminated}
            onEndTurn={onEndTurn}
            onOpenAccuse={onOpenAccuse}
          />
        )}

        <DeductionNotebook
          t={t}
          locale={locale}
          myPlayer={myPlayer}
          players={gameState.players}
          userNotes={userNotes}
          toggleNote={onToggleNote}
          matrixNotes={matrixNotes}
          toggleMatrixCell={onToggleMatrixCell}
          getCardName={getCardName}
          getRoomName={getRoomName}
          logs={gameState.logs}
          onResetNotes={onResetNotes}
        />

        {myPlayer && (
          <CardHandTray
            cards={myPlayer.hand}
            playerName={getPlayerDisplayName(myPlayer, locale)}
            getCardName={getCardName}
            onOpenNotebook={() => {
              document.getElementById('deduction-notebook')?.scrollIntoView({ behavior: 'smooth' });
            }}
            t={t}
          />
        )}
      </div>

      {/* 3. 탐정 명단 & 실시간 사건 일지 (모바일 3순위 / 데스크톱 2행 1~7열) */}
      <div className="xl:col-start-1 xl:col-span-7 xl:row-start-2 flex flex-col gap-4 order-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DetectiveRoster
            t={t}
            players={gameState.players}
            currentPlayerIndex={gameState.currentPlayerIndex}
            getPlayerName={p => getPlayerDisplayName(p, locale)}
          />

          <GameLogPanel t={t} logs={gameState.logs} />
        </div>
      </div>
    </div>
  );
};
