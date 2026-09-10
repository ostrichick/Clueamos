'use client';

import React, { useState } from 'react';
import { ScrollText, ListChecks, LayoutGrid, Check, X } from 'lucide-react';
import { Player } from '@/engine/types';
import { SUSPECTS, LOCATIONS, WEAPONS } from '@/engine/data';
import { SupportedLocale, TranslationStrings } from '@/i18n/translations';
import { getPlayerDisplayName } from '@/engine/engine';

interface DeductionNotebookProps {
  t: TranslationStrings;
  locale: SupportedLocale;
  myPlayer?: Player;
  players: Player[];
  userNotes: Record<string, 'UNKNOWN' | 'YES' | 'NO'>;
  toggleNote: (cardId: string) => void;
  matrixNotes: Record<string, Record<string, '?' | 'X' | 'O'>>;
  toggleMatrixCell: (cardId: string, playerId: string) => void;
  getCardName: (id: string) => string;
  getRoomName: (id: string) => string;
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
}) => {
  const [notebookViewMode, setNotebookViewMode] = useState<'simple' | 'matrix'>('simple');

  const renderSimpleRow = (id: string, name: string) => {
    const isMyCard = myPlayer?.hand?.some(c => c.id === id);
    const mark = isMyCard ? 'NO' : (userNotes[id] || 'UNKNOWN');
    return (
      <div 
        key={id} 
        onClick={() => !isMyCard && toggleNote(id)}
        className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
          !isMyCard ? 'cursor-pointer hover:bg-slate-800/50' : 'opacity-70'
        } border-slate-800 bg-slate-900/40`}
      >
        <span className="text-slate-300">{name}</span>
        <span>
          {mark === 'NO' && <X className="w-3.5 h-3.5 text-rose-500" />}
          {mark === 'YES' && <Check className="w-3.5 h-3.5 text-emerald-400 font-bold" />}
          {mark === 'UNKNOWN' && <span className="text-slate-600">?</span>}
        </span>
      </div>
    );
  };

  const renderMatrixRow = (id: string, name: string) => {
    return (
      <tr key={id} className="hover:bg-slate-800/30 transition-colors">
        <td className="p-2 font-medium text-slate-200 border-r border-slate-800/50">
          {name}
        </td>
        {players.map(p => {
          const isMyDetective = p.id === myPlayer?.id;
          const isMyCard = myPlayer?.hand?.some(c => c.id === id);

          if (isMyDetective) {
            if (isMyCard) {
              return (
                <td key={p.id} className="p-1.5 text-center border-l border-slate-800/50 bg-amber-500/10">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-slate-950">
                    HAND
                  </span>
                </td>
              );
            }
            const mark = userNotes[id] || 'UNKNOWN';
            return (
              <td
                key={p.id}
                onClick={() => toggleNote(id)}
                className="p-1.5 text-center cursor-pointer hover:bg-slate-800/60 border-l border-slate-800/50 transition-colors"
              >
                {mark === 'NO' && <span className="text-rose-400 font-black text-sm">✕</span>}
                {mark === 'YES' && <span className="text-emerald-400 font-black text-sm">✓</span>}
                {mark === 'UNKNOWN' && <span className="text-slate-600 font-mono">?</span>}
              </td>
            );
          }

          const cellVal = matrixNotes[id]?.[p.id] || '?';
          return (
            <td
              key={p.id}
              onClick={() => toggleMatrixCell(id, p.id)}
              className="p-1.5 text-center cursor-pointer hover:bg-slate-800/60 border-l border-slate-800/50 transition-colors select-none"
            >
              {cellVal === 'O' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 border border-emerald-500/60 text-emerald-300">
                  O
                </span>
              )}
              {cellVal === 'X' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 border border-rose-500/60 text-rose-300">
                  X
                </span>
              )}
              {cellVal === '?' && (
                <span className="text-slate-600 font-mono text-xs">·</span>
              )}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-bold text-slate-200">
            {t.notebookTitle}
          </h2>
        </div>

        {/* 보기 모드 전환 (체크리스트 vs 실전 매트릭스) */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700 self-start sm:self-auto">
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
                          {isMyDetective ? (locale === 'ko' ? '나 (Me)' : 'You') : getPlayerDisplayName(p, locale).split(' ')[0]}
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
    </div>
  );
};
