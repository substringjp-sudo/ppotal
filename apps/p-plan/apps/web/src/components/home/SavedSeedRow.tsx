'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { clusterSavedSpots, useWizardStore, colorForCategory, cn, type SavedSpot, type InspirationCluster } from '@pplaner/shared';

/**
 * 가고 싶은 곳 — 내 여행 홈의 씨앗 줄 (IA-4).
 *
 * 둘러보기에서 저장한 스팟은 "언젠가"로 묻히기 쉽다. 지역별로 묶어 내 여행 첫 화면에
 * 올려두면, 저장이 곧 다음 여행의 출발점이 된다. 클릭 한 번에 그 지역이 채워진 채
 * 계획 위저드가 열린다 — 고르는 단계를 더 만들지 않는다.
 */
export default function SavedSeedRow({ spots }: { spots: SavedSpot[] }) {
    const openWizard = useWizardStore((s) => s.open);
    const addLocation = useWizardStore((s) => s.addLocation);

    const clusters = useMemo(() => clusterSavedSpots(spots, { max: 6 }), [spots]);
    if (clusters.length === 0) return null;

    // open()이 reset()을 부르므로 지역 주입은 그 뒤에.
    const startFrom = (region: string) => {
        openWizard('PLAN');
        addLocation(region);
    };

    return (
        <section className="mb-8" aria-labelledby="saved-seed-title">
            <div className="mb-3 flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                    <h2 id="saved-seed-title" className="text-sm font-black text-slate-900 dark:text-white">가고 싶은 곳</h2>
                    <p className="mt-0.5 text-xs font-medium text-slate-400 truncate">저장한 스팟이 그리는 다음 여행이에요.</p>
                </div>
                <Link href="/saved" className="shrink-0 text-[11px] font-black text-primary hover:underline whitespace-nowrap">
                    지도로 보기
                </Link>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory">
                {clusters.map((c) => (
                    <SeedCard key={c.key} cluster={c} onStart={() => startFrom(c.region)} />
                ))}
            </div>
        </section>
    );
}

function SeedCard({ cluster: c, onStart }: { cluster: InspirationCluster; onStart: () => void }) {
    const accent = colorForCategory(c.region);
    return (
        <div className="shrink-0 snap-start w-52 sm:w-56 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
            <Link href={`/saved?region=${encodeURIComponent(c.region)}`} className="block">
                <div className="relative grid grid-cols-2 grid-rows-2 gap-0.5 h-28 bg-slate-100 dark:bg-slate-800">
                    {c.covers.length > 0 ? c.covers.slice(0, 4).map((u, i) => (
                        <div
                            key={i}
                            className={cn(
                                'relative',
                                c.covers.length === 1 && 'col-span-2 row-span-2',
                                c.covers.length === 3 && i === 0 && 'row-span-2',
                            )}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={u} alt="" className="absolute inset-0 h-full w-full object-cover" />
                        </div>
                    )) : <div className="col-span-2 row-span-2" style={{ backgroundColor: accent }} />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-2 left-2.5 right-2.5">
                        <p className="text-white font-black text-sm leading-tight truncate">{c.region}</p>
                        <p className="text-white/75 text-[10px] font-bold uppercase tracking-widest truncate">
                            {[c.theme, `${c.count}곳`].filter(Boolean).join(' · ')}
                        </p>
                    </div>
                </div>
            </Link>
            <button
                type="button"
                onClick={onStart}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-black text-primary hover:bg-primary/5 transition-colors"
            >
                <span className="material-symbols-rounded text-base">add_road</span>
                이 지역으로 계획 시작
            </button>
        </div>
    );
}
