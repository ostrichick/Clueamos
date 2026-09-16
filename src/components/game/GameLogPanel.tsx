import React, { useMemo, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { type LogEntry } from '@/engine/types';
import { type TranslationStrings } from '@/i18n/translations';

type LogFilterKey = 'all' | 'suggestion' | 'disprove' | 'accusation';

interface GameLogPanelProps {
  t: TranslationStrings;
  logs: LogEntry[];
}

export const GameLogPanel: React.FC<GameLogPanelProps> = ({ t, logs }) => {
  const [logFilter, setLogFilter] = useState<LogFilterKey>('all');

  const filteredLogs = useMemo(() => {
    const reversed = [...logs].reverse();
    if (logFilter === 'all') return reversed;
    return reversed.filter(log => log.type === logFilter);
  }, [logs, logFilter]);

  return (
    <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3 flex-1 min-h-[260px] shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800/60 pb-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <ScrollText className="w-3.5 h-3.5 text-amber-400" />
          {t.liveLogTitle}
        </h3>
        {/* 로그 카테고리 필터 탭 */}
        <div className="flex items-center gap-1 bg-slate-950/60 p-0.5 rounded-lg border border-slate-800/80">
          {(['all', 'suggestion', 'disprove', 'accusation'] as const).map(filterKey => {
            const label = filterKey === 'all' ? t.logFilterAll
              : filterKey === 'suggestion' ? t.logFilterSuggestion
              : filterKey === 'disprove' ? t.logFilterDisprove
              : t.logFilterAccusation;
            const isActive = logFilter === filterKey;
            return (
              <button
                key={filterKey}
                onClick={() => setLogFilter(filterKey)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500/25 text-amber-300 font-bold border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto max-h-[300px] flex flex-col gap-2 pr-1 text-xs">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-slate-600 text-xs italic">
            -
          </div>
        ) : (
          filteredLogs.map(log => (
            <div
              key={log.id}
              className={`p-2.5 rounded-lg border leading-relaxed ${
                log.type === 'accusation'
                  ? 'border-rose-500/50 bg-rose-950/20 text-rose-200'
                  : log.type === 'disprove'
                    ? 'border-indigo-500/40 bg-indigo-950/20 text-indigo-200'
                    : log.type === 'suggestion'
                      ? 'border-amber-500/30 bg-amber-950/10 text-amber-200/90'
                      : 'border-slate-800 bg-slate-900/50 text-slate-300'
              }`}
            >
              <span className="text-[10px] text-slate-500 block">{t.round} {log.turn}</span>
              {log.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
};