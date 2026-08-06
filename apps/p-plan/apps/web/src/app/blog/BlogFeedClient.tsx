'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    getPublicTravelogs,
    buildBlogCards,
    rankBlogCards,
    cn,
    type BlogCard,
} from '@pplaner/shared';

/**
 * 여행기 블로그 피드 (v1) — 여행기 통째를 카드로 보는 깊이형 표면.
 * 팔로우 그래프 없이 인기·추천/최신으로 정렬. (팔로잉 피드는 팔로우 도입 후.)
 */
export default function BlogFeedClient({ embedded }: { embedded?: boolean } = {}) {
    const [cards, setCards] = useState<BlogCard[] | null>(null);
    const [sort, setSort] = useState<'popular' | 'recent'>('popular');
    const [seed] = useState(() => Math.floor(Math.random() * 1_000_000_000));

    useEffect(() => {
        let alive = true;
        getPublicTravelogs(40).then((ts) => { if (alive) setCards(buildBlogCards(ts)); });
        return () => { alive = false; };
    }, []);

    const ordered = useMemo(() => {
        if (!cards) return [];
        if (sort === 'recent') return [...cards].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
        return rankBlogCards(cards, { seed });
    }, [cards, sort, seed]);

    const body = (
        <div className={cn('mx-auto max-w-[1080px]', embedded ? 'pb-24' : 'px-5 sm:px-8 pt-6 pb-24')}>
                <div className={cn('flex items-end justify-between mb-5', embedded && 'justify-end')}>
                    {!embedded && (
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">여행기</h1>
                            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">여행자들의 기록을 통째로 읽어보세요.</p>
                        </div>
                    )}
                    <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10">
                        <SortBtn on={sort === 'popular'} label="인기" onClick={() => setSort('popular')} />
                        <SortBtn on={sort === 'recent'} label="최신" onClick={() => setSort('recent')} />
                    </div>
                </div>

                {cards === null ? (
                    <BlogSkeleton />
                ) : ordered.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 dark:border-white/10 p-16 text-center">
                        <span className="material-symbols-rounded text-5xl text-slate-300">menu_book</span>
                        <p className="mt-3 text-base font-black text-slate-600 dark:text-slate-300">아직 공개된 여행기가 없어요</p>
                        <p className="mt-1 text-sm text-slate-400">여행기를 공개하면 여기 블로그 피드에 올라옵니다.</p>
                    </div>
                ) : (
                    <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
                        {ordered.map((c) => <BlogCardView key={c.id} card={c} />)}
                    </div>
                )}
        </div>
    );

    if (embedded) return body;
    return <div className="min-h-screen bg-slate-50 dark:bg-[#030712]">{body}</div>;
}

function SortBtn({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
    return (
        <button onClick={onClick}
            className={cn('px-3.5 py-1.5 rounded-lg text-xs font-black transition',
                on ? 'bg-primary text-white' : 'text-slate-500 dark:text-white/50 hover:text-slate-800 dark:hover:text-white/80')}>
            {label}
        </button>
    );
}

const THEME_GRADIENT: Record<string, string> = {
    nature: 'from-emerald-400 to-teal-500', relax: 'from-sky-400 to-indigo-500',
    city: 'from-slate-500 to-slate-700', foodie: 'from-orange-400 to-rose-500',
    culture: 'from-violet-400 to-purple-600', luxury: 'from-amber-400 to-yellow-600',
    adventure: 'from-lime-400 to-emerald-600',
};

function BlogCardView({ card: c }: { card: BlogCard }) {
    const sub = [c.region, c.theme].filter(Boolean).join(' · ');
    const stats = [c.placeCount ? `장소 ${c.placeCount}` : '', c.saveCount ? `저장 ${c.saveCount}` : ''].filter(Boolean).join(' · ');
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-4 break-inside-avoid">
            <Link href={`/travelogs/${c.id}`}
                className="group block rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className={cn('relative aspect-[4/3] bg-gradient-to-br', THEME_GRADIENT[c.theme || ''] || 'from-indigo-400 to-primary')}>
                    {c.cover && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.cover} alt="" className="absolute inset-0 h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                    )}
                    {c.saveCount > 0 && (
                        <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/55 backdrop-blur-md px-2.5 py-1 text-[11px] font-black text-white">
                            <span className="material-symbols-rounded text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>bookmark</span>
                            <span className="tabular-nums">{c.saveCount}</span>
                        </span>
                    )}
                </div>
                <div className="p-4">
                    <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight line-clamp-2 group-hover:text-primary transition">{c.title}</h3>
                    {sub && <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{sub}</p>}
                    {c.summary && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{c.summary}</p>}
                    <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-400">
                        {c.authorPhotoURL
                            ? // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.authorPhotoURL} alt="" className="w-5 h-5 rounded-full object-cover" />
                            : <span className="material-symbols-rounded text-base">person</span>}
                        <span className="truncate">{c.authorName || '여행자'}</span>
                        {stats && <span className="ml-auto tabular-nums text-slate-300 dark:text-white/30">{stats}</span>}
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}

function BlogSkeleton() {
    return (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
            {[260, 320, 240, 300, 220, 280].map((h, i) => (
                <div key={i} className="mb-4 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" style={{ height: h }} />
            ))}
        </div>
    );
}
