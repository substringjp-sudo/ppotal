'use client';

import { useRef, useState } from 'react';
import { cn, type TravelogPlace } from '@pplaner/shared';
import PhotoStrip from './PhotoStrip';
import { useCardStreamField } from './useCardStream';

/**
 * 장소 카드 — 이 카드 하나가 곧 TravelogPlace(=스팟)다.
 *
 * 여기에 쓴 글이 그대로 블로그 본문이자 스팟 피드의 소감이 된다. 별도 "장소 정리"
 * 단계가 없다.
 *
 * 흐름 설계:
 *  · 글 칸이 이미 열려 있다 — 사진 사이 틈을 찾아 클릭할 일이 없다.
 *  · 플레이스홀더가 기억 방아쇠다: "14:20 · 시부야 — 여기선 뭘 했나요?"
 *  · 쓰는 중인 카드는 사진이 커지고, 앞뒤 카드는 압축된 채 위아래에 남는다.
 *  · ⌘/Ctrl+Enter로 다음 장소, ⌘/Ctrl+1~5로 별점 — 손이 키보드를 떠나지 않는다.
 *  · 이름·날짜·분류는 접혀 있다가 필요할 때만 편다(대개 자동값이 맞다).
 */
export default function PlaceEntryCard({
    place, index, categoryOptions, dragHandleProps, isDragging,
    onUpdate, onRemove, onRemovePhoto, onSplitPhoto, onAddPhotos,
}: {
    place: TravelogPlace;
    index: number;
    categoryOptions: string[];
    dragHandleProps?: Record<string, any>;
    isDragging?: boolean;
    onUpdate: (patch: Partial<TravelogPlace>) => void;
    onRemove: () => void;
    onRemovePhoto: (url: string) => void;
    onSplitPhoto: (url: string) => void;
    onAddPhotos: (files: File[]) => void;
}) {
    const [showDetails, setShowDetails] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const field = useCardStreamField(place.id, {
        onRate: (n) => onUpdate({ rating: place.rating === n ? 0 : n }),
    });

    // 기억 방아쇠 — 시각과 장소가 "그때 뭘 했더라"를 되살린다
    const timeLabel = place.startTime
        ? (place.endTime ? `${place.startTime}–${place.endTime}` : place.startTime)
        : '';
    const trigger = [timeLabel, place.name].filter(Boolean).join(' · ');
    const placeholder = trigger ? `${trigger} — 여기선 뭘 했나요?` : '이 장소는 어땠나요?';

    return (
        <article
            className={cn(
                'rounded-2xl border bg-white dark:bg-slate-900 shadow-sm transition-all',
                field.isActive
                    ? 'border-primary/40 ring-2 ring-primary/10 shadow-md'
                    : 'border-slate-200 dark:border-slate-800',
                isDragging && 'opacity-40',
            )}
        >
            <div className="p-3 sm:p-4 space-y-3">
                {/* 헤더: 순번 · 이름 · 시각 */}
                <div className="flex items-start gap-2.5">
                    <button
                        {...dragHandleProps}
                        className="mt-0.5 w-7 h-7 rounded-lg bg-primary/10 text-primary grid place-items-center text-[11px] font-black shrink-0 cursor-grab active:cursor-grabbing touch-none"
                        aria-label="순서 바꾸기"
                        title="끌어서 순서 바꾸기"
                    >
                        {String(index + 1).padStart(2, '0')}
                    </button>
                    <div className="min-w-0 flex-1">
                        <input
                            value={place.name}
                            onChange={(e) => onUpdate({ name: e.target.value })}
                            placeholder="장소 이름"
                            className="w-full bg-transparent text-sm font-black text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/20 rounded px-1 -mx-1"
                        />
                        {(timeLabel || place.visitDate) && (
                            <p className="mt-0.5 px-1 -mx-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 tabular-nums truncate">
                                {[place.visitDate, timeLabel].filter(Boolean).join(' · ')}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => setShowDetails((v) => !v)}
                        className="w-7 h-7 rounded-lg grid place-items-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
                        aria-label="세부 설정"
                        aria-expanded={showDetails}
                    >
                        <span className="material-symbols-rounded text-lg">{showDetails ? 'expand_less' : 'tune'}</span>
                    </button>
                </div>

                <PhotoStrip
                    photos={place.photoUrls || []}
                    cover={place.coverPhotoUrl}
                    active={field.isActive}
                    onPickCover={(url) => onUpdate({ coverPhotoUrl: url })}
                    onRemovePhoto={onRemovePhoto}
                    onSplitPhoto={onSplitPhoto}
                />

                {/* 소감 — 항상 열려 있는 글 칸 */}
                <textarea
                    ref={field.ref}
                    onKeyDown={field.onKeyDown}
                    onFocus={field.onFocus}
                    onBlur={field.onBlur}
                    value={place.impression || ''}
                    onChange={(e) => onUpdate({ impression: e.target.value })}
                    placeholder={placeholder}
                    rows={field.isActive ? 5 : 3}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm leading-relaxed text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none resize-none transition-all"
                />

                {/* 별점 + 사진 추가 */}
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
                    <div className="flex-1" />
                    <button
                        onClick={() => fileRef.current?.click()}
                        className="rounded-lg px-2.5 py-1.5 text-[11px] font-black text-slate-500 hover:text-primary hover:bg-primary/5 transition flex items-center gap-1"
                    >
                        <span className="material-symbols-rounded text-base">add_photo_alternate</span>
                        사진
                    </button>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files?.length) onAddPhotos(Array.from(e.target.files));
                            e.target.value = '';
                        }}
                    />
                </div>

                {/* 세부 — 대개 자동값이 맞으므로 접어둔다 */}
                {showDetails && (
                    <div className="pt-1 space-y-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex gap-2 pt-2">
                            <input
                                type="date"
                                value={place.visitDate || ''}
                                onChange={(e) => onUpdate({ visitDate: e.target.value || undefined })}
                                className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/30"
                            />
                            <input
                                value={place.category || ''}
                                onChange={(e) => onUpdate({ category: e.target.value })}
                                list="place-category-options"
                                placeholder="분류 (카페 · 관광 · 맛집)"
                                className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </div>
                        <datalist id="place-category-options">
                            {categoryOptions.map((c) => <option key={c} value={c} />)}
                        </datalist>
                        <button
                            onClick={onRemove}
                            className="text-[11px] font-black text-rose-500 hover:underline flex items-center gap-1"
                        >
                            <span className="material-symbols-rounded text-sm">delete</span>
                            이 장소 삭제
                        </button>
                    </div>
                )}
            </div>
        </article>
    );
}
