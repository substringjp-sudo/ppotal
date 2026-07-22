import React from 'react';
import { constructMetadata } from '@ppotal/ui';
import { Map, ExternalLink, ArrowLeft, Award, Layers, Globe, ChevronRight } from 'lucide-react';

export const metadata = constructMetadata({
  title: '세계 여행 기록과 RATE·EXP 등급 시스템 활용법 - PPLANER Guides',
  description: '전 세계 국가 및 시·군·구 행정구역 방문을 가중치별로 정밀 기록하고 나만의 여행 히트맵과 경험치 등급을 관리하는 Regionevel 활용 가이드입니다.',
  url: 'https://www.pplaner.com/guides/world-travel-log',
});

export default function WorldTravelLogGuidePage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      
      {/* Header Glass Card */}
      <div className="relative overflow-hidden rounded-[32px] p-8 sm:p-12 border border-white/10 bg-slate-900/60 backdrop-blur-2xl shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <a href="/guides" className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold hover:underline bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
            <ArrowLeft size={14} /> 가이드 센터 홈으로
          </a>
          <span className="text-xs text-slate-400 font-medium">6분 읽기 · 2026.07.20</span>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold w-fit">
          <Map size={14} /> 글로벌 여행 아카이빙 가이드
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-heading leading-tight">
          세계 여행 기록과 RATE·EXP 등급 시스템 활용법
        </h1>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed border-t border-white/10 pt-4">
          &quot;얼마나 많은 세상을 탐험했는가?&quot; 단순한 도장 깨기식 국가 개수 세기는 여행의 실제 밀도를 반영하기 어렵습니다. 수년 동안 한 국가의 다양한 도시를 깊이 있게 여행한 경험과, 공항 환승으로 1시간 머문 기록이 동일하게 다루어져서는 안 되기 때문입니다.
        </p>
      </div>

      {/* Main Glass Container */}
      <div className="rounded-[32px] p-8 sm:p-12 border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl space-y-10 text-slate-200">
        
        {/* 5-Level Weights */}
        <section className="space-y-4">
          <h2 className="text-2xl font-extrabold text-white font-heading flex items-center gap-3 border-b border-white/10 pb-4">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl"><Award size={20} /></span>
            1. 체류 깊이에 따른 5단계 방문 가중치
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Regionevel에서는 특정 시·군·구 도시 행정구역에 대해 단순 경유부터 장기 거주까지 5가지 구체적 스코어링 옵션을 제공합니다.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 hover:border-slate-400/40 transition-all space-y-2">
              <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-bold text-xs">1단계: 통과 (Pass)</span>
              <p className="text-xs text-slate-300">기차나 차창 밖으로 지역을 통과했거나 이동 경로 상 지나친 단계</p>
            </div>

            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 hover:border-blue-400/40 transition-all space-y-2">
              <span className="inline-block px-2.5 py-1 rounded-lg bg-blue-900/60 text-blue-300 font-bold text-xs">2단계: 환승 (Transit)</span>
              <p className="text-xs text-slate-300">공항 터미널이나 기차역 환승을 위해 짧은 시간 체류한 단계</p>
            </div>

            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 hover:border-emerald-400/40 transition-all space-y-2">
              <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-900/60 text-emerald-300 font-bold text-xs">3단계: 방문 (Visit)</span>
              <p className="text-xs text-slate-300">명소 관광, 식사, 도보 탐방 등 해당 지역의 매력을 직접 체험한 단계</p>
            </div>

            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 hover:border-purple-400/40 transition-all space-y-2">
              <span className="inline-block px-2.5 py-1 rounded-lg bg-purple-900/60 text-purple-300 font-bold text-xs">4단계: 숙박 (Stay)</span>
              <p className="text-xs text-slate-300">해당 행정구역 내에서 1박 이상의 밤을 보내며 일상을 경험한 단계</p>
            </div>

            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 hover:border-amber-400/40 transition-all sm:col-span-2 space-y-2">
              <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-900/60 text-amber-300 font-bold text-xs">5단계: 거주 (Residence)</span>
              <p className="text-xs text-slate-300">유학, 워킹홀리데이, 장기 거주 또는 생활 터전으로 삼았던 깊이 있는 경험</p>
            </div>
          </div>
        </section>

        {/* RATE vs EXP */}
        <section className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-2xl font-extrabold text-white font-heading flex items-center gap-3 border-b border-white/10 pb-4">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl"><Layers size={20} /></span>
            2. RATE (방문율) vs EXP (경험치) 메커니즘
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-slate-950/60 border border-emerald-500/20 space-y-2">
              <h3 className="text-lg font-bold text-emerald-400">RATE (%)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                전체 대상 지자체 중 내가 최소 1회 이상 발을 내딛은 행정구역의 면적 및 개수 지수입니다. 예컨대 일본 47개 도도부현 중 25개 구역을 방문했다면 RATE 53.1%를 달성합니다.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950/60 border border-emerald-500/20 space-y-2">
              <h3 className="text-lg font-bold text-emerald-400">EXP (Points)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                단순 방문 여부를 넘어 방문 깊이 가중치의 합산 누적 포인트입니다. 숙박과 거주 기록이 누적될수록 세계 지도상에서 투명도가 점차 밝아지고 정교한 2톤 오렌지/블루 컬러 레이어로 채색됩니다.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Tool Box */}
        <div className="rounded-3xl bg-gradient-to-br from-emerald-950/80 via-slate-900 to-teal-950/80 p-8 border border-emerald-500/30 space-y-4 text-center">
          <h3 className="text-2xl font-extrabold text-white font-heading">Regionevel에서 나만의 글로벌 히트맵 열기</h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            전 세계 국가와 시·군·구 행정구역 다각형 경계를 인터랙티브 지도로 시각화하여 내 여행 경험치를 대시보드로 확인하세요.
          </p>
          <div className="pt-2">
            <a 
              href="https://rgnevel.pplaner.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm transition-all shadow-xl shadow-emerald-500/25 transform hover:scale-105"
            >
              Regionevel 글로벌 등급 지도 실행하기 <ExternalLink size={16} />
            </a>
          </div>
        </div>

      </div>
    </main>
  );
}
