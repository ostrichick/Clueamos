import React from 'react';
import { HelpCircle, ArrowRight } from 'lucide-react';
import { SUSPECTS, WEAPONS } from '@/engine/data';
import { type NoteMark } from '@/components/notebook/DeductionNotebook';
import { type TranslationStrings } from '@/i18n/translations';

export type CardStatusInfo = { mark: NoteMark; tag: string; label: string };

interface AskHypothesisPanelProps {
  t: TranslationStrings;
  currentRoomName: string;
  getCardName: (id: string) => string;
  getEffectiveCardStatus: (cardId: string) => CardStatusInfo;
  selectedSuspect: string;
  onSelectSuspect: (id: string) => void;
  selectedWeapon: string;
  onSelectWeapon: (id: string) => void;
  onSuggest: () => void;
}

export const AskHypothesisPanel: React.FC<AskHypothesisPanelProps> = ({
  t,
  currentRoomName,
  getCardName,
  getEffectiveCardStatus,
  selectedSuspect,
  onSelectSuspect,
  selectedWeapon,
  onSelectWeapon,
  onSuggest,
}) => {
  const activeSuspect = (getEffectiveCardStatus(selectedSuspect).mark === 'NO')
    ? (SUSPECTS.find(s => getEffectiveCardStatus(s.id).mark !== 'NO')?.id || selectedSuspect)
    : selectedSuspect;

  const activeWeapon = (getEffectiveCardStatus(selectedWeapon).mark === 'NO')
    ? (WEAPONS.find(w => getEffectiveCardStatus(w.id).mark !== 'NO')?.id || selectedWeapon)
    : selectedWeapon;

  return (
    <div className="bg-gradient-to-r from-amber-950/40 via-slate-900/95 to-amber-950/40 border-2 border-amber-500/60 rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 shadow-xl shadow-amber-500/15 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
        <div className="text-xs font-bold text-amber-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-extrabold text-amber-300">{t.askHypothesis}</span>
        </div>
        <div className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold font-mono">
          📍 {t.currentRoom}: {currentRoomName}
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="text-slate-300 font-bold block mb-1.5 flex items-center justify-between">
            <span>{t.selectSuspect}</span>
            <span className="text-[10px] text-slate-400 font-normal">
              {getEffectiveCardStatus(activeSuspect).label}
            </span>
          </label>
          <select 
            value={activeSuspect} 
            onChange={e => onSelectSuspect(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 hover:border-amber-500/60 focus:border-amber-500 rounded-xl p-2.5 text-slate-100 font-medium transition-colors cursor-pointer"
          >
            {SUSPECTS.map(s => {
              const status = getEffectiveCardStatus(s.id);
              return (
                <option key={s.id} value={s.id}>
                  {getCardName(s.id)}{status.tag}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label className="text-slate-300 font-bold block mb-1.5 flex items-center justify-between">
            <span>{t.selectWeapon}</span>
            <span className="text-[10px] text-slate-400 font-normal">
              {getEffectiveCardStatus(activeWeapon).label}
            </span>
          </label>
          <select 
            value={activeWeapon} 
            onChange={e => onSelectWeapon(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 hover:border-amber-500/60 focus:border-amber-500 rounded-xl p-2.5 text-slate-100 font-medium transition-colors cursor-pointer"
          >
            {WEAPONS.map(w => {
              const status = getEffectiveCardStatus(w.id);
              return (
                <option key={w.id} value={w.id}>
                  {getCardName(w.id)}{status.tag}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* 빠른 후보 칩 (아직 배제되지 않은 미확인/미작성 후보들 원터치 선택) */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="text-[10px] text-amber-300/80 font-bold uppercase tracking-wider mr-1">미확인 후보:</span>
        {SUSPECTS.filter(s => getEffectiveCardStatus(s.id).mark !== 'NO').slice(0, 3).map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelectSuspect(s.id)}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
              activeSuspect === s.id 
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm' 
                : 'bg-slate-800/80 text-amber-200/90 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {getCardName(s.id)}
          </button>
        ))}
        {WEAPONS.filter(w => getEffectiveCardStatus(w.id).mark !== 'NO').slice(0, 3).map(w => (
          <button
            key={w.id}
            type="button"
            onClick={() => onSelectWeapon(w.id)}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
              activeWeapon === w.id 
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm' 
                : 'bg-slate-800/80 text-amber-200/90 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {getCardName(w.id)}
          </button>
        ))}
      </div>

      <div className="flex gap-2 justify-end mt-1 pt-2 border-t border-slate-800/80">
        <button
          onClick={onSuggest}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer active:scale-95"
        >
          <span>{t.askQuestionBtn}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};