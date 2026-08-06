'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
    DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor,
    useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext, verticalListSortingStrategy, arrayMove, useSortable,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    collectCategories, generateId, hasMinimumContent, syncTravelogPlaces,
    buildStoryEntries, reorderStoryEntries, cn,
    getTrip, buildTripPriors, tripUtcOffsetMinutes,
    type Travelog, type TravelogPlace, type TravelogNote, type StoryEntry,
    type TripPriors,
} from '@pplaner/shared';
import { useAuth } from '@/hooks/useAuth';
import { useTravelogPersistence } from './hooks/useTravelogPersistence';
import PlaceEntryCard from '@/components/travelogs/editor/entry/PlaceEntryCard';
import NoteEntryCard from '@/components/travelogs/editor/entry/NoteEntryCard';
import { CardStreamProvider, useCardStreamState } from '@/components/travelogs/editor/entry/useCardStream';
import { intakePhotosToPlaces, uploadTravelogPhoto, type IntakeProgress } from '@/lib/travelogPhotoIntake';

/**
 * 여행기 에디터 — 카드 스트림.
 *
 * 쓴 것이 곧 스팟이다. 장소 카드 하나가 TravelogPlace 하나이고, 여기 쓴 글이 그대로
 * 블로그 본문이자 스팟 피드의 소감이 된다. 별도의 "장소 정리" 단계가 없다.
 *
 * 흐름:
 *   사진을 던진다 → 시간·위치로 자동 클러스터링 + 지명 조회 → 장소 카드가 이미 채워진
 *   채로 등장 → 사용자는 소감만 이어 쓴다(⌘Enter로 다음 장소). 빈 화면 앞에서
 *   막막할 일이 없다.
 */
