'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    useTrip,
} from '@/hooks/useTripQuery';
import {
    subscribeToUserTravelogs,
    useTravelogStore,
    useUserStore,
    type Travelog,
    cn,
} from '@pplaner/shared';
import { useAuth } from '@/hooks/useAuth';
import { parseISO, startOfDay, isAfter, isBefore, format } from 'date-fns';

/**
 * 여행 허브 (컨셉 STEP 2-2).
 *
 * 하나의 여행(Journey)을 그릇으로, 그 계획·점검·여행기·공유를 한 화면에 모은다.
 * 각 단계 카드는 기존 표면(편집기·점검 대시보드·여행기)으로 링크하고,
 * 상단엔 지금 무엇을 하면 되는지("다음 할 일")를 안내한다.
 */

const THEME_GRADIENT: Record<string, string> = {
    nature: 'from-emerald-400 to-teal-500', relax: 'from-sky-400 to-indigo-500',
    city: 'from-slate-500 to-slate-700', foodie: 'from-orange-400 to-rose-500',
    culture: 'from-violet-400 to-purple-600', luxury: 'from-amber-400 to-yellow-600',
    adventure: 'from-lime-400 to-emerald-600',
};
const gradientFor = (t?: string) => THEME_GRADIENT[t || ''] || 'from-indigo-400 to-primary';

