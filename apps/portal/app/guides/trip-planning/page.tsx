import React from 'react';
import { constructMetadata } from '@ppotal/ui';
import { Plane, ExternalLink, ArrowLeft, Calendar, Shield, Users, Sparkles, ChevronRight } from 'lucide-react';

export const metadata = constructMetadata({
  title: '동행 구인부터 동선 최적화까지: 스마트 여행 계획법 - PPLANER Guides',
  description: 'AI 동선 최적화, 예산 체크리스트 작성, 실시간 동행 네트워크 활용법을 담은 PPLANER 스마트 여행 계획수립 가이드입니다.',
  url: 'https://www.pplaner.com/guides/trip-planning',
});

export default function TripPlanningGuidePage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      
      {/* Header Glass Card */}
      <div className="relative overflow-hidden rounded-[32px] p-8 sm:p-12 border border-white/10 bg-slate-900/60 backdrop-blur-2xl shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <a href="/guides" className="inline-flex items-center gap-1.5 text-xs text-purple-400 font-bold hover:underline bg-purple-500/10 px-3 py-1.5 rounded-xl border border-purple-500/20">
            <ArrowLeft size={14} /> 가이드 센터 홈으로
          </a>
          <span className="text-xs text-slate-400 font-medium">7분 읽기 · 2026.07.20</span>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold w-fit">
          <Plane size={14} /> 여행 일정 설계 가이드
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-heading leading-tight">
          동행 구인부터 동선 최적화까지: 스마트 여행 계획법
        </h1>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed border-t border-white/10 pt-4">
          설레는 여정의 시작은 꼼꼼한 계획에서 비롯됩니다. 하지만 수많은 블로그 후기와 무분별한 지도 핀 찍기에 의존하다 보면 이동 동선이 꼬이거나 현지에서 예상치 못한 지출과 시간 허비에 직면하기 쉽습니다.
        </p>
      </div>

      {/* Main Glass Container */}
      <div className="rounded-[32px] p-8 sm:p-12 border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl space-y-10 text-slate-200">
        
        {/* Step Process */}
        <section className="space-y-4">
          <h2 className="text-2xl font-extrabold text-white font-heading flex items-center gap-3 border-b border-white/10 pb-4">
            <span className="p-2 bg-purple-500/20 text-purple-400 rounded-xl"><Calendar size={20} /></span>
            1. 성공적인 여행 일정을 세우는 4단계 프로세스
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 hover:border-purple-500/40 transition-all space-y-2">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-purple-500 text-white flex items-center justify-center font-black text-sm shadow-md shadow-purple-500/30">1</span>
                <h3 className="font-extrabold text-white text-base">거점 도시 & 이동 간선 확정</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">숙소를 중심으로 일별 주요 거점 노선을 확정합니다. 철도 또는 대중교통 이동 시간이 3시간을 초과하지 않도록 1일 이동 거리를 최적화합니다.</p>
            </div>

            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 hover:border-purple-500/40 transition-all space-y-2">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-purple-500 text-white flex items-center justify-center font-black text-sm shadow-md shadow-purple-500/30">2</span>
                <h3 className="font-extrabold text-white text-base">세부 일정 및 유연한 버퍼</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">입장 대기 시간이나 예상 식사 시간을 고려해 스케줄 간 30분~1시간의 버퍼 시간을 설정하여 현지 변수에 대비합니다.</p>
            </div>

            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 hover:border-purple-500/40 transition-all space-y-2">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-purple-500 text-white flex items-center justify-center font-black text-sm shadow-md shadow-purple-500/30">3</span>
                <h3 className="font-extrabold text-white text-base">예산 수립 및 공동 경비 산정</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">교통비, 숙박비, 현지 입장료, 식비를 카테고리별로 분할하고 동행자가 있는 경우 정산 비율을 사전에 합의합니다.</p>
            </div>

            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 hover:border-purple-500/40 transition-all space-y-2">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-purple-500 text-white flex items-center justify-center font-black text-sm shadow-md shadow-purple-500/30">4</span>
                <h3 className="font-extrabold text-white text-base">체크리스트 사전 점검</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">여권 만료일, 비자(eTA/VJW 등), 데이터 eSIM, 해외결제 카드 카테고리를 미리 점검합니다.</p>
            </div>
          </div>
        </section>

        {/* Companion Safety Callout */}
        <section className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-2xl font-extrabold text-white font-heading flex items-center gap-3 border-b border-white/10 pb-4">
            <span className="p-2 bg-purple-500/20 text-purple-400 rounded-xl"><Shield size={20} /></span>
            2. 안전하고 편리한 실시간 동행 구인 네트워크
          </h2>
          <div className="bg-slate-950/60 p-6 rounded-2xl border border-purple-500/30 space-y-3">
            <h3 className="text-base font-bold text-purple-400 flex items-center gap-2">
              <Users size={18} /> PPLANER 안전 동행 수칙
            </h3>
            <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-slate-300">
              <li>상대방의 PPLANER 인증 상태 및 이전 여행 레벨 아카이브를 확인하세요.</li>
              <li>첫 만남은 유동인구가 많은 공공장소나 목적지 현장에서 진행하세요.</li>
              <li>공동 경비 정산 내역은 플래너 앱 내의 공동 장부 기능을 활용하여 투명하게 공유하세요.</li>
            </ul>
          </div>
        </section>

        {/* CTA Box */}
        <div className="rounded-3xl bg-gradient-to-br from-purple-950/80 via-slate-900 to-indigo-950/80 p-8 border border-purple-500/30 space-y-4 text-center">
          <h3 className="text-2xl font-extrabold text-white font-heading">PPLANER AI 플래너 실행하기</h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            여행 동선 최적화, 예산 분배 및 실시간 동행 구인을 한곳에서 시작해보세요.
          </p>
          <div className="pt-2">
            <a 
              href="https://app.pplaner.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-extrabold text-sm transition-all shadow-xl shadow-purple-500/25 transform hover:scale-105"
            >
              PPLANER AI 일정 플래너 열기 <ExternalLink size={16} />
            </a>
          </div>
        </div>

      </div>
    </main>
  );
}