export default function TravelogEditorClient({ id }: { id: string }) {
    const router = useRouter();
    const { user } = useAuth();
    const [travelog, setTravelog] = useState<Travelog | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [progress, setProgress] = useState<IntakeProgress | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const seeded = useRef(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const { handleSave } = useTravelogPersistence({
        id, travelog, setTravelog, setIsLoading, setIsSaving,
    });

    // ── 계획 사전 정보 ───────────────────────────────────────────
    // 계획에서 여행기를 만들 수는 없다(계획은 의도, 기록은 증거). 하지만 계획은 증거를
    // '해석'할 때 우리가 가진 가장 정밀한 신호다 — 어느 날 어디에 가려 했는지가 적혀 있다.
    // 계획이 없으면(사진만 올린 경우) 아래는 전부 undefined로 남고 동작은 그대로다.
    const [priors, setPriors] = useState<TripPriors | null>(null);
    const [tzOffsetMinutes, setTzOffsetMinutes] = useState<number | undefined>();
    const tripId = travelog?.tripId;
    useEffect(() => {
        if (!tripId) { setPriors(null); setTzOffsetMinutes(undefined); return; }
        let alive = true;
        getTrip(tripId).then((trip) => {
            if (!alive || !trip) return;
            setPriors(buildTripPriors(trip as any));
            setTzOffsetMinutes(tripUtcOffsetMinutes(trip as any, -new Date().getTimezoneOffset()));
        }).catch(() => { /* 계획을 못 읽어도 사진만으로 계속 쓸 수 있어야 한다 */ });
        return () => { alive = false; };
    }, [tripId]);

    // "사진으로" 시작한 경우(?photos=1) 사진 고르기를 자동으로 연다 —
    // 위저드를 거치지 않으므로 첫 동작이 곧 사진 올리기가 되게.
    const autoOpened = useRef(false);
    useEffect(() => {
        if (autoOpened.current || isLoading || !travelog) return;
        if (typeof window === 'undefined') return;
        if (new URLSearchParams(window.location.search).get('photos') !== '1') return;
        autoOpened.current = true;
        setTimeout(() => fileRef.current?.click(), 250);
    }, [isLoading, travelog]);

    // 가져오기(계획·PATHWALK)로 들어온 여행기는 타임라인만 있을 수 있다 →
    // 최초 1회 장소 카드로 씨앗을 뿌려 카드 스트림으로 이어받는다.
    useEffect(() => {
        if (!travelog || seeded.current) return;
        seeded.current = true;
        if ((travelog.places || []).length === 0 && (travelog.timeline || []).length > 0) {
            const seededPlaces = syncTravelogPlaces(travelog);
            if (seededPlaces.length > 0) setTravelog((prev) => (prev ? { ...prev, places: seededPlaces } : prev));
        }
    }, [travelog]);

    const entries = useMemo<StoryEntry[]>(
        () => (travelog ? buildStoryEntries(travelog) : []),
        [travelog],
    );
    const entryIds = useMemo(
        () => entries.map((e) => (e.kind === 'place' ? e.place.id : e.note.id)),
        [entries],
    );
    const categoryOptions = useMemo(
        () => collectCategories(travelog?.places || []),
        [travelog?.places],
    );
    const nextOrder = entries.length;

    // ── 카드 조작 ────────────────────────────────────────────────
    const commitEntries = useCallback((next: StoryEntry[]) => {
        const { places, notes } = reorderStoryEntries(next);
        setTravelog((prev) => (prev ? { ...prev, places, notes } : prev));
    }, []);

    const updatePlace = useCallback((placeId: string, patch: Partial<TravelogPlace>) => {
        setTravelog((prev) => prev ? {
            ...prev,
            places: (prev.places || []).map((p) => (p.id === placeId ? { ...p, ...patch } : p)),
        } : prev);
    }, []);

    const updateNote = useCallback((noteId: string, patch: Partial<TravelogNote>) => {
        setTravelog((prev) => prev ? {
            ...prev,
            notes: (prev.notes || []).map((n) => (n.id === noteId ? { ...n, ...patch } : n)),
        } : prev);
    }, []);

    const removePlace = useCallback((placeId: string) => {
        setTravelog((prev) => prev ? { ...prev, places: (prev.places || []).filter((p) => p.id !== placeId) } : prev);
    }, []);

    const removeNote = useCallback((noteId: string) => {
        setTravelog((prev) => prev ? { ...prev, notes: (prev.notes || []).filter((n) => n.id !== noteId) } : prev);
    }, []);

    const addNote = useCallback(() => {
        const note: TravelogNote = { id: generateId(), text: '', order: nextOrder };
        setTravelog((prev) => prev ? { ...prev, notes: [...(prev.notes || []), note] } : prev);
        return note.id;
    }, [nextOrder]);

    const addEmptyPlace = useCallback(() => {
        const place: TravelogPlace = { id: generateId(), name: '', order: nextOrder, photoUrls: [] };
        setTravelog((prev) => prev ? { ...prev, places: [...(prev.places || []), place] } : prev);
    }, [nextOrder]);

    // 사진 한 장을 새 장소로 분리 — 자동 클러스터링이 잘못 묶었을 때의 값싼 복구
    const splitPhoto = useCallback((placeId: string, url: string) => {
        setTravelog((prev) => {
            if (!prev) return prev;
            const src = (prev.places || []).find((p) => p.id === placeId);
            if (!src) return prev;
            const newPlace: TravelogPlace = {
                id: generateId(),
                name: '',
                photoUrls: [url],
                visitDate: src.visitDate,
                order: (src.order ?? 0) + 0.5,   // 원래 장소 바로 뒤 (저장 시 정수로 재부여)
            };
            return {
                ...prev,
                places: [
                    ...(prev.places || []).map((p) => p.id === placeId
                        ? {
                            ...p,
                            photoUrls: (p.photoUrls || []).filter((u) => u !== url),
                            coverPhotoUrl: p.coverPhotoUrl === url ? undefined : p.coverPhotoUrl,
                        }
                        : p),
                    newPlace,
                ],
            };
        });
        toast.success('새 장소로 분리했어요');
    }, []);

    const removePhoto = useCallback((placeId: string, url: string) => {
        setTravelog((prev) => prev ? {
            ...prev,
            places: (prev.places || []).map((p) => p.id === placeId ? {
                ...p,
                photoUrls: (p.photoUrls || []).filter((u) => u !== url),
                coverPhotoUrl: p.coverPhotoUrl === url ? undefined : p.coverPhotoUrl,
            } : p),
        } : prev);
    }, []);

    // ── 사진 인입 ────────────────────────────────────────────────
    const handleFiles = useCallback(async (files: File[]) => {
        if (!user || !travelog || files.length === 0) return;
        const images = files.filter((f) => f.type.startsWith('image/'));
        if (images.length === 0) return;
        try {
            const places = await intakePhotosToPlaces(
                images, user.uid, travelog.id, nextOrder, setProgress,
                { priors: priors || undefined, tzOffsetMinutes },
            );
            setTravelog((prev) => {
                if (!prev) return prev;
                // 사진에 찍힌 날짜로 여행 시작·끝을 인지한다 — 처음 채울 때만, 기존 범위는 넓히기만 한다
                // (사용자가 사진 없는 날도 포함되게 손으로 넓혀둔 걸 도로 좁히지 않기 위해).
                const newDates = places.map((p) => p.visitDate).filter(Boolean) as string[];
                const newMin = newDates.length ? newDates.reduce((a, b) => (a < b ? a : b)) : undefined;
                const newMax = newDates.length ? newDates.reduce((a, b) => (a > b ? a : b)) : undefined;
                return {
                    ...prev,
                    places: [...(prev.places || []), ...places],
                    startDate: newMin && (!prev.startDate || newMin < prev.startDate) ? newMin : prev.startDate,
                    endDate: newMax && (!prev.endDate || newMax > prev.endDate) ? newMax : prev.endDate,
                };
            });
            toast.success(`사진 ${images.length}장 → 장소 ${places.length}곳으로 정리했어요`);
        } catch (e) {
            console.error(e);
            toast.error('사진을 올리지 못했어요.');
        } finally {
            setProgress(null);
        }
    }, [user, travelog, nextOrder, priors, tzOffsetMinutes]);

    const addPhotosToPlace = useCallback(async (placeId: string, files: File[]) => {
        if (!user || !travelog) return;
        const images = files.filter((f) => f.type.startsWith('image/'));
        if (images.length === 0) return;
        setProgress({ stage: 'uploading', done: 0, total: images.length });
        try {
            let done = 0;
            const urls = await Promise.all(images.map(async (f) => {
                const url = await uploadTravelogPhoto(f, user.uid, travelog.id);
                setProgress({ stage: 'uploading', done: ++done, total: images.length });
                return url;
            }));
            setTravelog((prev) => prev ? {
                ...prev,
                places: (prev.places || []).map((p) => p.id === placeId
                    ? { ...p, photoUrls: [...(p.photoUrls || []), ...urls] } : p),
            } : prev);
        } catch (e) {
            console.error(e);
            toast.error('사진을 올리지 못했어요.');
        } finally {
            setProgress(null);
        }
    }, [user, travelog]);

    // ── 키보드 흐름 ──────────────────────────────────────────────
    const stream = useCardStreamState(entryIds, addNote);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const onDragEnd = (e: DragEndEvent) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;
        const from = entryIds.indexOf(String(active.id));
        const to = entryIds.indexOf(String(over.id));
        if (from === -1 || to === -1) return;
        commitEntries(arrayMove(entries, from, to));
    };

    // 대표 이미지가 없으면 첫 장소의 대표컷을 승계 (블로그 피드·홈 갤러리가 쓴다)
    useEffect(() => {
        if (!travelog || travelog.coverImageUrl) return;
        const first = (travelog.places || []).find((p) => p.coverPhotoUrl || p.photoUrls?.length);
        const cover = first?.coverPhotoUrl || first?.photoUrls?.[0];
        if (cover) setTravelog((prev) => (prev && !prev.coverImageUrl ? { ...prev, coverImageUrl: cover } : prev));
    }, [travelog]);

    if (isLoading) return <EditorSkeleton />;
    if (!travelog) return <NotFound />;

    const canSave = hasMinimumContent(travelog);
    const isEmpty = entries.length === 0;

    return (
        <CardStreamProvider value={stream}>
            <div
                className="min-h-screen bg-slate-50 dark:bg-[#030712]"
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault(); setDragOver(false);
                    if (e.dataTransfer.files?.length) handleFiles(Array.from(e.dataTransfer.files));
                }}
            >
                {/* 상단 바 */}
                <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl">
                    <div className="mx-auto max-w-[720px] px-4 py-2.5 flex items-center gap-2">
                        <Link href={`/travelogs/${id}`} className="w-9 h-9 rounded-xl grid place-items-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0" aria-label="나가기">
                            <span className="material-symbols-rounded">arrow_back</span>
                        </Link>
                        <div className="flex-1 min-w-0 text-center">
                            <span className={cn('text-[10px] font-black uppercase tracking-widest',
                                isSaving ? 'text-primary' : canSave ? 'text-slate-400' : 'text-amber-500')}>
                                {isSaving ? '저장 중…' : canSave ? '자동 저장됨' : '제목과 내용을 입력하세요'}
                            </span>
                        </div>
                        <button
                            onClick={() => handleSave()}
                            disabled={!canSave}
                            className="rounded-xl bg-primary px-4 py-2 text-xs font-black text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/90 transition shrink-0"
                        >
                            저장
                        </button>
                    </div>
                    {progress && progress.stage !== 'done' && (
                        <div className="h-0.5 bg-primary/20">
                            <div className="h-full bg-primary transition-all"
                                style={{ width: `${Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%` }} />
                        </div>
                    )}
                </header>

                <div className="mx-auto max-w-[720px] px-4 pt-5 pb-40">
                    {/* 제목 · 요약 */}
                    <input
                        value={travelog.title}
                        onChange={(e) => setTravelog({ ...travelog, title: e.target.value })}
                        placeholder="여행기 제목"
                        className="w-full bg-transparent text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 outline-none"
                    />
                    <input
                        value={travelog.summary}
                        onChange={(e) => setTravelog({ ...travelog, summary: e.target.value })}
                        placeholder="한 줄 소개 (선택)"
                        className="mt-1.5 w-full bg-transparent text-sm font-medium text-slate-500 dark:text-slate-400 placeholder:text-slate-300 dark:placeholder:text-slate-700 outline-none"
                    />

                    {/* 카드 스트림 */}
                    <div className="mt-6">
                        {isEmpty ? (
                            <button
                                onClick={() => fileRef.current?.click()}
                                className={cn(
                                    'w-full rounded-3xl border-2 border-dashed p-10 sm:p-14 text-center transition',
                                    dragOver ? 'border-primary bg-primary/5' : 'border-slate-300 dark:border-slate-700 hover:border-primary hover:bg-primary/5',
                                )}
                            >
                                <span className="material-symbols-rounded text-5xl text-slate-300">add_photo_alternate</span>
                                <p className="mt-3 text-base font-black text-slate-700 dark:text-slate-200">사진을 올리면 여행기가 시작돼요</p>
                                <p className="mt-1 text-sm text-slate-400">찍은 시간과 위치로 장소를 자동으로 나눠 드려요.<br />끌어다 놓거나 눌러서 고르세요.</p>
                            </button>
                        ) : (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                                <SortableContext items={entryIds} strategy={verticalListSortingStrategy}>
                                    <div className="flex flex-col gap-3">
                                        {entries.map((entry, i) => (
                                            <SortableEntry
                                                key={entry.kind === 'place' ? entry.place.id : entry.note.id}
                                                entryId={entry.kind === 'place' ? entry.place.id : entry.note.id}
                                            >
                                                {(dragProps, isDragging) => entry.kind === 'place' ? (
                                                    <PlaceEntryCard
                                                        place={entry.place}
                                                        index={i}
                                                        categoryOptions={categoryOptions}
                                                        plannedPlaces={priors?.plannedPlaces}
                                                        dragHandleProps={dragProps}
                                                        isDragging={isDragging}
                                                        onUpdate={(patch) => updatePlace(entry.place.id, patch)}
                                                        onRemove={() => removePlace(entry.place.id)}
                                                        onRemovePhoto={(url) => removePhoto(entry.place.id, url)}
                                                        onSplitPhoto={(url) => splitPhoto(entry.place.id, url)}
                                                        onAddPhotos={(files) => addPhotosToPlace(entry.place.id, files)}
                                                    />
                                                ) : (
                                                    <NoteEntryCard
                                                        note={entry.note}
                                                        dragHandleProps={dragProps}
                                                        isDragging={isDragging}
                                                        onUpdate={(patch) => updateNote(entry.note.id, patch)}
                                                        onRemove={() => removeNote(entry.note.id)}
                                                    />
                                                )}
                                            </SortableEntry>
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )}
                    </div>

                    {/* 추가 액션 */}
                    {!isEmpty && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            <ActionChip icon="add_photo_alternate" label="사진 추가" onClick={() => fileRef.current?.click()} />
                            <ActionChip icon="place" label="장소 직접 추가" onClick={addEmptyPlace} />
                            <ActionChip icon="notes" label="글 추가" onClick={() => { const nid = addNote(); setTimeout(() => stream.focusEntry(nid), 50); }} />
                        </div>
                    )}

                    {/* 키보드 힌트 — 데스크탑에서만 */}
                    {!isEmpty && (
                        <p className="mt-6 hidden sm:block text-center text-[11px] font-medium text-slate-400">
                            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">⌘</kbd>
                            <span className="mx-1">+</span>
                            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">Enter</kbd>
                            <span className="ml-1.5">다음 장소로 · </span>
                            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">⌘</kbd>
                            <span className="mx-1">+</span>
                            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">1–5</kbd>
                            <span className="ml-1.5">별점</span>
                        </p>
                    )}
                </div>

                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files?.length) handleFiles(Array.from(e.target.files));
                        e.target.value = '';
                    }}
                />

                {/* 모바일: 키보드 위 "다음 장소" — 손을 화면 위로 크게 옮기지 않게 */}
                {stream.activeId && (
                    <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl px-4 py-2 flex items-center gap-2"
                        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.5rem)' }}>
                        <button onClick={() => stream.focusRelative(stream.activeId!, -1)}
                            className="w-10 h-10 rounded-xl grid place-items-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="이전 장소">
                            <span className="material-symbols-rounded">keyboard_arrow_up</span>
                        </button>
                        <button onClick={() => stream.focusRelative(stream.activeId!, 1)}
                            className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-black text-white">
                            다음 장소
                        </button>
                        <button onClick={() => (document.activeElement as HTMLElement)?.blur()}
                            className="w-10 h-10 rounded-xl grid place-items-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="키보드 닫기">
                            <span className="material-symbols-rounded">keyboard_hide</span>
                        </button>
                    </div>
                )}

                {/* 드래그 오버레이 */}
                {dragOver && (
                    <div className="fixed inset-0 z-50 bg-primary/10 backdrop-blur-sm grid place-items-center pointer-events-none">
                        <div className="rounded-3xl bg-white dark:bg-slate-900 px-8 py-6 shadow-2xl text-center">
                            <span className="material-symbols-rounded text-4xl text-primary">photo_library</span>
                            <p className="mt-2 text-sm font-black text-slate-800 dark:text-slate-100">놓으면 장소로 정리돼요</p>
                        </div>
                    </div>
                )}
            </div>
        </CardStreamProvider>
    );
}

/** dnd-kit 정렬 래퍼 — 드래그 핸들만 잡히게 해서 글 입력과 충돌하지 않는다 */
function SortableEntry({ entryId, children }: {
    entryId: string;
    children: (dragProps: Record<string, any>, isDragging: boolean) => React.ReactNode;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entryId });
    return (
        <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }}>
            {children({ ...attributes, ...listeners }, isDragging)}
        </div>
    );
}

function ActionChip({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-black text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition"
        >
            <span className="material-symbols-rounded text-base">{icon}</span>
            {label}
        </button>
    );
}

function EditorSkeleton() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#030712]">
            <div className="mx-auto max-w-[720px] px-4 pt-16 space-y-4">
                <div className="h-9 w-2/3 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-48 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-48 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            </div>
        </div>
    );
}

function NotFound() {
    return (
        <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-[#030712] px-6 text-center">
            <div>
                <span className="material-symbols-rounded text-5xl text-slate-300">search_off</span>
                <p className="mt-3 text-sm font-bold text-slate-500">여행기를 찾을 수 없어요.</p>
                <Link href="/travelogs" className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-white">여행기록으로</Link>
            </div>
        </div>
    );
}