export default function TripHubClient() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const profile = useUserStore((s) => s.profile);
    const createTravelog = useTravelogStore((s) => s.createTravelog);

    let id = Array.isArray(params.id) ? params.id[0] : (params.id as string);
    if (id === 'placeholder' && typeof window !== 'undefined') {
        const seg = window.location.pathname.split('/').filter(Boolean);
        if (seg[0] === 'trips' && seg[1]) id = seg[1];
    }

    const { data: trip, isLoading } = useTrip(id);
    const [travelog, setTravelog] = useState<Travelog | null>(null);
    const [creating, setCreating] = useState(false);

    // 이 여행에 연동된 여행기 찾기 (trip에서 만든 여행기는 tripId로 연결됨)
    useEffect(() => {
        if (!user) return;
        const unsub = subscribeToUserTravelogs(user.uid, (logs) => {
            setTravelog(logs.find((l) => l.tripId === id || l.id === id) || null);
        });
        return () => unsub();
    }, [user, id]);

    const phase = useMemo(() => {
        const now = startOfDay(new Date());
        const start = trip?.dates?.startDate ? parseISO(trip.dates.startDate) : null;
        const end = trip?.dates?.endDate ? parseISO(trip.dates.endDate) : null;
        const isPast = end ? isAfter(now, end) : false;
        const isOngoing = start && end ? !isBefore(now, start) && !isAfter(now, end) : false;
        return { isPast, isOngoing };
    }, [trip]);

    const startTravelog = async () => {
        if (!trip || !user || creating) return;
        setCreating(true);
        try {
            const dest = trip.locations?.regionNames?.[0] || trip.locations?.regions?.[0]?.name || '';
            await createTravelog(
                {
                    tripId: trip.id,
                    locations: dest ? [dest] : [],
                    isLocationUndecided: !dest,
                    theme: trip.theme,
                    startDate: trip.dates?.startDate,
                    endDate: trip.dates?.endDate,
                    isDateUndecided: !trip.dates?.startDate,
                },
                user.uid,
                profile,
            );
            router.push(`/travelogs/${trip.id}/edit`);
        } catch (e) {
            console.error('여행기 생성 실패:', e);
            setCreating(false);
        }
    };

    if (!id) return null;
    if (isLoading) return <Spinner />;
    if (!trip) return <NotFound />;

    const warn = trip.warningCount || 0;
    const crit = trip.criticalWarningCount || 0;
    const nights = trip.dates?.durationDays ? trip.dates.durationDays - 1 : undefined;
    const dest = trip.locations?.regionNames?.[0] || trip.locations?.regions?.[0]?.name;
    const dateStr = trip.dates?.startDate
        ? `${format(parseISO(trip.dates.startDate), 'yyyy.MM.dd')}${trip.dates.endDate ? ` – ${format(parseISO(trip.dates.endDate), 'MM.dd')}` : ''}`
        : '날짜 미정';

    // 다음 할 일 (한 가지 핵심 행동)
    const next = travelog?.status === 'published'
        ? { label: '공유 카드로 자랑하기', href: `/travelogs/${travelog.id}`, icon: 'ios_share' }
        : travelog
            ? { label: '여행기 마저 쓰기', href: `/travelogs/${travelog.id}/edit`, icon: 'edit_note' }
            : phase.isPast
                ? { label: '여행기 시작하기', action: startTravelog, icon: 'auto_stories' }
                : crit > 0
                    ? { label: '점검에서 문제 해결하기', href: `/edit-trip/${id}`, icon: 'error' }
                    : { label: '계획 다듬기', href: `/edit-trip/${id}`, icon: 'edit_calendar' };

    const stages = [
        {
            key: 'plan', icon: 'edit_calendar', title: '계획',
            desc: [nights != null ? `${nights}박 ${nights + 1}일` : null, trip.flightCount ? `항공 ${trip.flightCount}` : null, trip.accommodationCount ? `숙소 ${trip.accommodationCount}` : null].filter(Boolean).join(' · ') || '일정을 짜보세요',
            cta: '편집하기', href: `/edit-trip/${id}`, done: true,
        },
        {
            key: 'check', icon: 'verified', title: '점검',
            desc: warn > 0 ? `확인할 점 ${warn}건${crit ? ` (꼭 확인 ${crit})` : ''}` : '문제 없이 깔끔해요',
            cta: '점검 열기', href: `/edit-trip/${id}`, done: warn === 0, warn: crit > 0,
        },
        {
            key: 'journal', icon: 'auto_stories', title: '여행기',
            desc: travelog ? (travelog.status === 'published' ? '공유됨' : '작성 중') : (phase.isPast ? '다녀왔다면 여행기로 남겨요' : '다녀온 뒤 기록해요'),
            cta: travelog ? '열기' : '여행기 시작', href: travelog ? `/travelogs/${travelog.id}/edit` : undefined, action: travelog ? undefined : startTravelog, done: !!travelog,
        },
        {
            key: 'share', icon: 'ios_share', title: '공유',
            desc: travelog?.status === 'published' ? '공유 준비 완료' : '여행기를 완성하면 공유할 수 있어요',
            cta: travelog?.status === 'published' ? '공유하기' : undefined, href: travelog?.status === 'published' ? `/travelogs/${travelog.id}` : undefined, done: travelog?.status === 'published', locked: travelog?.status !== 'published',
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <div className="mx-auto max-w-[720px] px-4 sm:px-6 pt-4 pb-24">
                <Link href="/" className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 transition mb-3">
                    <span className="material-symbols-rounded text-base">arrow_back</span> 내 여행
                </Link>

                {/* 헤더 */}
                <div className={cn('relative rounded-3xl overflow-hidden shadow-sm bg-gradient-to-br p-6 text-white', gradientFor(trip.theme))}>
                    <div className="relative z-10">
                        <p className="text-xs font-semibold uppercase tracking-widest text-white/70">{dest || '여행'}</p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight">{trip.title}</h1>
                        <p className="mt-1.5 text-sm font-bold text-white/85 tabular-nums">{dateStr}</p>
                    </div>
                </div>

                {/* 다음 할 일 */}
                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-4">
                    <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                        <span className="material-symbols-rounded">{next.icon}</span>
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">다음 할 일</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{next.label}</p>
                    </div>
                    {next.href ? (
                        <Link href={next.href} className="shrink-0 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition">가기</Link>
                    ) : (
                        <button onClick={next.action} disabled={creating} className="shrink-0 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition disabled:opacity-50">{creating ? '…' : '시작'}</button>
                    )}
                </div>

                {/* 라이프사이클 단계 */}
                <div className="mt-5 flex flex-col gap-2.5">
                    {stages.map((s, i) => (
                        <motion.div key={s.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            className={cn('flex items-center gap-3 rounded-2xl border bg-white dark:bg-slate-900 p-4 shadow-sm', s.locked ? 'border-slate-100 dark:border-slate-800/60 opacity-70' : 'border-slate-200 dark:border-slate-800')}>
                            <span className={cn('w-10 h-10 rounded-xl grid place-items-center shrink-0',
                                s.warn ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                    : s.done ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800')}>
                                <span className="material-symbols-rounded">{s.icon}</span>
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.title}</p>
                                    <span className="text-xs font-semibold text-slate-300 uppercase">{String(i + 1).padStart(2, '0')}</span>
                                </div>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">{s.desc}</p>
                            </div>
                            {s.cta && (s.href ? (
                                <Link href={s.href} className="shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition">{s.cta}</Link>
                            ) : (
                                <button onClick={s.action} disabled={creating} className="shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition disabled:opacity-50">{s.cta}</button>
                            ))}
                        </motion.div>
                    ))}
                </div>

                {/* 이 여행 안의 도구 — 위시리스트는 전역이 아니라 여행에 속한다 */}
                <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                        href={`/wishlist?tripId=${id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition"
                    >
                        <span className="material-symbols-rounded text-base">favorite</span>
                        위시리스트
                    </Link>
                    <Link
                        href="/saved"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition"
                    >
                        <span className="material-symbols-rounded text-base">bookmark</span>
                        가고 싶은 지도
                    </Link>
                </div>
            </div>
        </div>
    );
}

function Spinner() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
    );
}
function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
            <div className="text-center">
                <span className="material-symbols-rounded text-5xl text-slate-300">search_off</span>
                <p className="mt-2 text-sm font-bold text-slate-500">여행을 찾을 수 없어요.</p>
                <Link href="/" className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white">내 여행으로</Link>
            </div>
        </div>
    );
}
