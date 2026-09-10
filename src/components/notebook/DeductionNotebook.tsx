'use client';

import React, { useState, useMemo } from 'react';
import { ScrollText, ListChecks, LayoutGrid, Check, X, Sparkles, RotateCcw, ArrowLeft } from 'lucide-react';
import { Player, LogEntry } from '@/engine/types';
import { SUSPECTS, LOCATIONS, WEAPONS } from '@/engine/data';
import { SupportedLocale, TranslationStrings } from '@/i18n/translations';
import { getPlayerDisplayName } from '@/engine/engine';
import { sounds } from '@/utils/sounds';

export type NoteMark = 'EMPTY' | 'NO' | 'UNKNOWN' | 'YES';
export type MatrixMark = '-' | 'X' | '?' | 'O';

interface DeductionNotebookProps {
  t: TranslationStrings;
  locale: SupportedLocale;
  myPlayer?: Player;
  players: Player[];
  userNotes: Record<string, NoteMark>;
  toggleNote: (cardId: string) => void;
  matrixNotes: Record<string, Record<string, MatrixMark>>;
  toggleMatrixCell: (cardId: string, playerId: string) => void;
  getCardName: (id: string) => string;
  getRoomName: (id: string) => string;
  logs?: LogEntry[];
  onResetNotes?: () => void;
  onBackToBoard?: () => void;
}

