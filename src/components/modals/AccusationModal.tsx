'use client';

import React, { useState } from 'react';
import { AlertTriangle, Eye } from 'lucide-react';
import { SUSPECTS, LOCATIONS, WEAPONS } from '@/engine/data';
import { TranslationStrings } from '@/i18n/translations';

interface AccusationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeclare: (accusation: { suspectId: string; locationId: string; weaponId: string }) => void;
  t: TranslationStrings;
  getCardName: (id: string) => string;
  getRoomName: (id: string) => string;
  getEffectiveCardStatus?: (id: string) => { mark: 'YES' | 'NO' | 'UNKNOWN'; tag: string; label: string };
}

export const AccusationModal: React.FC<AccusationModalProps> = ({
  isOpen,
  onClose,
  onDeclare,
  t,
  getCardName,
  getRoomName,
  getEffectiveCardStatus,
}) => {
  const getStatus = (id: string) => {
    if (getEffectiveCardStatus) return getEffectiveCardStatus(id);
    return { mark: 'UNKNOWN' as const, tag: '', label: '' };
  };

  const initialSuspect = SUSPECTS.find(s => getStatus(s.id).mark === 'YES')?.id
    || SUSPECTS.find(s => getStatus(s.id).mark === 'UNKNOWN')?.id
    || SUSPECTS[0].id;

  const initialLocation = LOCATIONS.find(l => getStatus(l.id).mark === 'YES')?.id
    || LOCATIONS.find(l => getStatus(l.id).mark === 'UNKNOWN')?.id
    || LOCATIONS[0].id;

  const initialWeapon = WEAPONS.find(w => getStatus(w.id).mark === 'YES')?.id
    || WEAPONS.find(w => getStatus(w.id).mark === 'UNKNOWN')?.id
    || WEAPONS[0].id;

  const [suspect, setSuspect] = useState(initialSuspect);
  const [location, setLocation] = useState(initialLocation);
  const [weapon, setWeapon] = useState(initialWeapon);

  if (!isOpen) return null;

  const suspectStatus = getStatus(suspect);
  const locationStatus = getStatus(location);
  const weaponStatus = getStatus(weapon);

  return (
    <div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in">
      <div className="max-w-2xl w-full bg-slate-900/95 border-2 border-rose-500/80 p-5 sm:p-6 rounded-3xl flex flex-col gap-4 shadow-2xl shadow-rose-950/80 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
            <h2 className="text-base sm:text-lg font-black text-slate-100">{t.accuseTitle}</h2>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
            FINAL ACCUSATION
          </span>
        </div>

        <p className="text-xs text-rose-200/90 bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/30 leading-relaxed">
          ⚠️ {t.accuseWarning}
        </p>

        {/* 무블러 투명 안내: 배경의 보드와 수첩을 보면서 지목 가능 */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-[11px] text-amber-300/90 font-medium">
          <Eye className="w-4 h-4 text-amber-400 shrink-0" />
          <span>뒤 배경의 보드판과 추리 수첩을 보면서 신중하게 용의자/장소/흉기를 선택하세요.</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* 1. 용의자 선택 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 font-bold flex items-center justify-between">
              <span>{t.accuseSuspect}</span>
              {suspectStatus.label && (
                <span className="text-[10px] text-amber-300 font-normal">
                  {suspectStatus.label}
                </span>
              )}
            </label>
            <select 
              value={suspect} 
              onChange={e => setSuspect(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 hover:border-rose-500/60 focus:border-rose-500 rounded-xl p-2.5 text-slate-100 font-medium transition-colors cursor-pointer"
            >
              {SUSPECTS.map(s => {
                const st = getStatus(s.id);
                return (
                  <option key={s.id} value={s.id}>
                    {getCardName(s.id)}{st.tag}
                  </option>
                );
              })}
            </select>
            {/* 유력 후보 칩 */}
            <div className="flex flex-wrap gap-1 pt-0.5">
              {SUSPECTS.filter(s => getStatus(s.id).mark !== 'NO').map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSuspect(s.id)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                    suspect === s.id
                      ? 'bg-rose-600 text-white border-rose-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {getCardName(s.id)}
                </button>
              ))}
            </div>
          </div>

          {/* 2. 범죄 장소 선택 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 font-bold flex items-center justify-between">
              <span>{t.accuseLocation}</span>
              {locationStatus.label && (
                <span className="text-[10px] text-amber-300 font-normal">
                  {locationStatus.label}
                </span>
              )}
            </label>
            <select 
              value={location} 
              onChange={e => setLocation(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 hover:border-rose-500/60 focus:border-rose-500 rounded-xl p-2.5 text-slate-100 font-medium transition-colors cursor-pointer"
            >
              {LOCATIONS.map(l => {
                const st = getStatus(l.id);
                return (
                  <option key={l.id} value={l.id}>
                    {getRoomName(l.id)}{st.tag}
                  </option>
                );
              })}
            </select>
            {/* 유력 후보 칩 */}
            <div className="flex flex-wrap gap-1 pt-0.5">
              {LOCATIONS.filter(l => getStatus(l.id).mark !== 'NO').slice(0, 4).map(l => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLocation(l.id)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                    location === l.id
                      ? 'bg-rose-600 text-white border-rose-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {getRoomName(l.id)}
                </button>
              ))}
            </div>
          </div>

          {/* 3. 살해 흉기 선택 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 font-bold flex items-center justify-between">
              <span>{t.accuseWeapon}</span>
              {weaponStatus.label && (
                <span className="text-[10px] text-amber-300 font-normal">
                  {weaponStatus.label}
                </span>
              )}
            </label>
            <select 
              value={weapon} 
              onChange={e => setWeapon(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 hover:border-rose-500/60 focus:border-rose-500 rounded-xl p-2.5 text-slate-100 font-medium transition-colors cursor-pointer"
            >
              {WEAPONS.map(w => {
                const st = getStatus(w.id);
                return (
                  <option key={w.id} value={w.id}>
                    {getCardName(w.id)}{st.tag}
                  </option>
                );
              })}
            </select>
            {/* 유력 후보 칩 */}
            <div className="flex flex-wrap gap-1 pt-0.5">
              {WEAPONS.filter(w => getStatus(w.id).mark !== 'NO').map(w => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setWeapon(w.id)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                    weapon === w.id
                      ? 'bg-rose-600 text-white border-rose-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {getCardName(w.id)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 선택한 최종 고발 요약 */}
        <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">최종 지목 조합:</span>
          <span className="text-amber-300 font-bold">
            👤 {getCardName(suspect)} / 📍 {getRoomName(location)} / 🔪 {getCardName(weapon)}
          </span>
        </div>

        <div className="flex gap-3 justify-end mt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={() => onDeclare({ suspectId: suspect, locationId: location, weaponId: weapon })}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-black tracking-wide transition-all shadow-lg shadow-rose-900/40 active:scale-95 cursor-pointer border border-rose-400/50"
          >
            {t.declareTruth}
          </button>
        </div>
      </div>
    </div>
  );
};
