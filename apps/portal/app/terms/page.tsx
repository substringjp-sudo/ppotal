import React from 'react';
import { constructMetadata } from '@ppotal/ui';
import { FileText, Shield, CheckCircle2 } from 'lucide-react';

export const metadata = constructMetadata({
  title: '서비스 이용약관 - PPLANER Terms of Service',
  description: 'PPLANER 서비스 이용에 관한 회사와 회원 간의 권범 및 의무, 책임사항을 안내해 드립니다.',
  url: 'https://www.pplaner.com/terms',
});

export default function TermsPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      
      {/* Header */}
      <div className="relative overflow-hidden rounded-[32px] p-8 sm:p-12 border border-white/10 bg-slate-900/60 backdrop-blur-2xl shadow-2xl space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold w-fit">
          <FileText size={14} /> 이용약관
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-heading leading-tight">
          서비스 이용약관 (Terms of Service)
        </h1>

        <p className="text-xs sm:text-sm text-slate-400 border-t border-white/10 pt-4">
          시행일자: 2026년 7월 20일 · 최종 수정: 2026년 7월 20일
        </p>
      </div>

      {/* Content Container */}
      <div className="rounded-[32px] p-8 sm:p-12 border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl space-y-8 text-slate-200 text-xs sm:text-sm leading-relaxed">
        
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white font-heading">제1조 (목적)</h2>
          <p>
            본 약관은 PPLANER(이하 &apos;회사&apos;)가 제공하는 웹 및 모바일 통합 서비스(포탈, JapanRailNote, Regionevel, BeforeGlow, AI 일정 플래너 이하 &apos;서비스&apos;)의 이용조건 및 절차, 이용자와 회사의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white font-heading">제2조 (용어의 정의)</h2>
          <ul className="list-disc pl-5 space-y-1 text-slate-300">
            <li>&apos;서비스&apos;라 함은 회사가 제공하는 PPLANER 통합 브랜드 하위의 모든 웹 애플리케이션을 의미합니다.</li>
            <li>&apos;이용자&apos;라 함은 본 약관에 따라 회사가 제공하는 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white font-heading">제3조 (약관의 효력 및 변경)</h2>
          <p>
            본 약관은 서비스 웹사이트에 게시함으로써 효력이 발생합니다. 회사는 합리적인 사유가 발생할 경우 관련 법령을 위배하지 않는 범위 내에서 약관을 변경할 수 있습니다.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white font-heading">제4조 (서비스의 제공 및 저작권)</h2>
          <p>
            회사가 작성한 철도 데이터 시각화 노선도, 지자체 경계 지도 알고리즘 및 가이드 콘텐츠의 저작권은 회사에 귀속됩니다. 이용자는 회사의 사전 승낙 없이 복제, 송신, 출판, 배포할 수 없습니다.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white font-heading">제5조 (면책 조항)</h2>
          <p>
            회사는 천재지변, 현지 대중교통 운행 중단 또는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.
          </p>
        </section>

      </div>
    </main>
  );
}
