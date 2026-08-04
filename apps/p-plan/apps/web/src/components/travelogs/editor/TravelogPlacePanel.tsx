'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Travelog,
    TravelogPlace,
    TravelogCollection,
    syncTravelogPlaces,
    COLLECTION_COLORS,
    cn,
} from '@pplaner/shared';

let __cid = 0;
const newCollectionId = () => `col_${Date.now().toString(36)}_${(__cid++).toString(36)}`;

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
    onCollectionsChange,
    onClose,
}: {
    travelog: Travelog;
    onChange: (places: TravelogPlace[]) => void;
    onCollectionsChange: (collections: TravelogCollection[]) => void;
    onClose: () => void;
}) {
    // 마운트 시 1회 파생 (이후에는 로컬 편집 상태가 원천)
    const initial = useMemo(() => syncTravelogPlaces(travelog), []); // eslint-disable-line react-hooks/exhaustive-deps
    const [places, setPlaces] = useState<TravelogPlace[]>(initial);
    const [collections, setCollections] = useState<TravelogCollection[]>(travelog.collections || []);
    const [managing, setManaging] = useState(false);

    const update = (id: string, patch: Partial<TravelogPlace>) => {
        setPlaces((prev) => {
            const next = prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
            onChange(next);
            return next;
        });
    };

    const commitCollections = (next: TravelogCollection[]) => {
        setCollections(next);
        onCollectionsChange(next);
    };
    const addCollection = () => {
        const c: TravelogCollection = {
            id: newCollectionId(),
            name: `분류 ${collections.length + 1}`,
            color: COLLECTION_COLORS[collections.length % COLLECTION_COLORS.length],
        };
        commitCollections([...collections, c]);
    };
    const updateCollection = (id: string, patch: Partial<TravelogCollection>) =>
        commitCollections(collections.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const removeCollection = (id: string) => {
        commitCollections(collections.filter((c) => c.id !== id));
        // 장소에서도 참조 제거
        setPlaces((prev) => {
            const next = prev.map((p) => p.collectionIds?.includes(id)
                ? { ...p, collectionIds: p.collectionIds.filter((x) => x !== id) }
                : p);
            onChange(next);
            return next;
        });
    };
    const togglePlaceCollection = (placeId: string, collId: string) => {
        const p = places.find((x) => x.id === placeId);
        if (!p) return;
        const has = p.collectionIds?.includes(collId);
        update(placeId, {
            collectionIds: has
                ? (p.collectionIds || []).filter((x) => x !== collId)
                : [...(p.collectionIds || []), collId],
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

                {/* 컬렉션 관리 */}
                <div className="shrink-0 px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <button
                        onClick={() => setManaging((v) => !v)}
                        className="w-full flex items-center justify-between text-left"
                    >
                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                            <span className="material-symbols-rounded text-base text-primary">sell</span>
                            컬렉션 {collections.length > 0 && `(${collections.length})`}
                        </span>
                        <span className="material-symbols-rounded text-slate-400">{managing ? 'expand_less' : 'expand_more'}</span>
                    </button>
                    {managing && (
                        <div className="mt-3 space-y-2.5">
                            {collections.map((c) => (
                                <CollectionEditRow
                                    key={c.id}
                                    collection={c}
                                    onUpdate={(patch) => updateCollection(c.id, patch)}
                                    onRemove={() => removeCollection(c.id)}
                                />
                            ))}
                            <button
                                onClick={addCollection}
                                className="w-full rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-2.5 text-xs font-black text-slate-500 hover:border-primary hover:text-primary transition flex items-center justify-center gap-1.5"
                            >
                                <span className="material-symbols-rounded text-base">add</span>
                                분류 추가
                            </button>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                예: “골목 카페” · “아이와 가기 좋은 곳”. 설명을 달면 뷰어에서 소개글로 보여요.
                            </p>
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
                            <PlaceEditCard
                                key={p.id}
                                place={p}
                                index={i}
                                collections={collections}
                                onUpdate={(patch) => update(p.id, patch)}
                                onToggleCollection={(cid) => togglePlaceCollection(p.id, cid)}
                            />
                        ))
                    )}
                </div>
            </motion.aside>
        </div>
    );
}

function PlaceEditCard({ place, index, collections, onUpdate, onToggleCollection }: {
    place: TravelogPlace;
    index: number;
    collections: TravelogCollection[];
    onUpdate: (patch: Partial<TravelogPlace>) => void;
    onToggleCollection: (collectionId: string) => void;
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

                {/* 빠른 분류 (자유 입력) */}
                <input
                    value={place.category || ''}
                    onChange={(e) => onUpdate({ category: e.target.value })}
                    placeholder="빠른 분류 (예: 카페 · 관광 · 맛집)"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
                />

                {/* 컬렉션 태깅 */}
                {collections.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {collections.map((c) => {
                            const on = place.collectionIds?.includes(c.id);
                            return (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => onToggleCollection(c.id)}
                                    className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black border transition',
                                        on ? 'text-white border-transparent' : 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400')}
                                    style={on ? { backgroundColor: c.color || '#64748b' } : undefined}
                                >
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color || '#64748b' }} />
                                    {c.name}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function CollectionEditRow({ collection: c, onUpdate, onRemove }: {
    collection: TravelogCollection;
    onUpdate: (patch: Partial<TravelogCollection>) => void;
    onRemove: () => void;
}) {
    const cycleColor = () => {
        const i = COLLECTION_COLORS.indexOf(c.color || '');
        onUpdate({ color: COLLECTION_COLORS[(i + 1) % COLLECTION_COLORS.length] });
    };
    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 space-y-2">
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={cycleColor}
                    className="w-6 h-6 rounded-full shrink-0 ring-2 ring-white dark:ring-slate-900 shadow"
                    style={{ backgroundColor: c.color || '#64748b' }}
                    title="색 바꾸기"
                    aria-label="색 바꾸기"
                />
                <input
                    value={c.name}
                    onChange={(e) => onUpdate({ name: e.target.value })}
                    placeholder="분류 이름"
                    className="flex-1 min-w-0 bg-transparent text-sm font-black text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
                />
                <button
                    type="button"
                    onClick={onRemove}
                    className="w-7 h-7 rounded-lg grid place-items-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20 transition shrink-0"
                    aria-label="삭제"
                >
                    <span className="material-symbols-rounded text-lg">delete</span>
                </button>
            </div>
            <input
                value={c.description || ''}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder="설명·요약 (선택)"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
            />
        </div>
    );
}
