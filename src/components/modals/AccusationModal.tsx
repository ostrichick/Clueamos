'use client';

import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { SUSPECTS, LOCATIONS, WEAPONS } from '@/engine/data';
import { TranslationStrings } from '@/i18n/translations';

interface AccusationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeclare: (accusation: { suspectId: string; locationId: string; weaponId: string }) => void;
  t: TranslationStrings;
  getCardName: (id: string) => string;
  getRoomName: (id: string) => string;
}

export const AccusationModal: React.FC<AccusationModalProps> = ({
  isOpen,
  onClose,
  onDeclare,
  t,
  getCardName,
  getRoomName,
}) => {
  const [suspect, setSuspect] = useState(SUSPECTS[0].id);
  const [location, setLocation] = useState(LOCATIONS[0].id);
  const [weapon, setWeapon] = useState(WEAPONS[0].id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="max-w-lg w-full bg-slate-900 border border-rose-500/50 p-6 rounded-3xl flex flex-col gap-5 shadow-2xl">
        <div className="flex items-center gap-2 text-rose-400">
          <AlertTriangle className="w-5 h-5" />
          <h2 className="text-lg font-black text-slate-100">{t.accuseTitle}</h2>
        </div>
        <p className="text-xs text-rose-300/80 bg-rose-950/30 p-3 rounded-xl border border-rose-500/20 leading-relaxed">
          {t.accuseWarning}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">{t.accuseSuspect}</label>
            <select 
              value={suspect} 
              onChange={e => setSuspect(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200"
            >
              {SUSPECTS.map(s => <option key={s.id} value={s.id}>{getCardName(s.id)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-slate-400 block mb-1">{t.accuseLocation}</label>
            <select 
              value={location} 
              onChange={e => setLocation(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200"
            >
              {LOCATIONS.map(l => <option key={l.id} value={l.id}>{getRoomName(l.id)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-slate-400 block mb-1">{t.accuseWeapon}</label>
            <select 
              value={weapon} 
              onChange={e => setWeapon(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200"
            >
              {WEAPONS.map(w => <option key={w.id} value={w.id}>{getCardName(w.id)}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={() => onDeclare({ suspectId: suspect, locationId: location, weaponId: weapon })}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-900/30 active:scale-95"
          >
            {t.declareTruth}
          </button>
        </div>
      </div>
    </div>
  );
};
