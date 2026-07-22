import React from 'react';
import { constructMetadata } from '@ppotal/ui';
import { BookOpen, Train, Map, Plane, CreditCard, Compass, ArrowRight, Sparkles, Star } from 'lucide-react';

export const metadata = constructMetadata({
  title: '여행 아티클 & 철도 가이드 센터 - PPLANER Knowledge Hub',
  description: '일본 철도망 완벽 해설, JR 패스 비교 분석, 세계 여행 등급 기록법 및 스마트 일정 설계 노하우를 담은 PPLANER 가이드 아티클 모음입니다.',
  url: 'https://www.pplaner.com/guides',
});

const articles = [
  {
    slug: 'japan-rail',
    title: '일본 철도망 완전 가이드: JR 6사와 주요 사철 계층 분석',
    description: '신칸센부터 재래선, 도시 지하철 및 대형 사철까지! 일본 전역을 연결하는 복잡한 철도 네트워크의 계층 구조와 탑승 기록 아카이빙 노하우를 깊이 있게 알아봅니다.',
    category: '일본 철도',
    readTime: '8분 읽기',
    icon: Train,
    accentColor: '#1c74e9',
    badgeBg: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
    hoverGlow: 'hover:shadow-[0_20px_50px_rgba(28,116,233,0.25)]',
    isFeatured: true,
  },
  {
    slug: 'world-travel-log',
    title: '세계 여행 기록과 RATE·EXP 등급 시스템 활용법',
    description: '내가 발을 디딘 국가와 시·군·구 지자체를 정밀 추적하고 거주·숙박·방문 가중치 기반으로 나만의 여행 히트맵과 레벨을 빌드하는 법.',
    category: '글로벌 아카이브',
    readTime: '6분 읽기',
    icon: Map,
    accentColor: '#2ecc71',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    hoverGlow: 'hover:shadow-[0_20px_50px_rgba(46,204,113,0.25)]',
  },
  {
    slug: 'regionevel',
    title: '행정구역 단위 여행 기록: Regionevel 세부 지자체 탐험 & EXP 등급 산정 가이드',
    description: '단순 국가 방문을 넘어서는 1차/2차 행정구역(State, Province, City) 추적 방법론과 RATE(방문율 %) 및 EXP(경험치) 레벨링 계산법.',
    category: '행정구역 탐험',
    readTime: '8분 읽기',
    icon: Map,
    accentColor: '#10b981',
    badgeBg: 'bg-teal-500/10 border-teal-500/30 text-teal-400',
    hoverGlow: 'hover:shadow-[0_20px_50px_rgba(16,185,129,0.25)]',
  },
  {
    slug: 'beforeglow',
    title: '전 세계 노을·트와일라잇 예보: BeforeGlow 대기 산란 및 골든아워 촬영 가이드',
    description: '대기 산란(Rayleigh Scattering) 원리와 습도·구름 고도 기반 노을 지수(Sky Glow Index) 계산법, 석양 및 트와일라잇 촬영 전략.',
    category: '노을 & 대기 예측',
    readTime: '7분 읽기',
    icon: Sparkles,
    accentColor: '#f97316',
    badgeBg: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    hoverGlow: 'hover:shadow-[0_20px_50px_rgba(249,115,22,0.25)]',
  },
  {
    slug: 'trip-planning',
    title: '동행 구인부터 동선 최적화까지: 스마트 여행 계획법',
    description: 'AI 알고리즘과 수치 검증을 활용하여 여행 일정의 동선 낭비를 줄이고, 실시간 동행자를 안전하게 만나 완벽한 여정을 세우는 정석 프로세스.',
    category: '일정 플래닝',
    readTime: '7분 읽기',
    icon: Plane,
    accentColor: '#a855f7',
    badgeBg: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    hoverGlow: 'hover:shadow-[0_20px_50px_rgba(168,85,247,0.25)]',
  },
  {
    slug: 'jr-pass',
    title: 'JR 패스 완전 정복: 전국권 vs 지역 패스 가성비 비교',
    description: '가격 개편 이후 손해 보지 않는 패스 선택 기준과 JR 동일본, 서일본, 큐슈 지역 패스 추천 탑승 노선 집중 가이드.',
    category: '패스 가성비',
    readTime: '6분 읽기',
    icon: CreditCard,
    accentColor: '#f59e0b',
    badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    hoverGlow: 'hover:shadow-[0_20px_50px_rgba(245,158,11,0.25)]',
  },
  {
    slug: 'shinkansen',
    title: '일본 신칸센 총정리: 노선별 특색과 지정석 예약 팁',
    description: '도카이도·산요·도호쿠·호쿠리쿠 신칸센 등 각 노선별 특성과 노조미·하야부사 차종별 차이점, 특대 수하물 예약 팁.',
    category: '신칸센 전문',
    readTime: '6분 읽기',
    icon: Compass,
    accentColor: '#f43f5e',
    badgeBg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
    hoverGlow: 'hover:shadow-[0_20px_50px_rgba(244,63,94,0.25)]',
  },
];

export default function GuidesIndexPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-[32px] p-8 sm:p-14 border border-white/10 bg-slate-900/60 backdrop-blur-2xl shadow-2xl text-center space-y-6">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-500/20 rounded-full filter blur-[100px] pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sky-400 text-xs font-bold tracking-wider uppercase backdrop-blur-md">
          <Sparkles size={14} className="animate-pulse" /> PPLANER KNOWLEDGE HUB
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-heading text-white max-w-3xl mx-auto leading-tight">
          여행자를 위한 정밀 아티클 & 지식 라이브러리
        </h1>

        <p className="text-slate-300 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
          실제 철도 데이터, 지자체 경계 지도, 대기 산란 예측 공식을 토대로 작성된 PPLANER 전문 아티클입니다. 깊이 있는 여행 정보와 아카이빙 노하우를 탐색해보세요.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-slate-400">
          <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-1.5">
            <Star size={12} className="text-amber-400" /> 데이터 검증 완료
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
            총 7개 전문 아티클
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
            주간 가이드 업데이트
          </span>
        </div>
      </div>

      {/* Article Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {articles.map((art) => {
          const IconComponent = art.icon;
          return (
            <a
              key={art.slug}
              href={`/guides/${art.slug}`}
              className={`group relative rounded-[32px] p-8 border border-white/10 bg-slate-900/40 hover:bg-slate-900/80 backdrop-blur-xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col justify-between space-y-6 ${art.hoverGlow}`}
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold ${art.badgeBg}`}>
                    <IconComponent size={14} /> {art.category}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">{art.readTime}</span>
                </div>

                <h2 className="text-2xl font-extrabold text-white group-hover:text-sky-400 transition-colors font-heading leading-snug">
                  {art.title}
                </h2>

                <p className="text-sm text-slate-300 leading-relaxed">
                  {art.description}
                </p>
              </div>

              <div className="pt-6 border-t border-white/10 flex items-center justify-between text-xs text-sky-400 font-bold group-hover:text-sky-300">
                <span className="flex items-center gap-2">
                  아티클 전체 읽기
                </span>
                <div className="w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-all">
                  <ArrowRight size={14} className="transform group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </a>
          );
        })}
      </div>

    </main>
  );
}
