import React from 'react';
import { constructMetadata } from '@ppotal/ui';
import { ShieldCheck, Lock, Eye, ExternalLink, Cookie } from 'lucide-react';

export const metadata = constructMetadata({
  title: '개인정보처리방침 - PPLANER Privacy Policy',
  description: 'PPLANER의 개인정보 수집, 이용 목적, Google AdSense 제3자 쿠키 고지 및 이용자 권리에 관한 방침입니다.',
  url: 'https://www.pplaner.com/privacy',
});

export default function PrivacyPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      
      {/* Header */}
      <div className="relative overflow-hidden rounded-[32px] p-8 sm:p-12 border border-white/10 bg-slate-900/60 backdrop-blur-2xl shadow-2xl space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-bold w-fit">
          <ShieldCheck size={14} /> 법적 준수 사항
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-heading leading-tight">
          개인정보처리방침 (Privacy Policy)
        </h1>

        <p className="text-xs sm:text-sm text-slate-400 border-t border-white/10 pt-4">
          시행일자: 2026년 7월 20일 · 최종 수정: 2026년 7월 20일
        </p>
      </div>

      {/* Content Container */}
      <div className="rounded-[32px] p-8 sm:p-12 border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl space-y-8 text-slate-200 text-xs sm:text-sm leading-relaxed">
        
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white font-heading">제1조 (개인정보의 수집 및 이용 목적)</h2>
          <p>
            PPLANER(이하 &apos;회사&apos;)는 이용자의 동의를 바탕으로 아래의 최소한의 개인정보를 수집하며, 서비스 제공, 회원관리, 맞춤형 콘텐츠 제공 및 서비스 개선 목적 이외의 용도로는 사용하지 않습니다.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-300">
            <li>회원 가입 및 관리: 구글/소셜 인증 시 제공되는 이메일 주소, 닉네임, 프로필 이미지</li>
            <li>서비스 이용 기록: 서비스 방문 일시, 접속 IP 정보, 쿠키, 서비스 이용 아카이브 데이터</li>
          </ul>
        </section>

        {/* AdSense Clause Highlight Box */}
        <section className="p-6 rounded-2xl bg-sky-950/40 border border-sky-500/30 space-y-3">
          <div className="flex items-center gap-2 text-sky-400 font-bold text-base">
            <Cookie size={18} /> 제2조 (Google AdSense 및 제3자 쿠키 고지)
          </div>
          <p className="text-slate-300">
            본 웹사이트는 Google LLC에서 제공하는 광고 서비스인 Google AdSense를 이용하고 있습니다. Google을 포함한 제3자 판매자는 쿠키를 사용하여 이용자의 이전 방문 기록(본 웹사이트 또는 다른 웹사이트)을 바탕으로 맞춤형 광고를 제공합니다.
          </p>
          <p className="text-slate-300">
            이용자는 Google의 광고 설정을 방문하여 맞춤형 광고를 비활성화할 수 있습니다.
          </p>
          <div className="pt-1">
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sky-400 font-bold hover:underline"
            >
              Google 광고 설정 바로가기 <ExternalLink size={14} />
            </a>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white font-heading">제3조 (개인정보의 보유 및 파기)</h2>
          <p>
            회사는 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 관계 법령의 규정에 의하여 보존할 필요가 있는 경우 관련 법령에서 정한 일정 기간 동안 정보를 보관합니다.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white font-heading">제4조 (이용자의 권리와 행사 방법)</h2>
          <p>
            이용자는 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할 수 있으며 회원 탈퇴를 요청할 수 있습니다. 개인정보 관리책임자에게 이메일(contact@pplaner.com)로 연락하시면 지체 없이 조치하겠습니다.
          </p>
        </section>

      </div>
    </main>
  );
}
