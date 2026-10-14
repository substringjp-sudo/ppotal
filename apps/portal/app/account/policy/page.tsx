import React from 'react';
import Link from 'next/link';
import {
  Layers,
  ShieldCheck,
  AlertTriangle,
  Train,
  Map as MapIcon,
  Sparkles,
  ArrowLeft,
  KeyRound,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Lock,
  Mail,
  ShieldAlert,
  ArrowUpRight,
  Database,
  UserCheck,
} from 'lucide-react';
import '../../globals.css';

export default function AccountPolicyPage() {
  return (
    <div className="min-h-screen relative text-slate-100 pb-24">
      {/* Dynamic Ambient Aurora Background */}
      <div className="bg-canvas">
        <div className="bg-light light-1"></div>
        <div className="bg-light light-2"></div>
        <div className="bg-light light-3"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10 relative z-10">
        
        {/* Top Breadcrumb */}
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <Link
            href="/account"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white transition-colors py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5"
          >
            <ArrowLeft size={16} />
            통합 계정 관리로 돌아가기
          </Link>

          <Link
            href="/"
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            포털 홈
          </Link>
        </div>

        {/* Header Hero Card */}
        <div className="relative overflow-hidden rounded-[32px] p-8 sm:p-12 border border-white/10 bg-slate-900/80 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-sky-500/20 via-indigo-500/20 to-purple-500/20 border border-sky-400/40 text-sky-300 text-xs font-bold w-fit shadow-lg shadow-sky-500/10">
            <Layers size={14} className="text-sky-400" /> PPOTAL Unified Account Policy & Guidelines
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight font-heading leading-tight">
            PPOTAL 통합 계정 정책 및 운영 방침
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            PPOTAL은 여행자의 자유로운 탐험을 지원하기 위해 <strong>단일 계정으로 모든 패밀리 서비스를 이용하는 싱글 사인온(SSO) 체계</strong>를 운영합니다. 본 방침은 통합 계정의 생성, 유지, 서비스 간 연동 및 <strong>탈퇴 시 데이터 파기 원칙</strong>을 명확히 규정합니다.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 border-t border-white/10 pt-4">
            <span>시행일자: 2026년 10월 15일</span>
            <span>·</span>
            <span>최종 개정: 2026년 10월 15일</span>
            <span>·</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 size={13} /> 전 서비스 표준 약관
            </span>
          </div>
        </div>

        {/* Infographic Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-sky-500/20 backdrop-blur-xl space-y-2">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center">
              <UserCheck size={18} />
            </div>
            <h4 className="text-sm font-bold text-white">1개의 통합 계정</h4>
            <p className="text-xs text-slate-400">
              JP Rail, Regionevel, P-Plan을 추가 가입 없이 단일 자격 증명으로 즉시 이용
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-emerald-500/20 backdrop-blur-xl space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Database size={18} />
            </div>
            <h4 className="text-sm font-bold text-white">상호 데이터 연동</h4>
            <p className="text-xs text-slate-400">
              철도 방문역 관할 지자체 ↔ 행정구역 방문 지도 간 지능형 동기화 지원
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-red-500/20 backdrop-blur-xl space-y-2">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center">
              <ShieldAlert size={18} />
            </div>
            <h4 className="text-sm font-bold text-white">동시 완전 파기</h4>
            <p className="text-xs text-slate-400">
              계정 삭제 시 연동된 모든 앱의 방문 기록과 일정표 DB가 일괄 영구 삭제
            </p>
          </div>
        </div>

        {/* Content Container */}
        <div className="rounded-[32px] p-8 sm:p-12 border border-white/10 bg-slate-900/60 backdrop-blur-2xl shadow-2xl space-y-12 text-slate-200 text-xs sm:text-sm leading-relaxed">
          
          {/* 제1조 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-sky-500/20 text-sky-400 font-extrabold text-xs">제1조</span>
              <h2 className="text-xl font-bold text-white font-heading">통합 계정 체계 및 패밀리 서비스</h2>
            </div>
            <p className="text-slate-300">
              회사는 이용자가 분절되지 않은 여행 경험을 누릴 수 있도록 단일 계정 기반의 통합 회원 체계를 운영합니다. 본 통합 계정으로 로그인 가능한 공식 패밀리 서비스는 다음과 같습니다:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-sky-400 font-bold text-xs">
                  <Train size={14} /> JP Rail
                </div>
                <p className="text-[11px] text-slate-400">
                  일본 전국 신칸센·JR·사철 전 노선 시각화 및 역 방문 스탬프 완승 기록
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                  <MapIcon size={14} /> Regionevel
                </div>
                <p className="text-[11px] text-slate-400">
                  전국 시·군·구 행정구역 여행 지도 색칠 및 방문 사진 아카이빙
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-purple-400 font-bold text-xs">
                  <Sparkles size={14} /> P-Plan
                </div>
                <p className="text-[11px] text-slate-400">
                  AI 기반 여행 동선 추천 및 3D 글로벌 뷰 일정 플래너
                </p>
              </div>
            </div>
          </section>

          {/* 제2조 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-sky-500/20 text-sky-400 font-extrabold text-xs">제2조</span>
              <h2 className="text-xl font-bold text-white font-heading">계정의 생성 및 수집 정보</h2>
            </div>
            <ol className="list-decimal pl-5 space-y-2 text-slate-300">
              <li>
                <strong>가입 방식:</strong> 이용자는 이메일 주소 및 비밀번호 설정 또는 Google 소셜 인증을 통해 계정을 즉시 생성할 수 있습니다.
              </li>
              <li>
                <strong>최소 수집 원칙:</strong> 서비스 제공 및 회원 식별을 위해 필요한 최소한의 정보(이메일, 닉네임, 프로필 이미지, 고유 식별자 UID)만을 수집·저장합니다.
              </li>
              <li>
                <strong>이용 권한:</strong> 계정이 생성되는 즉시 JP Rail, Regionevel, P-Plan 등 모든 연동 서비스에 대한 통합 이용 권한이 동일한 계정 자격으로 부여됩니다.
              </li>
            </ol>
          </section>

          {/* 제3조 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-sky-500/20 text-sky-400 font-extrabold text-xs">제3조</span>
              <h2 className="text-xl font-bold text-white font-heading">통합 사용 및 서비스 간 데이터 연동</h2>
            </div>
            <p className="text-slate-300">
              통합 계정은 패밀리 서비스 간 지능형 데이터 연결을 지원합니다:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
              <li>
                <strong>프로필 일원화:</strong> 포털 또는 각 서비스에서 설정한 닉네임은 모든 패밀리 서비스에서 일관되게 공유됩니다.
              </li>
              <li>
                <strong>상호 동기화:</strong> JP Rail에서 방문한 철도역의 관할 지자체 정보는 이용자의 요청 시 Regionevel의 시군구 방문 기록으로 상호 동기화됩니다.
              </li>
              <li>
                <strong>데이터 보안 및 격리:</strong> 공통 프로필을 제외한 각 서비스별 고유 상세 데이터(개별 일정, 여행 메모 등)는 해당 서비스 내에서만 안전하게 관리됩니다.
              </li>
            </ul>
          </section>

          {/* 제4조 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-sky-500/20 text-sky-400 font-extrabold text-xs">제4조</span>
              <h2 className="text-xl font-bold text-white font-heading">계정 유지 및 보안 책임</h2>
            </div>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
              <li>이용자는 본인의 비밀번호를 안전하게 관리할 책임이 있으며, 계정을 타인에게 양도 또는 대여할 수 없습니다.</li>
              <li>비밀번호 재설정이 필요한 경우, 통합 계정 관리 센터에서 등록된 이메일로 재설정 메일을 전송받아 즉시 변경할 수 있습니다.</li>
              <li>회사는 Firebase 보안 규칙 및 HTTPS 보안 전송을 통해 모든 인증 트래픽과 데이터를 암호화하여 보호합니다.</li>
            </ul>
          </section>

          {/* 제5조 (중요 경고 섹션) */}
          <section className="p-6 sm:p-8 rounded-2xl bg-red-950/30 border border-red-500/40 space-y-5">
            <div className="flex items-center gap-3 text-red-400 font-extrabold text-lg sm:text-xl font-heading">
              <ShieldAlert size={24} className="shrink-0" />
              <span>제5조 (통합 계정 삭제 및 데이터 영구 파기 방침)</span>
            </div>

            <div className="text-red-200 text-xs sm:text-sm space-y-4 leading-relaxed">
              <p>
                이용자는 언제든지 <strong>통합 계정 관리 페이지(<Link href="/account" className="underline font-bold text-white hover:text-red-300">https://pplaner.com/account</Link>)</strong>를 통해 회원 탈퇴(계정 삭제)를 직접 진행할 수 있습니다.
              </p>

              <div className="p-4 rounded-xl bg-black/50 border border-red-500/30 space-y-3">
                <p className="font-bold text-white flex items-center gap-1.5 text-sm">
                  <Trash2 size={16} className="text-red-400" />
                  연동된 모든 서비스 데이터 일괄 영구 파기 (Cascade Batch Deletion)
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-red-200/90">
                  <li>
                    <strong>PPOTAL 통합 계정 소멸:</strong> 계정 고유 식별자 및 Firebase Auth 인증 정보가 즉시 완전 삭제됩니다.
                  </li>
                  <li>
                    <strong>JP Rail DB 전량 삭제:</strong> 탑승 기록, 완승 노선, 방문 역 스탬프 컬렉션(users/&#123;uid&#125;/trips)이 영구 파기됩니다.
                  </li>
                  <li>
                    <strong>Regionevel DB 전량 삭제:</strong> 전국 시·군·구 지도 방문 색칠 내역, 사진, 타임라인 기록(users/&#123;uid&#125;/visits)이 영구 파기됩니다.
                  </li>
                  <li>
                    <strong>P-Plan DB 전량 삭제:</strong> 설계된 모든 여행 일정표, 버킷리스트, 여행 로그가 영구 파기됩니다.
                  </li>
                  <li>
                    <strong>복구 불가능:</strong> 파기된 데이터는 서버와 백업에서 즉시 지워지며, 동일 이메일로 재가입하더라도 이전 데이터는 절대 복구되지 않습니다.
                  </li>
                </ul>
              </div>

              <p className="text-[11px] text-red-300/80">
                ※ 관련 법령에 의해 별도 보존 의무가 있는 경우를 제외하고, 회사는 탈퇴 이용자의 모든 개인정보와 활동 데이터를 지체 없이 파기합니다.
              </p>
            </div>
          </section>

          {/* 제6조 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-sky-500/20 text-sky-400 font-extrabold text-xs">제6조</span>
              <h2 className="text-xl font-bold text-white font-heading">이용자의 권리와 고객 지원</h2>
            </div>
            <p className="text-slate-300">
              이용자는 언제든지 자신의 계정 정보에 대해 열람, 정정 및 삭제를 요구할 권리를 가집니다. 본 방침에 대한 문의나 권리 행사는 아래의 공식 창구로 연락해 주시기 바랍니다:
            </p>
            
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 text-slate-300">
                <Mail size={18} className="text-sky-400 shrink-0" />
                <span className="text-xs">운영 및 지원 문의:</span>
                <a href="mailto:contact@pplaner.com" className="text-sky-400 font-bold hover:underline text-xs">
                  contact@pplaner.com
                </a>
              </div>

              <Link
                href="/account"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/20"
              >
                <span>통합 계정 관리 센터 바로가기</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </section>

        </div>

      </div>
    </div>
  );
}
