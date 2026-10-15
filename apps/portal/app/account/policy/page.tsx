'use client';

import React from 'react';
import Link from 'next/link';
import { AppHeader, Button } from '@ppotal/ui';
import {
  Layers,
  ShieldCheck,
  Train,
  Map as MapIcon,
  Sparkles,
  ArrowLeft,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Database,
  UserCheck,
  ShieldAlert,
  Mail,
} from 'lucide-react';

export default function AccountPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      
      {/* Official Unified AppHeader (56px) */}
      <AppHeader
        theme="dark"
        className="shadow-sm"
        logo={
          <Link href="/" className="flex items-center gap-2.5 min-w-0" aria-label="PPLANER 홈">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center shadow-sm shrink-0">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-black tracking-tight text-white">
              PPLANER
            </span>
          </Link>
        }
        right={
          <Link href="/account">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft size={14} />}
              className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold"
            >
              계정 관리
            </Button>
          </Link>
        }
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        
        {/* Header Hero Card */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 space-y-3">
          <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
            통합 계정 정책
          </span>

          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            PPLANER 통합 계정 정책 및 운영 방침
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
            PPLANER는 모든 여행자의 자유로운 탐험을 지원하기 위해 <strong>단일 계정으로 모든 패밀리 서비스를 이용하는 싱글 사인온(SSO) 체계</strong>를 운영합니다. 본 방침은 통합 계정의 생성, 보안, 서비스 간 연동 및 <strong>탈퇴 시 데이터 파기 원칙</strong>을 규정합니다.
          </p>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 border-t border-slate-800 pt-4">
            <span>시행일자: 2026년 10월 15일</span>
            <span>·</span>
            <span>최종 개정: 2026년 10월 15일</span>
            <span>·</span>
            <span className="text-slate-300 font-medium flex items-center gap-1">
              <CheckCircle2 size={13} className="text-slate-400" /> 전 서비스 표준 약관
            </span>
          </div>
        </section>

        {/* Infographic Summary (3 Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center">
              <UserCheck size={16} />
            </div>
            <h4 className="text-sm font-bold text-white">단일 통합 계정</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              JP Rail, Regionevel, P-Plan을 추가 가입 없이 하나의 계정으로 바로 이용합니다.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center">
              <Database size={16} />
            </div>
            <h4 className="text-sm font-bold text-white">상호 데이터 연동</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              철도 방문역 관할 지자체와 행정구역 방문 지도 간의 기록을 연동합니다.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center">
              <Trash2 size={16} />
            </div>
            <h4 className="text-sm font-bold text-white">동시 영구 파기 원칙</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              계정 탈퇴 시 모든 연동 서비스의 개인 데이터가 즉시 일괄 파기됩니다.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-10 space-y-10 text-slate-300 text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              제1조 (목적 및 정의)
            </h2>
            <p>
              본 운영 방침은 PPLANER(이하 &apos;회사&apos;)가 운영하는 모든 패밀리 웹 및 모바일 서비스(JapanRailNote/JP Rail, Regionevel, P-Plan, BeforeGlow 등)에 적용되는 통합 계정(Unified Account)의 운영 원칙을 규정함으로써 회원의 권익을 보호하고 데이터 처리의 투명성을 보장함을 목적으로 합니다.
            </p>
          </section>

          <section className="space-y-3 border-t border-slate-800 pt-6">
            <h2 className="text-xl font-bold text-white">
              제2조 (통합 계정의 범위 및 SSO 연동)
            </h2>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li>
                <strong>통합 식별자(UID):</strong> 회원은 Firebase Authentication을 통해 발급된 단일 고유 식별자(UID)를 바탕으로 모든 서비스에 별도의 추가 회원가입 절차 없이 동일하게 접근할 수 있습니다.
              </li>
              <li>
                <strong>프로필 동기화:</strong> 닉네임, 프로필 설정 등 공통 계정 정보는 통합 관리 센터를 통해 일괄 수정 및 반영됩니다.
              </li>
            </ul>
          </section>

          <section className="space-y-3 border-t border-slate-800 pt-6">
            <h2 className="text-xl font-bold text-white">
              제3조 (서비스 간 데이터 상호 연동)
            </h2>
            <p>
              회원의 여행 경험 극대화를 위해 회사는 다음과 같은 상호 연동을 지원합니다:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-1">
                <h5 className="font-bold text-sky-400 flex items-center gap-1.5 text-xs">
                  <Train size={14} /> JP Rail ↔ Regionevel 연동
                </h5>
                <p className="text-xs text-slate-400 leading-relaxed">
                  일본 철도역 방문 및 탑승 스탬프 데이터를 바탕으로 해당 역이 위치한 지자체 행정구역 방문 지도에 방문 경험치 자동 반영
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-1">
                <h5 className="font-bold text-purple-400 flex items-center gap-1.5 text-xs">
                  <Sparkles size={14} /> P-Plan ↔ 전체 서비스 연동
                </h5>
                <p className="text-xs text-slate-400 leading-relaxed">
                  작성된 여행 일정표와 완승 노선, 방문 지자체 히스토리를 3D 글로벌 뷰에 통합 오버레이 렌더링
                </p>
              </div>
            </div>
          </section>

          <section className="p-6 rounded-xl border border-rose-900/40 bg-rose-950/20 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <ShieldAlert size={18} />
              </div>
              <h2 className="text-lg font-bold text-white">
                제4조 (회원 탈퇴 및 연동 데이터의 동시 영구 파기) - 중요
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-slate-200">
              회원이 통합 계정 관리 센터 또는 개별 패밀리 서비스의 설정 메뉴를 통해 <strong>&apos;회원 탈퇴(계정 삭제)&apos;</strong>를 요청하는 경우, 개인정보보호법 및 글로벌 데이터 삭제 가이드라인에 의거하여 다음과 같은 절차가 <strong>동시에 일괄 실행</strong>됩니다:
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-lg bg-slate-950/80 border border-rose-900/30 text-rose-200">
                <strong>1. JP Rail DB:</strong> 완승 노선, 역 방문 스탬프, 개별 승하차 기록 전체가 즉시 영구 삭제됩니다.
              </div>
              <div className="p-3 rounded-lg bg-slate-950/80 border border-rose-900/30 text-rose-200">
                <strong>2. Regionevel DB:</strong> 대한민국 및 일본 지자체 색칠 지도, 타임라인 사진, 일기 메모가 즉시 영구 삭제됩니다.
              </div>
              <div className="p-3 rounded-lg bg-slate-950/80 border border-rose-900/30 text-rose-200">
                <strong>3. P-Plan DB:</strong> 작성된 모든 일정표, 예산 장부, 동행 로그가 즉시 영구 삭제됩니다.
              </div>
              <div className="p-3 rounded-lg bg-slate-950/80 border border-rose-900/30 text-rose-200">
                <strong>4. 통합 인증 자격 증명:</strong> Firebase Authentication의 사용자 계정 자체가 영구 삭제되며 복원할 수 없습니다.
              </div>
            </div>
          </section>

          <section className="space-y-3 border-t border-slate-800 pt-6">
            <h2 className="text-xl font-bold text-white">
              제5조 (문의 및 고객 지원)
            </h2>
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-400">공식 고객 지원 및 개인정보 보호 책임 이메일</span>
                <p className="text-base font-bold text-white">contact@pplaner.com</p>
              </div>

              <a href="mailto:contact@pplaner.com">
                <Button variant="outline" size="sm" leftIcon={<Mail size={14} />}>
                  문의하기
                </Button>
              </a>
            </div>
          </section>
        </div>

      </main>
    </div>
  );
}
