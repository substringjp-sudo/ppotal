'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    getSavedSpots, unsaveSpot, clusterSavedSpots, useWizardStore, colorForCategory, cn,
    type SavedSpot, type InspirationCluster,
} from '@pplaner/shared';
import { useAuth } from '@/hooks/useAuth';
import MapComponent from '@/components/common/MapComponent';
import MyPageTabs from '@/components/layout/MyPageTabs';

/**
 * 가고 싶은 지도 (P3 + P5) — 피드에서 북마크한 스팟들의 개인 보드.
 * 지도/목록에 더해, 저장들이 그리는 여행 테마를 영감으로 제시해 계획으로 잇는다.
 */
export default function SavedSpotsClient() {
    const { user, loading: authLoading, loginWithGoogle } = useAuth();
    const openWizard = useWizardStore((s) => s.open);
    const addLocation = useWizardStore((s) => s.addLocation);
    const [spots, setSpots] = useState<SavedSpot[] | null>(null);
    const [focus, setFocus] = useState<string | null>(null);
    const [regionFilter, setRegionFilter] = useState<string | null>(null);

    // 홈의 씨앗 카드에서 넘어오면 그 지역에 바로 초점을 맞춘다 (?region=).
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const r = new URLSearchParams(window.location.search).get('region');
        if (r) setRegionFilter(r);
    }, []);

    useEffect(() => {
        if (authLoading) return;
        if (!user) { setSpots([]); return; }
        let alive = true;
        getSavedSpots(user.uid).then((s) => { if (alive) setSpots(s); });
        return () => { alive = false; };
    }, [user, authLoading]);

    const clusters = useMemo(() => clusterSavedSpots(spots || []), [spots]);
    const visible = useMemo(() => (
        regionFilter ? (spots || []).filter((s) => (s.region || '') === regionFilter) : (spots || [])
    ), [spots, regionFilter]);

    const markers = useMemo(() => visible
        .filter((s) => typeof s.lat === 'number' && typeof s.lng === 'number')
        .map((s) => ({ id: s.id, lat: s.lat as number, lng: s.lng as number, title: s.name, type: 'activity' as const, highlighted: s.id === focus })),
        [visible, focus]);

    const handleUnsave = async (s: SavedSpot) => {
        if (!user) return;
        setSpots((prev) => (prev || []).filter((x) => x.id !== s.id));
        try { await unsaveSpot(user.uid, s.travelogId, s.placeId); } catch (e) { console.error(e); }
    };

    if (authLoading || spots === null) return <BoardSkeleton />;

    if (!user) {
        return (
            <Centered icon="bookmark" title="가고 싶은 지도" desc="로그인하면 피드에서 저장한 장소가 지도에 모여요.">
                <button onClick={loginWithGoogle} className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white">로그인</button>
            </Centered>
        );
    }
    if (spots.length === 0) {
        return (
            <Centered icon="explore" title="아직 저장한 곳이 없어요" desc="탐색 피드에서 마음에 드는 스팟을 북마크하면 여기 지도에 쌓입니다.">
                <Link href="/discover?tab=spots" className="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white">둘러보러 가기</Link>
            </Centered>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#030712]">
            <MyPageTabs />
            {/* 지도 */}
            <div className="relative h-[42vh] min-h-[280px] w-full border-b border-slate-200 dark:border-white/10 bg-[#020617]">
                {markers.length > 0 ? (
                    <MapComponent
                        center={markers[0]}
                        zoom={4}
                        markers={markers}
                        highlightedId={focus || undefined}
                        onMarkerClick={(id) => {
                            setFocus(id);
                            const el = document.getElementById(`saved-${id}`);
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                    />
                ) : (
                    <div className="h-full grid place-items-center text-white/40 text-sm font-bold">저장한 장소에 좌표가 아직 없어요</div>
                )}
                <div className="absolute top-4 left-4 rounded-full bg-black/55 backdrop-blur-md px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white/85 pointer-events-none flex items-center gap-2">
                    <span className="material-symbols-rounded text-primary text-sm">bookmark</span>
                    가고 싶은 지도 · {spots.length}
                </div>
            </div>

            {/* 영감 — 저장들이 그리는 여행 (P5) */}
            {clusters.length > 0 && (
                <div className="mx-auto max-w-[720px] px-4 sm:px-6 pt-6">
                    <div className="flex items-baseline justify-between mb-3">
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">이 저장들이 그리는 여행</h2>
                        {regionFilter && (
                            <button onClick={() => setRegionFilter(null)} className="text-xs font-bold text-primary">전체 보기</button>
                        )}
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
                        {clusters.map((c) => (
                            <InspirationCard
                                key={c.key}
                                cluster={c}
                                active={regionFilter === c.region}
                                onFocus={() => setRegionFilter(regionFilter === c.region ? null : c.region)}
                                // open()이 reset()을 부르므로 지역 주입은 그 뒤에.
                                onStart={() => { openWizard('PLAN'); addLocation(c.region); }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* 목록 */}
            <div className="mx-auto max-w-[720px] px-4 sm:px-6 py-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {visible.map((s) => (
                        <motion.div key={s.id} id={`saved-${s.id}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            className={cn('group relative rounded-2xl overflow-hidden border bg-white dark:bg-white/[0.02] shadow-sm transition',
                                focus === s.id ? 'border-primary/50 ring-2 ring-primary/20' : 'border-slate-200 dark:border-white/10')}>
                            <Link href={`/spot/${s.travelogId}/${s.placeId}`} className="flex gap-3">
                                {s.coverUrl && (
                                    <div className="relative w-24 h-24 shrink-0 bg-slate-100 dark:bg-slate-900">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={s.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1 py-2.5 pr-2">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-primary transition">{s.name}</p>
                                    {(s.region || s.theme) && <p className="mt-0.5 text-xs font-bold uppercase tracking-widest text-slate-400 truncate">{[s.region, s.theme].filter(Boolean).join(' · ')}</p>}
                                    {s.authorName && <p className="mt-1 text-xs font-semibold text-slate-400 truncate">{s.authorName}의 기록</p>}
                                </div>
                            </Link>
                            <button
                                onClick={() => handleUnsave(s)}
                                className="absolute top-2 right-2 w-8 h-8 rounded-lg grid place-items-center bg-white/80 dark:bg-black/40 backdrop-blur text-slate-500 hover:text-rose-500 transition"
                                aria-label="저장 해제"
                                title="저장 해제"
                            >
                                <span className="material-symbols-rounded text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>bookmark</span>
                            </button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function InspirationCard({ cluster: c, active, onFocus, onStart }: {
    cluster: InspirationCluster;
    active: boolean;
    onFocus: () => void;
    onStart: () => void;
}) {
    const accent = colorForCategory(c.region);
    return (
        <div className={cn('shrink-0 w-56 rounded-2xl overflow-hidden border bg-white dark:bg-white/[0.03] shadow-sm transition',
            active ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200 dark:border-white/10')}>
            <button onClick={onFocus} className="block w-full text-left">
                {/* 커버 콜라주 */}
                <div className="relative grid grid-cols-2 grid-rows-2 gap-0.5 h-28 bg-slate-100 dark:bg-slate-900">
                    {c.covers.length > 0 ? c.covers.slice(0, 4).map((u, i) => (
                        <div key={i} className={cn('relative', c.covers.length === 1 && 'col-span-2 row-span-2', c.covers.length === 3 && i === 0 && 'row-span-2')}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={u} alt="" className="absolute inset-0 h-full w-full object-cover" />
                        </div>
                    )) : <div className="col-span-2 row-span-2" style={{ backgroundColor: accent }} />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-2 left-2.5 right-2.5">
                        <p className="text-white font-semibold text-sm leading-tight truncate">{c.region}</p>
                        <p className="text-white/75 text-xs font-bold uppercase tracking-widest truncate">
                            {[c.theme, `${c.count}곳`].filter(Boolean).join(' · ')}
                        </p>
                    </div>
                </div>
            </button>
            <button
                onClick={onStart}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-primary hover:bg-primary/5 transition"
            >
                <span className="material-symbols-rounded text-base">add_road</span>
                이 테마로 여행 시작
            </button>
        </div>
    );
}

function Centered({ icon, title, desc, children }: { icon: string; title: string; desc: string; children?: React.ReactNode }) {
    return (
        <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-[#030712] px-6 text-center">
            <div>
                <span className="material-symbols-rounded text-5xl text-slate-300">{icon}</span>
                <p className="mt-3 text-base font-semibold text-slate-700 dark:text-slate-200">{title}</p>
                <p className="mt-1 text-sm text-slate-400 max-w-xs mx-auto">{desc}</p>
                {children}
            </div>
        </div>
    );
}

function BoardSkeleton() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#030712]">
            <div className="h-[42vh] min-h-[280px] bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="mx-auto max-w-[720px] px-4 py-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />)}
            </div>
        </div>
    );
}
