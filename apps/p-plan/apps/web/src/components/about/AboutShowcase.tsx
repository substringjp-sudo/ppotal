'use client';

import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import {
    ShieldAlert, Bed, ClipboardCheck, Globe, CloudSun,
    ArrowRight, CheckCircle2, Plane, AlertTriangle,
} from 'lucide-react';

const SHOWCASE_DATA = [
    {
        id: 'conflict',
        label: '일정 충돌·중복 검증',
        icon: <ShieldAlert className="w-5 h-5" />,
        title: '겹치는 일정, 로그인 없이 바로 찾아드려요',
        description: '시간이 겹치는 일정, 무리한 동선, 같은 곳을 여러 날 방문하는 중복까지 입력하는 즉시 확인합니다.',
        features: ['시간 겹침·과밀 일정 자동 감지', '무리한 동선·연속 이동일 경고', '여행 타입(빡빡하게/느긋하게)에 따라 경고 강도 자동 조절'],
        color: 'text-red-500',
        bg: 'bg-red-500',
        borderColor: 'border-red-200 dark:border-red-900/50',
    },
    {
        id: 'logistics',
        label: '숙소·항공 정합성',
        icon: <Bed className="w-5 h-5" />,
        title: '예약 사이의 빈틈을 확인합니다',
        description: '숙소가 비는 날, 항공편 도착 시간과 체크인이 충돌하는 문제, 별도 발권 연결편에서 공항이 바뀌는 위험까지 짚어냅니다.',
        features: ['숙소 공백·중복 예약 자동 확인', '심야 도착·이른 출발 시 체크인 충돌 경고', '셀프 환승 시 공항 변경·수하물 재수속 경고'],
        color: 'text-blue-500',
        bg: 'bg-blue-500',
        borderColor: 'border-blue-200 dark:border-blue-900/50',
    },
    {
        id: 'reservation',
        label: '예약 완전성',
        icon: <ClipboardCheck className="w-5 h-5" />,
        title: '예약, 확정됐는지 놓치지 않게',
        description: '확정 예약인데 바우처 정보가 없거나, 예약이 필요한 항목을 아직 안 했거나, 예약 시간이 다른 일정과 겹치는지 확인합니다.',
        features: ['확정 예약의 바우처/링크 누락 확인', '미예약 항목 사전 알림', '예약 시간과 고정 일정 충돌 감지'],
        color: 'text-amber-500',
        bg: 'bg-amber-500',
        borderColor: 'border-amber-200 dark:border-amber-900/50',
    },
    {
        id: 'prep',
        label: '국가별 준비물·입국 요건',
        icon: <Globe className="w-5 h-5" />,
        title: '내 국적 기준으로 계산한 준비물',
        description: '출발국과 도착국을 함께 고려해 여권 유효기간, 어댑터/전압, 무비자·전자여행허가(ETA)·비자 필요 여부까지 안내합니다.',
        features: ['여권 유효기간·어댑터·전압 자동 비교', '국적별 무비자/ETA/비자 필요 여부 확인', '국제운전면허·여행자보험 등 실무 체크리스트'],
        color: 'text-emerald-500',
        bg: 'bg-emerald-500',
        borderColor: 'border-emerald-200 dark:border-emerald-900/50',
    },
    {
        id: 'live',
        label: '무료 실시간 정보',
        icon: <CloudSun className="w-5 h-5" />,
        title: '날씨·공휴일·환율까지 무료로',
        description: '여행 기간의 날씨, 현지 공휴일로 인한 혼잡과 예약 촉구, 실시간 환율까지 별도 비용 없이 확인할 수 있습니다.',
        features: ['여행지 날씨 예보 연동', '현지 연휴 혼잡 안내 및 숙소 미확정 시 경고', '실시간 환율 안내'],
        color: 'text-sky-500',
        bg: 'bg-sky-500',
        borderColor: 'border-sky-200 dark:border-sky-900/50',
    },
];

