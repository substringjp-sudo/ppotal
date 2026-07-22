import React from 'react';
import { constructMetadata } from '@ppotal/ui';
import { Map, Layers, Award, Sparkles, ArrowLeft, ExternalLink, ChevronRight, Globe, Navigation } from 'lucide-react';

export const metadata = constructMetadata({
  title: '행정구역 단위 여행 기록: Regionevel 세부 지자체 탐험 & EXP 등급 산정 가이드 - PPLANER',
  description: '단순 국가 방문을 넘어서는 1차/2차 행정구역(State, Province, City) 추적 방법론과 RATE(방문율 %) 및 EXP(경험치) 레벨링 계산법, 시군구 단위 도장 깨기 노하우를 소개합니다.',
  url: 'https://www.pplaner.com/guides/regionevel',
});

export default function RegionevelGuidePage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      
      {/* Article Header Card */}
      <div className="relative overflow-hidden rounded-[32px] p-8 sm:p-12 border border-white/10 bg-slate-900/60 backdrop-blur-2xl shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <a
            href="/guides"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold hover:underline bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20"
          >
            <ArrowLeft size={14} /> 가이드 센터 홈으로
          </a>
          <span className="text-xs text-slate-400 font-medium">8분 읽기 · 2026.07.20</span>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold w-fit">
          <Map size={14} /> 행정구역 아카이브 가이드
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-heading leading-tight">
          행정구역 단위 여행 기록: Regionevel 세부 지자체 탐험 &amp; EXP 등급 산정 가이드
        </h1>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed border-t border-white/10 pt-4">
          공항이나 수도 한 곳만 거쳐간 여행과 해당 국가의 여러 시·도, 군·구 지방 행정구역을 두루 밟은 깊이 있는 여정은 가치가 다릅니다. Regionevel은 세계 지리 데이터를 1차/2차 행정 단위로 정밀하게 쪼개어 나만의 리얼 방문 등급과 경험치를 시각화해주는 가중치 아카이빙 플랫폼입니다.
        </p>
      </div>

      {/* Main Content Sections */}
      <div className="rounded-[32px] p-8 sm:p-12 border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl space-y-10 text-slate-200">
        
        {/* Section 1 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-extrabold text-white font-heading flex items-center gap-3 border-b border-white/10 pb-4">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Globe size={20} />
            </span>
            1. 왜 국가 단위가 아닌 행정구역(Administrative Boundary)인가?
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            "일본에 3번 다녀왔다"는 사실만으로는 일본의 어디를 얼마만큼 깊이 있게 탐험했는지 알 수 없습니다. 도쿄 수도권만 머문 사람과 홋카이도, 간사이, 큐슈, 오키나와의 현(Prefecture) 단위 지자체를 도장 깨기 하듯 탐방한 사람의 스펙트럼은 완전히 다릅니다.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            Regionevel은 전 세계를 1차 행정구역(State, Province, Region, 도/현) 및 2차 행정구역(County, City, District, 시/군/구) 레이어로 정밀 구조화하여 단순한 '국가 칠하기'를 뛰어넘어 진정한 자발적 지리 탐험의 재미를 선사합니다.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-2xl font-extrabold text-white font-heading flex items-center gap-3 border-b border-white/10 pb-4">
            <span className="p-2 bg-teal-500/20 text-teal-400 rounded-xl">
              <Award size={20} />
            </span>
            2. RATE(방문율 %)와 EXP(경험치) 등급 공식
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Regionevel의 레벨링 시스템은 체류 품질과 깊이를 반영하도록 다음과 같은 엄격한 상태 체계를 갖추고 있습니다:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 hover:border-emerald-500/40 transition-all space-y-2">
              <h3 className="font-extrabold text-emerald-400 text-base">🏠 Live (거주 경험) · 최고 가중치</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                해당 지자체에서 6개월 이상 거주하며 일상과 문화를 체험한 지역입니다. 가장 높은 EXP 포인트를 획득하며 정체성 카드로 인정됩니다.
              </p>
            </div>
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 hover:border-teal-500/40 transition-all space-y-2">
              <h3 className="font-extrabold text-teal-400 text-base">🛌 Stay (숙박 체류) · 높은 가중치</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                최소 1박 이상 머물며 밤낮의 경관과 음식을 즐긴 지역입니다. 당일치기 통과와 차별화되는 실질적 로컬 점수를 받습니다.
              </p>
            </div>
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 hover:border-cyan-500/40 transition-all space-y-2">
              <h3 className="font-extrabold text-cyan-400 text-base">🚶 Visit (당일 방문) · 기초 가중치</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                관광지 방문, 식사, 하차 점검 등 수 시간 이상 머무르며 지자체 요소를 탐방한 기록입니다.
              </p>
            </div>
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 hover:border-blue-500/40 transition-all space-y-2">
              <h3 className="font-extrabold text-blue-400 text-base">🚆 Transit (단순 환승/경유) · 최소 포인트</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                기차 환승이나 환승 공항, 환승 휴게소 이용 등 이동 과정 중 거쳐간 영역입니다.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-2xl font-extrabold text-white font-heading flex items-center gap-3 border-b border-white/10 pb-4">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Layers size={20} />
            </span>
            3. 인터랙티브 히트맵 구축 및 아카이빙 공유법
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Regionevel에 기록을 등록하면 실시간으로 내 개별 전 세계 방문율 RATE(%)와 대륙별/국가별 세부 도색 히트맵(Heatmap)이 자동 생성됩니다.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            차별화된 등급 배지와 인터랙티브 지도를 이미지로 내보내거나 커뮤니티, 블로그, SNS에 공유하여 본인만의 독보적인 글로벌 여행 이력을 자랑할 수 있습니다.
          </p>
        </section>

        {/* Section 4 Interlinks */}
        <section className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-2xl font-extrabold text-white font-heading">관련 여행 가이드 및 추천 읽을거리</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="/guides/japan-rail"
              className="group p-5 rounded-2xl bg-gradient-to-r from-sky-500/10 to-blue-500/5 border border-sky-500/30 hover:border-sky-500/60 transition-all flex items-center justify-between"
            >
              <div className="space-y-1">
                <span className="text-xs text-sky-400 font-bold uppercase">일본 철도 노선망</span>
                <h4 className="font-extrabold text-white text-base group-hover:text-sky-400 transition-colors">JR 6사와 주요 사철 계층 완전 해설</h4>
              </div>
              <ChevronRight size={18} className="text-sky-400 transform group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="/guides/beforeglow"
              className="group p-5 rounded-2xl bg-gradient-to-r from-orange-500/10 to-amber-500/5 border border-orange-500/30 hover:border-orange-500/60 transition-all flex items-center justify-between"
            >
              <div className="space-y-1">
                <span className="text-xs text-orange-400 font-bold uppercase">노을 예측 가이드</span>
                <h4 className="font-extrabold text-white text-base group-hover:text-orange-400 transition-colors">BeforeGlow 대기 산란 및 골든아워 촬영</h4>
              </div>
              <ChevronRight size={18} className="text-orange-400 transform group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </section>

        {/* Sub-app CTA Banner */}
        <div className="rounded-3xl bg-gradient-to-br from-emerald-950/80 via-slate-900 to-teal-950/80 p-8 border border-emerald-500/30 space-y-4 text-center">
          <h3 className="text-2xl font-extrabold text-white font-heading">
            Regionevel로 내 방문 지자체 레벨 측정하기
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            전 세계 200여 개 국가와 5,000개 이상의 행정 구역 중 내가 가본 곳을 체크하고 나만의 등급 카드와 히트맵을 생성해보세요.
          </p>
          <div className="pt-2">
            <a
              href="https://rgnevel.pplaner.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm transition-all shadow-xl shadow-emerald-500/25 transform hover:scale-105"
            >
              Regionevel 서비스 실행하기 <ExternalLink size={16} />
            </a>
          </div>
        </div>

      </div>
    </main>
  );
}
