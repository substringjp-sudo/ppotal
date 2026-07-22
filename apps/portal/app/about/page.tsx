import React from 'react';
import { constructMetadata } from '@ppotal/ui';
import { Info, Train, Map, Sun, Plane, ExternalLink, Globe2, Sparkles, Compass, ShieldCheck, BookOpen } from 'lucide-react';

export const metadata = constructMetadata({
  title: '서비스 소개 (About Us) - PPLANER 통합 여행 포털',
  description: 'PPLANER는 일본 철도 아카이브, 세계 방문 등급 지도, 노을 예측 및 AI 일정 설계를 하나로 통합한 차세대 프리미엄 여행 정보 플랫폼입니다.',
  url: 'https://www.pplaner.com/about',
});

const subApps = [
  {
    name: 'JapanRailNote',
    domain: 'jprail.pplaner.com',
    url: 'https://jprail.pplaner.com',
    guideUrl: '/guides/japan-rail',
    guideText: '일본 철도망 전문 가이드 아티클',
    tagline: '일본 철도망 전문 데이터베이스 & 완승 기록기',
    description: 'JR 6사와 주요 사철, 신칸센, 노면전차의 노선도 및 역 간 거리 지도를 시각화하고, 이용 노선의 완승률(%) 통계를 산출합니다.',
    icon: Train,
    accent: 'from-sky-500 to-blue-600',
    borderColor: 'border-sky-500/30',
    badgeColor: 'bg-sky-500/10 text-sky-400',
  },
  {
    name: 'Regionevel',
    domain: 'rgnevel.pplaner.com',
    url: 'https://rgnevel.pplaner.com',
    guideUrl: '/guides/regionevel',
    guideText: '행정구역 탐험 & EXP 가이드 아티클',
    tagline: '글로벌 행정구역 방문 등급 & 경험치 지수',
    description: '전 세계 국가와 시·군·구 단위 행정구역에 대해 거주·숙박·방문 5단계 가중치 점수를 부여하여 나만의 글로브 히트맵을 생성합니다.',
    icon: Map,
    accent: 'from-emerald-500 to-teal-600',
    borderColor: 'border-emerald-500/30',
    badgeColor: 'bg-emerald-500/10 text-emerald-400',
  },
  {
    name: 'BeforeGlow',
    domain: 'bglow.pplaner.com',
    url: 'https://bglow.pplaner.com',
    guideUrl: '/guides/beforeglow',
    guideText: '노을 대기 산란 & 골든아워 가이드 아티클',
    tagline: '대기 산란 기반 일몰 노을 품질 예측',
    description: '구름 수직 고도, 습도, 대기 질 수치를 계산하여 여행지에서의 노을 황홀도를 사전 예측해줍니다.',
    icon: Sun,
    accent: 'from-orange-500 to-amber-600',
    borderColor: 'border-orange-500/30',
    badgeColor: 'bg-orange-500/10 text-orange-400',
  },
  {
    name: 'PPLANER AI',
    domain: 'app.pplaner.com',
    url: 'https://app.pplaner.com',
    guideUrl: '/guides/trip-planning',
    guideText: '스마트 여행 계획 & 동행 가이드 아티클',
    tagline: '실시간 여행 일정 설계 및 동행 매칭 네트워크',
    description: '동선 최적화, 경비 분배 및 실시간 여행 동행자를 만날 수 있는 통합 일정 앱 서비스입니다.',
    icon: Plane,
    accent: 'from-purple-500 to-indigo-600',
    borderColor: 'border-purple-500/30',
    badgeColor: 'bg-purple-500/10 text-purple-400',
  },
];

export default function AboutPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-[32px] p-8 sm:p-14 border border-white/10 bg-slate-900/60 backdrop-blur-2xl shadow-2xl text-center space-y-6">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-500/20 rounded-full filter blur-[100px] pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sky-400 text-xs font-bold tracking-wider uppercase backdrop-blur-md">
          <Globe2 size={14} /> ABOUT PPLANER
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-heading text-white max-w-3xl mx-auto leading-tight">
          여행의 기록과 설계를 하나로 연결하는<br className="hidden sm:inline" /> 프리미엄 여행 플랫폼
        </h1>

        <p className="text-slate-300 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
          PPLANER(피플래너)는 주먹구구식 단순 블로그 정보의 한계를 넘어, 고정밀 지리정보와 실시간 네트워크 기술로 여행자의 모든 순간을 가치 있게 아카이빙합니다.
        </p>
      </div>

      {/* 4 Core Sub-Apps Grid */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
            PPLANER 4대 하위 전문 서비스
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            각 목적에 특화된 서브도메인을 통해 전문화된 아카이브 도구와 가이드를 제공합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subApps.map((app) => {
            const IconComponent = app.icon;
            return (
              <div
                key={app.name}
                className={`rounded-[32px] p-8 border ${app.borderColor} bg-slate-900/40 hover:bg-slate-900/80 backdrop-blur-xl transition-all duration-300 flex flex-col justify-between space-y-6 group hover:-translate-y-1`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${app.accent} text-white shadow-lg`}>
                      <IconComponent size={22} />
                    </div>
                    <span className={`px-3 py-1 rounded-xl text-xs font-bold border border-white/10 ${app.badgeColor}`}>
                      {app.domain}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl font-extrabold text-white font-heading group-hover:text-sky-400 transition-colors">
                      {app.name}
                    </h3>
                    <p className="text-xs text-sky-400 font-semibold mt-1">
                      {app.tagline}
                    </p>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {app.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <a
                    href={app.guideUrl}
                    className="inline-flex items-center gap-1.5 font-bold text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    <BookOpen size={14} /> {app.guideText}
                  </a>
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-extrabold text-white hover:text-sky-400 transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10"
                  >
                    웹앱 오픈하기 <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vision Section */}
      <div className="rounded-[32px] p-8 sm:p-12 border border-white/10 bg-slate-900/40 backdrop-blur-xl space-y-6 text-slate-200">
        <h2 className="text-2xl font-extrabold text-white font-heading flex items-center gap-3">
          <ShieldCheck className="text-sky-400" size={24} /> PPLANER의 핵심 가치와 검증
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs sm:text-sm">
          <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 space-y-2">
            <h3 className="font-bold text-white text-base">데이터 신뢰성</h3>
            <p className="text-slate-300">공식 철도청 운임표 및 지자체 행정구역 경계선 데이터를 기반으로 오차 없는 정확한 통계를 도출합니다.</p>
          </div>
          <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 space-y-2">
            <h3 className="font-bold text-white text-base">유연한 아카이빙</h3>
            <p className="text-slate-300">모바일과 데스크톱 어디서나 실시간 동기화되는 Firebase 인프라 상에서 기록을 보존합니다.</p>
          </div>
          <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 space-y-2">
            <h3 className="font-bold text-white text-base">투명성 & 사용자 보호</h3>
            <p className="text-slate-300">엄격한 개인정보보호 준수 및 광고 투명성 가이드라인을 이행하여 안심하고 이용할 수 있는 환경을 만듭니다.</p>
          </div>
        </div>
      </div>

    </main>
  );
}
