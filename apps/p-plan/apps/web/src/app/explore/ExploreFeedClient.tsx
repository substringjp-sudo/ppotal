'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    getPublicTravelogs,
    buildFeedSpots,
    rankSpots,
    getSavedSpotKeys,
    getLikedSpotKeys,
    saveSpot,
    unsaveSpot,
    likeSpot,
    unlikeSpot,
    cn,
    type FeedSpot,
} from '@pplaner/shared';
import { useAuth } from '@/hooks/useAuth';

/**
 * 스팟 피드 (탐색) — P2.
 *
 * 공개 여행기들을 스팟 원자로 펼쳐 휴리스틱으로 정렬해 한 장씩 보여준다.
 * 재밌으면 마음 찍기, 인상 깊으면(→P3) 저장, 궁금하면 스팟/여행기로.
 */
export default function ExploreFeedClient({ embedded }: { embedded?: boolean } = {}) {
    const { user, loginWithGoogle } = useAuth();
    const [spots, setSpots] = useState<FeedSpot[] | null>(null);
    const [liked, setLiked] = useState<Set<string>>(new Set());
    const [saved, setSaved] = useState<Set<string>>(new Set());
    // 세션 동안 흔들리지 않는 세렌디피티 seed
    const [seed] = useState(() => Math.floor(Math.random() * 1_000_000_000));

    useEffect(() => {
        let alive = true;
        (async () => {
            const travelogs = await getPublicTravelogs(40);
            const ranked = rankSpots(buildFeedSpots(travelogs), { seed });
            if (alive) setSpots(ranked);
        })();
        return () => { alive = false; };
    }, [seed]);

    // 로그인 시 내 좋아요/저장 상태를 불러와 반영 (크로스세션)
    useEffect(() => {
        if (!user) { setLiked(new Set()); setSaved(new Set()); return; }
        let alive = true;
        Promise.all([getLikedSpotKeys(user.uid), getSavedSpotKeys(user.uid)]).then(([l, s]) => {
            if (alive) { setLiked(l); setSaved(s); }
        });
        return () => { alive = false; };
    }, [user]);

    const toggleLike = (feed: FeedSpot) => {
        const key = feed.key;
        const willLike = !liked.has(key);
        setLiked((prev) => { const n = new Set(prev); willLike ? n.add(key) : n.delete(key); return n; });
        if (user) {
            (willLike ? likeSpot : unlikeSpot)(user.uid, feed.travelogId, feed.spot.id).catch(console.error);
        }
    };

    const toggleSave = (feed: FeedSpot) => {
        if (!user) { loginWithGoogle(); return; }
        const key = feed.key;
        const willSave = !saved.has(key);
        setSaved((prev) => { const n = new Set(prev); willSave ? n.add(key) : n.delete(key); return n; });
        (willSave ? saveSpot(user.uid, feed) : unsaveSpot(user.uid, feed.travelogId, feed.spot.id)).catch(console.error);
    };

    if (spots === null) return <FeedSkeleton embedded={embedded} />;
    if (spots.length === 0) return <EmptyFeed embedded={embedded} />;

    const body = (
        <div className={cn('mx-auto max-w-[540px]', embedded ? 'pb-24' : 'px-4 sm:px-5 pt-5 pb-24')}>
            {!embedded && (
                <div className="mb-4 flex items-baseline justify-between">
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">탐색</h1>
                    <span className="text-xs font-bold text-slate-400">여행자들의 장소 {spots.length}</span>
                </div>
            )}
            <div className="flex flex-col gap-5">
                {spots.map((s) => (
                    <SpotFeedCard key={s.key} feed={s} liked={liked.has(s.key)} saved={saved.has(s.key)}
                        onLike={() => toggleLike(s)} onSave={() => toggleSave(s)} />
                ))}
            </div>
            <p className="mt-10 text-center text-xs font-medium text-slate-400">여기까지예요 · 여행기를 공개하면 이 피드에 스팟이 흐릅니다</p>
        </div>
    );

    if (embedded) return body;
    return <div className="min-h-screen bg-slate-50 dark:bg-[#030712]">{body}</div>;
}

