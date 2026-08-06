'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
    subscribeToFootprintActivities,
    summarizeFootprint,
    findUnwrittenStretches,
    buildJourneyAtlasFromFootprint,
    cn,
    type FootprintActivity,
} from '@pplaner/shared';

const AtlasMapView = dynamic(() => import('@/components/journey-atlas/AtlasMapView'), { ssr: false });

/**
 * 발자취 개요 — 지도가 인덱스, 시간은 필터.
 *
 * 여행 기록은 매일 쌓이지 않는다. 1년에 두세 번, 며칠씩 몰아서 생긴다. 그래서
 * 날짜별 목록을 첫 화면에 두면 대부분이 빈 공간이고, 무엇보다 "쌓인다"는 감각이 없다.
 * 대신 지도와 지역별 누적을 앞세우고, 날짜는 지역을 눌러 들어간 다음에 등장하게 했다.
 *
 * 그리고 이 화면의 진짜 목적은 마지막 섹션이다 — **여행기 안 쓴 기록**.
 * 발자취 레이어를 따로 만든 이유가 "다녀왔지만 안 쓴 것"을 잃지 않기 위해서였으니,
 * 그게 화면에 드러나야 다시 돌아올 이유가 된다.
 */
export default function FootprintPanel({
    userId,
    activities: given,
}: {
    userId: string;
    /** 이미 갖고 있는 활동을 넘기면 구독하지 않고 그걸 쓴다 (여행 상세에 끼워 넣거나 미리보기할 때) */
    activities?: FootprintActivity[];
}) {
    const router = useRouter();
    const [fetched, setFetched] = useState<FootprintActivity[] | null>(null);
    const activities = given ?? fetched;

    useEffect(() => {
        if (!userId || given) return;
        const unsub = subscribeToFootprintActivities(userId, (list) => setFetched(list));
        return () => unsub();
    }, [userId, given]);

    const summary = useMemo(
        () => (activities ? summarizeFootprint(activities) : null),
        [activities],
    );
    const unwritten = useMemo(
        () => (activities ? findUnwrittenStretches(activities) : []),
        [activities],
    );
    const atlas = useMemo(
        () => (activities?.length ? buildJourneyAtlasFromFootprint(activities) : null),
        [activities],
    );

    if (activities === null) {
        return (
            <div className="space-y-4">
                <div className="h-6 w-56 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-[300px] rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
                <span className="material-symbols-rounded text-4xl text-slate-300">footprint</span>
                <p className="mt-3 text-sm font-black text-slate-600 dark:text-slate-300">아직 남은 발자취가 없어요</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                    사진을 올리거나 PATHWALK에서 가져오면, 여행기로 쓰지 않아도 다녀온 기록은 여기 남습니다.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-7">
            {/* 누적 — 쌓이는 감각이 이 화면의 보상이다 */}
            {summary && (
                <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                    <p className="text-base font-black text-slate-900 dark:text-white">
                        <Count n={summary.regionCount} /> 개 지역{' '}
                        <Count n={summary.placeCount} /> 곳
                    </p>
                    <p className="text-[11px] font-bold text-slate-400">
                        여행기로 쓴 기록 {summary.writtenCount} · 기록만 남은 것 {summary.unwrittenCount}
                    </p>
                </div>
            )}

            {/* 지도 — 발자취 전체(여행기 안 쓴 방문까지) */}
            <div className="relative h-[320px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800">
                {atlas && <AtlasMapView data={atlas} hoveredTripId={null} />}
                <div className="pointer-events-none absolute left-3 bottom-3 flex flex-col gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-3 py-2">
                    <Legend color="hsl(20, 90%, 55%)" label="여행기로 쓴 곳" />
                    <Legend color="hsl(215, 15%, 60%)" label="기록만 남은 곳" />
                </div>
            </div>

            {/* 지역별 누적 */}
            {summary && summary.regions.length > 0 && (
                <section>
                    <SectionTitle>지역별 누적</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {summary.regions.map((r) => (
                            <button
                                key={r.region}
                                onClick={() => router.push(`/footprint?region=${encodeURIComponent(r.region)}`)}
                                className="text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-primary transition-colors"
                            >
                                <div className="flex items-baseline justify-between gap-2">
                                    <b className="text-sm font-black text-slate-900 dark:text-white truncate">{r.region}</b>
                                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
                                        {r.visitCount}번 방문
                                    </span>
                                </div>
                                <p className="mt-1.5 text-[11px] font-bold text-slate-400 tabular-nums">
                                    {r.placeCount}곳{r.lastVisit ? ` · 최근 ${r.lastVisit.slice(0, 7).replace('-', '.')}` : ''}
                                </p>
                                {!r.hasTravelog && (
                                    <p className="mt-1.5 text-[10px] font-black text-amber-600 dark:text-amber-400">
                                        아직 여행기 없음
                                    </p>
                                )}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* 여행기 안 쓴 기록 — 이 화면이 존재하는 이유 */}
            {unwritten.length > 0 && (
                <section>
                    <SectionTitle>여행기 안 쓴 기록</SectionTitle>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                        {unwritten.slice(0, 6).map((s, i) => (
                            <motion.div
                                key={`${s.startAt}-${i}`}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(i * 0.04, 0.2) }}
                                className={cn(
                                    'flex items-center gap-3 px-4 py-3',
                                    i > 0 && 'border-t border-slate-100 dark:border-slate-800',
                                )}
                            >
                                <Thumb url={s.activities.find((a) => a.photoUrls?.length)?.photoUrls?.[0]} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                                        {s.region || '이름 없는 기록'}
                                    </p>
                                    <p className="text-[11px] font-semibold text-slate-400 tabular-nums truncate">
                                        {fmtRange(s.startAt, s.endAt)} · {s.placeCount}곳
                                        {s.photoCount > 0 ? ` · 사진 ${s.photoCount}장` : ''}
                                    </p>
                                </div>
                                <button
                                    onClick={() => router.push(`/footprint?from=${encodeURIComponent(s.startAt)}`)}
                                    className="shrink-0 rounded-full border border-primary px-3 py-1.5 text-[11px] font-black text-primary hover:bg-primary/5 transition"
                                >
                                    여행기 쓰기
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

/** Storage URL이 만료·삭제됐을 때 깨진 이미지 아이콘이 뜨지 않게 아이콘으로 되돌린다 */
function Thumb({ url }: { url?: string }) {
    const [failed, setFailed] = useState(false);
    return (
        <div className="w-11 h-11 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 grid place-items-center overflow-hidden">
            {url && !failed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" onError={() => setFailed(true)} className="w-full h-full object-cover" />
            ) : (
                <span className="material-symbols-rounded text-lg text-slate-400">photo</span>
            )}
        </div>
    );
}

function Count({ n }: { n: number }) {
    return <em className="not-italic text-primary text-xl tabular-nums">{n}</em>;
}

function Legend({ color, label }: { color: string; label: string }) {
    return (
        <span className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            {label}
        </span>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-slate-400">{children}</p>
    );
}

function fmtRange(startIso: string, endIso: string): string {
    const d = (iso: string) => iso.slice(0, 10).replace(/-/g, '.');
    const s = d(startIso);
    const e = d(endIso);
    return s === e ? s : `${s} – ${e.slice(5)}`;
}
