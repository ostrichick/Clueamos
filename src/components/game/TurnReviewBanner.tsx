'use client';

import React from 'react';
import { BookOpenCheck, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { TranslationStrings } from '@/i18n/translations';
import { TurnReviewState, PlayMode, PlayerRole } from '@/store/useGameStore';

interface TurnReviewBannerProps {
  review: TurnReviewState | null;
  playMode: PlayMode;
  myPlayerRole: PlayerRole;
  isAutoPlaying: boolean;
  onConfirm: () => void;
  t: TranslationStrings;
}

export const TurnReviewBanner: React.FC<TurnReviewBannerProps> = ({
  review,
  playMode,
  myPlayerRole,
  isAutoPlaying,
  onConfirm,
  t,
}) => {
  if (!review || !review.active) return null;

  const isMultiplayer = playMode === 'host' || playMode === 'guest';
  const isMyRoleReady = review.readyRoles.includes(myPlayerRole);

  return (
    <div className="w-full z-20 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="bg-gradient-to-r from-blue-950/95 via-slate-900/95 to-amber-950/95 border-2 border-amber-400/80 rounded-2xl sm:rounded-3xl p-4 sm:px-6 sm:py-3.5 shadow-2xl shadow-amber-500/25 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* 요약 안내 */}
        <div className="flex items-start gap-3 w-full md:w-auto text-left min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shrink-0 shadow-inner mt-0.5">
            <BookOpenCheck className="w-5 h-5 text-amber-300 animate-pulse" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-2 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
              <span>{t.turnReviewTitle}</span>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-200">
                Round {review.turnNumber}
              </span>
            </div>

            {review.summary ? (
              <p className="text-xs text-slate-200 font-medium leading-relaxed mt-0.5 line-clamp-2">
                📢 {review.summary}
              </p>
            ) : null}

            <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
              {t.turnReviewSubtitle}
            </p>

            {/* 멀티플레이어 참여자별 확인 상태 뱃지 */}
            {isMultiplayer && (
              <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px]">
                <span
                  className={`px-2.5 py-0.5 rounded-full border font-bold flex items-center gap-1 ${
                    review.readyRoles.includes('p1')
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {review.readyRoles.includes('p1') ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                  )}
                  {review.readyRoles.includes('p1') ? t.turnReviewP1Ready : t.turnReviewP1Writing}
                </span>

                <span
                  className={`px-2.5 py-0.5 rounded-full border font-bold flex items-center gap-1 ${
                    review.readyRoles.includes('p2')
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {review.readyRoles.includes('p2') ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                  )}
                  {review.readyRoles.includes('p2') ? t.turnReviewP2Ready : t.turnReviewP2Writing}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 확인 버튼 영역 */}
        <div className="w-full md:w-auto shrink-0 flex items-center justify-end">
          {isMultiplayer && isMyRoleReady ? (
            <div className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 animate-spin" />
              <span>{t.turnReviewWaitingPeer}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onConfirm}
              className="w-full md:w-auto px-6 py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm tracking-wide transition-all duration-150 transform active:scale-95 shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 border border-amber-300 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>{isAutoPlaying ? `🤖 ${t.turnReviewConfirmBtn}` : t.turnReviewConfirmBtn}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
