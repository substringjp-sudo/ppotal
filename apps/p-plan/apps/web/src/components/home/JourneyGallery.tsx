'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getSavedSpots, type SavedSpot, type TripSummary, type Travelog, cn } from '@pplaner/shared';
import { parseISO, startOfDay, isAfter, isBefore, format } from 'date-fns';
import SavedSeedRow from '@/components/home/SavedSeedRow';
import FootprintPanel from '@/components/home/FootprintPanel';

/**
 * 홈 = 내 여행 = 마이페이지.
 *
 * "내 여행"과 "둘러보기"는 내 것 / 남의 것이라는 두 모드다. 그렇다면 내 콘텐츠는
 * 전부 이 안에 있어야 하는데, 발자취·여행 지도·인텔리전스가 계정용 프로필 메뉴에
 * 흩어져 있었다. 프로필 메뉴는 둘러보기에서도 똑같이 열리므로 모드 경계가 무너진다.
 * 그래서 내 콘텐츠를 여기 탭으로 모았다.
 *
 * "새로 시작"은 반대로 여기서 빠졌다. 만들기는 내 것도 남의 것도 아닌 세 번째 축이라
 * 어느 화면에 있든 같은 자리(헤더/하단 내비 가운데)에 있어야 하기 때문이다.
 */

const TABS = [
    { id: 'trips' as const, label: '여행' },
    { id: 'footprint' as const, label: '발자취' },
    { id: 'stats' as const, label: '인텔리전스' },
];
type TabId = typeof TABS[number]['id'];

interface Journey {
    key: string;
    title: string;
    startDate?: string;
    endDate?: string;
    theme?: string;
    coverImageUrl?: string;
    badge: { label: string; cls: string };
    href: string;
}

// 배지는 임의의 그라디언트/사진 커버 위에 얹히므로 배경이 불투명해야 읽힌다.
// (bg-primary/10은 흰 배경에선 보이지만 파란 커버 위에선 거의 사라진다)
const BADGE = {
    plan: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    ongoing: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200',
    write: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200',
    journal: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200',
    shared: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
};

const THEME_GRADIENT: Record<string, string> = {
    nature: 'from-emerald-400 to-teal-500',
    relax: 'from-sky-400 to-indigo-500',
    city: 'from-slate-500 to-slate-700',
    foodie: 'from-orange-400 to-rose-500',
    culture: 'from-violet-400 to-purple-600',
    luxury: 'from-amber-400 to-yellow-600',
    adventure: 'from-lime-400 to-emerald-600',
};
const gradientFor = (theme?: string) => THEME_GRADIENT[theme || ''] || 'from-indigo-400 to-primary';

function fmtRange(s?: string, e?: string): string {
    if (!s) return '날짜 미정';
    try {
        const ss = format(parseISO(s), 'yyyy.MM.dd');
        if (!e || e === s) return ss;
        return `${ss} – ${format(parseISO(e), 'MM.dd')}`;
    } catch { return '날짜 미정'; }
}

