'use client';

import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { 
    Plane, Bed, CalendarRange, Globe, Heart, 
    ArrowRight, CheckCircle2, QrCode, MapPin,
    Clock, Tag, BarChart3, Navigation, Zap
} from 'lucide-react';

const SHOWCASE_DATA = [
    {
        id: 'transport',
        label: '이동수단 예약',
        icon: <Plane className="w-5 h-5" />,
        title: '항공권부터 렌터카까지, 완벽한 예약 관리',
        description: '모든 이동수단의 정보를 티켓 형태로 관리하세요. 편명, 좌석, 바우처 번호까지 챙겨주는 스마트 시스템입니다.',
        features: ['항공권/열차권 디지털 티켓팅', '출도착 시간 자동 타임라인 연동', '렌터카 및 셔틀 정보 통합 관리'],
        color: 'text-blue-500',
        bg: 'bg-blue-500',
        borderColor: 'border-blue-200 dark:border-blue-900/50'
    },
    {
        id: 'accommodation',
        label: '숙소 시간표',
        icon: <Bed className="w-5 h-5" />,
        title: '체크인부터 체크아웃까지 한눈에',
        description: '단순한 예약 기록을 넘어, 숙박 기간 전체를 시각화합니다. 주변 명소와의 거리와 동선을 실시간으로 계산합니다.',
        features: ['스테이 전 기간 시각적 타임라인', '얼리 체크인/레이트 체크아웃 대응', '숙소 위치 기반 동선 정합성 체크'],
        color: 'text-indigo-500',
        bg: 'bg-indigo-500',
        borderColor: 'border-indigo-200 dark:border-indigo-900/50'
    },
    {
        id: 'timeline',
        label: '타임라인',
        icon: <CalendarRange className="w-5 h-5" />,
        title: '여정의 흐름을 조절하는 간트 차트',
        description: '리스트 방식의 여행 계획은 잊으세요. 시간의 흐름을 밀도 있게 조절할 수 있는 전문가용 타임라인을 제공합니다.',
        features: ['드래그 앤 드롭 일정 조절', '이동 및 대기 시간 자동 시각화', '멀티 데이 일정 동시 보기 및 편집'],
        color: 'text-purple-500',
        bg: 'bg-purple-500',
        borderColor: 'border-purple-200 dark:border-purple-900/50'
    },
    {
        id: 'globe',
        label: '마스터리 글로브',
        icon: <Globe className="w-5 h-5" />,
        title: '당신의 세계를 확장하는 즐거움',
        description: '여행은 기록될 때 완성됩니다. 3D 지구본 위에 당신의 발자취를 남기고 방문 국가별 통계를 확인하세요.',
        features: ['3D 인터랙티브 여정 시각화', '국가/도시별 방문 마스터리 통계', '여행 발자취 자동 기록 및 시각화'],
        color: 'text-emerald-500',
        bg: 'bg-emerald-500',
        borderColor: 'border-emerald-200 dark:border-emerald-900/50'
    },
    {
        id: 'wishlist',
        label: '위시리스트',
        icon: <Heart className="w-5 h-5" />,
        title: '지도 기반의 똑똑한 장소 수집',
        description: '가고 싶은 곳을 지도 위에서 바로 담으세요. 실제 동선과 거리를 고려하여 위시리스트를 즉시 계획으로 바꿀 수 있습니다.',
        features: ['지역별/카테고리별 핀 필터링', '지도 기반의 직관적인 일정 설계', '클릭 한 번으로 위시리스트 장소 추가'],
        color: 'text-rose-500',
        bg: 'bg-rose-500',
        borderColor: 'border-rose-200 dark:border-rose-900/50'
    }
];

