'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useWizardStore, generateId, getSavedSpots, type SavedSpot, type TripSummary, type Travelog, cn } from '@pplaner/shared';
import { parseISO, startOfDay, isAfter, isBefore, format } from 'date-fns';
import PathwalkImportModal from '@/components/travelogs/PathwalkImportModal';
import SavedSeedRow from '@/components/home/SavedSeedRow';

/**
 * 홈 = 내 여행 갤러리 (컨셉 스파인 STEP 2-1).
 *
 * 하나의 "여행(Journey)"을 그릇으로, 계획(trip)과 여행기(travelog)를 합쳐 카드로 보여준다.
 * 각 카드에 라이프사이클 상태 배지(계획·여행 중·여행기·공유됨)를 달고, 상단엔 "새로 시작"의
 * 네 문(계획으로 · 사진으로 · PATHWALK · 저장한 곳에서)을 둔다.
 */

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

const BADGE = {
    plan: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    ongoing: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    write: 'bg-primary/10 text-primary',
    journal: 'bg-primary/10 text-primary',
    shared: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
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
    const openWizard = useWizardStore((s) => s.open);
    const router = useRouter();
    const [showPathwalk, setShowPathwalk] = useState(false);
    const [savedSpots, setSavedSpots] = useState<SavedSpot[]>([]);

    // 저장한 스팟은 다음 여행의 씨앗 — 홈에서 바로 보이게 가져온다.
    useEffect(() => {
        if (!userId) return;
        let alive = true;
        getSavedSpots(userId).then((s) => { if (alive) setSavedSpots(s); });
        return () => { alive = false; };
    }, [userId]);

    // "사진으로"는 계획 위저드(날짜·지역·취향 4단계)를 거치지 않는다. 사진이 곧 시작이므로
    // 빈 여행기의 에디터로 바로 보내고, 첫 화면인 사진 고르기를 자동으로 연다.
    const startFromPhotos = () => {
        router.push(`/travelogs/log_${generateId()}/edit?photos=1`);
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

            {/* 새로 시작 — 네 개의 문 */}
            <div className="mb-8 rounded-3xl bg-gradient-to-br from-primary to-indigo-600 p-5 sm:p-6 shadow-lg">
                <p className="text-sm font-black text-white">새로 시작</p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <button
                        type="button"
                        onClick={() => openWizard('PLAN')}
                        className="flex items-center gap-2.5 rounded-2xl bg-white/15 hover:bg-white/25 transition px-4 py-3 text-left"
                    >
                        <span className="material-symbols-rounded text-white text-[22px]">edit_note</span>
                        <span><span className="block text-sm font-black text-white">계획으로</span><span className="block text-[11px] text-white/70">일정을 짜며 시작</span></span>
                    </button>
                    <button
                        type="button"
                        onClick={startFromPhotos}
                        className="flex items-center gap-2.5 rounded-2xl bg-white/15 hover:bg-white/25 transition px-4 py-3 text-left"
                    >
                        <span className="material-symbols-rounded text-white text-[22px]">photo_library</span>
                        <span><span className="block text-sm font-black text-white">사진으로</span><span className="block text-[11px] text-white/70">사진을 올리면 바로 정리돼요</span></span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowPathwalk(true)}
                        className="flex items-center gap-2.5 rounded-2xl bg-white/15 hover:bg-white/25 transition px-4 py-3 text-left"
                        title="PATHWALK가 기록한 발자취를 여행기로 가져옵니다"
                    >
                        <span className="material-symbols-rounded text-white text-[22px]">footprint</span>
                        <span><span className="block text-sm font-black text-white">PATHWALK</span><span className="block text-[11px] text-white/70">발자취에서 가져오기</span></span>
                    </button>
                    {/* 네 번째 문 — 둘러보기에서 저장해 둔 곳이 출발점이 된다 */}
                    <Link
                        href={savedSpots.length > 0 ? '/saved' : '/discover?tab=spots'}
                        className="flex items-center gap-2.5 rounded-2xl bg-white/15 hover:bg-white/25 transition px-4 py-3 text-left"
                    >
                        <span className="material-symbols-rounded text-white text-[22px]">bookmark</span>
                        <span>
                            <span className="block text-sm font-black text-white">저장한 곳에서</span>
                            <span className="block text-[11px] text-white/70">
                                {savedSpots.length > 0 ? `가고 싶은 지도 · ${savedSpots.length}곳` : '둘러보기에서 마음에 든 곳 저장'}
                            </span>
                        </span>
                    </Link>
                </div>
            </div>

            {/* 가고 싶은 곳 — 저장이 그리는 다음 여행 */}
            <SavedSeedRow spots={savedSpots} />

            {/* 여행 갤러리 */}
            {journeys.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
                    <span className="material-symbols-rounded text-4xl text-slate-300">luggage</span>
                    <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">아직 여행이 없어요. 위에서 새로 시작해 보세요.</p>
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

            {showPathwalk && userId && (
                <PathwalkImportModal userId={userId} onClose={() => setShowPathwalk(false)} />
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
