import React from 'react';
import { constructMetadata } from '@ppotal/ui';
import { Sun, CloudSun, Camera, Sparkles, ArrowLeft, ExternalLink, ChevronRight, Compass, Eye } from 'lucide-react';

export const metadata = constructMetadata({
  title: '전 세계 노을·트와일라잇 예보: BeforeGlow 대기 산란 및 골든아워 촬영 가이드 - PPLANER',
  description: '대기 산란(Rayleigh Scattering) 과학적 원리와 습도·구름 고도 기반 노을 지수(Sky Glow Index) 계산법, 전 세계 석양 및 트와일라잇 매직아워 촬영 전략을 소개합니다.',
  url: 'https://www.pplaner.com/guides/beforeglow',
});

export default function BeforeGlowGuidePage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      
      {/* Article Header Card */}
      <div className="relative overflow-hidden rounded-[32px] p-8 sm:p-12 border border-white/10 bg-slate-900/60 backdrop-blur-2xl shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <a
            href="/guides"
            className="inline-flex items-center gap-1.5 text-xs text-orange-400 font-bold hover:underline bg-orange-500/10 px-3 py-1.5 rounded-xl border border-orange-500/20"
          >
            <ArrowLeft size={14} /> 가이드 센터 홈으로
          </a>
          <span className="text-xs text-slate-400 font-medium">7분 읽기 · 2026.07.20</span>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold w-fit">
          <Sun size={14} /> 노을 & 대기 예측 가이드
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-heading leading-tight">
          전 세계 노을·트와일라잇 예보: BeforeGlow 대기 산란 및 골든아워 촬영 가이드
        </h1>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed border-t border-white/10 pt-4">
          여행지에서의 석양은 찰나의 시간이지만, 태양광이 대기를 통과하며 만드는 빛의 붉은 스펙트럼은 철저한 수치 예측이 가능한 자연 현상입니다. BeforeGlow는 구름 고도, 미세먼지 시정, 습도 데이터와 산란 공식을 결합하여 최고의 노을 붉음 지수(Sky Glow Index)를 계산해드립니다.
        </p>
      </div>

      {/* Main Content Sections */}
      <div className="rounded-[32px] p-8 sm:p-12 border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl space-y-10 text-slate-200">
        
        {/* Section 1 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-extrabold text-white font-heading flex items-center gap-3 border-b border-white/10 pb-4">
            <span className="p-2 bg-orange-500/20 text-orange-400 rounded-xl">
              <Sun size={20} />
            </span>
            1. 붉게 타오르는 석양의 과학: 레일리 산란과 미 산란
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            낮 시간 동안 대기를 통과하는 태양 빛은 짧은 파장의 파란색 빛이 강하게 산란(Rayleigh Scattering)되어 하늘이 파랗게 보입니다. 반면 일몰 직전에는 태양 고도가 낮아지며 빛이 통과해야 하는 대기 투과 거리가 약 10배 이상 길어집니다. 파란 빛은 도중에 모두 산란하여 소멸하고, 파장이 긴 붉은색·주황색 영역의 스펙트럼만이 지표면에 도달하게 됩니다.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            여기에 대기 중 적절한 미세 수적(물방울)이나 미세 에어로졸 입자가 존재하면 빛의 미 산란(Mie Scattering) 현상이 겹쳐 하늘 전체가 웅장한 보라색, 핑크색 트와일라잇 스펙트럼으로 붉게 물들게 됩니다.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-2xl font-extrabold text-white font-heading flex items-center gap-3 border-b border-white/10 pb-4">
            <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <CloudSun size={20} />
            </span>
            2. BeforeGlow Sky Glow Index (노을 지수) 산정 공식
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            BeforeGlow 알고리즘은 단순히 구름 양만 측정하지 않고, 노을의 질을 결정짓는 4가지 기상 요소를 수치화합니다:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 hover:border-orange-500/40 transition-all space-y-2">
              <h3 className="font-extrabold text-orange-400 text-base">상층/중층 구름 비율 (30~70%)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                하늘을 가리는 저층 먹구름은 일몰 빛을 막지만, 6km 이상의 고층 권운·권적운은 수평으로 들어오는 붉은 태양광을 반사하여 장엄한 야경 노을을 완성합니다.
              </p>
            </div>
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 hover:border-amber-500/40 transition-all space-y-2">
              <h3 className="font-extrabold text-amber-400 text-base">대기 투과 시정 &amp; 습도 (Relative Humidity)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                습도가 40~65% 구간이고 대기 시정(Visibility)이 20km 이상으로 투명할 때 산란된 빛이 뭉개지지 않고 선명한 단풍빛 그러데이션을 유지합니다.
              </p>
            </div>
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 hover:border-yellow-500/40 transition-all space-y-2">
              <h3 className="font-extrabold text-yellow-400 text-base">서쪽 지평선 개활도 (Horizon Clearance)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                관측 지점 기준 서쪽 100~300km 부근 지평선에 구름 띠가 없어야 태양빛이 차단되지 않고 구름 밑면을 강하게 때릴 수 있습니다.
              </p>
            </div>
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 hover:border-rose-500/40 transition-all space-y-2">
              <h3 className="font-extrabold text-rose-400 text-base">에어로졸 수치 (AOD Index)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                적절한 청정 먼지 입자는 빛의 확산을 돕지만, 과도한 미세먼지는 빛을 흡수하여 황톳빛의 탁한 하늘을 유발하므로 밸런스 검정이 필수적입니다.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-2xl font-extrabold text-white font-heading flex items-center gap-3 border-b border-white/10 pb-4">
            <span className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
              <Camera size={20} />
            </span>
            3. 골든아워 &amp; 매직아워 타임라인과 사진 촬영 팁
          </h2>
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-white/5 space-y-1">
              <h4 className="font-bold text-orange-300 text-sm">🌇 1단계: 골든아워 (Golden Hour, 일몰 40분 전 ~ 일몰 직전)</h4>
              <p className="text-xs text-slate-300">태양 고도가 6도 이하로 내려가며 모든 건축물과 피사체가 따뜻하고 풍성한 황금색 감성 빛으로 물듭니다. 역광 인물 사진 및 건축물 입체감 촬영에 최고입니다.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-white/5 space-y-1">
              <h4 className="font-bold text-pink-300 text-sm">🌆 2단계: 붉은 잔광 (Afterglow, 일몰 후 0~15분)</h4>
              <p className="text-xs text-slate-300">태양이 지평선 아래로 넘어간 직후, 하늘의 구름 밑면이 가장 선명한 강렬한 붉은색과 주황색으로 터지는 순간입니다. 삼각대 장착 후 조리개를 F8 정도로 조여 촬영하세요.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-white/5 space-y-1">
              <h4 className="font-bold text-purple-300 text-sm">🌌 3단계: 매직아워 / 블루아워 (Magic Hour, 일몰 후 15~35분)</h4>
              <p className="text-xs text-slate-300">하늘 상층부는 코발트 블루로 어두워지고 지평선 근처는 딥 핑크·주황 빛이 남아 최고 연색성을 자랑합니다. 도시 조명이 들어오는 시점과 맞아떨어져 야경 사진의 정점을 찍습니다.</p>
            </div>
          </div>
        </section>

        {/* Section 4 Interlinks */}
        <section className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-2xl font-extrabold text-white font-heading">관련 여행 가이드 및 추천 읽을거리</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="/guides/world-travel-log"
              className="group p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-500/30 hover:border-emerald-500/60 transition-all flex items-center justify-between"
            >
              <div className="space-y-1">
                <span className="text-xs text-emerald-400 font-bold uppercase">글로벌 아카이브</span>
                <h4 className="font-extrabold text-white text-base group-hover:text-emerald-400 transition-colors">세계 여행 기록과 RATE·EXP 등급 시스템</h4>
              </div>
              <ChevronRight size={18} className="text-emerald-400 transform group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="/guides/trip-planning"
              className="group p-5 rounded-2xl bg-gradient-to-r from-purple-500/10 to-indigo-500/5 border border-purple-500/30 hover:border-purple-500/60 transition-all flex items-center justify-between"
            >
              <div className="space-y-1">
                <span className="text-xs text-purple-400 font-bold uppercase">스마트 일자별 플래닝</span>
                <h4 className="font-extrabold text-white text-base group-hover:text-purple-400 transition-colors">동행 구인부터 동선 최적화 일정 프로세스</h4>
              </div>
              <ChevronRight size={18} className="text-purple-400 transform group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </section>

        {/* Sub-app CTA Banner */}
        <div className="rounded-3xl bg-gradient-to-br from-orange-950/80 via-slate-900 to-amber-950/80 p-8 border border-orange-500/30 space-y-4 text-center">
          <h3 className="text-2xl font-extrabold text-white font-heading">
            BeforeGlow로 오늘 여행지 노을 예보 확인하기
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            전 세계 주요 도시 및 내가 있는 위치의 실시간 대기 산란 지수, 일몰 시각, 골든아워 타임라인을 고화질 그래픽으로 실시간 조회해보세요.
          </p>
          <div className="pt-2">
            <a
              href="https://bglow.pplaner.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-extrabold text-sm transition-all shadow-xl shadow-orange-500/25 transform hover:scale-105"
            >
              BeforeGlow 서비스 실행하기 <ExternalLink size={16} />
            </a>
          </div>
        </div>

      </div>
    </main>
  );
}
