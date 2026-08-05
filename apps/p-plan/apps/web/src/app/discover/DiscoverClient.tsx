'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    getHotFeed,
    getPublicTravelogs,
    buildFeedSpots,
    rankSpots,
    colorForCategory,
    cn,
    type HotFeedSpot,
} from '@pplaner/shared';

/**
 * 둘러보기 포털 (P4) — 로그인 없이 보는 공개 정문.
 *
 * 스케줄 함수가 만든 hot 스냅샷(public/hotFeed)을 우선 읽고, 없으면 최신 공개 스팟으로
 * 폴백한다. 유입과 크리에이터 보상("N명이 저장")을 겸하는 큐레이션 랜딩.
 */
export default function DiscoverClient() {
    const [spots, setSpots] = useState<HotFeedSpot[] | null>(null);
    const [region, setRegion] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            const hot = await getHotFeed();
            if (hot && hot.spots?.length) {
                if (alive) setSpots(hot.spots);
                return;
            }
            // 폴백: 스냅샷이 아직 없으면 최신 공개 스팟으로
            const travelogs = await getPublicTravelogs(40);
            const ranked = rankSpots(buildFeedSpots(travelogs), { seed: 7 }).slice(0, 30);
            const fallback: HotFeedSpot[] = ranked.map((f) => ({
                travelogId: f.travelogId, placeId: f.spot.id, name: f.spot.name,
                coverUrl: f.coverUrl, region: f.region, theme: f.theme,
                authorName: f.authorName, saves: f.saveCount, likes: f.likeCount,
            }));
            if (alive) setSpots(fallback);
        })();
        return () => { alive = false; };
    }, []);

    const regions = useMemo(() => {
        const seen: string[] = [];
        (spots || []).forEach((s) => { if (s.region && !seen.includes(s.region)) seen.push(s.region); });
        return seen.slice(0, 10);
    }, [spots]);

    const visible = useMemo(() => (
        region ? (spots || []).filter((s) => s.region === region) : (spots || [])
    ), [spots, region]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#030712]">
            {/* 히어로 */}
            <section className="relative overflow-hidden border-b border-slate-200 dark:border-white/10">
                <div className="mx-auto max-w-[1080px] px-5 sm:px-8 py-12 sm:py-16">
                    <p className="text-[11px] font-black uppercase tracking-[0.25em] text-primary">둘러보기</p>
                    <h1 className="mt-2 text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                        여행자들이 지금<br className="sm:hidden" /> 저장하는 곳
                    </h1>
                    <p className="mt-3 text-base sm:text-lg font-medium text-slate-500 dark:text-slate-400 max-w-xl">
                        긴 여행기를 읽지 않아도, 마음에 드는 장소 한 컷씩. 로그인 없이 둘러보고 마음에 들면 저장하세요.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2.5">
                        <Link href="/explore" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-white hover:bg-primary/90 transition">스팟 피드 열기</Link>
                        <Link href="/edit-trip/guest" className="rounded-xl border border-slate-200 dark:border-white/15 px-5 py-2.5 text-sm font-black text-slate-700 dark:text-slate-200 hover:border-primary hover:text-primary transition">여행 계획 시작</Link>
                    </div>
                </div>
            </section>

            <div className="mx-auto max-w-[1080px] px-5 sm:px-8 py-8">
                {spots === null ? (
                    <DiscoverSkeleton />
                ) : spots.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 dark:border-white/10 p-16 text-center">
                        <span className="material-symbols-rounded text-5xl text-slate-300">travel_explore</span>
                        <p className="mt-3 text-base font-black text-slate-600 dark:text-slate-300">아직 공개된 스팟이 없어요</p>
                        <p className="mt-1 text-sm text-slate-400">여행기를 공개하면 여기에 뜨는 곳으로 소개됩니다.</p>
                    </div>
                ) : (
                    <>
                        {regions.length > 1 && (
                            <div className="mb-6 flex flex-wrap gap-2">
                                <Chip on={!region} label="전체" onClick={() => setRegion(null)} />
                                {regions.map((r) => <Chip key={r} on={region === r} label={r} color={colorForCategory(r)} onClick={() => setRegion(r)} />)}
                            </div>
                        )}
                        <div className="columns-2 md:columns-3 gap-4 [column-fill:_balance]">
                            {visible.map((s, i) => <HotCard key={`${s.travelogId}:${s.placeId}:${i}`} spot={s} />)}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function Chip({ on, label, color, onClick }: { on: boolean; label: string; color?: string; onClick: () => void }) {
    return (
        <button onClick={onClick}
            className={cn('inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black border transition',
                on ? 'text-white border-transparent shadow' : 'text-slate-500 dark:text-white/50 border-slate-200 dark:border-white/15 hover:border-slate-400')}
            style={on ? { backgroundColor: color || '#334155' } : undefined}>
            {color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: on ? 'rgba(255,255,255,0.9)' : color }} />}
            {label}
        </button>
    );
}

function HotCard({ spot: s }: { spot: HotFeedSpot }) {
    const sub = [s.region, s.theme].filter(Boolean).join(' · ');
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="mb-4 break-inside-avoid">
            <Link href={`/spot/${s.travelogId}/${s.placeId}`}
                className="group block relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-900 shadow-sm hover:shadow-lg transition">
                {s.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.coverUrl} alt={s.name} className="w-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                {s.saves > 0 && (
                    <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/55 backdrop-blur-md px-2.5 py-1 text-[11px] font-black text-white">
                        <span className="material-symbols-rounded text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>bookmark</span>
                        <span className="tabular-nums">{s.saves}</span>
                    </span>
                )}
                <div className="absolute inset-x-0 bottom-0 p-4">
                    <h3 className="text-base font-black text-white leading-tight">{s.name}</h3>
                    {sub && <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-white/60">{sub}</p>}
                    {s.authorName && <p className="mt-1 text-[11px] font-semibold text-white/70">{s.authorName}의 기록</p>}
                </div>
            </Link>
        </motion.div>
    );
}

function DiscoverSkeleton() {
    return (
        <div className="columns-2 md:columns-3 gap-4">
            {[220, 300, 260, 200, 320, 240].map((h, i) => (
                <div key={i} className="mb-4 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" style={{ height: h }} />
            ))}
        </div>
    );
}
