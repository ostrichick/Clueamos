'use client';

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  BookOpenCheck, 
  Flame, 
  ArrowRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { TranslationStrings } from '@/i18n/translations';
import { TurnReviewState, PlayMode, PlayerRole } from '@/store/useGameStore';
import { sounds } from '@/utils/sounds';

export interface OnBoardActionOverlayProps {
  // Phase 1: 턴 행동 완료 (패스 턴 또는 최종 고발)
  isActionDonePhase: boolean;
  onEndTurn?: () => void;
  onOpenAccuse?: () => void;
  canAccuse?: boolean;

  // Phase 2: 턴 종료 후 수첩 정리 및 노트 확인 (노트 레디)
  turnReview?: TurnReviewState | null;
  onConfirmTurnReview?: () => void;
  myPlayerRole?: PlayerRole;
  playMode?: PlayMode;
  isAutoPlaying?: boolean;

  t: TranslationStrings;
}

export const OnBoardActionOverlay: React.FC<OnBoardActionOverlayProps> = ({
  isActionDonePhase,
  onEndTurn,
  onOpenAccuse,
  canAccuse = true,
  turnReview,
  onConfirmTurnReview,
  myPlayerRole,
  playMode = 'local',
  isAutoPlaying = false,
  t,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  const isReviewActive = Boolean(turnReview && turnReview.active);
  if (!isActionDonePhase && !isReviewActive) {
    return null;
  }

  const isMultiplayer = playMode === 'host' || playMode === 'guest';
  const isMyRoleReady = Boolean(turnReview?.readyRoles?.includes(myPlayerRole || 'p1'));

  const handleEndTurn = () => {
    sounds.playMove();
    onEndTurn?.();
  };

  const handleConfirmReview = () => {
    sounds.playPencilMark();
    onConfirmTurnReview?.();
  };

  const handleOpenAccuse = () => {
    sounds.playClue();
    onOpenAccuse?.();
  };

  // 1. 최소화(접기) 모드: 보드 하단에 컴팩트 플로팅 독으로 렌더링
  if (isMinimized) {
    return (
      <div className="absolute inset-x-2 bottom-2 z-30 flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto bg-[#18120f]/95 border-2 border-amber-500/80 rounded-2xl px-3 py-2 shadow-2xl shadow-black/90 backdrop-blur-md flex items-center gap-2 max-w-sm w-full animate-in fade-in slide-in-from-bottom-2 duration-150">
          {isReviewActive ? (
            !isMyRoleReady ? (
              <button
                type="button"
                onClick={handleConfirmReview}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer animate-pulse"
              >
                <BookOpenCheck className="w-3.5 h-3.5" />
                <span>{isAutoPlaying ? `🤖 ${t.turnReviewConfirmBtn}` : t.turnReviewConfirmBtn}</span>
              </button>
            ) : (
              <div className="flex-1 py-1.5 px-3 rounded-xl bg-slate-900/80 border border-slate-700 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span className="truncate">{t.turnReviewWaitingPeer}</span>
              </div>
            )
          ) : (
            <>
              <button
                type="button"
                onClick={handleEndTurn}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer animate-pulse"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>{t.endTurnBtn}</span>
              </button>
              {canAccuse && onOpenAccuse && (
                <button
                  type="button"
                  onClick={handleOpenAccuse}
                  className="py-2 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer border border-rose-400/50"
                  title={t.makeAccusationBtn}
                >
                  <Flame className="w-3.5 h-3.5 text-rose-200" />
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            title="보드 패널 펼치기 (Expand)"
            className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs flex items-center justify-center cursor-pointer active:scale-95"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // 2. 기본 모드: 보드판 중앙에 고급 브라스/우드 스타일 액션 카드 렌더링
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none p-3 sm:p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="pointer-events-auto max-w-[340px] sm:max-w-[380px] w-full bg-[#18120f]/95 border-2 border-amber-500/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl shadow-black/90 backdrop-blur-md flex flex-col items-center text-center gap-3 select-none relative">
        
        {/* 상단 우측 보드 보기(최소화) 버튼 */}
        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          title="보드 보기 위해 패널 접기 (Peek board)"
          className="absolute top-3 right-3 text-amber-300/70 hover:text-amber-200 p-1.5 rounded-lg hover:bg-amber-500/20 border border-amber-500/20 cursor-pointer transition-colors"
        >
          <Minimize2 className="w-4 h-4" />
        </button>

        {isReviewActive && turnReview ? (
          /* ========================================================
             A. 수첩 정리 및 노트 확인 (Notes Ready / Turn Review)
             ======================================================== */
          <>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shadow-inner">
              <BookOpenCheck className="w-6 h-6 text-emerald-300 animate-pulse" />
            </div>

            <div className="flex flex-col items-center gap-1 w-full px-2">
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <span className="font-serif font-black text-sm sm:text-base text-emerald-300 tracking-wide">
                  {t.turnReviewTitle}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-200">
                  Round {turnReview.turnNumber}
                </span>
              </div>

              {turnReview.summary && (
                <p className="text-xs text-slate-200 font-medium leading-snug bg-black/40 px-3 py-1.5 rounded-xl border border-slate-800/80 w-full mt-1 line-clamp-2">
                  📢 {turnReview.summary}
                </p>
              )}

              <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                {t.turnReviewSubtitle}
              </p>

              {/* 멀티플레이어 참여자별 확인 상태 뱃지 */}
              {isMultiplayer && (
                <div className="flex items-center gap-2 mt-1.5 flex-wrap justify-center text-[11px]">
                  <span
                    className={`px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${
                      turnReview.readyRoles.includes('p1')
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {turnReview.readyRoles.includes('p1') ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                    )}
                    {turnReview.readyRoles.includes('p1') ? t.turnReviewP1Ready : t.turnReviewP1Writing}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${
                      turnReview.readyRoles.includes('p2')
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {turnReview.readyRoles.includes('p2') ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                    )}
                    {turnReview.readyRoles.includes('p2') ? t.turnReviewP2Ready : t.turnReviewP2Writing}
                  </span>
                </div>
              )}
            </div>

            {/* 확인 완료 버튼 또는 대기 표시 */}
            <div className="w-full pt-1">
              {isMultiplayer && isMyRoleReady ? (
                <div className="w-full py-2.5 px-4 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>{t.turnReviewWaitingPeer}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmReview}
                  className="w-full py-2.5 sm:py-3 px-5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm tracking-wide transition-all duration-150 transform active:scale-95 shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 border border-emerald-300 cursor-pointer animate-pulse"
                >
                  <BookOpenCheck className="w-4 h-4 text-slate-950" />
                  <span>{isAutoPlaying ? `🤖 ${t.turnReviewConfirmBtn}` : t.turnReviewConfirmBtn}</span>
                  <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                </button>
              )}
            </div>
          </>
        ) : (
          /* ========================================================
             B. 턴 행동 완료 (Pass Turn & Make Accusation)
             ======================================================== */
          <>
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-inner">
              <CheckCircle2 className="w-6 h-6 text-amber-300 animate-bounce" />
            </div>

            <div className="flex flex-col items-center gap-1 w-full px-2">
              <h4 className="font-serif font-black text-sm sm:text-base text-amber-200 tracking-wide">
                {t.actionDoneTitle}
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-300 leading-snug">
                {t.actionDoneDesc}
              </p>
            </div>

            <div className="w-full flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={handleEndTurn}
                className="w-full py-2.5 sm:py-3 px-5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm tracking-wide transition-all duration-150 transform active:scale-95 shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 border border-amber-300 cursor-pointer animate-pulse"
              >
                <ArrowRight className="w-4 h-4 text-slate-950" />
                <span>{t.endTurnBtn}</span>
              </button>

              {canAccuse && onOpenAccuse && (
                <button
                  type="button"
                  onClick={handleOpenAccuse}
                  className="w-full py-2 px-4 rounded-xl bg-rose-950/70 hover:bg-rose-900/80 border border-rose-600/70 text-rose-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-md"
                >
                  <Flame className="w-3.5 h-3.5 text-rose-300" />
                  <span>{t.makeAccusationBtn}</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