export const DeductionNotebook: React.FC<DeductionNotebookProps> = ({
  t,
  locale,
  myPlayer,
  players,
  userNotes,
  toggleNote,
  matrixNotes,
  toggleMatrixCell,
  getCardName,
  getRoomName,
  logs = [],
  onResetNotes,
  onBackToBoard,
}) => {
  const [notebookViewMode, setNotebookViewMode] = useState<'simple' | 'matrix'>('simple');
  const [smartAssist, setSmartAssist] = useState<boolean>(true);

  const handleNoteClick = (id: string) => {
    sounds.playPencilMark();
    toggleNote(id);
  };

  const handleMatrixCellClick = (cardId: string, playerId: string) => {
    sounds.playPencilMark();
    toggleMatrixCell(cardId, playerId);
  };

  // Smart Assist: Analyze log history for suggestions & disproves
  // If player Y disproved a suggestion containing cardId, map it
  const smartDisprovedMap = useMemo(() => {
    if (!smartAssist) return new Map<string, Set<string>>(); // playerId -> Set<cardId>

    const map = new Map<string, Set<string>>();
    logs.forEach(log => {
      if (log.type === 'disprove') {
        const responderId = log.metadata?.responderId;
        if (responderId && responderId !== 'none') {
          if (!map.has(responderId)) map.set(responderId, new Set());
          const set = map.get(responderId)!;

          // If this player showed a card in response to a suggestion:
          if (log.metadata?.shownCardId && (log.metadata.askerId === myPlayer?.id || !myPlayer)) {
            set.add(log.metadata.shownCardId);
          } else {
            if (log.metadata?.suspectId) set.add(log.metadata.suspectId);
            if (log.metadata?.locationId) set.add(log.metadata.locationId);
            if (log.metadata?.weaponId) set.add(log.metadata.weaponId);
          }
        }
      }
    });
    return map;
  }, [logs, smartAssist, myPlayer]);

  const renderSimpleRow = (id: string, name: string) => {
    const isMyCard = myPlayer?.hand?.some(c => c.id === id);
    const mark: NoteMark = userNotes[id] || 'EMPTY';

    return (
      <div 
        key={id} 
        onClick={() => handleNoteClick(id)}
        className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer hover:bg-slate-800/60 select-none ${
          isMyCard
            ? 'border-amber-500/40 bg-amber-950/20 shadow-sm'
            : 'border-slate-800 bg-slate-900/40'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`truncate ${isMyCard ? 'text-amber-200 font-bold' : 'text-slate-300'}`}>{name}</span>
          {isMyCard && smartAssist && (
            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono shrink-0">
              {t.handBadge}
            </span>
          )}
        </div>
        <span className="w-5 h-5 flex items-center justify-center shrink-0">
          {mark === 'NO' && <X className="w-3.5 h-3.5 text-rose-500 font-black" />}
          {mark === 'UNKNOWN' && <span className="text-amber-400 font-bold font-mono text-sm">?</span>}
          {mark === 'YES' && <Check className="w-3.5 h-3.5 text-emerald-400 font-black" />}
          {mark === 'EMPTY' && <span className="text-slate-500 font-mono font-bold text-sm">-</span>}
        </span>
      </div>
    );
  };

  const renderMatrixRow = (id: string, name: string) => {
    return (
      <tr key={id} className="hover:bg-slate-800/30 transition-colors">
        <td className="p-2 font-medium text-slate-200 border-r border-slate-800/50">
          <div className="flex items-center justify-between gap-1">
            <span>{name}</span>
            {myPlayer?.hand?.some(c => c.id === id) && smartAssist && (
              <span className="text-[9px] font-black px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                {t.handBadge}
              </span>
            )}
          </div>
        </td>
        {players.map(p => {
          const isMyDetective = p.id === myPlayer?.id;
          const isMyCard = myPlayer?.hand?.some(c => c.id === id);

          if (isMyDetective) {
            const mark: NoteMark = userNotes[id] || 'EMPTY';
            return (
              <td
                key={p.id}
                onClick={() => handleNoteClick(id)}
                className={`p-1.5 text-center cursor-pointer hover:bg-slate-800/60 border-l border-slate-800/50 transition-colors select-none ${
                  isMyCard ? 'bg-amber-500/10' : ''
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  {mark === 'NO' && <span className="text-rose-400 font-black text-sm">✕</span>}
                  {mark === 'UNKNOWN' && <span className="text-amber-400 font-mono font-bold text-sm">?</span>}
                  {mark === 'YES' && <span className="text-emerald-400 font-black text-sm">✓</span>}
                  {mark === 'EMPTY' && <span className="text-slate-500 font-mono font-bold text-sm">-</span>}
                </div>
              </td>
            );
          }

          const cellVal: MatrixMark = matrixNotes[id]?.[p.id] || '-';
          const isSmartDisproved = smartAssist && smartDisprovedMap.get(p.id)?.has(id);

          return (
            <td
              key={p.id}
              onClick={() => handleMatrixCellClick(id, p.id)}
              className="p-1.5 text-center cursor-pointer hover:bg-slate-800/60 border-l border-slate-800/50 transition-colors select-none"
            >
              <div className="flex items-center justify-center gap-0.5">
                {cellVal === 'X' && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 border border-rose-500/60 text-rose-300">
                    X
                  </span>
                )}
                {cellVal === '?' && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 border border-amber-500/60 text-amber-300">
                    ?
                  </span>
                )}
                {cellVal === 'O' && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 border border-emerald-500/60 text-emerald-300">
                    O
                  </span>
                )}
                {cellVal === '-' && (
                  <span className="text-slate-600 font-mono text-xs">-</span>
                )}
                {isSmartDisproved && (
                  <span 
                    title={`${p.name} ${t.smartClueDisprovedTag}`}
                    className="text-[9px] text-amber-400 animate-pulse font-mono"
                  >
                    💡
                  </span>
                )}
              </div>
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div id="deduction-notebook" className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          {onBackToBoard && (
            <button
              onClick={onBackToBoard}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/25 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t.backToBoard}</span>
            </button>
          )}
          <div className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-slate-200">
              {t.notebookTitle}
            </h2>
          </div>
        </div>

        {/* 컨트롤: 스마트 어시스트 토글 & 보기 모드 전환 & 초기화 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 스마트 어시스트 토글 */}
          <button
            onClick={() => {
              sounds.playCardSlide();
              setSmartAssist(!smartAssist);
            }}
            title={t.smartAssistDesc}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              smartAssist
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                : 'bg-slate-800/60 text-slate-400 border-slate-700'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${smartAssist ? 'text-amber-400' : ''}`} />
            <span>{t.smartAssistTitle}</span>
            <span className={`text-[10px] font-mono px-1 rounded ${smartAssist ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-700 text-slate-400'}`}>
              {smartAssist ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* 보기 모드 전환 (체크리스트 vs 실전 매트릭스) */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setNotebookViewMode('simple')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                notebookViewMode === 'simple'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>{t.notebookSimpleMode}</span>
            </button>
            <button
              onClick={() => setNotebookViewMode('matrix')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                notebookViewMode === 'matrix'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{t.notebookMatrixMode}</span>
            </button>
          </div>

          {onResetNotes && (
            <button
              onClick={() => {
                sounds.playPencilMark();
                onResetNotes();
              }}
              title={t.resetNotes}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {notebookViewMode === 'simple' ? (
        /* 1. 간편 체크리스트 뷰 */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* 용의자 */}
          <div className="flex flex-col gap-1.5">
            <div className="font-bold text-rose-400 border-b border-slate-800 pb-1">{t.suspectsHeader}</div>
            {SUSPECTS.map(s => renderSimpleRow(s.id, getCardName(s.id)))}
          </div>

          {/* 살인이 일어난 장소 */}
          <div className="flex flex-col gap-1.5">
            <div className="font-bold text-blue-400 border-b border-slate-800 pb-1">{t.locationsHeader}</div>
            {LOCATIONS.map(r => renderSimpleRow(r.id, getRoomName(r.id)))}
          </div>

          {/* 범행 도구 */}
          <div className="flex flex-col gap-1.5">
            <div className="font-bold text-amber-400 border-b border-slate-800 pb-1">{t.weaponsHeader}</div>
            {WEAPONS.map(w => renderSimpleRow(w.id, getCardName(w.id)))}
          </div>
        </div>
      ) : (
        /* 2. 전 탐정 매트릭스 그리드 뷰 (보드게임 정석 추리표) */
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 shadow-inner">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-300 border-b border-slate-700 font-semibold">
                <th className="p-2.5 min-w-[130px] text-slate-300">
                  {locale === 'ko' ? '단서 카드' : 'Clue Card'}
                </th>
                {players.map(p => {
                  const isMyDetective = p.id === myPlayer?.id;
                  return (
                    <th key={p.id} className="p-2 text-center min-w-[70px] border-l border-slate-800/80">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-base leading-none">{p.avatar}</span>
                        <span className={`text-[10px] font-bold truncate max-w-[65px] ${isMyDetective ? 'text-amber-400' : 'text-slate-300'}`}>
                          {isMyDetective ? (locale === 'ko' ? '나' : locale === 'es' ? 'Tú' : 'YOU') : getPlayerDisplayName(p, locale).split(' ')[0]}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {/* 용의자 섹션 */}
              <tr className="bg-rose-950/40 text-rose-300 font-black text-[10px]">
                <td colSpan={1 + players.length} className="px-3 py-1 uppercase tracking-wider">
                  {t.suspectsHeader}
                </td>
              </tr>
              {SUSPECTS.map(s => renderMatrixRow(s.id, getCardName(s.id)))}

              {/* 장소 섹션 */}
              <tr className="bg-blue-950/40 text-blue-300 font-black text-[10px]">
                <td colSpan={1 + players.length} className="px-3 py-1 uppercase tracking-wider">
                  {t.locationsHeader}
                </td>
              </tr>
              {LOCATIONS.map(r => renderMatrixRow(r.id, getRoomName(r.id)))}

              {/* 범행 도구 섹션 */}
              <tr className="bg-amber-950/40 text-amber-300 font-black text-[10px]">
                <td colSpan={1 + players.length} className="px-3 py-1 uppercase tracking-wider">
                  {t.weaponsHeader}
                </td>
              </tr>
              {WEAPONS.map(w => renderMatrixRow(w.id, getCardName(w.id)))}
            </tbody>
          </table>
        </div>
      )}

      {/* 하단: 보드로 돌아가기 편의 버튼 */}
      {onBackToBoard && (
        <div className="pt-3 border-t border-slate-800/80 flex justify-center">
          <button
            onClick={onBackToBoard}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.backToBoard}</span>
          </button>
        </div>
      )}
    </div>
  );
};
