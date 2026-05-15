'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { 
    getTravelog, 
    Travelog, 
    TravelogSection, 
    TravelogDailyPlan,
    cn
} from '@pplaner/shared';
import { useAuth } from '@/hooks/useAuth';
import MapComponent from '@/components/common/MapComponent';
import { Skeleton } from '@/components/common/Skeleton';
import Badge from '@/components/common/Badge';
import ScrollReveal from '@/components/common/ScrollReveal';
// react-icons/fi 대신 프로젝트 표준인 Material Symbols Rounded를 사용합니다.
import Image from 'next/image';

interface TravelogPageClientProps {
    id: string;
}

export default function TravelogPageClient({ id }: TravelogPageClientProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [travelog, setTravelog] = useState<Travelog | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // 지도 관련 상태
    const [mapCenter, setMapCenter] = useState({ lat: 37.5665, lng: 126.9780 });
    const [mapZoom, setMapZoom] = useState(12);
    const [highlightedMarkerId, setHighlightedMarkerId] = useState<string | null>(null);

    // 스크롤 진행률
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    useEffect(() => {
        const fetchTravelog = async () => {
            try {
                setLoading(true);
                const data = await getTravelog(id);
                if (data) {
                    setTravelog(data);
                    
                    // 첫 번째 이벤트 위치로 지도 중심 설정
                    if (data.timeline.length > 0 && data.timeline[0].events.length > 0) {
                        const firstEvent = data.timeline[0].events[0];
                        if (firstEvent.location) {
                            setMapCenter({
                                lat: firstEvent.location.lat || 0,
                                lng: firstEvent.location.lng || 0
                            });
                        }
                    }
                } else {
                    setError('여행 기록을 찾을 수 없습니다.');
                }
            } catch (err) {
                console.error('[TravelogViewer] Error fetching travelog:', err);
                setError('데이터를 불러오는 중 오류가 발생했습니다.');
            } finally {
                setLoading(false);
            }
        };

        fetchTravelog();
    }, [id]);

    // 타임라인 데이터를 마커로 변환
    const markers = useMemo(() => {
        if (!travelog) return [];
        const result: any[] = [];
        travelog.timeline.forEach((day: TravelogDailyPlan) => {
            day.events.forEach((event) => {
                if (event.location) {
                    result.push({
                        id: event.id,
                        lat: event.location.lat,
                        lng: event.location.lng,
                        title: event.title,
                        type: event.type,
                        day: day.day,
                        highlighted: event.id === highlightedMarkerId
                    });
                }
            });
        });
        return result;
    }, [travelog, highlightedMarkerId]);

    // 전체 경로 데이터
    const path = useMemo(() => {
        return markers.map(m => ({ lat: m.lat, lng: m.lng }));
    }, [markers]);

    // 특정 이벤트로 이동
    const focusEvent = (eventId: string, lat: number, lng: number) => {
        setHighlightedMarkerId(eventId);
        setMapCenter({ lat, lng });
        setMapZoom(15);
        
        // 해당 엘리먼트로 스크롤 (필요시)
        const el = document.getElementById(`section-${eventId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    if (loading) return <TravelogSkeleton />;
    if (error || !travelog) return <ErrorView message={error || '알 수 없는 오류'} />;

    const isAuthor = user?.uid === travelog.userId;
    const totalMembers = travelog.memberCounts.me + travelog.memberCounts.partner + travelog.memberCounts.family + travelog.memberCounts.friends;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-100 selection:bg-primary/30 font-display transition-colors duration-500">
            {/* 상단 프로그레스 바 */}
            <motion.div 
                className="fixed top-0 left-0 right-0 h-1 bg-primary z-[100] origin-left"
                style={{ scaleX }}
            />

            {/* 상단 액션 바 (Floating) - 내비게이션 바 아래로 위치 조정 */}
            <div className="fixed top-[80px] left-0 right-0 z-40 p-4 sm:p-6 pointer-events-none">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <button 
                        onClick={() => router.back()}
                        className="p-3 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70 hover:text-primary dark:hover:text-white hover:border-primary/20 dark:hover:border-white/20 transition-all pointer-events-auto shadow-xl flex items-center justify-center"
                    >
                        <span className="material-symbols-rounded">arrow_back</span>
                    </button>
                    
                    <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
                        <button className="p-3 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70 hover:text-rose-500 hover:border-rose-500/30 transition-all shadow-xl flex items-center justify-center">
                            <span className="material-symbols-rounded">favorite</span>
                        </button>
                        <button className="p-3 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70 hover:text-primary hover:border-primary/30 transition-all shadow-xl flex items-center justify-center">
                            <span className="material-symbols-rounded">share</span>
                        </button>
                        {isAuthor && (
                            <button 
                                onClick={() => router.push(`/travelogs/${id}/edit`)}
                                className="flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-primary text-white font-black shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
                            >
                                <span className="material-symbols-rounded text-sm">edit</span>
                                <span className="uppercase text-[9px] sm:text-[10px] tracking-widest whitespace-nowrap">여행 편집</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <section className="relative h-[85vh] w-full overflow-hidden">
                <motion.div 
                    initial={{ scale: 1.1, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 1.5, ease: [0.23, 1, 0.32, 1] }}
                    className="absolute inset-0"
                >
                    {travelog.coverImageUrl ? (
                        <Image 
                            src={travelog.coverImageUrl} 
                            alt={travelog.title}
                            fill
                            className="object-cover"
                            priority
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800" />
                    )}
                    {/* Overlay Gradients for Depth */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-slate-50 dark:to-[#030712] transition-colors duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent" />
                </motion.div>
                
                <div className="absolute inset-0 flex items-end">
                    <div className="max-w-7xl mx-auto w-full px-8 pb-24">
                        <motion.div 
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className="max-w-3xl space-y-8"
                        >
                            <div className="flex flex-wrap gap-3">
                                <Badge variant="primary" pulse className="px-4 py-1.5 text-[10px]">실시간 여행기</Badge>
                                <Badge variant="glass" className="px-4 py-1.5 text-[10px] border-white/20 uppercase">{travelog.theme || '탐험'}</Badge>
                            </div>
                            
                            <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[1.1] text-white">
                                {travelog.title}
                            </h1>
                            
                            <div className="flex flex-wrap items-center gap-8 text-white/50 font-bold uppercase tracking-widest text-[11px]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                        <span className="material-symbols-rounded text-primary text-base">calendar_today</span>
                                    </div>
                                    <span>{travelog.startDate} — {travelog.endDate}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                        <span className="material-symbols-rounded text-primary text-base">group</span>
                                    </div>
                                    <span>{totalMembers}명의 여행자</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2 }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 text-white/20"
                >
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">여행 탐색</span>
                    <div className="w-[1px] h-12 bg-gradient-to-b from-primary/60 to-transparent animate-pulse" />
                </motion.div>
            </section>

            {/* Main Content & Map Split View */}
            <main className="max-w-7xl mx-auto px-8 py-24">
                <div className="flex flex-col lg:flex-row gap-20">
                    {/* Left Column: Content */}
                    <div className="flex-1 min-w-0">
                        {/* Summary Block */}
                        <ScrollReveal>
                            <section className="space-y-8 mb-32">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-[2px] bg-primary" />
                                    <h2 className="text-sm font-black uppercase tracking-[0.4em] text-primary">개요</h2>
                                </div>
                                <p className="text-2xl md:text-3xl text-slate-800 dark:text-white font-light leading-relaxed tracking-tight">
                                    {travelog.summary}
                                </p>
                            </section>
                        </ScrollReveal>

                        {/* Sections Rendering */}
                        <div className="space-y-32">
                            {travelog.sections.map((section, idx) => (
                                <ScrollReveal key={section.id}>
                                    <SectionRenderer 
                                        section={section} 
                                        onFocusEvent={focusEvent}
                                    />
                                </ScrollReveal>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Sticky Map */}
                    <aside className="lg:w-[480px] flex-shrink-0">
                        <div className="sticky top-32 space-y-8">
                            <div className="relative group">
                                {/* Ambient Glow */}
                                <div className="absolute -inset-1 bg-gradient-to-r from-primary/40 to-cyan-500/40 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                                
                                <div className="relative h-[650px] rounded-[2.5rem] overflow-hidden border border-white/5 bg-[#020617] shadow-3xl">
                                    <MapComponent 
                                        center={mapCenter}
                                        zoom={mapZoom}
                                        markers={markers}
                                        path={path}
                                        highlightedId={highlightedMarkerId || undefined}
                                        onMarkerClick={(id) => {
                                            const m = markers.find(mark => mark.id === id);
                                            if (m) focusEvent(id, m.lat, m.lng);
                                        }}
                                    />
                                    
                                    {/* Map Control Overlays */}
                                    <div className="absolute top-6 left-6 flex flex-col gap-3">
                                        <div className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/70">
                                            <span className="material-symbols-rounded text-primary text-sm">navigation</span>
                                            <span>실시간 경로</span>
                                        </div>
                                    </div>
                                    
                                    <div className="absolute bottom-6 right-6 flex flex-col gap-3">
                                        <button className="w-12 h-12 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-white/70 hover:text-white transition-all flex items-center justify-center">
                                            <span className="material-symbols-rounded">fullscreen</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Card - Glassmorphism */}
                            <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 backdrop-blur-3xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -translate-y-1/2 translate-x-1/2 rounded-full group-hover:bg-primary/20 transition-all duration-1000" />
                                
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-8 flex items-center gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                    여행 데이터
                                </h3>
                                
                                <div className="grid grid-cols-2 gap-12">
                                    <div className="space-y-2">
                                        <div className="text-4xl font-black text-white">{markers.length}</div>
                                        <div className="text-[9px] text-white/30 font-black uppercase tracking-widest">방문 장소</div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-4xl font-black text-white">{travelog.timeline.length}</div>
                                        <div className="text-[9px] text-white/30 font-black uppercase tracking-widest">여행 일수</div>
                                    </div>
                                </div>
                                
                                <div className="mt-8 pt-8 border-t border-white/5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/30">동기화 상태</span>
                                        <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-emerald-500">
                                            <span className="w-1 h-1 rounded-full bg-emerald-500" />
                                            안전하게 연결됨
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>

            {/* Footer Signature */}
            <footer className="max-w-7xl mx-auto px-8 py-24 border-t border-white/5 text-center">
                <div className="inline-flex flex-col items-center gap-6">
                    <div className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-primary to-orange-600 p-0.5 shadow-2xl">
                        <div className="w-full h-full rounded-[1.8rem] bg-[#020617] flex items-center justify-center">
                            <span className="text-2xl font-black text-white">P</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-slate-400 dark:text-white/20 text-xs font-black uppercase tracking-[0.5em]">여행 기록 보관소</p>
                        <p className="text-slate-500 dark:text-white/40 text-[10px] font-bold">© 2026 PPLANER AI TRAVEL ENGINE. 모든 권리 보유.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function SectionRenderer({ 
    section, 
    onFocusEvent 
}: { 
    section: TravelogSection;
    onFocusEvent: (id: string, lat: number, lng: number) => void;
}) {
    switch (section.type) {
        case 'day_header':
            return (
                <div className="relative py-12 group">
                    <div className="absolute left-0 top-0 w-24 h-[1px] bg-gradient-to-r from-primary/50 to-transparent" />
                    <h2 className="text-7xl md:text-9xl font-black text-white/[0.03] tracking-tighter absolute -top-4 -left-4 pointer-events-none group-hover:text-white/[0.05] transition-all duration-1000">
                        {section.content.replace('Day ', '0')}
                    </h2>
                    <h3 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight relative z-10 flex items-center gap-6">
                        {section.content}
                        <span className="w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/40" />
                    </h3>
                </div>
            );
            
        case 'text':
            return (
                <div className="max-w-none p-8 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
                    <p className="text-xl md:text-2xl text-slate-700 dark:text-slate-300 leading-[1.7] font-normal tracking-wide whitespace-pre-wrap">
                        {section.content}
                    </p>
                </div>
            );
            
        case 'photo_gallery':
            return (
                <div className="grid grid-cols-2 gap-6">
                    {section.imageUrls?.map((url, i) => (
                        <div key={i} className={cn(
                            "relative rounded-[2rem] overflow-hidden group border border-white/5",
                            i % 3 === 0 ? "col-span-2 aspect-[16/9]" : "aspect-[1/1]"
                        )}>
                            <Image 
                                src={url} 
                                alt={`Journey memory ${i}`} 
                                fill 
                                className="object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-110" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end p-8">
                                <div className="text-white/60 text-[10px] font-black uppercase tracking-widest">추억 캡슐 #{i + 1}</div>
                            </div>
                        </div>
                    ))}
                </div>
            );
            
        case 'event_block':
            const event = section.contentJson || {};
            const emotion = event.emotion || { joy: 0, sadness: 0, anger: 0 };
            
            const getEmotionColor = () => {
                if (emotion.joy > 0.5) return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
                if (emotion.sadness > 0.5) return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
                if (emotion.anger > 0.5) return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
                return 'text-white/30 bg-white/5 border-white/10';
            };

            return (
                <div 
                    id={`section-${event.id}`}
                    onClick={() => event.location && onFocusEvent(event.id, event.location.lat, event.location.lng)}
                    className="group relative p-8 rounded-[2.5rem] bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:border-primary/20 dark:hover:border-white/10 transition-all duration-500 cursor-pointer overflow-hidden shadow-sm dark:shadow-none"
                >
                    {/* Background Subtle Accent */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-primary/10 transition-all duration-1000" />
                    
                    <div className="relative flex items-start gap-8">
                        <div className={cn(
                            "w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-2xl",
                            event.type === 'activity' ? "bg-primary text-white" : "bg-white/5 text-white/30 border border-white/10"
                        )}>
                            {event.type === 'activity' ? <span className="material-symbols-rounded text-2xl">navigation</span> : <span className="material-symbols-rounded text-2xl">location_on</span>}
                        </div>
                        
                        <div className="flex-1 space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors tracking-tight">
                                        {event.title || '제목 없는 장소'}
                                    </h3>
                                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-white/30">
                                        <div className="flex items-center gap-1.5">
                                            <span className="material-symbols-rounded text-primary text-xs">schedule</span>
                                            {event.type === 'activity' ? `${event.startTime} - ${event.endTime}` : event.time}
                                        </div>
                                        <span className="w-1 h-1 rounded-full bg-white/10" />
                                        <div className="flex items-center gap-1.5">
                                            <span className="material-symbols-rounded text-primary text-xs">location_on</span>
                                            {typeof event.location === 'string' ? event.location : (event.location?.name || '알 수 없는 장소')}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Emotion Badge */}
                                <div className={cn(
                                    "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all",
                                    getEmotionColor()
                                )}>
                                    {emotion.joy > 0.5 ? '찬란한 즐거움' : 
                                     emotion.sadness > 0.5 ? '우울함' : 
                                     emotion.anger > 0.5 ? '강렬함' : '평온함'}
                                </div>
                            </div>
                            
                            <p className="text-slate-400 text-lg leading-relaxed font-medium line-clamp-3 group-hover:text-slate-200 transition-colors">
                                {event.memo || '이 좌표에 기록된 일지가 없습니다.'}
                            </p>
                        </div>
                    </div>
                </div>
            );
        default:
            return null;
    }
}

function TravelogSkeleton() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#030712] p-8 space-y-12 transition-colors duration-500">
            <Skeleton className="h-[80vh] w-full rounded-[3rem] bg-slate-200/50 dark:bg-slate-800/50" />
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-20">
                <div className="flex-1 space-y-12">
                    <Skeleton className="h-20 w-3/4" />
                    <Skeleton className="h-64 w-full rounded-[2.5rem]" />
                    <Skeleton className="h-64 w-full rounded-[2.5rem]" />
                </div>
                <Skeleton className="lg:w-[480px] h-[650px] rounded-[2.5rem]" />
            </div>
        </div>
    );
}

function ErrorView({ message }: { message: string }) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#030712] flex flex-col items-center justify-center p-8 text-center transition-colors duration-500">
            <div className="w-32 h-32 rounded-[2.5rem] bg-rose-500/10 flex items-center justify-center text-rose-500 mb-8 border border-rose-500/20 shadow-xl">
                <span className="material-symbols-rounded text-5xl">location_off</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">신호를 잃었습니다</h1>
            <p className="text-slate-500 dark:text-white/40 max-w-md mx-auto mb-12 text-lg font-light leading-relaxed">{message}</p>
            <button 
                onClick={() => window.location.reload()}
                className="px-10 py-4 rounded-full bg-slate-200/50 dark:bg-white/5 hover:bg-slate-300/50 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 transition-all font-black uppercase text-[11px] tracking-widest text-slate-600 dark:text-white/70"
            >
                연결 재시도
            </button>
        </div>
    );
}
