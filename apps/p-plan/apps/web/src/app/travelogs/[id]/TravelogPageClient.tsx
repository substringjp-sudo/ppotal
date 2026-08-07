'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useSpring } from 'framer-motion';
import {
    getTravelog,
    Travelog,
    TravelogDailyPlan,
    TravelogPlace,
    syncTravelogPlaces,
    buildStoryEntries,
    groupStoryEntriesByDay,
    collectCategories,
    colorForCategory,
    cn
} from '@pplaner/shared';
import { useAuth } from '@/hooks/useAuth';
import MapComponent from '@/components/common/MapComponent';
import { Skeleton } from '@/components/common/Skeleton';
import Badge from '@/components/common/Badge';
import ScrollReveal from '@/components/common/ScrollReveal';
import ShareCardModal from '@/components/travelogs/ShareCardModal';
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

    // 보기 방식: 블로그(글 흐름) ↔ 장소(지도·목록에서 장소별 사진·소감)
    const [viewMode, setViewMode] = useState<'blog' | 'places'>('blog');
    const [showShare, setShowShare] = useState(false);

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

    // 장소 중심 데이터 (타임라인에서 파생하되 작성된 소감·분류는 보존)
    const places = useMemo<TravelogPlace[]>(() => {
        if (!travelog) return [];
        return syncTravelogPlaces(travelog);
    }, [travelog]);

    // 커스텀 분류 필터
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const visiblePlaces = useMemo(() => (
        activeCategory ? places.filter(p => (p.category?.trim() || '') === activeCategory) : places
    ), [places, activeCategory]);

    // 지도·포토북 템플릿이면 장소 보기로 시작
    useEffect(() => {
        if (travelog?.template === 'map' || travelog?.template === 'photobook') setViewMode('places');
    }, [travelog?.template]);

    // 장소 마커 (좌표가 있는 장소만, 활성 분류 반영)
    const placeMarkers = useMemo(() => {
        return visiblePlaces
            .filter(p => p.location && typeof p.location.lat === 'number' && typeof p.location.lng === 'number')
            .map(p => ({
                id: p.id,
                lat: p.location!.lat as number,
                lng: p.location!.lng as number,
                title: p.name,
                type: 'activity' as const,
                highlighted: p.id === highlightedMarkerId,
            }));
    }, [visiblePlaces, highlightedMarkerId]);

    // 현재 보기에 맞는 마커/경로
    const activeMarkers = viewMode === 'places' ? placeMarkers : markers;
    const path = useMemo(() => {
        return activeMarkers.map(m => ({ lat: m.lat, lng: m.lng }));
    }, [activeMarkers]);

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

    // 장소로 이동 (장소 뷰)
    const focusPlace = (place: TravelogPlace) => {
        setHighlightedMarkerId(place.id);
        if (place.location?.lat != null && place.location?.lng != null) {
            setMapCenter({ lat: place.location.lat, lng: place.location.lng });
            setMapZoom(15);
        }
        const el = document.getElementById(`place-${place.id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    if (loading) return <TravelogSkeleton />;
    if (error || !travelog) return <ErrorView message={error || '알 수 없는 오류'} />;

    const isAuthor = user?.uid === travelog.userId;
    const totalMembers = travelog.memberCounts.me + travelog.memberCounts.partner + travelog.memberCounts.family + travelog.memberCounts.friends;

    return (
        <div className="min-h-screen bg-[#faf9f7] dark:bg-[#030712] text-slate-900 dark:text-slate-100 selection:bg-primary/30 font-display transition-colors duration-500">
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
                        <button
                            onClick={() => setShowShare(true)}
                            className="p-3 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70 hover:text-primary hover:border-primary/30 transition-all shadow-xl flex items-center justify-center"
                        >
                            <span className="material-symbols-rounded">share</span>
                        </button>
                        {isAuthor && (
                            <button 
                                onClick={() => router.push(`/travelogs/${id}/edit`)}
                                className="flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-primary text-white font-semibold shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
                            >
                                <span className="material-symbols-rounded text-sm">edit</span>
                                <span className="uppercase text-xs sm:text-xs tracking-widest whitespace-nowrap">여행 편집</span>
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
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-[#faf9f7] dark:to-[#030712] transition-colors duration-500" />
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
                                <Badge variant="primary" pulse className="px-4 py-1.5 text-xs">실시간 여행기</Badge>
                                <Badge variant="glass" className="px-4 py-1.5 text-xs border-white/20 uppercase">{travelog.theme || '탐험'}</Badge>
                            </div>

                            {/* Kicker — 세리프 이탤릭. 표지는 곧 읽기 경험의 시작이라 여기서부터 세리프를 연다 */}
                            {(travelog.startDate || travelog.endDate) && (
                                <p className="font-editorial italic text-base text-white/75 tracking-wide -mb-4">
                                    {[travelog.startDate, travelog.endDate].filter(Boolean).join(' – ')}
                                </p>
                            )}

                            <h1 className="font-editorial text-6xl md:text-8xl font-semibold tracking-tight leading-[1.1] text-white">
                                {travelog.title}
                            </h1>

                            <div className="flex flex-wrap items-center gap-8 text-white/50 font-semibold uppercase tracking-widest text-[11px]">
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
                    <span className="text-xs font-semibold uppercase tracking-[0.3em]">여행 탐색</span>
                    <div className="w-[1px] h-12 bg-gradient-to-b from-primary/60 to-transparent animate-pulse" />
                </motion.div>
            </section>

            {/* Main Content & Map Split View */}
            <main className="max-w-7xl mx-auto px-8 py-24">
                {/* 보기 방식 토글 (블로그 ↔ 장소) */}
                <div className="mb-14 flex justify-center">
                    <div className="inline-flex items-center gap-1 p-1.5 rounded-2xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 shadow-sm">
                        <ViewToggleButton
                            active={viewMode === 'blog'}
                            onClick={() => setViewMode('blog')}
                            icon="article"
                            label="여행기"
                        />
                        <ViewToggleButton
                            active={viewMode === 'places'}
                            onClick={() => setViewMode('places')}
                            icon="pin_drop"
                            label={`장소 ${places.length ? places.length : ''}`.trim()}
                        />
                    </div>
                </div>

                {/* 분류 필터 (장소 보기에서, 자유 입력 분류 기준) */}
                {viewMode === 'places' && (
                    <CategoryFilterBar
                        places={places}
                        active={activeCategory}
                        onSelect={setActiveCategory}
                    />
                )}

                {viewMode === 'places' && travelog.template === 'map' ? (
                    <MapTemplateSection
                        places={visiblePlaces}
                        markers={placeMarkers}
                        center={mapCenter}
                        zoom={mapZoom}
                        highlightedId={highlightedMarkerId}
                        onFocusPlace={focusPlace}
                    />
                ) : viewMode === 'places' && travelog.template === 'photobook' ? (
                    <PhotobookSection places={visiblePlaces} onFocusPlace={focusPlace} />
                ) : (
                <div className="flex flex-col lg:flex-row gap-20">
                    {/* Left Column: Content */}
                    <div className="flex-1 min-w-0">
                        {viewMode === 'blog' ? (
                            <StoryView
                                travelog={travelog}
                                byDay={travelog.template === 'timeline'}
                                onFocusPlace={focusPlace}
                            />
                        ) : (
                            <PlaceListView
                                places={visiblePlaces}
                                highlightedId={highlightedMarkerId}
                                onFocusPlace={focusPlace}
                            />
                        )}
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
                                        markers={activeMarkers}
                                        path={path}
                                        highlightedId={highlightedMarkerId || undefined}
                                        onMarkerClick={(mid) => {
                                            if (viewMode === 'places') {
                                                const p = places.find(pl => pl.id === mid);
                                                if (p) focusPlace(p);
                                            } else {
                                                const m = markers.find(mark => mark.id === mid);
                                                if (m) focusEvent(mid, m.lat, m.lng);
                                            }
                                        }}
                                    />
                                    
                                    {/* Map Control Overlays */}
                                    <div className="absolute top-6 left-6 flex flex-col gap-3">
                                        <div className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-white/70">
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
                                
                                <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-white/30 mb-8 flex items-center gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                    여행 데이터
                                </h3>
                                
                                <div className="grid grid-cols-2 gap-12">
                                    <div className="space-y-2">
                                        <div className="text-4xl font-bold text-white">{places.length || markers.length}</div>
                                        <div className="text-xs text-white/30 font-semibold uppercase tracking-widest">방문 장소</div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-4xl font-bold text-white">{travelog.timeline.length}</div>
                                        <div className="text-xs text-white/30 font-semibold uppercase tracking-widest">여행 일수</div>
                                    </div>
                                </div>
                                
                                <div className="mt-8 pt-8 border-t border-white/5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold uppercase tracking-widest text-white/30">동기화 상태</span>
                                        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-500">
                                            <span className="w-1 h-1 rounded-full bg-emerald-500" />
                                            안전하게 연결됨
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
                )}
            </main>

            {/* Footer Signature */}
            <footer className="max-w-7xl mx-auto px-8 py-24 border-t border-white/5 text-center">
                <div className="inline-flex flex-col items-center gap-6">
                    <div className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-primary to-orange-600 p-0.5 shadow-2xl">
                        <div className="w-full h-full rounded-[1.8rem] bg-[#020617] flex items-center justify-center">
                            <span className="text-2xl font-bold text-white">P</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-slate-400 dark:text-white/20 text-xs font-semibold uppercase tracking-[0.5em]">여행 기록 보관소</p>
                        <p className="text-slate-500 dark:text-white/40 text-xs font-bold">© 2026 PPLANER AI TRAVEL ENGINE. 모든 권리 보유.</p>
                    </div>
                </div>
            </footer>

            {/* 공유 카드 */}
            {showShare && (
                <ShareCardModal
                    travelog={travelog}
                    isAuthor={isAuthor}
                    authorName={user?.displayName}
                    authorPhotoURL={user?.photoURL}
                    onClose={() => setShowShare(false)}
                    onPublished={(updated) => setTravelog(updated)}
                />
            )}
        </div>
    );
}

function ViewToggleButton({ active, onClick, icon, label }: {
    active: boolean; onClick: () => void; icon: string; label: string;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-semibold uppercase tracking-widest transition-all',
                active
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white/70'
            )}
            aria-pressed={active}
        >
            <span className="material-symbols-rounded text-base">{icon}</span>
            {label}
        </button>
    );
}

function StarRating({ value }: { value: number }) {
    return (
        <div className="flex items-center gap-0.5" aria-label={`별점 ${value}점`}>
            {[1, 2, 3, 4, 5].map((n) => (
                <span
                    key={n}
                    className={cn(
                        'material-symbols-rounded text-base',
                        n <= value ? 'text-amber-400' : 'text-slate-300 dark:text-white/15'
                    )}
                    style={{ fontVariationSettings: n <= value ? "'FILL' 1" : "'FILL' 0" }}
                >
                    star
                </span>
            ))}
        </div>
    );
}

/** 분류 필터 바 — 장소들의 자유 입력 분류(category)에서 칩을 만든다 */
function CategoryFilterBar({ places, active, onSelect }: {
    places: TravelogPlace[];
    active: string | null;
    onSelect: (c: string | null) => void;
}) {
    const categories = collectCategories(places);
    if (categories.length === 0) return null;
    const countFor = (c: string) => places.filter((p) => (p.category?.trim() || '') === c).length;
    const chip = (on: boolean, label: string, color: string | undefined, onClick: () => void, key: string) => (
        <button
            key={key}
            onClick={onClick}
            className={cn('inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition',
                on ? 'text-white border-transparent shadow' : 'text-slate-500 dark:text-white/50 border-slate-200 dark:border-white/15 hover:border-slate-400')}
            style={on && color ? { backgroundColor: color } : on ? { backgroundColor: '#334155' } : undefined}
        >
            {color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: on ? 'rgba(255,255,255,0.9)' : color }} />}
            {label}
        </button>
    );
    return (
        <div className="mb-10">
            <div className="flex flex-wrap items-center justify-center gap-2">
                {chip(!active, `전체 ${places.length}`, undefined, () => onSelect(null), 'all')}
                {categories.map((c) => chip(active === c, `${c} ${countFor(c)}`, colorForCategory(c), () => onSelect(c), c))}
            </div>
        </div>
    );
}

/** 장소 카드 하나 (목록/그리드/지도 템플릿에서 공용) */
function PlaceCard({ place: p, index: i, highlighted, onClick }: {
    place: TravelogPlace;
    index: number;
    highlighted: boolean;
    onClick: () => void;
}) {
    return (
        <div
            id={`place-${p.id}`}
            onClick={onClick}
            className={cn(
                'group relative rounded-[2rem] overflow-hidden border bg-white dark:bg-white/[0.02] shadow-sm dark:shadow-none transition-all duration-500 cursor-pointer h-full',
                highlighted
                    ? 'border-primary/50 ring-2 ring-primary/20'
                    : 'border-slate-200 dark:border-white/5 hover:border-primary/20 dark:hover:border-white/10'
            )}
        >
            {/* 사진 스트립 */}
            {p.photoUrls && p.photoUrls.length > 0 && (
                <div className="flex gap-1 h-44 overflow-x-auto">
                    {p.photoUrls.slice(0, 5).map((url, idx) => (
                        <div key={idx} className={cn('relative flex-shrink-0 h-full', idx === 0 ? 'w-1/2' : 'w-1/3')}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                        </div>
                    ))}
                </div>
            )}
            <div className="p-7 space-y-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary grid place-items-center text-xs font-semibold shrink-0">
                            {String(i + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">{p.name}</h3>
                            {(p.location?.address || p.visitDate) && (
                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/30 truncate">
                                    {[p.visitDate, p.location?.address].filter(Boolean).join(' · ')}
                                </p>
                            )}
                        </div>
                    </div>
                    {typeof p.rating === 'number' && p.rating > 0 && <StarRating value={p.rating} />}
                </div>
                {p.impression && (
                    <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {p.impression}
                    </p>
                )}
                {p.category && (
                    <span className="inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-white/40">
                        {p.category}
                    </span>
                )}
            </div>
        </div>
    );
}

function PlacesEmpty() {
    return (
        <div className="rounded-[2rem] border border-dashed border-slate-200 dark:border-white/10 p-16 text-center">
            <span className="material-symbols-rounded text-5xl text-slate-300 dark:text-white/20">wrong_location</span>
            <p className="mt-4 text-lg font-bold text-slate-500 dark:text-white/40">아직 정리된 장소가 없어요.</p>
            <p className="mt-1 text-sm text-slate-400 dark:text-white/25">사진을 올리거나 일정에 장소를 연결하면 여기 모여요.</p>
        </div>
    );
}

/** 장소 중심 뷰(사이드 지도와 함께 쓰는 세로 목록) */
function PlaceListView({ places, highlightedId, onFocusPlace }: {
    places: TravelogPlace[];
    highlightedId: string | null;
    onFocusPlace: (place: TravelogPlace) => void;
}) {
    if (places.length === 0) return <PlacesEmpty />;
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="w-12 h-[2px] bg-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.4em] text-primary">장소별 기록</h2>
            </div>
            {places.map((p, i) => (
                <ScrollReveal key={p.id}>
                    <PlaceCard place={p} index={i} highlighted={highlightedId === p.id} onClick={() => onFocusPlace(p)} />
                </ScrollReveal>
            ))}
        </div>
    );
}

/** 여행지도 템플릿: 큰 지도(핀) + 장소 카드 그리드 (전체 폭) */
function MapTemplateSection({ places, markers, center, zoom, highlightedId, onFocusPlace }: {
    places: TravelogPlace[];
    markers: { id: string; lat: number; lng: number; title: string; type: 'activity'; highlighted: boolean }[];
    center: { lat: number; lng: number };
    zoom: number;
    highlightedId: string | null;
    onFocusPlace: (place: TravelogPlace) => void;
}) {
    if (places.length === 0) return <PlacesEmpty />;
    const path = markers.map((m) => ({ lat: m.lat, lng: m.lng }));
    return (
        <div>
            {/* 큰 지도 */}
            <div className="relative h-[460px] sm:h-[540px] rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-white/10 shadow-xl bg-[#020617]">
                <MapComponent
                    center={center}
                    zoom={zoom}
                    markers={markers}
                    path={path}
                    highlightedId={highlightedId || undefined}
                    onMarkerClick={(mid) => {
                        const p = places.find((pl) => pl.id === mid);
                        if (p) onFocusPlace(p);
                    }}
                />
                <div className="absolute top-6 left-6 px-4 py-2 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 flex items-center gap-2.5 text-xs font-semibold uppercase tracking-widest text-white/80 pointer-events-none">
                    <span className="material-symbols-rounded text-primary text-sm">map</span>
                    여행지도 · 장소 {places.length}
                </div>
            </div>

            {/* 장소 카드 그리드 */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                {places.map((p, i) => (
                    <ScrollReveal key={p.id}>
                        <PlaceCard place={p} index={i} highlighted={highlightedId === p.id} onClick={() => onFocusPlace(p)} />
                    </ScrollReveal>
                ))}
            </div>
        </div>
    );
}

/** 타임라인 템플릿: 일자별로 이벤트를 시간 순 레일에 세운다 */
/**
 * 스토리 뷰 — 에디터가 쓴 카드 스트림(장소 카드 + 글 카드)을 그대로 읽는 화면.
 * "쓴 것이 곧 읽히는 것"이라, 별도의 문서(sections)를 렌더하지 않는다.
 * byDay=true(타임라인 템플릿)면 장소의 날짜가 바뀔 때마다 날짜 헤더를 세운다.
 */
function StoryView({ travelog, byDay, onFocusPlace }: {
    travelog: Travelog;
    byDay?: boolean;
    onFocusPlace: (place: TravelogPlace) => void;
}) {
    const entries = buildStoryEntries(travelog);
    if (entries.length === 0) {
        return (
            <div className="rounded-[2rem] border border-dashed border-slate-200 dark:border-white/10 p-16 text-center">
                <span className="material-symbols-rounded text-5xl text-slate-300 dark:text-white/20">auto_stories</span>
                <p className="mt-4 text-lg font-bold text-slate-500 dark:text-white/40">아직 내용이 없어요.</p>
            </div>
        );
    }

    const groups = byDay
        ? groupStoryEntriesByDay(entries)
        : [{ day: undefined, date: undefined, entries }];

    // 읽는 화면 — 세리프는 폰트 교체가 아니라 레이아웃 규칙 한 벌을 데려온다.
    // 한 줄 길이를 42~46자(≈660px)로 좁히고 행간을 넓힌다.
    return (
        <div className="max-w-[660px] space-y-16">
            {travelog.summary && (
                <p className="font-editorial text-2xl md:text-[28px] text-slate-800 dark:text-white font-normal leading-[1.55] tracking-tight">
                    {travelog.summary}
                </p>
            )}
            {groups.map((g, gi) => (
                <section key={gi} className="space-y-10">
                    {byDay && (g.day != null || g.date) && (
                        <div className="flex items-center gap-4">
                            {g.day != null && (
                                <span className="text-5xl font-bold text-primary/20 tabular-nums leading-none">D{g.day}</span>
                            )}
                            <div>
                                <h2 className="font-editorial text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
                                    {g.day != null ? `Day ${g.day}` : g.date}
                                </h2>
                                {g.date && g.day != null && (
                                    <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-slate-400 tabular-nums">{g.date}</p>
                                )}
                            </div>
                        </div>
                    )}
                    {g.entries.map((entry) => (
                        <ScrollReveal key={entry.kind === 'place' ? entry.place.id : entry.note.id}>
                            {entry.kind === 'note' ? (
                                <p className="font-editorial text-lg text-slate-700 dark:text-slate-300 leading-[1.9] whitespace-pre-wrap">
                                    {entry.note.text}
                                </p>
                            ) : (
                                <StoryPlaceBlock place={entry.place} onClick={() => onFocusPlace(entry.place)} />
                            )}
                        </ScrollReveal>
                    ))}
                </section>
            ))}
        </div>
    );
}

/** 스토리 흐름 속 장소 한 덩어리 — 사진 + 이름/시각 + 소감 */
function StoryPlaceBlock({ place, onClick }: { place: TravelogPlace; onClick: () => void }) {
    const photos = place.coverPhotoUrl
        ? [place.coverPhotoUrl, ...(place.photoUrls || []).filter((u) => u !== place.coverPhotoUrl)]
        : (place.photoUrls || []);
    const timeLabel = place.startTime
        ? (place.endTime ? `${place.startTime}–${place.endTime}` : place.startTime)
        : '';
    const meta = [place.visitDate, timeLabel, place.category].filter(Boolean).join(' · ');

    return (
        <div id={`place-${place.id}`} onClick={onClick} className="cursor-pointer group">
            {photos.length > 0 && (
                <div className={cn('grid gap-2 mb-5', photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
                    {photos.slice(0, 4).map((url, i) => (
                        <div key={i} className={cn('relative overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900',
                            photos.length === 1 ? 'aspect-[16/10]' : photos.length === 3 && i === 0 ? 'col-span-2 aspect-[16/9]' : 'aspect-square')}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
                        </div>
                    ))}
                </div>
            )}
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h3 className="font-editorial text-[27px] font-semibold text-slate-900 dark:text-white tracking-tight group-hover:text-primary transition-colors">
                        {place.name}
                    </h3>
                    {meta && <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-400 tabular-nums">{meta}</p>}
                </div>
                {typeof place.rating === 'number' && place.rating > 0 && <StarRating value={place.rating} />}
            </div>
            {place.impression && (
                <p className="font-editorial mt-4 text-lg text-slate-700 dark:text-slate-300 leading-[1.9] whitespace-pre-wrap">
                    {place.impression}
                </p>
            )}
        </div>
    );
}

function PhotobookSection({ places, onFocusPlace }: {
    places: TravelogPlace[];
    onFocusPlace: (place: TravelogPlace) => void;
}) {
    const withPhotos = places.filter((p) => p.photoUrls && p.photoUrls.length > 0);
    if (withPhotos.length === 0) return <PlacesEmpty />;
    return (
        <div className="space-y-20">
            {withPhotos.map((p, i) => (
                <ScrollReveal key={p.id}>
                    <section id={`place-${p.id}`} onClick={() => onFocusPlace(p)} className="cursor-pointer">
                        <div className="flex items-end justify-between mb-6">
                            <div className="flex items-center gap-4 min-w-0">
                                <span className="text-6xl font-bold text-slate-200 dark:text-white/10 tabular-nums leading-none">{String(i + 1).padStart(2, '0')}</span>
                                <div className="min-w-0">
                                    <h3 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white truncate">{p.name}</h3>
                                    {(p.visitDate || p.location?.address) && (
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/30 truncate">
                                            {[p.visitDate, p.location?.address].filter(Boolean).join(' · ')}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {typeof p.rating === 'number' && p.rating > 0 && <StarRating value={p.rating} />}
                        </div>
                        <div className="columns-2 md:columns-3 gap-3 [column-fill:_balance]">
                            {p.photoUrls!.map((url, idx) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img key={idx} src={url} alt="" className="w-full mb-3 rounded-2xl break-inside-avoid border border-slate-200 dark:border-white/5" />
                            ))}
                        </div>
                        {p.impression && (
                            <p className="mt-6 text-lg md:text-xl text-slate-700 dark:text-slate-300 leading-relaxed font-light whitespace-pre-wrap">
                                {p.impression}
                            </p>
                        )}
                    </section>
                </ScrollReveal>
            ))}
        </div>
    );
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
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">신호를 잃었습니다</h1>
            <p className="text-slate-500 dark:text-white/40 max-w-md mx-auto mb-12 text-lg font-light leading-relaxed">{message}</p>
            <button 
                onClick={() => window.location.reload()}
                className="px-10 py-4 rounded-full bg-slate-200/50 dark:bg-white/5 hover:bg-slate-300/50 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 transition-all font-semibold uppercase text-[11px] tracking-widest text-slate-600 dark:text-white/70"
            >
                연결 재시도
            </button>
        </div>
    );
}
