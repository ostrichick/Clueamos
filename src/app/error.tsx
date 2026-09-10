'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Clueamos App Runtime Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-amber-500">
      <div className="max-w-md w-full bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 sm:p-8 text-center shadow-2xl flex flex-col items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg">
          <AlertTriangle className="w-7 h-7 animate-pulse" />
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
            일시적인 문제가 발생했습니다
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
            게임을 불러오는 도중 오류가 감지되었습니다. 아래 버튼을 눌러 다시 시도하거나 메인 로비로 이동해주세요.
          </p>
          {error.message && (
            <div className="mt-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-rose-400 max-h-24 overflow-y-auto break-all">
              {error.message}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full pt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>다시 시도</span>
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = window.location.origin + window.location.pathname;
              }
            }}
            className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>메인으로</span>
          </button>
        </div>
      </div>
    </div>
  );
}
