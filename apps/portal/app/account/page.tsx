'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, AuthModal, AppHeader, Button } from '@ppotal/ui';
import { updateUserDisplayName, deleteUserProfileAndAuth, auth } from '@ppotal/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import {
  Layers,
  ShieldCheck,
  Trash2,
  ExternalLink,
  Train,
  Map as MapIcon,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  LogOut,
  Loader2,
  Check,
  ArrowUpRight,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Mail,
} from 'lucide-react';

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
      setResetSuccess(`${user.email} 메일로 비밀번호 재설정 링크가 전송되었습니다.`);
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
      '정말로 탈퇴하시겠습니까?\n\nJP Rail, Regionevel, P-Plan 등 모든 연동 서비스의 방문 기록, 스탬프, 일정표가 영구히 파기되며 되돌릴 수 없습니다.'
    );
    if (!finalConfirm) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteUserProfileAndAuth(user);
      alert('PPLANER 통합 계정 및 모든 연동 데이터가 영구 삭제되었습니다. 이용해 주셔서 감사합니다.');
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
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <AppHeader
          theme="dark"
          className="shadow-sm"
          logo={
            <Link href="/" className="flex items-center gap-2.5 min-w-0" aria-label="PPLANER 홈">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center shadow-sm">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-black tracking-tight text-white">
                PPLANER
              </span>
            </Link>
          }
        />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
          <p className="text-sm font-medium">계정 정보를 불러오는 중입니다</p>
        </div>
      </div>
    );
  }

  // 2. 비로그인 상태
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <AppHeader
          theme="dark"
          className="shadow-sm"
          logo={
            <Link href="/" className="flex items-center gap-2.5 min-w-0" aria-label="PPLANER 홈">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center shadow-sm">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-black tracking-tight text-white">
                PPLANER
              </span>
            </Link>
          }
          right={
            <Button variant="primary" size="sm" onClick={() => setIsAuthModalOpen(true)} className="!bg-primary text-white font-bold">
              로그인
            </Button>
          }
        />

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center space-y-6 shadow-xl">
            <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center mx-auto">
              <Layers size={28} />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
                통합 계정
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">
                계정 관리
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                하나의 계정으로 JP Rail, Regionevel, P-Plan의 모든 여행 데이터를 확인하고 관리할 수 있습니다.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full justify-center h-10 !bg-primary text-white font-semibold"
              >
                로그인
              </Button>
              <Link href="/" className="w-full">
                <Button variant="outline" size="md" className="w-full justify-center h-10 border-slate-700 text-slate-300 hover:bg-slate-800">
                  홈
                </Button>
              </Link>
            </div>
          </div>
        </main>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          appName="Portal"
        />
      </div>
    );
  }

  // 3. 로그인 상태 - 공식 @ppotal/ui 시스템 기반 대시보드
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      
      {/* 1. Official Unified AppHeader (56px) */}
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
          <div className="flex items-center gap-2.5">
            <Link href="/account/policy">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white hover:bg-slate-800/80"
              >
                약관 및 정책
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => logout()}
              leftIcon={<LogOut size={15} />}
              className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
            >
              로그아웃
            </Button>
          </div>
        }
      />

      {/* Main Workspace */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        
        {/* Profile Card */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 space-y-6">
          
          {/* Identity & Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            
            {/* Avatar & Title */}
            <div className="flex items-center gap-4 sm:gap-5 min-w-0">
              <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white text-xl font-bold shrink-0">
                {displayName[0]?.toUpperCase() || 'P'}
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/80">
                    통합 계정
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                  {displayName}
                </h1>
                
                <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-1.5 truncate">
                  <Mail size={13} className="text-slate-500 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
              {!isEditingName && (
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setNewDisplayName(displayName);
                    setIsEditingName(true);
                  }}
                  className="h-9 px-3.5 rounded-lg border-slate-700 bg-slate-800/40 hover:bg-slate-800 text-slate-200 text-xs font-semibold"
                >
                  닉네임 수정
                </Button>
              )}

              <Button
                variant="secondary"
                size="md"
                onClick={handlePasswordReset}
                isLoading={resetSending}
                leftIcon={<KeyRound size={14} />}
                className="h-9 px-3.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                비밀번호 변경
              </Button>
            </div>
          </div>

          {/* Inline Edit Form */}
          {isEditingName && (
            <form onSubmit={handleUpdateName} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="새로운 닉네임 입력 (최대 20자)"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
                maxLength={20}
                required
              />
              <div className="flex gap-2 shrink-0">
                <Button variant="primary" size="md" type="submit" isLoading={nameUpdating} className="h-9 px-4 text-xs font-semibold">
                  저장
                </Button>
                <Button variant="ghost" size="md" type="button" onClick={() => setIsEditingName(false)} className="h-9 px-3.5 text-xs">
                  취소
                </Button>
              </div>
            </form>
          )}

          {nameSuccess && (
            <div className="p-3.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 text-xs flex items-center gap-2">
              <CheckCircle2 size={14} className="text-slate-400 shrink-0" />
              <span>{nameSuccess}</span>
            </div>
          )}

          {resetSuccess && (
            <div className="p-3.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 text-xs flex items-center gap-2">
              <CheckCircle2 size={14} className="text-slate-400 shrink-0" />
              <span>{resetSuccess}</span>
            </div>
          )}

          {/* Account Meta Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-6 border-t border-slate-800">
            <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/60 space-y-1">
              <span className="text-xs text-slate-400 font-medium block">인증 계정</span>
              <span className="text-sm font-semibold text-white truncate block">{user.email}</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/60 space-y-1">
              <span className="text-xs text-slate-400 font-medium block">인증 방식</span>
              <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-slate-400" /> 이메일 로그인
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/60 space-y-1">
              <span className="text-xs text-slate-400 font-medium block">가입일</span>
              <span className="text-sm font-semibold text-slate-200 block">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('ko-KR') : '확인됨'}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/60 space-y-1">
              <span className="text-xs text-slate-400 font-medium block">회원 고유 식별자</span>
              <span className="text-xs font-mono text-slate-400 truncate block" title={user.uid}>
                {user.uid}
              </span>
            </div>
          </div>
        </section>

        {/* Connected Services Section */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              연동 서비스
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              통합 계정으로 바로 이용할 수 있는 서비스입니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            
            {/* Service 1: JP Rail */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div>
                <div className="relative h-44 w-full overflow-hidden bg-slate-950">
                  <img
                    src="/screenshots/jrn-station-map.png"
                    alt="JP Rail"
                    className="w-full h-full object-cover opacity-85"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/20"></div>
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-slate-900/80 backdrop-blur-sm border border-slate-700/80 text-slate-200 text-xs font-medium flex items-center gap-1.5">
                    <Train size={13} className="text-slate-400" /> JP Rail
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-2">
                  <h3 className="text-base font-bold text-white">
                    JP Rail
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    일본 신칸센, JR, 사철 전 노선과 역 방문 스탬프를 벡터 지도로 기록합니다.
                  </p>
                </div>
              </div>

              <div className="p-5 sm:p-6 pt-0">
                <a href="https://jprail.pplaner.com" target="_blank" rel="noopener noreferrer" className="block w-full">
                  <Button variant="secondary" size="md" className="w-full justify-center h-10 rounded-lg text-slate-200 font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700" rightIcon={<ArrowUpRight size={15} />}>
                    열기
                  </Button>
                </a>
              </div>
            </div>

            {/* Service 2: Regionevel */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div>
                <div className="relative h-44 w-full overflow-hidden bg-slate-950">
                  <img
                    src="/screenshots/rgn-world.png"
                    alt="Regionevel"
                    className="w-full h-full object-cover opacity-85"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/20"></div>
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-slate-900/80 backdrop-blur-sm border border-slate-700/80 text-slate-200 text-xs font-medium flex items-center gap-1.5">
                    <MapIcon size={13} className="text-slate-400" /> Regionevel
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-2">
                  <h3 className="text-base font-bold text-white">
                    Regionevel
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    한국 및 일본 전역의 행정구역 방문 발자취와 기록을 지도에 남깁니다.
                  </p>
                </div>
              </div>

              <div className="p-5 sm:p-6 pt-0">
                <a href="https://rgnevel.pplaner.com" target="_blank" rel="noopener noreferrer" className="block w-full">
                  <Button variant="secondary" size="md" className="w-full justify-center h-10 rounded-lg text-slate-200 font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700" rightIcon={<ArrowUpRight size={15} />}>
                    열기
                  </Button>
                </a>
              </div>
            </div>

            {/* Service 3: P-Plan */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div>
                <div className="relative h-44 w-full overflow-hidden bg-slate-950">
                  <img
                    src="/screenshots/rgn-city-history.png"
                    alt="P-Plan"
                    className="w-full h-full object-cover opacity-85"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/20"></div>
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-slate-900/80 backdrop-blur-sm border border-slate-700/80 text-slate-200 text-xs font-medium flex items-center gap-1.5">
                    <Sparkles size={13} className="text-slate-400" /> P-Plan
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-2">
                  <h3 className="text-base font-bold text-white">
                    P-Plan
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    여행 동선과 일정표, 예산을 체계적으로 설계하고 관리합니다.
                  </p>
                </div>
              </div>

              <div className="p-5 sm:p-6 pt-0">
                <a href="https://app.pplaner.com" target="_blank" rel="noopener noreferrer" className="block w-full">
                  <Button variant="secondary" size="md" className="w-full justify-center h-10 rounded-lg text-slate-200 font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700" rightIcon={<ArrowUpRight size={15} />}>
                    열기
                  </Button>
                </a>
              </div>
            </div>

          </div>
        </section>

        {/* Danger Zone */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsDeleteOpen(!isDeleteOpen)}
            className="w-full p-5 sm:p-6 flex items-center justify-between text-left hover:bg-slate-800/20 transition-colors cursor-pointer select-none"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                <ShieldAlert size={18} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  계정 삭제
                </h3>
                <p className="text-xs text-slate-400">
                  모든 연동 서비스의 데이터가 영구적으로 파기됩니다.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 shrink-0">
              <span>{isDeleteOpen ? '닫기' : '계정 삭제'}</span>
              {isDeleteOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </div>
          </button>

          {/* Expanded Delete Zone */}
          {isDeleteOpen && (
            <div className="p-5 sm:p-6 pt-2 border-t border-slate-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-xs sm:text-sm font-medium text-slate-300">
                  계정 삭제 시 아래 서비스의 모든 데이터가 영구 삭제됩니다:
                </p>
                <Link
                  href="/account/policy"
                  className="text-xs text-slate-400 hover:text-white underline inline-flex items-center gap-1 shrink-0"
                >
                  삭제 정책 확인 <ExternalLink size={12} />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="font-semibold text-slate-200 block">JP Rail</span>
                  <p className="text-xs text-slate-400">
                    완승 노선, 역 방문 스탬프, 탑승 기록
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="font-semibold text-slate-200 block">Regionevel</span>
                  <p className="text-xs text-slate-400">
                    행정구역 지도 기록, 메모, 타임라인
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="font-semibold text-slate-200 block">P-Plan</span>
                  <p className="text-xs text-slate-400">
                    여행 일정표, 버킷리스트, 여행 로그
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <label className="flex items-start gap-3 cursor-pointer select-none p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={deleteConfirmed}
                    onChange={(e) => setDeleteConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-slate-200 border-slate-700 bg-slate-900 shrink-0"
                  />
                  <span className="text-xs sm:text-sm text-slate-300 leading-snug">
                    안내사항을 확인하였으며, 모든 연동 데이터가 영구 삭제되어 복구할 수 없음에 동의합니다.
                  </span>
                </label>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    value={deleteInputText}
                    onChange={(e) => setDeleteInputText(e.target.value)}
                    placeholder='"계정 삭제" 입력'
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-500"
                  />

                  <Button
                    variant="danger"
                    size="md"
                    onClick={handleDeleteAccount}
                    disabled={!deleteConfirmed || deleteInputText.trim() !== '계정 삭제' || isDeleting}
                    isLoading={isDeleting}
                    leftIcon={<Trash2 size={15} />}
                    className="h-10 px-5 rounded-lg text-xs font-bold"
                  >
                    계정 삭제
                  </Button>
                </div>

                {deleteError && (
                  <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs">
                    {deleteError}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
