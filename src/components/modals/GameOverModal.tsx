'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, ScrollText, ChevronUp, ChevronDown, Copy, Check } from 'lucide-react';
import { type Solution, type Player, type LogEntry, type GamePhase } from '@/engine/types';
import { type SupportedLocale, type TranslationStrings } from '@/i18n/translations';
import { getPlayerDisplayName } from '@/engine/engine';
import { useDraggableModal, ModalDragHandle } from '@/hooks/useDraggableModal';
import {
  generateShareReport,
  getDetectiveRank,
  loadCareerStats,
  recordGameResult,
} from '@/utils/stats';

interface GameOverModalProps {
  phase: GamePhase;
  winnerId?: string;
  solution: Solution;
  players: Player[];
  logs: LogEntry[];
  turnCount: number;
  t: TranslationStrings;
  locale: SupportedLocale;
  trackedPlayerId?: string;
  getCardName: (id: string) => string;
  getRoomName: (id: string) => string;
  onPlayAgain?: () => void;
  onExitToLobby?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  phase,
  winnerId,
  solution,
  players,
  logs,
  turnCount,
  t,
  locale,
  trackedPlayerId,
  getCardName,
  getRoomName,
  onPlayAgain,
  onExitToLobby,
}) => {
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [careerStats, setCareerStats] = useState(loadCareerStats);
  const [reportCopied, setReportCopied] = useState(false);
  const recordedGameRef = useRef(false);
  const { handlePointerDown, modalStyle } = useDraggableModal({
    isOpen: phase === 'GAME_OVER',
  });

  useEffect(() => {
    if (phase !== 'GAME_OVER') {
      recordedGameRef.current = false;
      return;
    }
    if (recordedGameRef.current || !trackedPlayerId) return;

    const trackedPlayer = players.find((player) => player.id === trackedPlayerId);
    if (!trackedPlayer) return;

    recordedGameRef.current = true;
    const updatedStats = recordGameResult(
      winnerId === trackedPlayerId,
      turnCount,
      trackedPlayer.characterId
    );
    queueMicrotask(() => setCareerStats(updatedStats));
  }, [phase, players, trackedPlayerId, turnCount, winnerId]);

  if (phase !== 'GAME_OVER') return null;

  const winner = players.find(p => p.id === winnerId);
  const rank = getDetectiveRank(careerStats.totalWins);
  const rankLabel = {
    ROOKIE: locale === 'ko' ? '신입 탐정' : locale === 'es' ? 'Detective Novato' : 'Rookie Detective',
    JUNIOR: locale === 'ko' ? '주니어 탐정' : locale === 'es' ? 'Detective Junior' : 'Junior Detective',
    VETERAN: locale === 'ko' ? '베테랑 탐정' : locale === 'es' ? 'Detective Veterano' : 'Veteran Detective',
    MASTER: locale === 'ko' ? '마스터 탐정' : locale === 'es' ? 'Maestro Detective' : 'Master Detective',
  }[rank.rank];

  const handleCopyReport = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;

    const report = generateShareReport({
      isWin: Boolean(winner),
      winnerName: winner ? getPlayerDisplayName(winner, locale) : '',
      turns: turnCount,
      suspectName: getCardName(solution.suspectId),
      locationName: getRoomName(solution.locationId),
      weaponName: getCardName(solution.weaponId),
      locale,
    });

    await navigator.clipboard.writeText(report);
    setReportCopied(true);
    window.setTimeout(() => setReportCopied(false), 1800);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in select-none">
      <div 
        onPointerDown={handlePointerDown}
        style={modalStyle}
        className="max-w-lg w-full bg-slate-900 border border-amber-500/50 p-6 rounded-3xl text-center flex flex-col items-center gap-3 shadow-2xl my-auto"
      >
        <ModalDragHandle label="드래그하여 이동 (Drag to move)" />
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/10">
          🏆
        </div>
        <h2 className="text-2xl font-black text-slate-100">{t.investigationEnd}</h2>
        <p className="text-sm text-slate-300 font-medium">
          {winner
            ? `${getPlayerDisplayName(winner, locale)} ${t.truthRevealed}`
            : t.mysteryUnsolved}
        </p>

        {/* 사건의 진상 (정답 카드 3장) */}
        <div className="bg-slate-800/70 border border-amber-500/30 p-4 rounded-2xl text-xs text-left w-full flex flex-col gap-1.5 text-slate-200 shadow-inner">
          <div className="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{t.secretSolutionTitle}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
            <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-700/80">
              <span className="text-[10px] text-rose-400 block font-bold">{t.solutionCulprit}</span>
              <span className="font-semibold text-slate-100">{getCardName(solution.suspectId)}</span>
            </div>
            <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-700/80">
              <span className="text-[10px] text-blue-400 block font-bold">{t.solutionLocation}</span>
              <span className="font-semibold text-slate-100">{getRoomName(solution.locationId)}</span>
            </div>
            <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-700/80">
              <span className="text-[10px] text-amber-400 block font-bold">{t.solutionWeapon}</span>
              <span className="font-semibold text-slate-100">{getCardName(solution.weaponId)}</span>
            </div>
          </div>
        </div>

        {trackedPlayerId && (
          <div className="w-full bg-slate-800/50 border border-slate-700/70 rounded-2xl p-3.5 text-left shadow-inner">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                  {locale === 'ko' ? '탐정 커리어' : locale === 'es' ? 'Carrera de detective' : 'Detective Career'}
                </div>
                <div className="text-sm font-black text-amber-300">Lv.{rank.level} · {rankLabel}</div>
              </div>
              <div className="text-right text-[10px] text-slate-400 font-mono">
                {careerStats.totalGames > 0
                  ? `${Math.round((careerStats.totalWins / careerStats.totalGames) * 100)}% ${locale === 'ko' ? '승률' : locale === 'es' ? 'victorias' : 'win rate'}`
                  : `0% ${locale === 'ko' ? '승률' : locale === 'es' ? 'victorias' : 'win rate'}`}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="rounded-xl bg-slate-900/70 border border-slate-700/70 p-2">
                <div className="text-base font-black text-slate-100">{careerStats.totalGames}</div>
                <div className="text-[10px] text-slate-500">{locale === 'ko' ? '총 게임' : locale === 'es' ? 'Partidas' : 'Games'}</div>
              </div>
              <div className="rounded-xl bg-slate-900/70 border border-slate-700/70 p-2">
                <div className="text-base font-black text-emerald-300">{careerStats.totalWins}</div>
                <div className="text-[10px] text-slate-500">{locale === 'ko' ? '승리' : locale === 'es' ? 'Victorias' : 'Wins'}</div>
              </div>
              <div className="rounded-xl bg-slate-900/70 border border-slate-700/70 p-2">
                <div className="text-base font-black text-sky-300">{careerStats.currentStreak}</div>
                <div className="text-[10px] text-slate-500">{locale === 'ko' ? '연승' : locale === 'es' ? 'Racha' : 'Streak'}</div>
              </div>
              <div className="rounded-xl bg-slate-900/70 border border-slate-700/70 p-2">
                <div className="text-base font-black text-violet-300">{careerStats.bestTurnsToWin ?? '—'}</div>
                <div className="text-[10px] text-slate-500">{locale === 'ko' ? '최단 승리 턴' : locale === 'es' ? 'Mejor turno' : 'Best turns'}</div>
              </div>
            </div>
          </div>
        )}

        {/* 사건 수사 타임라인 복기 (Collapsible Timeline Debrief) */}
        <div className="w-full bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden text-left shadow-inner">
          <button
            onClick={() => setTimelineExpanded(!timelineExpanded)}
            className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-amber-400 hover:bg-slate-800/60 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-amber-400" />
              <span>{t.investigationTimeline}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 font-mono">
                {logs.length}
              </span>
            </span>
            {timelineExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {timelineExpanded && (
            <div className="p-3 border-t border-slate-700/60 max-h-56 overflow-y-auto flex flex-col gap-2 text-xs text-slate-300">
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className={`p-2.5 rounded-xl border text-[11px] leading-relaxed ${
                    log.type === 'accusation'
                      ? 'border-rose-500/40 bg-rose-950/20 text-rose-200'
                      : log.type === 'disprove'
                        ? 'border-indigo-500/40 bg-indigo-950/20 text-indigo-200'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 mr-1.5 font-mono">[{t.round} {log.turn}]</span>
                  {log.message}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleCopyReport}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {reportCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          {reportCopied
            ? (locale === 'ko' ? '사건 보고서 복사 완료' : locale === 'es' ? 'Informe copiado' : 'Report copied')
            : (locale === 'ko' ? '사건 보고서 복사' : locale === 'es' ? 'Copiar informe' : 'Copy case report')}
        </button>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
          {onPlayAgain && (
            <button
              onClick={onPlayAgain}
              className="flex-1 w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98]"
            >
              {t.playAgain}
            </button>
          )}
          {onExitToLobby && (
            <button
              onClick={onExitToLobby}
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm border border-slate-700 transition-all active:scale-[0.98]"
            >
              {t.exitToLobby}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
