import React from 'react';
import Link from 'next/link';
import { constructMetadata } from '@ppotal/ui';
import { FileText, Shield, CheckCircle2, Layers, AlertTriangle, ExternalLink, ArrowLeft } from 'lucide-react';
import '../globals.css';

export const metadata = constructMetadata({
  title: '서비스 이용약관 - PPLANER Terms of Service',
  description: 'PPLANER 서비스 이용에 관한 회사와 회원 간의 권리와 의무, 책임사항을 안내해 드립니다.',
  url: 'https://www.pplaner.com/terms',
});

export default function TermsPage() {
  return (
    <main className="min-h-screen relative text-slate-100 pb-32">
      <div className="bg-canvas">
        <div className="bg-light light-1"></div>
        <div className="bg-light light-2"></div>
        <div className="bg-light light-3"></div>
      </div>

      <div className="container space-y-10">
        <header>
          <Link href="/" className="logo" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="logo-icon"></div>
            <div className="logo-text">PPLANER</div>
          </Link>

          <div className="header-actions">
            <Link
              href="/"
              className="auth-btn"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                textDecoration: 'none',
              }}
            >
              <ArrowLeft size={16} />
              <span>포털 홈</span>
            </Link>
          </div>
        </header>

        {/* Header Hero */}
        <section
          className="p-8 sm:p-14 space-y-6"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: '32px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div className="hero-badge" style={{ marginBottom: '0.75rem' }}>
            <FileText size={14} style={{ marginRight: '0.4rem' }} /> 이용약관
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-heading leading-tight">
            서비스 이용약관 (Terms of Service)
          </h1>

          <p className="text-sm sm:text-base text-slate-300 border-t border-white/10 pt-4">
            시행일자: 2026년 7월 20일 · 최종 개정: 2026년 10월 15일
          </p>
        </section>

        {/* Content Container */}
        <div
          className="p-8 sm:p-14 space-y-8 text-slate-200 text-sm sm:text-base leading-relaxed"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '32px',
          }}
        >
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-white font-heading">제1조 (목적)</h2>
            <p>
              본 약관은 PPLANER(이하 &apos;회사&apos;)가 제공하는 웹 및 모바일 통합 서비스(포탈, JapanRailNote, Regionevel, BeforeGlow, AI 일정 플래너 이하 &apos;서비스&apos;)의 이용조건 및 절차, 이용자와 회사의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section className="space-y-3 border-t border-white/10 pt-6">
            <h2 className="text-2xl font-bold text-white font-heading">제2조 (용어의 정의)</h2>
            <ul className="list-disc pl-6 space-y-1 text-slate-300">
              <li>&apos;서비스&apos;라 함은 회사가 제공하는 PPLANER 통합 브랜드 하위의 모든 웹 애플리케이션을 의미합니다.</li>
              <li>&apos;이용자&apos;라 함은 본 약관에 따라 회사가 제공하는 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
            </ul>
          </section>

          <section className="space-y-3 border-t border-white/10 pt-6">
            <h2 className="text-2xl font-bold text-white font-heading">제3조 (약관의 효력 및 변경)</h2>
            <p>
              본 약관은 서비스 웹사이트에 게시함으로써 효력이 발생합니다. 회사는 합리적인 사유가 발생할 경우 관련 법령을 위배하지 않는 범위 내에서 약관을 변경할 수 있습니다.
            </p>
          </section>

          <section className="space-y-3 border-t border-white/10 pt-6">
            <h2 className="text-2xl font-bold text-white font-heading">제4조 (서비스의 제공 및 저작권)</h2>
            <p>
              회사가 작성한 철도 데이터 시각화 노선도, 지자체 경계 지도 알고리즘 및 가이드 콘텐츠의 저작권은 회사에 귀속됩니다. 이용자는 회사의 사전 승낙 없이 복제, 송신, 출판, 배포할 수 없습니다.
            </p>
          </section>

          <section className="space-y-3 border-t border-white/10 pt-6">
            <h2 className="text-2xl font-bold text-white font-heading">제5조 (면책 조항)</h2>
            <p>
              회사는 천재지변, 현지 대중교통 운행 중단 또는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.
            </p>
          </section>

          <section
            className="p-6 rounded-2xl space-y-3"
            style={{
              background: 'rgba(56, 189, 248, 0.05)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
            }}
          >
            <h2 className="text-xl font-bold text-white font-heading flex items-center gap-2">
              <Layers size={20} className="text-sky-400" />
              제6조 (통합 계정의 운영 및 계정 삭제·탈퇴)
            </h2>
            <p className="text-slate-300">
              회사는 회원의 편리한 이용을 위해 단일 계정으로 모든 패밀리 서비스(JP Rail, Regionevel, P-Plan, Portal 등)를 이용할 수 있는 통합 계정 체계를 운영합니다.
            </p>
            <ul className="list-disc pl-6 space-y-1 text-slate-300 text-sm">
              <li>회원은 언제든지 통합 계정 관리 페이지를 통해 회원 탈퇴(계정 삭제)를 신청할 수 있습니다.</li>
              <li>
                <strong>데이터 일괄 파기 고지:</strong> 회원이 통합 계정을 삭제하는 경우, <strong>연동된 모든 서비스(JP Rail 철도 완승 내역, Regionevel 방문 지도 및 메모, P-Plan 여행 계획)의 데이터가 동시에 영구 파기</strong>되며 복구되지 않습니다.
              </li>
            </ul>
            <div className="pt-2">
              <Link
                href="/account/policy"
                className="inline-flex items-center gap-1.5 text-sky-400 font-bold hover:underline text-sm"
              >
                PPLANER 통합 계정 정책 및 운영 방침 전문 보기 <ExternalLink size={14} />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
