import React from 'react';
import { constructMetadata } from '@ppotal/ui';
import { CreditCard, ExternalLink, ArrowLeft, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

export const metadata = constructMetadata({
  title: 'JR 패스 완전 정복: 전국권 vs 지역 패스 가성비 비교 - PPLANER Guides',
  description: '가격 개편 이후 전국권 JR 패스와 지역별(JR 동일본, 서일본, 큐슈 등) 패스의 가성비 비교, 손익분기점 계산 및 추천 노선 가이드입니다.',
  url: 'https://www.pplaner.com/guides/jr-pass',
});

export default function JrPassGuidePage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      
      {/* Header Glass Card */}
      <div className="relative overflow-hidden rounded-[32px] p-8 sm:p-12 border border-white/10 bg-slate-900/60 backdrop-blur-2xl shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <a href="/guides" className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-bold hover:underline bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
            <ArrowLeft size={14} /> 가이드 센터 홈으로
          </a>
          <span className="text-xs text-slate-400 font-medium">6분 읽기 · 2026.07.20</span>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold w-fit">
          <CreditCard size={14} /> JR 패스 전문 정보
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-heading leading-tight">
          JR 패스 완전 정복: 전국권 vs 지역 패스 가성비 비교
        </h1>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed border-t border-white/10 pt-4">
          최근 JR 그룹의 관광객 전용 철도패스 가격 인상 개편 이후, &quot;무조건 JR 패스를 사면 이득이다&quot;라는 공식은 더 이상 성립하지 않게 되었습니다. 본인이 구상하는 이동 구간의 정상 운임 합계를 미리 산출해보고 구매를 결정하는 것이 지출 절감의 핵심입니다.
        </p>
      </div>

      {/* Main Glass Container */}
      <div className="rounded-[32px] p-8 sm:p-12 border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl space-y-10 text-slate-200">
        
        {/* Section 1 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-extrabold text-white font-heading border-b border-white/10 pb-4">
            1. 전국권 JR 패스 vs 지역 패스(Regional Pass) 차이점
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-950/60 p-6 rounded-2xl border border-white/10 space-y-3">
              <span className="inline-block px-3 py-1 rounded-lg bg-amber-500/20 text-amber-400 font-extrabold text-xs">전국권 JR 패스</span>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                JR 6사의 거의 모든 신칸센, 특급, 재래선 열차를 자유롭게 이용 가능하지만 가격 인상폭이 큽니다. 도쿄-신오사카-하카타를 가로지르는 장거리 전주 여행 시에만 이득이 발생합니다.
              </p>
            </div>

            <div className="bg-slate-950/60 p-6 rounded-2xl border border-white/10 space-y-3">
              <span className="inline-block px-3 py-1 rounded-lg bg-sky-500/20 text-sky-400 font-extrabold text-xs">지역 전용 JR 패스</span>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                JR 서일본(간사이·세토우치 등), JR 동일본(도호쿠 등), JR 큐슈 등 특정 권역에 집중된 패스입니다. 가성비가 월등히 높아 일정 구간 이동 시 필수적입니다.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-2xl font-extrabold text-white font-heading border-b border-white/10 pb-4">
            2. 주요 추천 가성비 지역 패스 3선
          </h2>

          <div className="space-y-3 text-xs sm:text-sm">
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 space-y-1">
              <h3 className="font-extrabold text-amber-400 text-base">① JR 서일본 간사이 와이드 에리어 패스</h3>
              <p className="text-slate-300">오사카, 교토, 고베, 돗토리, 기노사키 온천 및 신오사카-오카야마 간 산요 신칸센 자유석/지정석 탑승이 포함된 최강의 가성비 패스.</p>
            </div>

            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 space-y-1">
              <h3 className="font-extrabold text-amber-400 text-base">② JR 큐슈 레일 패스 (북큐슈 / 전큐슈)</h3>
              <p className="text-slate-300">후쿠오카, 구마모토, 가고시마, 유후인을 잇는 큐슈 신칸센 및 디자인 특급 열차 탑승이 가능한 큐슈 일주 필수 패스.</p>
            </div>

            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 space-y-1">
              <h3 className="font-extrabold text-amber-400 text-base">③ JR 동일본 도호쿠 에리어 패스</h3>
              <p className="text-slate-300">도쿄에서 센다이, 아오모리 등 도호쿠 6개 현으로 향하는 하야부사 신칸센을 마음껏 이용할 수 있는 수도권-도호쿠 권역 전용 패스.</p>
            </div>
          </div>
        </section>

        {/* CTA Box */}
        <div className="rounded-3xl bg-gradient-to-br from-amber-950/80 via-slate-900 to-yellow-950/80 p-8 border border-amber-500/30 space-y-4 text-center">
          <h3 className="text-2xl font-extrabold text-white font-heading">JapanRailNote 노선 구간 운임 조회하기</h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            여행 예정인 노선의 정상 운임을 계산하고 패스 구매가 이득인지 검증해보세요.
          </p>
          <div className="pt-2">
            <a 
              href="https://jprail.pplaner.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-white font-extrabold text-sm transition-all shadow-xl shadow-amber-500/25 transform hover:scale-105"
            >
              JapanRailNote 노선 지도 대시보드 열기 <ExternalLink size={16} />
            </a>
          </div>
        </div>

      </div>
    </main>
  );
}