export default function LandingShowcase() {
    const [activeTab, setActiveTab] = useState(SHOWCASE_DATA[0].id);
    const activeData = SHOWCASE_DATA.find(t => t.id === activeTab)!;

    return (
        <section className="py-24 bg-white dark:bg-slate-950">
            <div className="max-w-7xl mx-auto px-4 lg:px-20">
                <div className="text-center mb-24">
                    <motion.span 
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-4 inline-block"
                    >
                        Interactive Showcase
                    </motion.span>
                    <h2 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white leading-tight">
                        실제 화면으로 경험하는<br />PPLANER의 강력함
                    </h2>
                    <p className="mt-6 text-slate-500 font-medium">스크롤을 내려 각 기능을 자세히 살펴보세요.</p>
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
                                    className={`absolute inset-0 bg-slate-50 dark:bg-slate-900 rounded-[3rem] shadow-2xl p-10 flex items-center justify-center border-2 ${activeData.borderColor}`}
                                >
                                    {activeTab === 'transport' && <TransportMockup />}
                                    {activeTab === 'accommodation' && <AccommodationMockup />}
                                    {activeTab === 'timeline' && <TimelineMockup />}
                                    {activeTab === 'globe' && <GlobeMockup />}
                                    {activeTab === 'wishlist' && <WishlistMockup />}
                                </motion.div>
                            </AnimatePresence>

                            {/* Decorative Background Elements */}
                            <motion.div 
                                animate={{ borderColor: activeData.bg }}
                                className={`absolute -inset-4 rounded-[3.5rem] border-2 border-dashed opacity-20 -z-10 transition-colors duration-500`} 
                            />
                        </div>
                    </div>

                    {/* Right: Scrolling Content */}
                    <div className="lg:flex-1 space-y-32 order-1 lg:order-2 pb-[30vh]">
                        {SHOWCASE_DATA.map((item) => (
                            <ContentSection 
                                key={item.id} 
                                data={item} 
                                onInView={() => setActiveTab(item.id)} 
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

// --- Internal Components ---

function ContentSection({ data, onInView }: { data: typeof SHOWCASE_DATA[0], onInView: () => void }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { margin: "-45% 0px -45% 0px" });

    useEffect(() => {
        if (isInView) {
            onInView();
        }
    }, [isInView, onInView]);

    return (
        <div ref={ref} className={`space-y-8 py-20 transition-opacity duration-500 ${isInView ? 'opacity-100' : 'opacity-30'}`}>
            <div className="space-y-6">
                <span className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest inline-block bg-white dark:bg-slate-800 shadow-sm border ${data.borderColor} ${data.color}`}>
                    {data.label}
                </span>
                <h3 className="text-4xl font-black text-slate-900 dark:text-white leading-tight">
                    {data.title}
                </h3>
                <p className="text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    {data.description}
                </p>
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

            <div className="pt-8">
                <button className="flex items-center gap-3 text-slate-900 dark:text-white font-black group px-8 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                    실제 상세 화면 체험하기
                    <ArrowRight className={`w-5 h-5 group-hover:translate-x-1 transition-transform ${data.color}`} />
                </button>
            </div>
        </div>
    );
}

// --- Mockup Sub-Components ---

function TransportMockup() {
    return (
        <div className="w-full space-y-8">
            <motion.div 
                initial={{ rotate: -5, opacity: 0, scale: 0.8 }}
                animate={{ rotate: 0, opacity: 1, scale: 1.05 }}
                className="bg-white dark:bg-slate-950 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden ring-1 ring-slate-200 dark:ring-white/10"
            >
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Airline Ticket</p>
                        <h4 className="text-2xl font-black dark:text-white leading-tight">ICN → NRT</h4>
                        <p className="text-xs font-bold text-slate-400">HL8274 · Korean Air</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white">
                        <QrCode className="w-6 h-6" />
                    </div>
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-white/5 pt-6">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Gate</p>
                        <p className="text-lg font-black dark:text-white">24A</p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Seat</p>
                        <p className="text-lg font-black dark:text-white">12C</p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Boarding</p>
                        <p className="text-lg font-black text-blue-500">10:30</p>
                    </div>
                </div>
            </motion.div>
            <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-blue-500/10 p-6 rounded-3xl border border-blue-200/50 flex items-center justify-between"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-500">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-blue-500 uppercase">System Notice</p>
                        <p className="text-xs font-bold dark:text-white">타임라인에 항공 시간이 반영되었습니다.</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function AccommodationMockup() {
    return (
        <div className="w-full relative py-10">
            <motion.div 
                initial={{ x: -40, opacity: 0, scale: 0.9 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                className="bg-white dark:bg-slate-950 p-6 rounded-3xl shadow-xl flex gap-6 items-center ring-1 ring-slate-200 dark:ring-white/10 mb-6"
            >
                <div className="w-20 h-20 bg-indigo-500 rounded-2xl overflow-hidden shadow-inner">
                    <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=200" alt="Hotel" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                    <p className="text-[10px] font-black text-indigo-500 uppercase mb-1">Stay Detail</p>
                    <h4 className="text-xl font-black dark:text-white mb-1">Grand Park Hotel</h4>
                    <p className="text-xs text-slate-500 font-bold flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Tokyo, Shinjuku
                    </p>
                </div>
            </motion.div>
            
            <motion.div 
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-slate-200/50 dark:bg-white/5 h-20 rounded-3xl p-4 flex gap-4"
            >
                <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm">
                    <p className="text-xs font-black">Check-in at <span className="text-indigo-500">15:00</span></p>
                </div>
                <div className="w-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white">
                    <Tag className="w-5 h-5" />
                </div>
            </motion.div>
        </div>
    );
}

function TimelineMockup() {
    return (
        <div className="w-full space-y-4">
            <div className="flex gap-4 mb-4">
                <div className="px-4 py-2 bg-purple-500 text-white rounded-full text-[10px] font-black uppercase">DAY 1</div>
                <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full text-[10px] font-black uppercase">DAY 2</div>
            </div>
            <div className="space-y-3 relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-purple-200 dark:bg-purple-900/30" />
                <TimelineBlock time="10:00" title="미술관 도슨트 투어" color="bg-purple-500" />
                <TimelineBlock time="13:30" title="강변 카페 피크닉" color="bg-orange-400" />
                <TimelineBlock time="16:00" title="지역 플리마켓 산책" color="bg-emerald-500" active />
                <TimelineBlock time="19:00" title="재즈 클럽 디너" color="bg-indigo-500" />
            </div>
        </div>
    );
}

function GlobeMockup() {
    return (
        <div className="w-full text-center relative">
            <div className="w-48 h-48 mx-auto mb-10 relative">
                <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="absolute inset-0 bg-emerald-500/20 rounded-full blur-3xl opacity-50" 
                />
                <div className="absolute inset-0 border-4 border-emerald-500/30 rounded-full animate-[spin_10s_linear_infinite]" />
                <div className="absolute inset-4 border-2 border-emerald-500/10 rounded-full" />
                <div className="absolute inset-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.5)]">
                    <Globe className="w-16 h-16 text-white" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/30"
                >
                    <p className="text-3xl font-black text-emerald-500">12</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Visited Countries</p>
                </motion.div>
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/30"
                >
                    <p className="text-3xl font-black text-emerald-500">45</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Cities Mastery</p>
                </motion.div>
            </div>
        </div>
    );
}

function WishlistMockup() {
    return (
        <div className="w-full relative">
            <div className="aspect-video bg-slate-200 dark:bg-slate-800 rounded-[2rem] overflow-hidden relative shadow-inner">
                 <div className="absolute inset-0 opacity-40">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <pattern id="grid-s" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-300 dark:text-slate-700" />
                        </pattern>
                        <rect width="100%" height="100%" fill="url(#grid-s)" />
                    </svg>
                </div>
                <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute top-1/4 left-1/3 text-rose-500"
                >
                    <MapPin className="w-8 h-8 fill-current animate-bounce" />
                </motion.div>
                <div className="absolute bottom-1/3 right-1/4 text-rose-500/50">
                    <MapPin className="w-6 h-6 fill-current" />
                </div>
            </div>
            <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="absolute -bottom-6 -right-6 bg-white dark:bg-slate-950 p-6 rounded-3xl shadow-2xl border border-rose-100 dark:border-rose-900/50 w-64"
            >
                <div className="flex items-center gap-3 mb-4">
                    <Heart className="w-5 h-5 text-rose-500 fill-current" />
                    <p className="text-xs font-black dark:text-white">카페 노티드 한남</p>
                </div>
                <button className="w-full py-3 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg hover:shadow-rose-500/20 active:scale-95 transition-all">
                    내 일정에 추가하기
                </button>
            </motion.div>
        </div>
    );
}

function TimelineBlock({ time, title, color, active = false }: { time: string, title: string, color: string, active?: boolean }) {
    return (
        <motion.div 
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 group"
        >
            <span className="text-[10px] font-black text-slate-400 w-12">{time}</span>
            <div className={`relative flex-1 p-3 rounded-2xl ${active ? 'ring-2 ring-purple-500 shadow-xl scale-105' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5'} flex items-center gap-3 transition-all`}>
                <div className={`w-2 h-2 rounded-full ${color}`} />
                <p className="text-xs font-medium dark:text-white truncate">{title}</p>
                {active && <Zap className="w-3 h-3 text-amber-500 ml-auto fill-current font-bold" />}
            </div>
        </motion.div>
    );
}
