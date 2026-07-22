import React from 'react';
import { constructMetadata } from '@ppotal/ui';
import { Compass, ExternalLink, ArrowLeft, Zap, Info, Luggage } from 'lucide-react';

export const metadata = constructMetadata({
  title: '일본 신칸센 총정리: 노선별 특색과 지정석 예약 팁 - PPLANER Guides',
  description: '도카이도, 산요, 도호쿠, 호쿠리쿠, 큐슈 신칸센 등 주요 노선 분석 및 노조미·하야부사 등 차종 구분, 대형 수하물 예약 팁 안내.',
  url: 'https://www.pplaner.com/guides/shinkansen',
});

export default function ShinkansenGuidePage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      
      {/* Header Glass Card */}
      <div className="relative overflow-hidden rounded-[32px] p-8 sm:p-12 border border-white/10 bg-slate-900/60 backdrop-blur-2xl shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <a href="/guides" className="inline-flex items-center gap-1.5 text-xs text-rose-400 font-bold hover:underline bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20">
            <ArrowLeft size={14} /> 가이드 센터 홈으로
          </a>
          <span className="text-xs text-slate-400 font-medium">6분 읽기 · 2026.07.20</span>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold w-fit">
          <Compass size={14} /> 신칸센 전문 해설
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-heading leading-tight">
          일본 신칸센 총정리: 노선별 특색과 지정석 예약 팁
        </h1>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed border-t border-white/10 pt-4">
          신칸센(新幹線)은 단순한 열차를 넘어 일본 전체를 연결하는 탄탄한 고속철도 대동맥입니다. 최고의 정시 운항률과 안전성을 바탕으로 도시 간 이동 시간을 극적으로 절감해 줍니다.
        </p>
      </div>

      {/* Main Glass Container */}
      <div className="rounded-[32px] p-8 sm:p-12 border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl space-y-10 text-slate-200">
        
        {/* Section 1 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-extrabold text-white font-heading border-b border-white/10 pb-4 flex items-center gap-3">
            <span className="p-2 bg-rose-500/20 text-rose-400 rounded-xl"><Zap size={20} /></span>
            1. 일본 5대 주요 신칸센 노선 네트워크
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 space-y-2">
              <h3 className="font-extrabold text-amber-400 text-base">도카이도 신칸센 (도쿄~신오사카)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">세계 최다 수송밀도를 자랑하며 노조미(Nozomi), 히카리(Hikari), 코다마(Kodama) 세 등급으로 운행됩니다.</p>
            </div>

            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 space-y-2">
              <h3 className="font-extrabold text-blue-400 text-base">산요 신칸센 (신오사카~하카타)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">JR 서일본이 운용하며 미즈호, 사쿠라, 츠바메 열차를 통해 오사카에서 후쿠오카까지 직통 연결합니다.</p>
            </div>

            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 space-y-2">
              <h3 className="font-extrabold text-emerald-400 text-base">도호쿠 신칸센 (도쿄~신아오모리)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">최고 시속 320km로 달리는 분홍빛 하야부사(Hayabusa)와 야마비코 열차가 주력으로 운행됩니다.</p>
            </div>

            <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 space-y-2">
              <h3 className="font-extrabold text-purple-400 text-base">호쿠리쿠 신칸센 (도쿄~카나자와~츠루가)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">일본 알프스 산맥을 가로질러 온천 도시 카나자와와 츠루가까지 고속으로 이동할 수 있습니다.</p>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-2xl font-extrabold text-white font-heading border-b border-white/10 pb-4 flex items-center gap-3">
            <span className="p-2 bg-rose-500/20 text-rose-400 rounded-xl"><Luggage size={20} /></span>
            2. 특대 수하물 규정 및 실전 승차 팁
          </h2>
          
          <div className="bg-slate-950/60 p-6 rounded-2xl border border-rose-500/30 space-y-3">
            <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
              <Info size={18} /> 신칸센 수하물 & 좌석 팁
            </h3>
            <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-slate-300">
              <li><strong>특대 수하물(세 변의 합 160cm~250cm):</strong> 탑승 전 수하물 전용 좌석을 지정석과 함께 사전 예약해야 수수료가 발생하지 않습니다.</li>
              <li><strong>후지산 조망 좌석:</strong> 도카이도 신칸센 도쿄→오사카 방향 이동 시 진행 방향 오른쪽 <strong>E열 좌석</strong>에 안착 시 후지산 전경을 감상할 수 있습니다.</li>
            </ul>
          </div>
        </section>

        {/* CTA Box */}
        <div className="rounded-3xl bg-gradient-to-br from-rose-950/80 via-slate-900 to-red-950/80 p-8 border border-rose-500/30 space-y-4 text-center">
          <h3 className="text-2xl font-extrabold text-white font-heading">JapanRailNote 신칸센 노선 시각화 지도</h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            전국 신칸센 노선 정차역과 주행 라인을 인터랙티브 맵으로 확인해보세요.
          </p>
          <div className="pt-2">
            <a 
              href="https://jprail.pplaner.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-extrabold text-sm transition-all shadow-xl shadow-rose-500/25 transform hover:scale-105"
            >
              JapanRailNote 노선 지도 대시보드 열기 <ExternalLink size={16} />
            </a>
          </div>
        </div>

      </div>
    </main>
  );
}
