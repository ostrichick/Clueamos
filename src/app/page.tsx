import React from 'react';
import { Users, Bot, KeyRound, Sparkles, BookOpen, Skull, Building2, HelpCircle } from 'lucide-react';
import { SUSPECTS, LOCATIONS, WEAPONS, MOTIVES } from '@/engine/data';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* 상단 네비게이션 */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black text-xl tracking-wider">
              C
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
                Clueamos
              </span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Phase 1 Prototype
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <div className="flex items-center gap-1.5 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>사람 2명</span>
              <span className="text-slate-600">+</span>
              <Bot className="w-4 h-4 text-indigo-400" />
              <span>AI 탐정 2명</span>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 히어로 섹션 */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12 flex flex-col gap-12">
        <div className="text-center max-w-2xl mx-auto flex flex-col items-center gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-medium text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>고립된 그랜드 벨벳 호텔의 살인사건</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-50 leading-tight">
            부부가 함께 풀어가는 <br />
            <span className="bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
              4인 미스터리 추리 웹게임
            </span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            비밀 정답을 치팅하지 않는 영리한 2명의 AI 탐정과 함께, <br className="hidden sm:inline" />
            용의자 · 장소 · 도구 그리고 <strong>범행 동기</strong>의 진실을 먼저 밝혀내세요.
          </p>

          <div className="mt-4 flex gap-4">
            <button className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/25 transition-all active:scale-95 flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              <span>게임 시작 (개발 중)</span>
            </button>
            <a 
              href="https://github.com/ostrichick/Clueamos" 
              target="_blank" 
              rel="noreferrer"
              className="px-6 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 font-semibold transition-all text-slate-300"
            >
              GitHub 저장소
            </a>
          </div>
        </div>

        {/* 4대 추리 요소 미리보기 카드 그리드 */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 용의자 */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col gap-4 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider uppercase text-rose-400 flex items-center gap-1.5">
                <Skull className="w-4 h-4" /> 용의자 ({SUSPECTS.length}명)
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              {SUSPECTS.slice(0, 4).map(s => (
                <div key={s.id} className="text-sm bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
                  <div className="font-semibold text-slate-200">{s.name}</div>
                  <div className="text-xs text-slate-500 truncate">{s.description}</div>
                </div>
              ))}
              <div className="text-xs text-slate-500 text-center font-medium">+ 그 외 2명</div>
            </div>
          </div>

          {/* 사건 장소 */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col gap-4 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider uppercase text-blue-400 flex items-center gap-1.5">
                <Building2 className="w-4 h-4" /> 현장 장소 ({LOCATIONS.length}곳)
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              {LOCATIONS.slice(0, 4).map(r => (
                <div key={r.id} className="text-sm bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
                  <div className="font-semibold text-slate-200">{r.name}</div>
                  <div className="text-xs text-slate-500 truncate">{r.description}</div>
                </div>
              ))}
              <div className="text-xs text-slate-500 text-center font-medium">+ 그 외 2곳</div>
            </div>
          </div>

          {/* 도구 */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col gap-4 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider uppercase text-amber-400 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4" /> 범행 도구 ({WEAPONS.length}개)
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              {WEAPONS.slice(0, 4).map(w => (
                <div key={w.id} className="text-sm bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
                  <div className="font-semibold text-slate-200">{w.name}</div>
                  <div className="text-xs text-slate-500 truncate">{w.description}</div>
                </div>
              ))}
              <div className="text-xs text-slate-500 text-center font-medium">+ 그 외 2개</div>
            </div>
          </div>

          {/* 범행 동기 (Clueamos 독자 룰) */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-amber-500/20 flex flex-col gap-4 hover:border-amber-500/40 transition-colors bg-gradient-to-b from-amber-500/5 to-transparent">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider uppercase text-purple-400 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" /> 범행 동기 ({MOTIVES.length}개)
              </span>
              <span className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded font-semibold border border-amber-500/20">
                독자 룰
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              {MOTIVES.map(m => (
                <div key={m.id} className="text-sm bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
                  <div className="font-semibold text-slate-200">{m.name}</div>
                  <div className="text-xs text-slate-500 truncate">{m.description}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI 탐정 소개 */}
        <section className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-slate-100">함께할 2인의 컴퓨터 탐정 (Fair AI)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-slate-800/30 border border-slate-700/60 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  논리형 AI
                </span>
                <span className="font-bold text-slate-200">아서 (Arthur)</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                정답을 훔쳐보지 않고, 오직 자신이 가진 카드와 공개된 질문 기록만을 이용해 정직하고 냉철하게 소거법을 적용합니다. 확신도가 85% 이상에 도달해야만 최종 고발을 단행합니다.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-800/30 border border-slate-700/60 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  직감/블러핑형 AI
                </span>
                <span className="font-bold text-slate-200">블레이크 (Blake)</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                때로는 자신이 쥐고 있는 카드를 슬쩍 질문에 넣어 상대방의 혼란을 유도(블러핑)하며, 완벽한 확신이 서지 않아도 직감에 따라 과감하게 승부수를 던집니다.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* 푸터 */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
        Clueamos Project · Built with Next.js, Tailwind CSS & Pure TypeScript Engine
      </footer>
    </div>
  );
}
