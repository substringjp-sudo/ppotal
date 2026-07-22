import React from 'react';
import { constructMetadata } from '@ppotal/ui';
import { Train, ExternalLink, ArrowLeft, ArrowRight, Zap, MapPin, CheckCircle2, ChevronRight, Layers } from 'lucide-react';

export const metadata = constructMetadata({
  title: '일본 철도망 완전 가이드: JR 6사와 민영철도 계층 분석 - PPLANER',
  description: '신칸센, JR 6개 여객철도회사, 대형 사철, 도시 지하철로 구성된 일본 철도의 계층 구조와 노선 탑승 아카이빙 노하우를 깊이 있게 해설합니다.',
  url: 'https://www.pplaner.com/guides/japan-rail',
});

export default function JapanRailGuidePage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      
      {/* Header Glass Card */}
      <div className="relative overflow-hidden rounded-[32px] p-8 sm:p-12 border border-white/10 bg-slate-900/60 backdrop-blur-2xl shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <a href="/guides" className="inline-flex items-center gap-1.5 text-xs text-sky-400 font-bold hover:underline bg-sky-500/10 px-3 py-1.5 rounded-xl border border-sky-500/20">
            <ArrowLeft size={14} /> 가이드 센터 홈으로
          </a>
          <span className="text-xs text-slate-400 font-medium">8분 읽기 · 2026.07.20</span>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-bold w-fit">
          <Train size={14} /> 일본 철도 전문 가이드
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-heading leading-tight">
          일본 철도망 완전 가이드: JR 6사와 민영철도 계층 구조 해설
        </h1>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed border-t border-white/10 pt-4">
          일본의 철도망은 전 세계에서 가장 밀도가 높고 복잡한 수송 체계를 자랑합니다. 1987년 일본국유철도(JNR)의 민영화 이후 탄생한 6개 지역별 JR 여객 회사부터 16대 대형 사철, 각 지방도시의 3섹터 철도와 노면전차, 그리고 정밀한 도시 지하철망에 이르기까지 매년 수십억 명의 이동을 담당하고 있습니다.
        </p>
      </div>

      {/* Content Body Glass Container */}
      <div className="rounded-[32px] p-8 sm:p-12 border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl space-y-10 text-slate-200">
        
        {/* Section 1 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-extrabold text-white font-heading flex items-center gap-3 border-b border-white/10 pb-4">
            <span className="p-2 bg-sky-500/20 text-sky-400 rounded-xl"><Zap size={20} /></span>
            1. JR 6개 여객철도회사의 구역과 특징
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            국유철도 분할 민영화로 탄생한 JR 그룹의 여객 6사는 각 섬과 지역에 따라 독립된 사업 영역과 운임 체계를 갖고 있습니다. 본주는 홋카이도, 동일본, 도카이, 서일본, 시코쿠, 큐슈의 6개 영역으로 구분됩니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 hover:border-sky-500/40 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sky-400 text-base">JR 동일본 (JR East)</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold">수도권 & 도호쿠</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">도쿄 수도권 방사형 광역 전철망(야마노테선, 주오선 등)과 도호쿠·조에츠·호쿠리쿠 신칸센을 운영합니다. 수송 밀도가 가장 높고 수이카(Suica) 교통카드를 주도합니다.</p>
            </div>

            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 hover:border-orange-500/40 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-orange-400 text-base">JR 도카이 (JR Central)</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold">도카이도 간선</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">일본 최고 수익 노선인 도카이도 신칸센(도쿄~신오사카)을 소유하고 있으며, 나고야 중심의 과부하 간선 및 리니어 중앙 신칸센 건설을 주도합니다.</p>
            </div>

            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 hover:border-blue-500/40 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-blue-400 text-base">JR 서일본 (JR West)</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">간사이 & 산요</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">오사카·교토·고베 간사이 도시권의 신쾌속(新快速) 네트워크와 산요 신칸센, 산인·산요 지방 간선을 관할하며 다채로운 패스 상품을 운용합니다.</p>
            </div>

            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 hover:border-red-500/40 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-red-400 text-base">JR 큐슈 (JR Kyushu)</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold">큐슈 일주</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">큐슈 신칸센 및 디자인 거장 미토오카 에이지가 디렉팅한 수많은 관광 특급(유후인노모리, 36+3 등)으로 특화된 철도 브랜딩을 자랑합니다.</p>
            </div>

            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 hover:border-emerald-500/40 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-emerald-400 text-base">JR 홋카이도 (JR Hokkaido)</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">북해도 전역</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">삿포로 근교 수송과 홋카이도 신칸센(신하코다테호쿠토)을 담당하며, 극한지용 철도 차량 및 제설 인프라 노하우가 집약되어 있습니다.</p>
            </div>

            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 hover:border-cyan-500/40 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-cyan-400 text-base">JR 시코쿠 (JR Shikoku)</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">시코쿠 4개 현</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">세토대교선을 통해 본주 서일본과 연결되며 시코쿠 4개 현을 잇는 특급 열차와 호빵맨 열차 등 친근한 특화 노선을 운영합니다.</p>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-2xl font-extrabold text-white font-heading flex items-center gap-3 border-b border-white/10 pb-4">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl"><Layers size={20} /></span>
            2. 대형 사철(大手私鉄)과 지하철의 직통 운행 네트워크
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            일본 여행 중 초보자들이 가장 혼란을 겪는 부분은 JR과 민영 철도(사철) 간의 환승 체계입니다. 도쿄의 킨테츠, 한큐, 도부, 메이테츠, 오다큐, 난카이 등 16대 대형 사철은 터미널 백화점 사업 및 주택지 개발과 연계하여 JR 이상의 조차 속도와 저렴한 운임을 제공합니다.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            특히 수도권 도쿄 메트로와 도에이 지하철은 사철 노선과 지하철 선로를 직접 연결하여 승객이 내리지 않고 터미널을 통과하는 상호 직통 운행(相互直通運転)을 전면 도입했습니다. 노선명과 운용 주체를 인지하는 것이 환승 비용 절감의 핵심입니다.
          </p>
        </section>

        {/* Section 3: Sub-guides Callout */}
        <section className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-2xl font-extrabold text-white font-heading">
            3. 신칸센 및 JR 패스 추천 심화 가이드
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a href="/guides/jr-pass" className="group p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/30 hover:border-amber-500/60 transition-all flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-amber-400 font-bold uppercase">패스 가성비 분석</span>
                <h4 className="font-extrabold text-white text-base group-hover:text-amber-400 transition-colors">JR 패스 전국권 vs 지역 패스 비교</h4>
              </div>
              <ChevronRight size={18} className="text-amber-400 transform group-hover:translate-x-1 transition-transform" />
            </a>

            <a href="/guides/shinkansen" className="group p-5 rounded-2xl bg-gradient-to-r from-rose-500/10 to-red-500/5 border border-rose-500/30 hover:border-rose-500/60 transition-all flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-rose-400 font-bold uppercase">신칸센 해설</span>
                <h4 className="font-extrabold text-white text-base group-hover:text-rose-400 transition-colors">신칸센 노선별 특징과 수하물 예약</h4>
              </div>
              <ChevronRight size={18} className="text-rose-400 transform group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </section>

        {/* Tool Callout */}
        <div className="rounded-3xl bg-gradient-to-br from-sky-950/80 via-slate-900 to-blue-950/80 p-8 border border-sky-500/30 space-y-4 text-center">
          <h3 className="text-2xl font-extrabold text-white font-heading">JapanRailNote로 나만의 철도 지도 아카이빙하기</h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            전국 신칸센, JR 간선, 사철, 지하철 노선 데이터를 인터랙티브 벡터 지도로 확인하고 내 철도 탑승률(%) 통계를 한눈에 관리해보세요.
          </p>
          <div className="pt-2">
            <a 
              href="https://jprail.pplaner.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-sm transition-all shadow-xl shadow-sky-500/25 transform hover:scale-105"
            >
              JapanRailNote 실행하기 <ExternalLink size={16} />
            </a>
          </div>
        </div>

      </div>
    </main>
  );
}