export default function JourneyGallery({
    trips,
    travelogs,
    displayName,
    userId,
}: {
    trips: TripSummary[];
    travelogs: Travelog[];
    displayName?: string | null;
    userId?: string;
}) {
    const [savedSpots, setSavedSpots] = useState<SavedSpot[]>([]);
    const [tab, setTab] = useState<TabId>('trips');

    // 저장한 스팟은 다음 여행의 씨앗 — 홈에서 바로 보이게 가져온다.
    useEffect(() => {
        if (!userId) return;
        let alive = true;
        getSavedSpots(userId).then((s) => { if (alive) setSavedSpots(s); });
        return () => { alive = false; };
    }, [userId]);

    // 주소로 탭을 열 수 있게 (?tab=footprint) — 옛 /footprint·/stats 링크가 여기로 온다
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const t = new URLSearchParams(window.location.search).get('tab');
        if (t && TABS.some((x) => x.id === t)) setTab(t as TabId);
    }, []);

    const selectTab = (id: TabId) => {
        setTab(id);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', id);
            window.history.replaceState({}, '', url);
        }
    };

    const journeys = useMemo<Journey[]>(() => {
        const now = startOfDay(new Date());
        const logByTrip = new Map<string, Travelog>();
        const standaloneLogs: Travelog[] = [];
        travelogs.forEach((t) => {
            if (t.tripId) logByTrip.set(t.tripId, t);
            else standaloneLogs.push(t);
        });

        const out: Journey[] = [];

        // 계획(trip) 기반 여행 — 연동 여행기가 있으면 그 상태 배지를 반영하되,
        // 클릭은 항상 여행 허브(/trips/[id])로 보낸다(계획·점검·여행기·공유를 한 그릇으로).
        trips.forEach((t) => {
            const log = logByTrip.get(t.id);
            const href = `/trips/${t.id}`;
            if (log) {
                out.push({ ...journeyFromLog(log, t), href });
                return;
            }
            const start = t.dates?.startDate ? parseISO(t.dates.startDate) : null;
            const end = t.dates?.endDate ? parseISO(t.dates.endDate) : null;
            let badge = { label: '계획 중', cls: BADGE.plan };
            if (start && end && !isBefore(now, start) && !isAfter(now, end)) badge = { label: '여행 중', cls: BADGE.ongoing };
            else if (end && isAfter(now, end)) badge = { label: '여행기 쓰기', cls: BADGE.write };
            out.push({
                key: `trip-${t.id}`,
                title: t.title,
                startDate: t.dates?.startDate,
                endDate: t.dates?.endDate,
                theme: t.theme,
                badge,
                href,
            });
        });

        // 독립 여행기 (계획 없이 사진/기억에서 시작한 것)
        standaloneLogs.forEach((log) => out.push(journeyFromLog(log)));

        // 최근 여행 우선 (시작일 내림차순, 없으면 뒤로)
        return out.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
    }, [trips, travelogs]);

    return (
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6 pt-6 pb-24">
            {/* 인사 */}
            <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    {displayName ? `${displayName}님의 여행` : '내 여행'}
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                    계획하고, 다녀오고, 여행기로 남겨 나눠요.
                </p>
            </div>

            {/* 내 콘텐츠 탭 — 여행(만든 것) · 발자취(다녀온 것) · 인텔리전스(나라는 여행자) */}
            <div className="mb-6 flex gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto" role="tablist">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        role="tab"
                        aria-selected={tab === t.id}
                        onClick={() => selectTab(t.id)}
                        className={cn(
                            'relative shrink-0 px-1 py-3 mr-6 text-sm font-black transition-colors',
                            tab === t.id ? 'text-primary' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                        )}
                    >
                        {t.label}
                        {tab === t.id && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
                    </button>
                ))}
            </div>

            {tab === 'footprint' && userId && <FootprintPanel userId={userId} />}

            {tab === 'stats' && (
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
                    <span className="material-symbols-rounded text-3xl text-primary">analytics</span>
                    <p className="mt-2 text-sm font-black text-slate-900 dark:text-white">여행자로서의 나</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                        성향·배지·지역 통계를 한곳에서 봅니다.
                    </p>
                    <Link
                        href="/stats"
                        className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-xs font-black text-white hover:bg-primary/90 transition"
                    >
                        인텔리전스 열기
                    </Link>
                </div>
            )}

            {tab === 'trips' && (
            <>
            {/* 가고 싶은 곳 — 저장이 그리는 다음 여행 */}
            <SavedSeedRow spots={savedSpots} />

            {/* 여행 갤러리 */}
            {journeys.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
                    <span className="material-symbols-rounded text-4xl text-slate-300">luggage</span>
                    <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                        아직 여행이 없어요. 오른쪽 위 <b className="text-primary">새로 시작</b>에서 시작해 보세요.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {journeys.map((j, i) => (
                        <motion.div key={j.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
                            <Link
                                href={j.href}
                                className="group block rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
                            >
                                <div className={cn('relative h-32 bg-gradient-to-br', gradientFor(j.theme))}>
                                    {j.coverImageUrl && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={j.coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                                    )}
                                    <span className={cn('absolute top-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-black', j.badge.cls)}>
                                        {j.badge.label}
                                    </span>
                                </div>
                                <div className="p-4">
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">{j.title}</h3>
                                    <p className="mt-1 text-xs font-semibold text-slate-400 tabular-nums">{fmtRange(j.startDate, j.endDate)}</p>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            )}
            </>
            )}
        </div>
    );
}

function journeyFromLog(log: Travelog, trip?: TripSummary): Journey {
    let badge = { label: '여행기', cls: BADGE.journal };
    let href = `/travelogs/${log.id}`;
    if (log.status === 'published') badge = { label: '공유됨', cls: BADGE.shared };
    else if (log.status === 'draft') { badge = { label: '여행기 작성 중', cls: BADGE.write }; href = `/travelogs/${log.id}/edit`; }
    return {
        key: `log-${log.id}`,
        title: log.title || trip?.title || '여행기',
        startDate: log.startDate || trip?.dates?.startDate,
        endDate: log.endDate || trip?.dates?.endDate,
        theme: log.theme || trip?.theme,
        coverImageUrl: log.coverImageUrl,
        badge,
        href,
    };
}