export default function AboutShowcase() {
    const [activeTab, setActiveTab] = useState(SHOWCASE_DATA[0].id);
    const activeData = SHOWCASE_DATA.find(t => t.id === activeTab)!;

    return (
        <section className="py-24 bg-slate-50 dark:bg-slate-900/40">
            <div className="max-w-7xl mx-auto px-4 lg:px-20">
                <div className="text-center mb-24">
                    <motion.span
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-4 inline-block"
                    >
                        무엇을 확인해주나요
                    </motion.span>
                    <h2 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white leading-tight">
                        여행자가 놓치기 쉬운 것들을<br />앱이 대신 확인합니다
                    </h2>
                    <p className="mt-6 text-slate-500 font-medium">스크롤을 내려 각 점검 항목을 자세히 살펴보세요.</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-16 relative">
                    {/* Left: Sticky Mockup Display */}
                    <div className="lg:flex-1 h-fit lg:sticky lg:top-32 order-2 lg:order-1">
                        <div className="relative w-full aspect-square max-w-[600px] mx-auto">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: -30 }}
                                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                    className={`absolute inset-0 bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-10 flex items-center justify-center border-2 ${activeData.borderColor}`}
                                >
                                    {activeTab === 'conflict' && <ConflictMockup />}
                                    {activeTab === 'logistics' && <LogisticsMockup />}
                                    {activeTab === 'reservation' && <ReservationMockup />}
                                    {activeTab === 'prep' && <PrepMockup />}
                                    {activeTab === 'live' && <LiveInfoMockup />}
                                </motion.div>
                            </AnimatePresence>

                            <motion.div
                                animate={{ borderColor: activeData.bg }}
                                className="absolute -inset-4 rounded-[3.5rem] border-2 border-dashed opacity-20 -z-10 transition-colors duration-500"
                            />
                        </div>
                    </div>

                    {/* Right: Scrolling Content */}
                    <div className="lg:flex-1 space-y-32 order-1 lg:order-2 pb-[30vh]">
                        {SHOWCASE_DATA.map((item) => (
                            <ContentSection key={item.id} data={item} onInView={() => setActiveTab(item.id)} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

function ContentSection({ data, onInView }: { data: typeof SHOWCASE_DATA[0]; onInView: () => void }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { margin: '-45% 0px -45% 0px' });

    useEffect(() => {
        if (isInView) onInView();
    }, [isInView, onInView]);

    return (
        <div ref={ref} className={`space-y-8 py-20 transition-opacity duration-500 ${isInView ? 'opacity-100' : 'opacity-30'}`}>
            <div className="space-y-6">
                <span className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest inline-flex items-center gap-2 bg-white dark:bg-slate-800 shadow-sm border ${data.borderColor} ${data.color}`}>
                    {data.icon}
                    {data.label}
                </span>
                <h3 className="text-4xl font-black text-slate-900 dark:text-white leading-tight">{data.title}</h3>
                <p className="text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{data.description}</p>
            </div>

            <div className="space-y-4">
                {data.features.map((f, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-3"
                    >
                        <div className={`w-5 fill-current ${data.color}`}>
                            <CheckCircle2 className="w-5 h-5 shadow-sm" />
                        </div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{f}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// --- Mockup Sub-Components (실제 화면 톤을 그대로 재현) ---

function ConflictMockup() {
    return (
        <div className="w-full space-y-5">
            <div className="rounded-3xl border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/15 p-5">
                <div className="flex items-start gap-3">
                    <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                        확인 필요
                    </span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        1일차: '센소지'와 '도쿄 스카이트리'의 시간이 겹칩니다.
                    </p>
                </div>
            </div>
            <div className="rounded-3xl border border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-900/15 p-5">
                <div className="flex items-start gap-3">
                    <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        참고
                    </span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        3일차 일정이 하루 6곳으로 빡빡해요. 이동 여유를 확인해보세요.
                    </p>
                </div>
            </div>
        </div>
    );
}

function LogisticsMockup() {
    return (
        <div className="w-full space-y-5">
            <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl shadow-xl ring-1 ring-slate-200 dark:ring-white/10 flex items-center gap-4">
                <div className="w-11 h-11 bg-blue-500 rounded-2xl flex items-center justify-center text-white shrink-0">
                    <Plane className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">환승 경고</p>
                    <p className="text-sm font-bold dark:text-white">LGW 도착 → LHR 출발, 공항이 달라요</p>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl shadow-xl ring-1 ring-slate-200 dark:ring-white/10 flex items-center gap-4">
                <div className="w-11 h-11 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shrink-0">
                    <Bed className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">숙소 공백</p>
                    <p className="text-sm font-bold dark:text-white">8/3 밤에 예약된 숙소가 없어요</p>
                </div>
            </div>
        </div>
    );
}

function ReservationMockup() {
    return (
        <div className="w-full space-y-5">
            <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl shadow-xl ring-1 ring-slate-200 dark:ring-white/10 flex items-center gap-4">
                <div className="w-11 h-11 bg-amber-500 rounded-2xl flex items-center justify-center text-white shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">미예약</p>
                    <p className="text-sm font-bold dark:text-white">'디즈니랜드 입장권'이 아직 예약 전이에요</p>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl shadow-xl ring-1 ring-slate-200 dark:ring-white/10 flex items-center gap-4">
                <div className="w-11 h-11 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shrink-0">
                    <ClipboardCheck className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">확인 완료</p>
                    <p className="text-sm font-bold dark:text-white">오마카세 예약, 일정 충돌 없음</p>
                </div>
            </div>
        </div>
    );
}

function PrepMockup() {
    return (
        <div className="w-full space-y-4">
            {[
                { label: '여권 유효기간', status: '6개월 이상 남음', ok: true },
                { label: '전자여행허가(ETA)', status: '필수 · 미신청', ok: false },
                { label: '전원 어댑터', status: 'C타입 필요', ok: true },
                { label: '국제운전면허', status: '렌터카 예정 · 발급 필요', ok: false },
            ].map((item, i) => (
                <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center justify-between bg-white dark:bg-slate-950 rounded-2xl p-4 shadow-sm ring-1 ring-slate-200 dark:ring-white/10"
                >
                    <p className="text-sm font-bold dark:text-white">{item.label}</p>
                    <span className={`text-xs font-black px-2.5 py-1 rounded-full ${item.ok ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                        {item.status}
                    </span>
                </motion.div>
            ))}
        </div>
    );
}

function LiveInfoMockup() {
    return (
        <div className="w-full grid grid-cols-2 gap-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="col-span-2 bg-sky-500 text-white rounded-3xl p-6 shadow-xl">
                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">현지 연휴 안내</p>
                <p className="text-sm font-black">골든위크 기간이에요 · 숙소가 아직 미확정입니다</p>
            </motion.div>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-slate-950 rounded-3xl p-5 shadow-sm ring-1 ring-slate-200 dark:ring-white/10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">날씨</p>
                <p className="text-2xl font-black dark:text-white">28°C</p>
                <p className="text-xs text-slate-400 font-bold">여행 기간 평균</p>
            </motion.div>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-slate-950 rounded-3xl p-5 shadow-sm ring-1 ring-slate-200 dark:ring-white/10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">환율</p>
                <p className="text-2xl font-black dark:text-white">¥100</p>
                <p className="text-xs text-slate-400 font-bold">≈ 920원</p>
            </motion.div>
        </div>
    );
}