function SpotFeedCard({ feed, liked, saved, onLike, onSave }: { feed: FeedSpot; liked: boolean; saved: boolean; onLike: () => void; onSave: () => void }) {
    const { spot } = feed;
    const sub = [feed.region, feed.theme].filter(Boolean).join(' · ');
    const likeCount = feed.likeCount + (liked ? 1 : 0);
    return (
        <motion.article
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10%' }}
            style={{ scrollSnapAlign: 'start' }}
            className="relative rounded-[20px] overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-900 shadow-lg"
        >
            {/* 커버 */}
            <Link href={`/spot/${feed.travelogId}/${spot.id}`} className="block relative aspect-[4/5]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={feed.coverUrl} alt={spot.name} className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/25" />
                {feed.theme && (
                    <span className="absolute top-4 left-4 rounded-full bg-black/50 backdrop-blur-md px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/90">
                        {feed.theme}
                    </span>
                )}
                {typeof spot.rating === 'number' && spot.rating > 0 && (
                    <span className="absolute top-4 right-4 flex items-center gap-0.5 rounded-full bg-black/50 backdrop-blur-md px-2.5 py-1">
                        <span className="material-symbols-rounded text-amber-400 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        <span className="text-xs font-semibold text-white tabular-nums">{spot.rating}</span>
                    </span>
                )}
                {/* 하단 텍스트 오버레이 */}
                <div className="absolute inset-x-0 bottom-0 p-5">
                    <h2 className="text-2xl font-bold text-white tracking-tight leading-tight">{spot.name}</h2>
                    {sub && <p className="mt-1 text-xs font-bold uppercase tracking-widest text-white/60">{sub}</p>}
                    {spot.impression && (
                        <p className="mt-2 text-sm text-white/85 leading-relaxed line-clamp-2">{spot.impression}</p>
                    )}
                </div>
            </Link>

            {/* 액션 바 */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900">
                <button
                    onClick={onLike}
                    className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition',
                        liked ? 'text-rose-500 bg-rose-50 dark:bg-rose-500/10' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800')}
                    aria-pressed={liked}
                    aria-label="마음 찍기"
                >
                    <span className="material-symbols-rounded text-lg" style={{ fontVariationSettings: liked ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                    {likeCount > 0 && <span className="tabular-nums">{likeCount}</span>}
                </button>
                <button
                    onClick={onSave}
                    className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition',
                        saved ? 'text-primary bg-primary/10' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800')}
                    aria-pressed={saved}
                    title={saved ? '가고 싶은 지도에서 빼기' : '가고 싶은 지도에 저장'}
                >
                    <span className="material-symbols-rounded text-lg" style={{ fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0" }}>bookmark</span>
                    <span className="text-xs uppercase tracking-widest">{saved ? '저장됨' : '저장'}</span>
                </button>
                <div className="flex-1" />
                <Link
                    href={`/travelogs/${feed.travelogId}`}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-primary transition min-w-0"
                >
                    {feed.authorPhotoURL
                        ? // eslint-disable-next-line @next/next/no-img-element
                        <img src={feed.authorPhotoURL} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                        : <span className="material-symbols-rounded text-base shrink-0">auto_stories</span>}
                    <span className="truncate max-w-[9rem]">{feed.authorName || '여행자'}의 기록</span>
                    <span className="material-symbols-rounded text-base shrink-0">chevron_right</span>
                </Link>
            </div>
        </motion.article>
    );
}

function FeedSkeleton({ embedded }: { embedded?: boolean }) {
    const body = (
        <div className={cn('mx-auto max-w-[540px] flex flex-col gap-5', embedded ? 'pb-24' : 'px-4 pt-5 pb-24')}>
            {!embedded && <div className="h-7 w-24 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />}
            {[0, 1].map((i) => (
                <div key={i} className="rounded-[20px] overflow-hidden border border-slate-200 dark:border-white/10">
                    <div className="aspect-[4/5] bg-slate-200 dark:bg-slate-800 animate-pulse" />
                    <div className="h-14 bg-white dark:bg-slate-900" />
                </div>
            ))}
        </div>
    );
    if (embedded) return body;
    return <div className="min-h-screen bg-slate-50 dark:bg-[#030712]">{body}</div>;
}

function EmptyFeed({ embedded }: { embedded?: boolean }) {
    const body = (
        <div className="text-center">
            <span className="material-symbols-rounded text-5xl text-slate-300">travel_explore</span>
            <p className="mt-3 text-base font-semibold text-slate-600 dark:text-slate-300">아직 공개된 스팟이 없어요</p>
            <p className="mt-1 text-sm text-slate-400">여행기를 공개하면 그 안의 장소들이 여기 흐릅니다.</p>
            <Link href="/" className="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white">내 여행으로</Link>
        </div>
    );
    if (embedded) return <div className="py-20 grid place-items-center">{body}</div>;
    return <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-[#030712] px-6">{body}</div>;
}
