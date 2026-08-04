'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Travelog, TravelogPlace, syncTravelogPlaces, cn } from '@pplaner/shared';

/**
 * 장소 정리 패널 (에디터).
 *
 * 에디터가 사진→타임라인으로 이미 모아둔 장소를 하나씩 보여주고, 각 장소에 대한
 * 소감·별점·분류를 작성하게 한다. 여기서 채운 내용이 뷰어의 "장소" 보기(지도/목록)와
 * 이후 "여행지도" 템플릿의 원천 데이터가 된다.
 *
 * 마운트 시 travelog에서 장소를 한 번 파생해 로컬 상태로 들고, 편집분을 onChange로
 * 상위(travelog.places)에 올린다. (파생은 사용자가 쓴 소감을 절대 덮어쓰지 않는다.)
 */
export default function TravelogPlacePanel({
    travelog,
    onChange,
    onClose,
}: {
    travelog: Travelog;
    onChange: (places: TravelogPlace[]) => void;
    onClose: () => void;
}) {
    // 마운트 시 1회 파생 (이후에는 로컬 편집 상태가 원천)
    const initial = useMemo(() => syncTravelogPlaces(travelog), []); // eslint-disable-line react-hooks/exhaustive-deps
    const [places, setPlaces] = useState<TravelogPlace[]>(initial);

    const update = (id: string, patch: Partial<TravelogPlace>) => {
        setPlaces((prev) => {
            const next = prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
            onChange(next);
            return next;
        });
    };

    const filledCount = places.filter((p) => (p.impression && p.impression.trim()) || (p.rating && p.rating > 0)).length;

    return (
        <div className="fixed inset-0 z-[70] flex items-stretch justify-end bg-black/40 backdrop-blur-sm">
            <motion.aside
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                className="w-full max-w-[560px] h-full bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl"
            >
                {/* 헤더 */}
                <div className="shrink-0 px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-rounded text-primary">pin_drop</span>
                                장소 정리
                            </h2>
                            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                                장소마다 소감과 별점을 남기면, 독자가 여행기를 <b className="text-slate-700 dark:text-slate-200">지도·목록</b>으로도 볼 수 있어요.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl grid place-items-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            aria-label="닫기"
                        >
                            <span className="material-symbols-rounded">close</span>
                        </button>
                    </div>
                    {places.length > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all"
                                    style={{ width: `${Math.round((filledCount / places.length) * 100)}%` }}
                                />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 tabular-nums">{filledCount}/{places.length}</span>
                        </div>
                    )}
                </div>

                {/* 목록 */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                    {places.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-10 text-center">
                            <span className="material-symbols-rounded text-4xl text-slate-300">wrong_location</span>
                            <p className="mt-3 text-sm font-bold text-slate-500">아직 모인 장소가 없어요.</p>
                            <p className="mt-1 text-xs text-slate-400">사진을 올리거나 일정에 장소를 연결하면 여기 나타나요.</p>
                        </div>
                    ) : (
                        places.map((p, i) => (
                            <PlaceEditCard key={p.id} place={p} index={i} onUpdate={(patch) => update(p.id, patch)} />
                        ))
                    )}
                </div>
            </motion.aside>
        </div>
    );
}

function PlaceEditCard({ place, index, onUpdate }: {
    place: TravelogPlace;
    index: number;
    onUpdate: (patch: Partial<TravelogPlace>) => void;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            {/* 사진 스트립 */}
            {place.photoUrls && place.photoUrls.length > 0 && (
                <div className="flex gap-1 h-28 overflow-x-auto bg-slate-100 dark:bg-slate-950">
                    {place.photoUrls.slice(0, 6).map((url, idx) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={idx} src={url} alt="" className="h-full w-28 object-cover flex-shrink-0" />
                    ))}
                </div>
            )}
            <div className="p-4 space-y-3">
                <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary grid place-items-center text-[11px] font-black shrink-0">
                        {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 dark:text-white truncate">{place.name}</p>
                        {(place.visitDate || place.location?.address) && (
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate">
                                {[place.visitDate, place.location?.address].filter(Boolean).join(' · ')}
                            </p>
                        )}
                    </div>
                </div>

                {/* 별점 */}
                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                        <button
                            key={n}
                            type="button"
                            onClick={() => onUpdate({ rating: place.rating === n ? 0 : n })}
                            className="p-0.5"
                            aria-label={`별점 ${n}점`}
                        >
                            <span
                                className={cn('material-symbols-rounded text-xl transition-colors',
                                    (place.rating || 0) >= n ? 'text-amber-400' : 'text-slate-300 dark:text-slate-700 hover:text-amber-200')}
                                style={{ fontVariationSettings: (place.rating || 0) >= n ? "'FILL' 1" : "'FILL' 0" }}
                            >
                                star
                            </span>
                        </button>
                    ))}
                </div>

                {/* 소감 */}
                <textarea
                    value={place.impression || ''}
                    onChange={(e) => onUpdate({ impression: e.target.value })}
                    placeholder="이 장소는 어땠나요? 소감·후기를 남겨보세요."
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none resize-none transition"
                />

                {/* 분류 */}
                <input
                    value={place.category || ''}
                    onChange={(e) => onUpdate({ category: e.target.value })}
                    placeholder="분류 (예: 카페 · 관광 · 맛집)"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
                />
            </div>
        </div>
    );
}
