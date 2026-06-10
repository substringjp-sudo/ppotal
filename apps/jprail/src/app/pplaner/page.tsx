'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function PplanerBridgePage() {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (countdown <= 0) {
      window.location.href = 'https://pplaner.com';
      return;
    }
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <div className="min-h-screen bg-[#0b0f17] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-emerald-600/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900/60 border border-slate-800 backdrop-blur-xl rounded-3xl p-8 text-center shadow-2xl relative z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-blue-600 to-emerald-500 rounded-2xl shadow-lg mb-6">
          <span className="material-symbols-outlined text-white text-3xl">rocket_launch</span>
        </div>

        <h1 className="text-2xl font-black tracking-tight mb-3">
          AI 여행 메이트, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">PPLANER</span>
        </h1>

        <p className="text-slate-400 text-sm font-medium leading-relaxed mb-6">
          PPLANER는 정밀한 노선 설계와 여행 아카이빙을 돕는 통합 플랫폼입니다.
          현재 보고 계신 <strong>JapanRailNote</strong>와 <strong>Regionevel</strong>의 데이터가 유기적으로 연동되어 더욱 깊이 있는 여행 지도를 만들어 드립니다.
        </p>

        <div className="bg-slate-950/80 border border-slate-800/60 p-5 rounded-2xl mb-8 flex flex-col items-center">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
            잠시 후 포털로 이동합니다
          </span>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
            <span className="text-xl font-bold text-slate-200">
              {countdown}초 후 자동 이동
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href="https://pplaner.com"
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>지금 바로 이동하기</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </a>
          <Link
            href="/"
            className="w-full py-3.5 bg-slate-800/50 hover:bg-slate-800 text-slate-300 font-bold text-sm uppercase tracking-wider rounded-xl transition-all border border-slate-700/50 hover:border-slate-700 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>이전 페이지로 돌아가기</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
