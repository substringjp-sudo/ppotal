import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
    MapPin,
    Train,
    Cloud,
    ShieldCheck,
    Smartphone,
    Share2,
    CheckCircle2,
    ArrowRight,
    Sparkles,
    Download
} from 'lucide-react';

export const metadata: Metadata = {
    title: 'JapanRailNote 모바일 앱 — 일본 철도 완승 기록 안드로이드 앱',
    description: '일본 전국의 JR, 사철, 신칸센 노선도에서 탑승 구간을 기록하고 완승률을 관리하세요. Google 클라우드 자동 동기화와 타임라인 로컬 분석을 지원합니다.',
    openGraph: {
        title: 'JapanRailNote 모바일 앱',
        description: '내 손안의 일본 철도 여행기, 완승률 관리 & 클라우드 동기화',
        images: ['/images/app/map_main.png'],
    },
};

export default function AppPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
            {/* Top Navigation */}
            <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Link href="/app" className="flex items-center gap-2.5 group">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition">
                            <Train className="w-5 h-5" />
                        </div>
                        <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                            JapanRailNote <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 ml-1">App</span>
                        </span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <Link
                            href="/"
                            className="hidden sm:inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition"
                        >
                            웹 지도 바로가기 ↗
                        </Link>
                        <Link
                            href="/privacy/app"
                            className="text-xs text-slate-400 hover:text-white transition"
                        >
                            개인정보처리방침
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
                {/* Background glow effects */}
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/10 to-purple-600/5 rounded-full blur-3xl pointer-events-none" />

                <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                        {/* Hero Text */}
                        <div className="lg:col-span-7 text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6 animate-pulse">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Android 전용 앱 출시</span>
                            </div>

                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] mb-6">
                                내 손안의 일본 철도 여행기, <br />
                                <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
                                    JapanRailNote
                                </span>
                            </h1>

                            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl mx-auto lg:mx-0 mb-8">
                                전국 JR 노선과 사철, 신칸센 노선도 위에서 펼쳐지는 나만의 완승 지도.<br className="hidden sm:inline" />
                                드래그 한 번으로 탑승 구간을 기록하고, 구글 클라우드로 안전하게 동기화하세요.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                                {/* Google Play Badge Button */}
                                <a
                                    href="https://play.google.com/store/apps/details?id=com.pplan.jprail"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition duration-200"
                                >
                                    <Download className="w-5 h-5" />
                                    <div className="text-left">
                                        <div className="text-[10px] uppercase tracking-wider text-blue-200 font-medium leading-none">GET IT ON</div>
                                        <div className="text-sm font-bold leading-tight">Google Play</div>
                                    </div>
                                </a>

                                <Link
                                    href="/"
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-semibold text-sm transition"
                                >
                                    <span>웹 버전 지도 체험하기</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>

                            <div className="mt-8 flex items-center justify-center lg:justify-start gap-6 text-xs text-slate-400">
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span>구글 계정 자동 동기화</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span>로컬 타임라인 안전 파싱</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span>오프라인 완승 관리</span>
                                </div>
                            </div>
                        </div>

                        {/* Hero Device Mockup */}
                        <div className="lg:col-span-5 flex justify-center">
                            <div className="relative w-[280px] sm:w-[310px] rounded-[44px] p-3 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 shadow-2xl shadow-blue-500/20 border border-slate-700/60 ring-1 ring-white/10">
                                {/* Smartphone Camera Notch */}
                                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-900 rounded-full z-20" />
                                
                                {/* Device Screen Content */}
                                <div className="relative rounded-[34px] overflow-hidden bg-slate-950 aspect-[9/19.5] border border-slate-800/80">
                                    <Image
                                        src="/images/app/map_main.png"
                                        alt="JapanRailNote App Main Screen"
                                        fill
                                        sizes="(max-width: 768px) 300px, 340px"
                                        className="object-cover"
                                        priority
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Key Features Section */}
            <section className="py-20 bg-slate-900/60 border-y border-slate-800/80 relative">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <span className="text-blue-400 text-xs font-bold uppercase tracking-wider">Features</span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-4 tracking-tight">
                            철도 여행자를 위해 완성된 핵심 기능
                        </h2>
                        <p className="text-slate-400 text-sm sm:text-base">
                            일본 여행 중에도, 다녀온 뒤에도 언제든 손쉽게 내 여정을 기록하고 감상할 수 있습니다.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Feature 1 */}
                        <div className="p-7 rounded-3xl bg-slate-950/70 border border-slate-800/80 hover:border-blue-500/50 transition group">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition">
                                <Train className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">정교한 전국 인터랙티브 노선망</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                JR 동일본·서일본·도카이·규슈·홋카이도·시코쿠는 물론 도쿄 메트로와 각 지역 사철까지, 일본 전국의 모든 철도 노선이 실시간 벡터 지도로 펼쳐집니다.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="p-7 rounded-3xl bg-slate-950/70 border border-slate-800/80 hover:border-blue-500/50 transition group">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition">
                                <MapPin className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">간편한 드래그 & 터치 탑승 기록</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                출발역에서 도착역까지 손가락으로 드래그하거나 터치 한 번으로 구간을 선택하세요. 탑승한 노선은 지도 위에 선명한 완승 색상으로 표시됩니다.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="p-7 rounded-3xl bg-slate-950/70 border border-slate-800/80 hover:border-blue-500/50 transition group">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition">
                                <Cloud className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Google 클라우드 실시간 동기화</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Google Firebase 인프라를 통해 기기를 바꾸거나 새로 설치해도 이전 탑승 기록과 누적 거리(km)가 1초 만에 안전하게 자동 복원됩니다.
                            </p>
                        </div>

                        {/* Feature 4 */}
                        <div className="p-7 rounded-3xl bg-slate-950/70 border border-slate-800/80 hover:border-blue-500/50 transition group">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-6 group-hover:scale-110 transition">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">안전한 로컬 타임라인 자동 판정</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Google 타임라인 JSON 파일을 앱에 넣으면 기기 내부에서만 로컬로 안전하게 분석하여 이동했던 열차 구간을 스마트하게 찾아 기록해 줍니다.
                            </p>
                        </div>

                        {/* Feature 5 */}
                        <div className="p-7 rounded-3xl bg-slate-950/70 border border-slate-800/80 hover:border-blue-500/50 transition group">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-6 group-hover:scale-110 transition">
                                <Smartphone className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">노선별 완승률 & 이동 통계</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                내가 달린 총 탑승 거리(km)와 회사별·노선별 완승 비율을 한눈에 확인하고 타임라인 히스토리로 여행의 추억을 되짚어보세요.
                            </p>
                        </div>

                        {/* Feature 6 */}
                        <div className="p-7 rounded-3xl bg-slate-950/70 border border-slate-800/80 hover:border-blue-500/50 transition group">
                            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-6 group-hover:scale-110 transition">
                                <Share2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">감성 여행 카드 & 소셜 공유</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                완승한 노선도와 여행 통계를 예쁜 카드 이미지로 내보내어 인스타그램이나 트위터, 친구들에게 공유하고 자랑할 수 있습니다.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Screenshots Gallery Section */}
            <section className="py-20 sm:py-28 relative">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <span className="text-blue-400 text-xs font-bold uppercase tracking-wider">Preview</span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-4 tracking-tight">
                            실제 앱 구동 화면 미리보기
                        </h2>
                        <p className="text-slate-400 text-sm sm:text-base">
                            깔끔하고 직관적인 UI로 철도 마니아부터 여행자까지 누구나 편리하게 쓸 수 있습니다.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Screen 1 */}
                        <div className="flex flex-col items-center">
                            <div className="w-full relative aspect-[9/19.5] rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl group hover:border-blue-500/50 transition">
                                <Image
                                    src="/images/app/map_main.png"
                                    alt="노선도 및 구간 선택 화면"
                                    fill
                                    sizes="(max-width: 768px) 100vw, 250px"
                                    className="object-cover group-hover:scale-105 transition duration-300"
                                />
                            </div>
                            <div className="mt-4 text-center">
                                <h4 className="font-semibold text-white text-sm">노선도 및 구간 선택</h4>
                                <p className="text-xs text-slate-400 mt-1">인터랙티브 지도에서 손쉬운 드래그 기록</p>
                            </div>
                        </div>

                        {/* Screen 2 */}
                        <div className="flex flex-col items-center">
                            <div className="w-full relative aspect-[9/19.5] rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl group hover:border-blue-500/50 transition">
                                <Image
                                    src="/images/app/trips_list.png"
                                    alt="탑승 기록 및 히스토리"
                                    fill
                                    sizes="(max-width: 768px) 100vw, 250px"
                                    className="object-cover group-hover:scale-105 transition duration-300"
                                />
                            </div>
                            <div className="mt-4 text-center">
                                <h4 className="font-semibold text-white text-sm">탑승 기록 타임라인</h4>
                                <p className="text-xs text-slate-400 mt-1">날짜별, 노선별 기록 관리 및 거리 확인</p>
                            </div>
                        </div>

                        {/* Screen 3 */}
                        <div className="flex flex-col items-center">
                            <div className="w-full relative aspect-[9/19.5] rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl group hover:border-blue-500/50 transition">
                                <Image
                                    src="/images/app/settings_sync.png"
                                    alt="클라우드 동기화 설정"
                                    fill
                                    sizes="(max-width: 768px) 100vw, 250px"
                                    className="object-cover group-hover:scale-105 transition duration-300"
                                />
                            </div>
                            <div className="mt-4 text-center">
                                <h4 className="font-semibold text-white text-sm">클라우드 백업 및 설정</h4>
                                <p className="text-xs text-slate-400 mt-1">Google 계정으로 데이터 안전 보관</p>
                            </div>
                        </div>

                        {/* Screen 4 */}
                        <div className="flex flex-col items-center">
                            <div className="w-full relative aspect-[9/19.5] rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl group hover:border-blue-500/50 transition">
                                <Image
                                    src="/images/app/guide_dialog.png"
                                    alt="친절한 이용 안내 가이드"
                                    fill
                                    sizes="(max-width: 768px) 100vw, 250px"
                                    className="object-cover group-hover:scale-105 transition duration-300"
                                />
                            </div>
                            <div className="mt-4 text-center">
                                <h4 className="font-semibold text-white text-sm">상세 이용 가이드</h4>
                                <p className="text-xs text-slate-400 mt-1">첫 사용자도 쉽게 따라 할 수 있는 튜토리얼</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Privacy & Security Banner */}
            <section className="py-16 bg-slate-900/40 border-t border-slate-800/80">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <div className="p-8 rounded-3xl bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-800/30 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">철저한 개인정보 보호 및 데이터 안전</h3>
                                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                    JapanRailNote는 불필요한 개인정보나 GPS 실시간 위치를 서버에 수집하지 않습니다. 데이터 삭제 요청도 언제든 보장됩니다.
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/privacy/app"
                            className="shrink-0 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition"
                        >
                            앱 개인정보처리방침 전문 보기 →
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-slate-800/80 bg-slate-950 text-slate-400 text-xs">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                        <Train className="w-4 h-4 text-blue-500" />
                        <span className="font-bold text-slate-200">JapanRailNote</span>
                        <span className="text-slate-600">|</span>
                        <span>Package: <code className="text-slate-400 font-mono">com.pplan.jprail</code></span>
                    </div>

                    <div className="flex flex-wrap items-center gap-6">
                        <Link href="/" className="hover:text-white transition">웹 노선도</Link>
                        <Link href="/privacy/app" className="hover:text-white transition">앱 개인정보처리방침</Link>
                        <Link href="/privacy" className="hover:text-white transition">웹 개인정보처리방침</Link>
                        <a href="mailto:substring.jp@gmail.com" className="hover:text-white transition">문의: substring.jp@gmail.com</a>
                    </div>
                </div>
                <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 pt-6 border-t border-slate-900 text-center text-slate-600 text-[11px]">
                    © 2026 JapanRailNote by substring. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
