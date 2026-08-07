'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    getTravelog,
    syncTravelogPlaces,
    cn,
    type Travelog,
    type TravelogPlace,
} from '@pplaner/shared';

/**
 * 스팟 상세 (permalink) — 여행기 안의 장소 하나를 독립 주소로 보여준다.
 * 스팟 피드/포털/북마크가 가리키는 소셜의 최소 단위. 깊이가 궁금하면 출처 여행기로.
 */
export default function SpotPageClient() {
    const params = useParams();
    let travelogId = (Array.isArray(params.travelogId) ? params.travelogId[0] : params.travelogId) as string;
    let placeId = (Array.isArray(params.placeId) ? params.placeId[0] : params.placeId) as string;
    if ((travelogId === 'placeholder' || placeId === 'placeholder') && typeof window !== 'undefined') {
        const seg = window.location.pathname.split('/').filter(Boolean);
        if (seg[0] === 'spot' && seg[1] && seg[2]) { travelogId = seg[1]; placeId = seg[2]; }
    }

    const [travelog, setTravelog] = useState<Travelog | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const data = await getTravelog(travelogId);
                if (alive) { setTravelog(data); setLoading(false); }
            } catch {
                if (alive) { setError(true); setLoading(false); }
            }
        })();
        return () => { alive = false; };
    }, [travelogId]);

    const place = useMemo<TravelogPlace | null>(() => {
        if (!travelog) return null;
        return syncTravelogPlaces(travelog).find((p) => p.id === placeId) || null;
    }, [travelog, placeId]);

    if (loading) return <Spinner />;
    if (error || !travelog || !place) return <NotFound travelogId={travelog ? travelogId : null} />;

    const photos = place.coverPhotoUrl
        ? [place.coverPhotoUrl, ...(place.photoUrls || []).filter((u) => u !== place.coverPhotoUrl)]
        : (place.photoUrls || []);
    const sub = [place.visitDate, place.location?.address].filter(Boolean).join(' · ');

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-100">
            <div className="mx-auto max-w-[680px] px-4 sm:px-6 pt-6 pb-24">
                <Link href="/journey-atlas" className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-primary transition mb-4">
                    <span className="material-symbols-rounded text-base">explore</span> 둘러보기
                </Link>

                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-[20px] overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-sm">
                    {photos.length > 0 && (
                        <div className={cn('grid gap-1', photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
                            {photos.slice(0, 4).map((url, i) => (
                                <div key={i} className={cn('relative bg-slate-100 dark:bg-slate-900',
                                    photos.length === 3 && i === 0 ? 'col-span-2 aspect-[16/9]' : 'aspect-square',
                                    photos.length === 1 && 'aspect-[4/3]')}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="p-6 sm:p-7 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <h1 className="text-2xl font-bold tracking-tight truncate">{place.name}</h1>
                                {sub && <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">{sub}</p>}
                            </div>
                            {typeof place.rating === 'number' && place.rating > 0 && (
                                <div className="flex items-center gap-0.5 shrink-0" aria-label={`별점 ${place.rating}`}>
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <span key={n} className={cn('material-symbols-rounded text-lg', n <= place.rating! ? 'text-amber-400' : 'text-slate-300 dark:text-white/15')}
                                            style={{ fontVariationSettings: n <= place.rating! ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {place.category && (
                            <span className="inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-white/40">
                                {place.category}
                            </span>
                        )}

                        {place.impression && (
                            <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{place.impression}</p>
                        )}

                        {/* 출처 여행기 */}
                        <Link href={`/travelogs/${travelogId}`}
                            className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-white/10 p-4 hover:border-primary/40 transition group">
                            <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                                <span className="material-symbols-rounded">auto_stories</span>
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">출처 여행기</p>
                                <p className="text-sm font-semibold truncate group-hover:text-primary transition">{travelog.title}</p>
                            </div>
                            <span className="material-symbols-rounded text-slate-300 group-hover:text-primary transition">chevron_right</span>
                        </Link>

                        {travelog.authorName && (
                            <div className="flex items-center gap-2 pt-1 text-xs font-bold text-slate-400">
                                {travelog.authorPhotoURL
                                    ? // eslint-disable-next-line @next/next/no-img-element
                                    <img src={travelog.authorPhotoURL} alt="" className="w-5 h-5 rounded-full object-cover" />
                                    : <span className="material-symbols-rounded text-base">person</span>}
                                {travelog.authorName}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

function Spinner() {
    return (
        <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-[#030712]">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
    );
}
function NotFound({ travelogId }: { travelogId: string | null }) {
    return (
        <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-[#030712] px-6 text-center">
            <div>
                <span className="material-symbols-rounded text-5xl text-slate-300">wrong_location</span>
                <p className="mt-3 text-sm font-bold text-slate-500">이 스팟을 찾을 수 없어요.</p>
                <Link href={travelogId ? `/travelogs/${travelogId}` : '/'}
                    className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white">
                    {travelogId ? '여행기로' : '홈으로'}
                </Link>
            </div>
        </div>
    );
}
