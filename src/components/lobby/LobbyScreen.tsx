'use client';

import React from 'react';
import Image from 'next/image';
import { 
  Languages, 
  Smartphone, 
  User, 
  Radio, 
  Copy, 
  Check, 
  ArrowRight 
} from 'lucide-react';
import { SUSPECTS, CHARACTER_PROFILES } from '@/engine/data';
import { SupportedLocale, TranslationStrings } from '@/i18n/translations';
import { PlayMode } from '@/store/useGameStore';

interface LobbyScreenProps {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: TranslationStrings;
  playMode: PlayMode;
  setPlayMode: (mode: PlayMode) => void;
  effectiveP1: string;
  effectiveP2: string;
  handleSelectP1: (charId: string) => void;
  handleSelectP2: (charId: string) => void;
  roomCode: string | null;
  inputRoomCode: string;
  setInputRoomCode: (code: string) => void;
  isConnecting: boolean;
  isConnected: boolean;
  connectionError: string | null;
  createRoom: () => void;
  joinRoom: (code: string) => void;
  disconnectRoom: () => void;
  handleCopyInviteLink: () => void;
  copySuccessToast: boolean;
  handleStartGame: () => void;
  getCardName: (id: string) => string;
  aiPlayerCount: number;
  setAiPlayerCount: (count: number) => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  locale,
  setLocale,
  t,
  playMode,
  setPlayMode,
  effectiveP1,
  effectiveP2,
  handleSelectP1,
  handleSelectP2,
  roomCode,
  inputRoomCode,
  setInputRoomCode,
  isConnecting,
  isConnected,
  connectionError,
  createRoom,
  joinRoom,
  disconnectRoom,
  handleCopyInviteLink,
  copySuccessToast,
  handleStartGame,
  getCardName,
  aiPlayerCount,
  setAiPlayerCount,
}) => {
  const aiCandidates = playMode === 'solo'
    ? SUSPECTS.filter(s => s.id !== effectiveP1)
    : SUSPECTS.filter(s => s.id !== effectiveP1 && s.id !== effectiveP2);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-amber-500 relative">
      {/* 우측 상단 언어 선택 버튼 */}
      <div className="absolute top-6 right-6 flex items-center gap-2 bg-slate-900/80 border border-slate-700/80 px-3 py-1.5 rounded-2xl backdrop-blur-md shadow-lg z-20">
        <Languages className="w-4 h-4 text-amber-400" />
        <button 
          onClick={() => setLocale('en')}
          className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${locale === 'en' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
        >
          EN
        </button>
        <button 
          onClick={() => setLocale('es')}
          className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${locale === 'es' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
        >
          ES
        </button>
        <button 
          onClick={() => setLocale('ko')}
          className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${locale === 'ko' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
        >
          KO
        </button>
      </div>

      <div className="max-w-3xl w-full bg-slate-900/80 border border-amber-500/30 p-6 sm:p-8 rounded-3xl backdrop-blur-2xl flex flex-col items-center text-center gap-6 shadow-2xl relative overflow-hidden my-8">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-black text-2xl shadow-xl shadow-amber-500/20 mb-1">
            C
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
            {t.gameTitle}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm max-w-md">
            {t.gameSubtitle}
          </p>
        </div>

        {/* 1. 플레이 모드 선택 (1번 멀티플레이 vs 2번 싱글플레이) */}
        <div className="flex items-center justify-center p-1 bg-slate-800/90 rounded-2xl border border-slate-700 w-full max-w-md shadow-inner">
          <button
            onClick={() => {
              if (playMode === 'solo') {
                setPlayMode('host');
              }
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
              playMode !== 'solo'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>{t.playModeMulti}</span>
          </button>
          <button
            onClick={() => {
              disconnectRoom();
              setPlayMode('solo');
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
              playMode === 'solo'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>{t.playModeSolo}</span>
          </button>
        </div>

        {/* 2. 멀티 디바이스 연동 패널 */}
        {playMode !== 'solo' && (
          <div className="w-full bg-slate-800/60 p-4 sm:p-5 rounded-2xl border border-amber-500/30 flex flex-col gap-4 text-left">
            {!roomCode ? (
              /* 방 만들기 / 참여하기 버튼 */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 방 만들기 (Host) */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/80 flex flex-col justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Radio className="w-4 h-4 text-amber-400" /> {t.hostRoomTitle}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {locale === 'ko' ? '방을 개설하고 초대 링크를 공유하여 함께 접속합니다.' : 'Host a new room and share the invite link with Player 2.'}
                    </p>
                  </div>
                  <button
                    disabled={isConnecting}
                    onClick={createRoom}
                    className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors shadow disabled:opacity-50"
                  >
                    {isConnecting && playMode === 'host' ? t.connectingToRoom : t.hostRoomBtn}
                  </button>
                </div>

                {/* 방 참여하기 (Guest) */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/80 flex flex-col justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-indigo-400" /> {t.joinRoomTitle}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {locale === 'ko' ? '전달받은 2자리 방 코드를 입력합니다.' : 'Enter the 2-digit room code sent by Player 1.'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={2}
                      placeholder="48"
                      value={inputRoomCode}
                      onChange={(e) => setInputRoomCode(e.target.value.replace(/\D/g, '').slice(0, 2))}
                      className="w-20 text-center uppercase tracking-widest font-mono font-black text-base bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-600 focus:border-indigo-400 focus:outline-none"
                    />
                    <button
                      disabled={isConnecting || inputRoomCode.length < 2}
                      onClick={() => joinRoom(inputRoomCode.trim())}
                      className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs transition-colors shadow"
                    >
                      {isConnecting && playMode === 'guest' ? t.connectingToRoom : t.joinRoomBtn}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* 방 개설 완료 화면 (2자리 코드 및 초대 복사) */
              <div className="p-4 rounded-xl bg-slate-900/80 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/50 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-amber-400 font-bold leading-none">ROOM</span>
                    <span className="text-lg font-black text-amber-300 font-mono leading-tight">{roomCode}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">
                        {playMode === 'host' ? t.waitingForPlayer2 : t.connectedToRoom}
                      </span>
                      {isConnected ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {t.player2Connected}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-bold text-amber-400 flex items-center gap-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          {t.waitingForPlayer2}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {locale === 'ko' ? '아래 초대 링크를 복사하여 상대방에게 전송하세요.' : 'Share the invite link with Player 2 to join immediately.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyInviteLink}
                    className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition-colors"
                  >
                    {copySuccessToast ? <Check className="w-3.5 h-3.5 text-slate-950" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copySuccessToast ? t.inviteLinkCopied : t.copyInviteLink}</span>
                  </button>
                  <button
                    onClick={disconnectRoom}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
                  >
                    {locale === 'ko' ? '방 나가기' : 'Leave Room'}
                  </button>
                </div>
              </div>
            )}

            {connectionError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs text-center">
                {connectionError}
              </div>
            )}
          </div>
        )}

        {/* 3. 캐릭터 선택 패널 */}
        <div className="w-full flex flex-col gap-4 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-200">
                {t.selectCharacterTitle}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {playMode === 'solo' ? t.playModeSoloDesc : t.selectCharacterSubtitle}
              </p>
            </div>
          </div>

          {/* 현재 누구의 캐릭터를 고르고 있는지 안내 배너 */}
          <div className="px-3 py-2 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              {playMode === 'solo'
                ? (locale === 'ko' ? '👉 당신의 탐정 캐릭터:' : '👉 Your Detective Character:')
                : playMode === 'guest'
                  ? (locale === 'ko' ? '👉 당신(플레이어 2)의 탐정 캐릭터를 선택하세요:' : '👉 Choose your Detective character:')
                  : (locale === 'ko' ? '👉 당신(방장, 플레이어 1)의 탐정 캐릭터를 선택하세요:' : '👉 Choose your Detective character:')}
            </span>
            <span className="font-bold text-amber-400">
              {playMode === 'guest'
                ? `${t.player} 2: ${getCardName(effectiveP2)}`
                : `${playMode === 'solo' ? (locale === 'ko' ? '탐정' : 'Detective') : `${t.player} 1`}: ${getCardName(effectiveP1)}`}
            </span>
          </div>

          {/* 6명 용의자 캐릭터 선택 그리드 카드 (대형 고화질 초상화) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {SUSPECTS.map(s => {
              const profile = CHARACTER_PROFILES[s.id];
              const isP1 = effectiveP1 === s.id;
              const isP2 = effectiveP2 === s.id;
              
              const isSelected = playMode === 'guest' ? isP2 : isP1;
              const isDisabled = playMode === 'guest' ? isP1 : (playMode === 'host' && isP2);

              return (
                <div
                  key={s.id}
                  onClick={() => {
                    if (isDisabled) return;
                    if (playMode === 'guest') {
                      handleSelectP2(s.id);
                    } else {
                      handleSelectP1(s.id);
                    }
                  }}
                  style={{
                    borderColor: isSelected ? profile?.color : undefined,
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-2.5 overflow-hidden group ${
                    isSelected
                      ? 'ring-2 bg-slate-800/95 shadow-xl border-amber-400'
                      : isDisabled
                        ? 'opacity-40 cursor-not-allowed bg-slate-900/30 border-slate-800'
                        : 'cursor-pointer hover:bg-slate-800/60 bg-slate-900/50 border-slate-800 hover:border-slate-700 active:scale-[0.98]'
                  }`}
                >
                  {/* 대형 초상화 이미지 뷰 */}
                  <div className="relative w-full h-44 sm:h-48 rounded-xl overflow-hidden bg-slate-950 border border-slate-700/60 shadow-inner">
                    <Image
                      src={profile.portraitUrl}
                      alt={getCardName(s.id)}
                      fill
                      className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* 상단 좌측: 캐릭터 이름 배지 */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-700/80 text-[11px] font-black text-slate-100 shadow-md">
                      <span>{profile?.avatar}</span>
                      <span>{getCardName(s.id)}</span>
                    </div>

                    {/* 상단 우측: 플레이어 역할 뱃지 */}
                    {isP1 && (
                      <span className="absolute top-2 right-2 text-[10px] font-black px-2 py-1 rounded-md bg-amber-500 text-slate-950 shadow-md">
                        {playMode === 'solo' ? (locale === 'ko' ? '내 캐릭터' : 'Your Detective') : `${t.player} 1`}
                      </span>
                    )}
                    {playMode !== 'solo' && isP2 && (
                      <span className="absolute top-2 right-2 text-[10px] font-black px-2 py-1 rounded-md bg-pink-500 text-slate-950 shadow-md">
                        {t.player} 2
                      </span>
                    )}

                    {/* 선택 불가 안내 오버레이 */}
                    {isDisabled && (
                      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 text-center">
                        <span className="text-xs text-amber-300 font-bold bg-slate-900/90 px-2.5 py-1 rounded-lg border border-amber-500/30">
                          🔒 {t.characterAlreadyChosen}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 설명 텍스트 */}
                  <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed px-0.5">
                    {t.cards[s.id]?.description || s.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* AI 탐정 추가 설정 (멀티플레이어 모드) */}
          {playMode !== 'solo' ? (
            <div className="bg-slate-800/50 border border-amber-500/20 rounded-2xl p-4 flex flex-col gap-3 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🤖</span>
                    <h3 className="text-sm font-bold text-slate-200">{t.aiCountTitle}</h3>
                    {playMode === 'guest' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                        🔒 {t.aiCountGuestNote}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{t.aiCountSubtitle}</p>
                </div>
                <div className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg self-start sm:self-auto border border-amber-500/20">
                  {locale === 'ko' 
                    ? `총 ${2 + aiPlayerCount}인 게임 (${aiPlayerCount === 0 ? '1:1 진검승부' : `사람 2명 + AI ${aiPlayerCount}명`})`
                    : `Total ${2 + aiPlayerCount} Players (${aiPlayerCount === 0 ? '1v1 Duel' : `2 Humans + ${aiPlayerCount} AIs`})`}
                </div>
              </div>

              {/* AI 인원수 선택 버튼 (0, 1, 2, 3, 4명) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-0.5">
                {[0, 1, 2, 3, 4].map(count => {
                  const isSelected = aiPlayerCount === count;
                  const isGuest = playMode === 'guest';
                  
                  return (
                    <button
                      key={count}
                      type="button"
                      disabled={isGuest}
                      onClick={() => {
                        if (!isGuest) setAiPlayerCount(count);
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 border ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 scale-[1.02]'
                          : isGuest
                            ? 'bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-slate-900/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-600 active:scale-95 cursor-pointer'
                      }`}
                    >
                      <span className="text-xs font-black">{count === 0 ? '⚔️ 0명' : `🤖 ${count}명`}</span>
                      <span className={`text-[10px] truncate max-w-full ${isSelected ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                        {count === 0 
                          ? (locale === 'ko' ? '1:1 결투' : '1v1') 
                          : count === 2 
                            ? (locale === 'ko' ? '기본 (4인)' : 'Default') 
                            : count === 4 
                              ? (locale === 'ko' ? '풀파티' : 'Max 6') 
                              : `${2 + count}인`}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* AI 탐정 배정 미리보기 */}
              <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-800/80 text-xs">
                <span className="text-slate-400 font-medium text-[11px]">
                  {aiPlayerCount === 0 
                    ? (locale === 'ko' ? '⚔️ AI 탐정 없음: 사람 둘만의 두뇌 대결' : '⚔️ No AI: 1v1 pure human duel') 
                    : `${t.aiDetectivesPreview}:`}
                </span>
                {aiPlayerCount > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {aiCandidates.slice(0, aiPlayerCount).map(c => (
                      <span 
                        key={c.id} 
                        className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300 font-mono flex items-center gap-1"
                      >
                        <span>{CHARACTER_PROFILES[c.id]?.avatar}</span>
                        <span>{getCardName(c.id).replace(/^[^\s]+\s+/, '')}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 솔로 플레이 모드일 때의 AI 미리보기 */
            <div className="bg-slate-800/30 border border-slate-700/40 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-400 font-medium">
                <span>🤖</span>
                <span>{t.aiDetectivesPreview}:</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {aiCandidates.slice(0, 3).map(c => (
                  <span 
                    key={c.id} 
                    className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300 font-mono flex items-center gap-1"
                  >
                    <span>{CHARACTER_PROFILES[c.id]?.avatar}</span>
                    <span>{getCardName(c.id).replace(/^[^\s]+\s+/, '')}</span>
                  </span>
                ))}
                <span className="text-[10px] text-slate-500">
                  (3 AIs)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 시작 버튼: 호스트/로컬은 시작 버튼, 게스트는 대기 안내 */}
        {playMode === 'guest' ? (
          <div className="w-full py-4 rounded-xl bg-slate-800/80 border border-slate-700 text-amber-400 font-bold text-sm text-center flex items-center justify-center gap-2 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{locale === 'ko' ? '방장(플레이어 1)이 게임을 시작하기를 기다리고 있습니다...' : 'Waiting for Player 1 to start the investigation...'}</span>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center gap-2">
            <button
              disabled={playMode === 'host' && !isConnected}
              onClick={handleStartGame}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-base sm:text-lg shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>{t.startGame}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            {playMode === 'host' && !isConnected && (
              <p className="text-[11px] text-amber-400/90 flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>
                  {!roomCode
                    ? (locale === 'ko'
                        ? '💡 상단의 [방 만들기]를 눌러 방을 생성하거나, 2번 싱글 플레이를 선택하세요.'
                        : locale === 'es'
                          ? '💡 Presiona [Crear Sala] arriba para crear una sala o selecciona Un Jugador.'
                          : '💡 Tap [Host Room] above to create a room, or choose Option 2 for Solo Play.')
                    : (locale === 'ko'
                        ? '💡 상대방(플레이어 2)이 2자리 코드로 접속하면 게임을 시작할 수 있습니다.'
                        : locale === 'es'
                          ? '💡 Puedes comenzar cuando el Jugador 2 se una con el código de 2 dígitos.'
                          : '💡 You can start once Player 2 joins with the 2-digit code.')}
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
