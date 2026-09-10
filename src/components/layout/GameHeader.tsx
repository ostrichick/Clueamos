'use client';

import React from 'react';
import { 
  Volume2, 
  VolumeX, 
  Music, 
  ScrollText, 
  Flame, 
  RotateCcw,
  MapPin,
  LogOut 
} from 'lucide-react';
import { Player } from '@/engine/types';
import { SupportedLocale, TranslationStrings } from '@/i18n/translations';
import { PlayMode } from '@/store/useGameStore';
import { getPlayerDisplayName } from '@/engine/engine';

interface GameHeaderProps {
  t: TranslationStrings;
  locale: SupportedLocale;
  setLocale: (loc: SupportedLocale) => void;
  turnCount: number;
  maxTurns: number;
  playMode: PlayMode;
  roomCode: string | null;
  peerOnline: boolean;
  currentPlayer: Player;
  soundEnabled: boolean;
  toggleSound: () => void;
  bgmActive: boolean;
  toggleBgm: () => void;
  activeTab: 'board' | 'notes';
  setActiveTab: (tab: 'board' | 'notes') => void;
  isHumanTurn: boolean;
  isMyTurn: boolean;
  onOpenAccuse: () => void;
  onNewGame: () => void;
  onExitToLobby?: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  t,
  locale,
  setLocale,
  turnCount,
  maxTurns,
  playMode,
  roomCode,
  peerOnline,
  currentPlayer,
  soundEnabled,
  toggleSound,
  bgmActive,
  toggleBgm,
  activeTab,
  setActiveTab,
  isHumanTurn,
  isMyTurn,
  onOpenAccuse,
  onNewGame,
  onExitToLobby,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <span className="font-extrabold text-amber-400 tracking-tight text-lg">Clueamos</span>
        <div className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
          {t.round} {turnCount} / {maxTurns}
        </div>

        {/* 멀티플레이 룸 뱃지 및 온라인 상태 */}
        {playMode !== 'local' && (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-xs font-mono">
            {roomCode && <span className="text-slate-200 font-bold">{roomCode}</span>}
            {peerOnline ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">{t.online}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span className="hidden sm:inline">{t.offline}</span>
              </span>
            )}
            <span className="text-[10px] text-amber-400 font-bold hidden sm:inline font-sans">({playMode.toUpperCase()})</span>
          </div>
        )}
      </div>

      {/* 현재 차례 표시기 */}
      <div className="flex items-center gap-2">
        <div 
          className="w-3 h-3 rounded-full animate-pulse" 
          style={{ backgroundColor: currentPlayer.color }} 
        />
        <span className="text-xs sm:text-sm font-bold text-slate-200 truncate max-w-[180px] sm:max-w-none">
          {getPlayerDisplayName(currentPlayer, locale)}{t.turn}
        </span>
        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 hidden sm:inline-block">
          {currentPlayer.type === 'human' ? t.player : t.detective}
        </span>
      </div>

      {/* 언어 선택 및 유틸리티 버튼들 */}
      <div className="flex items-center gap-2">
        {/* 언어 토글 */}
        <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 text-xs font-semibold">
          <button 
            onClick={() => setLocale('en')} 
            className={`px-2 py-1 rounded ${locale === 'en' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            EN
          </button>
          <button 
            onClick={() => setLocale('es')} 
            className={`px-2 py-1 rounded ${locale === 'es' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            ES
          </button>
          <button 
            onClick={() => setLocale('ko')} 
            className={`px-2 py-1 rounded ${locale === 'ko' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            KO
          </button>
        </div>

        <button
          onClick={toggleSound}
          title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
        </button>

        {/* 절차적 필름 느와르 재즈 BGM 토글 */}
        <button
          onClick={toggleBgm}
          title={t.bgmMusic}
          className={`p-2 rounded-lg border transition-all ${
            bgmActive
              ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-sm shadow-amber-500/30 ring-1 ring-amber-500/40'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400'
          }`}
        >
          <Music className={`w-4 h-4 ${bgmActive ? 'animate-pulse text-amber-400' : ''}`} />
        </button>

        <button 
          onClick={() => setActiveTab(activeTab === 'board' ? 'notes' : 'board')}
          className={`text-xs font-bold px-3 py-2 rounded-lg border transition-all flex items-center gap-1.5 ${
            activeTab === 'notes'
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-500/30 ring-2 ring-amber-400/80 scale-105'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-400'
          }`}
        >
          {activeTab === 'board' ? <ScrollText className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
          <span>{activeTab === 'board' ? t.viewNotes : t.backToBoard}</span>
        </button>

        {isHumanTurn && isMyTurn && !currentPlayer.isEliminated && (
          <button
            onClick={onOpenAccuse}
            className="text-xs font-bold px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors flex items-center gap-1.5 shadow-md shadow-rose-900/30"
          >
            <Flame className="w-4 h-4" />
            <span>{t.finalAccusationBtn}</span>
          </button>
        )}

        <button 
          onClick={onNewGame}
          title={t.newGame}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {onExitToLobby && (
          <button
            onClick={() => {
              if (window.confirm(t.confirmExitToLobby)) {
                onExitToLobby();
              }
            }}
            title={t.exitToLobby}
            className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/60 text-slate-400 hover:text-rose-300 transition-all flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline text-xs font-bold text-rose-300">
              {t.exitToLobby}
            </span>
          </button>
        )}
      </div>
    </header>
  );
};
