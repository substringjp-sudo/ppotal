'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, AuthModal } from '@ppotal/ui';
import { updateUserDisplayName, deleteUserProfileAndAuth, auth } from '@ppotal/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import {
  User as UserIcon,
  Mail,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  ExternalLink,
  Train,
  Map as MapIcon,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  LogOut,
  RefreshCw,
  Loader2,
  Check,
  Calendar,
  ArrowUpRight,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import '../globals.css';

export default function AccountPage() {
  const router = useRouter();
  const { user, profile, loading, logout, refreshProfile } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // 닉네임 수정 상태
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameUpdating, setNameUpdating] = useState(false);
  const [nameSuccess, setNameSuccess] = useState<string | null>(null);

  // 비밀번호 재설정 이메일 상태
  const [resetSending, setResetSending] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // 계정 삭제(회원 탈퇴) 토글 및 상태
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleteInputText, setDeleteInputText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const displayName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Explorer';

  // 닉네임 업데이트 핸들러
  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newDisplayName.trim()) return;
    setNameUpdating(true);
    setNameSuccess(null);
    try {
      await updateUserDisplayName(user, newDisplayName.trim());
      await refreshProfile();
      setNameSuccess('닉네임이 성공적으로 변경되었습니다.');
      setIsEditingName(false);
      setNewDisplayName('');
    } catch (err: any) {
      console.error('Failed to update display name:', err);
      alert('닉네임 변경 중 오류가 발생했습니다.');
    } finally {
      setNameUpdating(false);
    }
  };

  // 비밀번호 재설정 핸들러
  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setResetSending(true);
    setResetSuccess(null);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetSuccess(`${user.email} 메일로 재설정 링크가 전송되었습니다.`);
    } catch (err: any) {
      console.error('Failed to send password reset email:', err);
      alert('비밀번호 재설정 메일 전송에 실패했습니다.');
    } finally {
      setResetSending(false);
    }
  };

  // 통합 계정 및 모든 데이터 완전 삭제 핸들러
  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!deleteConfirmed) {
      alert('모든 서비스 데이터가 함께 영구 삭제됨을 확인하고 체크해주세요.');
      return;
    }
    if (deleteInputText.trim() !== '계정 삭제') {
      alert('안전을 위해 "계정 삭제"를 정확히 입력해주세요.');
      return;
    }

    const finalConfirm = window.confirm(
      '정말로 탈퇴하시겠습니까?\n\nJP Rail, Regionevel, P-Plan 등 모든 연동 서비스의 방문 기록, 스탬프, 일정표가 영구히 파기되며 복구할 수 없습니다.'
    );
    if (!finalConfirm) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteUserProfileAndAuth(user);
      alert('PPOTAL 통합 계정 및 모든 연동 데이터가 영구 삭제되었습니다. 이용해 주셔서 감사합니다.');
      router.push('/');
    } catch (err: any) {
      console.error('Account deletion error:', err);
      if (err?.code === 'auth/requires-recent-login') {
        setDeleteError('보안을 위해 최근 재인증이 필요합니다. 로그아웃 후 다시 로그인한 직후 탈퇴를 시도해주세요.');
      } else {
        setDeleteError(err?.message || '계정 삭제 처리 중 오류가 발생했습니다.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // 1. 로딩 상태
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 relative">
        <div className="bg-canvas">
          <div className="bg-light light-1"></div>
          <div className="bg-light light-2"></div>
        </div>
        <div className="flex flex-col items-center gap-4 text-slate-400 z-10">
          <Loader2 className="w-10 h-10 animate-spin text-sky-400" />
          <p className="text-sm font-semibold tracking-wide">PPOTAL 통합 계정 불러오는 중...</p>
        </div>
      </main>
    );
  }

  // 2. 비로그인 상태
  if (!user) {
    return (
      <main className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto flex flex-col items-center justify-center text-center relative">
        <div className="bg-canvas">
          <div className="bg-light light-1"></div>
          <div className="bg-light light-2"></div>
          <div className="bg-light light-3"></div>
        </div>

        <div className="relative overflow-hidden rounded-[32px] p-8 sm:p-12 border border-white/10 bg-slate-900/80 backdrop-blur-3xl shadow-[0_30px_100px_rgba(0,0,0,0.8)] space-y-7 w-full z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500/20 via-indigo-500/20 to-purple-500/20 border border-sky-400/30 text-sky-400 flex items-center justify-center mx-auto shadow-lg shadow-sky-500/10">
            <Layers className="w-8 h-8" />
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-bold">
              <ShieldCheck size={14} /> PPOTAL Unified Account
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading">
              통합 계정 관리 센터
            </h1>
            <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              하나의 계정으로 <strong>JP Rail</strong>, <strong>Regionevel</strong>, <strong>P-Plan</strong>의 모든 여행 기록과 데이터를 확인하고 안전하게 관리하세요.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:from-sky-400 hover:to-purple-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-500/25 active:scale-95 cursor-pointer"
            >
              통합 계정으로 로그인 / 회원가입
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-sm transition-all border border-white/10"
            >
              포털 둘러보기
            </Link>
          </div>
        </div>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          appName="Portal"
        />
      </main>
    );
  }

  // 3. 로그인 상태 - 프리미엄 통합 대시보드
  return (
    <div className="min-h-screen relative text-slate-100 pb-28">
      {/* Dynamic Ambient Aurora Background */}
      <div className="bg-canvas">
        <div className="bg-light light-1"></div>
        <div className="bg-light light-2"></div>
        <div className="bg-light light-3"></div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8 relative z-10">
        
        {/* Navigation Bar */}
        <header className="flex items-center justify-between py-2 border-b border-white/10 pb-5">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Layers className="text-white w-4.5 h-4.5" />
            </div>
            <div>
              <span className="font-heading text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                PPOTAL
              </span>
              <span className="block text-[9px] font-bold text-sky-400 tracking-wider uppercase">Unified Account</span>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            <Link
              href="/account/policy"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-all py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
            >
              <ShieldCheck size={14} className="text-sky-400" />
              <span>운영 방침 & 약관</span>
            </Link>

            <button
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-400 transition-colors py-2 px-3 rounded-lg hover:bg-red-500/10 cursor-pointer"
            >
              <LogOut size={14} />
              <span>로그아웃</span>
            </button>
          </div>
        </header>

        {/* Hero Profile Card */}
        <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8 border border-white/10 bg-slate-900/80 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            
            {/* Identity Info */}
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 p-[2px] shadow-xl shadow-sky-500/20">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-white text-2xl font-black font-heading">
                    {displayName[0]?.toUpperCase() || 'E'}
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-white" title="통합 계정 활성 상태">
                  <Check size={11} strokeWidth={3} />
                </div>
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-[10px] font-bold">
                    <Sparkles size={10} className="text-sky-400" /> Master Explorer
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> 3개 서비스 연동
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight font-heading truncate">
                  {displayName}
                </h1>
                
                <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                  <Mail size={12} className="text-slate-500 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              {!isEditingName && (
                <button
                  onClick={() => {
                    setNewDisplayName(displayName);
                    setIsEditingName(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all border border-white/10 hover:border-white/25 active:scale-95 cursor-pointer"
                >
                  닉네임 수정
                </button>
              )}

              <button
                onClick={handlePasswordReset}
                disabled={resetSending}
                className="px-3.5 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-bold transition-all border border-indigo-500/30 active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {resetSending ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
                <span>비밀번호 재설정</span>
              </button>
            </div>
          </div>

          {/* Inline Edit Form */}
          {isEditingName && (
            <form onSubmit={handleUpdateName} className="pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="새로운 닉네임 입력 (최대 20자)"
                className="flex-1 bg-white/5 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-all"
                maxLength={20}
                required
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={nameUpdating || !newDisplayName.trim()}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-sky-500/20"
                >
                  {nameUpdating ? '저장 중...' : '저장'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-medium transition-all cursor-pointer"
                >
                  취소
                </button>
              </div>
            </form>
          )}

          {nameSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 size={13} className="shrink-0" />
              {nameSuccess}
            </div>
          )}

          {resetSuccess && (
            <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-center gap-2">
              <CheckCircle2 size={13} className="shrink-0" />
              {resetSuccess}
            </div>
          )}

          {/* Account Meta Badges Bar */}
          <div className="pt-4 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-slate-400 block">인증 계정</span>
              <span className="font-semibold text-white truncate block">{user.email}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-slate-400 block">보안 상태</span>
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <ShieldCheck size={12} /> Firebase 암호화
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-slate-400 block">통합 프로필 생성</span>
              <span className="font-semibold text-slate-200">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('ko-KR') : '정상 생성'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-slate-400 block">고유 회원 식별자</span>
              <span className="font-mono text-[10px] text-slate-400 truncate block">{user.uid}</span>
            </div>
          </div>
        </section>

        {/* Connected Family Ecosystem Section */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold mb-1">
                <Layers size={11} /> Connected Ecosystem
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white font-heading">
                통합 계정으로 연동된 패밀리 서비스
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              별도 가입 없이 현재 계정으로 즉시 연동됩니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Service 1: JP Rail */}
            <div className="group rounded-2xl border border-sky-500/20 bg-slate-900/70 hover:border-sky-400/50 transition-all duration-300 shadow-lg hover:shadow-sky-500/10 flex flex-col justify-between overflow-hidden">
              <div>
                <div className="relative h-36 w-full overflow-hidden bg-slate-950">
                  <img
                    src="/screenshots/jrn-station-map.png"
                    alt="JP Rail 철도 지도"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/40"></div>
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-sky-950/80 backdrop-blur-md border border-sky-400/40 text-sky-400 text-[10px] font-bold flex items-center gap-1">
                    <Train size={11} /> JP Rail
                  </div>
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-emerald-950/80 backdrop-blur-md border border-emerald-400/40 text-emerald-400 text-[9px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> 동기화 중
                  </div>
                </div>

                <div className="p-5 space-y-1.5">
                  <h3 className="text-base font-bold text-white group-hover:text-sky-400 transition-colors">
                    JP Rail (일본 철도 완승 노트)
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    일본 신칸센, JR, 사철 전 노선과 역 방문 스탬프를 고정밀 벡터 지도로 아카이빙합니다.
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0">
                <a
                  href="https://jprail.pplaner.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 hover:border-sky-500/50 text-sky-400 text-xs font-bold transition-all flex items-center justify-between group-hover:bg-sky-500 group-hover:text-white"
                >
                  <span className="whitespace-nowrap">JP Rail 실행하기</span>
                  <ArrowUpRight size={14} className="shrink-0" />
                </a>
              </div>
            </div>

            {/* Service 2: Regionevel */}
            <div className="group rounded-2xl border border-emerald-500/20 bg-slate-900/70 hover:border-emerald-400/50 transition-all duration-300 shadow-lg hover:shadow-emerald-500/10 flex flex-col justify-between overflow-hidden">
              <div>
                <div className="relative h-36 w-full overflow-hidden bg-slate-950">
                  <img
                    src="/screenshots/rgn-world.png"
                    alt="Regionevel 여행 지도"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/40"></div>
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-emerald-950/80 backdrop-blur-md border border-emerald-400/40 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                    <MapIcon size={11} /> Regionevel
                  </div>
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-emerald-950/80 backdrop-blur-md border border-emerald-400/40 text-emerald-400 text-[9px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> 동기화 중
                  </div>
                </div>

                <div className="p-5 space-y-1.5">
                  <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                    Regionevel (전국 지자체 여행 지도)
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    한국 및 일본 행정구역을 발자취대로 색칠하고, 방문 사진과 추억을 지도에 기록합니다.
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0">
                <a
                  href="https://rgnevel.pplaner.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 text-xs font-bold transition-all flex items-center justify-between group-hover:bg-emerald-500 group-hover:text-white"
                >
                  <span className="whitespace-nowrap">Regionevel 실행하기</span>
                  <ArrowUpRight size={14} className="shrink-0" />
                </a>
              </div>
            </div>

            {/* Service 3: P-Plan */}
            <div className="group rounded-2xl border border-purple-500/20 bg-slate-900/70 hover:border-purple-400/50 transition-all duration-300 shadow-lg hover:shadow-purple-500/10 flex flex-col justify-between overflow-hidden">
              <div>
                <div className="relative h-36 w-full overflow-hidden bg-slate-950">
                  <img
                    src="/screenshots/rgn-city-history.png"
                    alt="P-Plan 여행 일정 플래너"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/40"></div>
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-purple-950/80 backdrop-blur-md border border-purple-400/40 text-purple-400 text-[10px] font-bold flex items-center gap-1">
                    <Sparkles size={11} /> P-Plan
                  </div>
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-emerald-950/80 backdrop-blur-md border border-emerald-400/40 text-emerald-400 text-[9px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> 동기화 중
                  </div>
                </div>

                <div className="p-5 space-y-1.5">
                  <h3 className="text-base font-bold text-white group-hover:text-purple-400 transition-colors">
                    P-Plan (AI 스마트 여행 플래너)
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    AI 기반 동선 추천과 3D 글로벌 뷰를 통해 장기 여행 계획과 예산, 일정을 정밀 설계합니다.
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0">
                <a
                  href="https://app.pplaner.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-500/50 text-purple-400 text-xs font-bold transition-all flex items-center justify-between group-hover:bg-purple-500 group-hover:text-white"
                >
                  <span className="whitespace-nowrap">P-Plan 실행하기</span>
                  <ArrowUpRight size={14} className="shrink-0" />
                </a>
              </div>
            </div>

          </div>
        </section>

        {/* Refined Danger Zone: Compact Accordion */}
        <section className="rounded-2xl border border-white/5 bg-slate-900/40 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => setIsDeleteOpen(!isDeleteOpen)}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors cursor-pointer select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <ShieldAlert size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">
                  통합 계정 삭제 (회원 탈퇴)
                </h3>
                <p className="text-xs text-slate-400">
                  JP Rail, Regionevel, P-Plan의 모든 연동 데이터가 영구 파기됩니다.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 shrink-0">
              <span>{isDeleteOpen ? '접기' : '탈퇴 설정'}</span>
              {isDeleteOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {/* Expanded Content */}
          {isDeleteOpen && (
            <div className="p-5 sm:p-7 pt-2 border-t border-red-500/20 bg-red-950/20 space-y-5 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-xs font-bold text-red-300">
                  ⚠️ 계정 삭제 시 다음 서비스 데이터가 예외 없이 영구 파기됩니다:
                </p>
                <Link
                  href="/account/policy"
                  className="text-xs text-red-300/80 hover:text-white underline inline-flex items-center gap-1 shrink-0"
                >
                  운영 방침 제5조 전문 확인 <ExternalLink size={11} />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-lg bg-black/40 border border-red-500/25 space-y-0.5">
                  <span className="font-bold text-sky-400 flex items-center gap-1 text-[11px]">
                    <Train size={12} /> JP Rail 데이터
                  </span>
                  <p className="text-[11px] text-red-200/80 leading-tight">
                    완승 노선, 역 방문 스탬프, 탑승 히스토리 영구 삭제
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-black/40 border border-red-500/25 space-y-0.5">
                  <span className="font-bold text-emerald-400 flex items-center gap-1 text-[11px]">
                    <MapIcon size={12} /> Regionevel 데이터
                  </span>
                  <p className="text-[11px] text-red-200/80 leading-tight">
                    전국 행정구역 색칠, 메모, 타임라인 사진 영구 삭제
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-black/40 border border-red-500/25 space-y-0.5">
                  <span className="font-bold text-purple-400 flex items-center gap-1 text-[11px]">
                    <Sparkles size={12} /> P-Plan 데이터
                  </span>
                  <p className="text-[11px] text-red-200/80 leading-tight">
                    모든 여행 일정표, 버킷리스트, 여행 로그 영구 삭제
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer select-none p-3 rounded-xl bg-black/30 border border-red-500/20 hover:bg-black/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={deleteConfirmed}
                    onChange={(e) => setDeleteConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-red-600 focus:ring-red-500 border-white/20 bg-slate-800 shrink-0"
                  />
                  <span className="text-xs text-red-200 leading-snug">
                    안내사항을 확인하였으며, 통합 계정 삭제 시 <strong>모든 연동 서비스의 DB가 영구 삭제되어 복구할 수 없음</strong>에 동의합니다.
                  </span>
                </label>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={deleteInputText}
                      onChange={(e) => setDeleteInputText(e.target.value)}
                      placeholder='실수 방지를 위해 "계정 삭제"를 입력하세요'
                      className="w-full bg-slate-950/80 border border-red-500/30 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-400"
                    />
                  </div>

                  <button
                    onClick={handleDeleteAccount}
                    disabled={!deleteConfirmed || deleteInputText.trim() !== '계정 삭제' || isDeleting}
                    className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-red-600/30 shrink-0"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>영구 삭제 진행 중...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 size={15} />
                        <span>계정 및 데이터 영구 삭제</span>
                      </>
                    )}
                  </button>
                </div>

                {deleteError && (
                  <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs">
                    {deleteError}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
