'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    generateId,
    getFootprintPoints,
    subscribeToFootprintActivities,
    saveFootprintActivities,
    updateFootprintActivity,
    deleteFootprintActivity,
    activityToTravelogPlaces,
    type FootprintActivity,
    type FootprintPoint,
} from '@pplaner/shared';
import { useAuth } from '@/hooks/useAuth';
import { intakePhotosToFootprint, type FootprintIntakeProgress } from '@/lib/footprintPhotoIntake';
import { saveTravelog } from '@pplaner/shared';
import FootprintTimeline from '@/components/footprint/FootprintTimeline';
import NewActivitySheet from '@/components/footprint/NewActivitySheet';
import ActivityDetailSheet from '@/components/footprint/ActivityDetailSheet';

const ymd = (iso: string) => iso.slice(0, 10);

/**
 * 발자취 — 사진(나중엔 PATHWALK)에서 정제된 방문 기록을 시간축으로 정리하는 공간.
 * 여행기(Travelog)와 달리 항상 비공개이고, 여기서 고른 활동만 발췌해 여행기로 옮겨진다.
 */
export default function FootprintClient() {
    const { user, loading: authLoading, loginWithGoogle } = useAuth();
    const router = useRouter();

    const [activities, setActivities] = useState<FootprintActivity[]>([]);
    const [points, setPoints] = useState<FootprintPoint[]>([]);
    const [loadingPoints, setLoadingPoints] = useState(true);

    const [newRange, setNewRange] = useState<{ day: string; start: Date; end: Date } | null>(null);
    const [selected, setSelected] = useState<FootprintActivity | null>(null);
    const [progress, setProgress] = useState<FootprintIntakeProgress | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!user) return;
        const unsub = subscribeToFootprintActivities(user.uid, setActivities);
        return () => unsub();
    }, [user]);

    const refetchPoints = async () => {
        if (!user) return;
        setLoadingPoints(true);
        const pts = await getFootprintPoints(user.uid);
        setPoints(pts);
        setLoadingPoints(false);
    };

    useEffect(() => { refetchPoints(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

    // 개요("내 여행 → 발자취")에서 지역 카드나 "여행기 쓰기"를 눌러 들어온 경우,
    // 여기서부터는 날짜축이 의미를 갖는다 — 어느 지역/어느 시점을 볼지 좁혀서 연다.
    const [filter, setFilter] = useState<{ region?: string; from?: string }>({});
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const q = new URLSearchParams(window.location.search);
        setFilter({ region: q.get('region') || undefined, from: q.get('from') || undefined });
    }, []);

    const days = useMemo(() => {
        const inRegion = (a: FootprintActivity) => !filter.region || a.region === filter.region;
        const set = new Set<string>();
        activities.filter(inRegion).forEach((a) => set.add(ymd(a.startAt)));
        // 지역으로 좁힌 경우엔 활동이 없는 날(포인트만 있는 날)을 끌어오지 않는다
        if (!filter.region) points.forEach((p) => set.add(ymd(p.timestamp)));
        const all = Array.from(set).sort().reverse();
        if (!filter.from) return all;
        // 특정 기록으로 들어왔으면 그 날짜가 맨 위에 오게 한다
        const fromDay = ymd(filter.from);
        return [fromDay, ...all.filter((d) => d !== fromDay)].filter((d) => set.has(d) || d === fromDay);
    }, [activities, points, filter]);

    const handleFiles = async (files: FileList | null) => {
        if (!files || files.length === 0 || !user) return;
        setProgress({ stage: 'uploading', done: 0, total: files.length });
        try {
            await intakePhotosToFootprint(Array.from(files), user.uid, setProgress);
            await refetchPoints();
        } catch (e) {
            console.error('[FootprintClient] photo intake failed:', e);
        } finally {
            setProgress(null);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const handleCreateRange = (day: string, range: { start: Date; end: Date }) => {
        setNewRange({ day, ...range });
    };

    const handleCreateActivity = async (title: string) => {
        if (!newRange || !user) return;
        const dayActivities = activities.filter((a) => ymd(a.startAt) === newRange.day);
        await saveFootprintActivities([{
            userId: user.uid,
            startAt: newRange.start.toISOString(),
            endAt: newRange.end.toISOString(),
            order: dayActivities.length,
            type: 'unknown',
            title: title || undefined,
            places: [],
            source: 'manual',
            travelogIds: [],
        }]);
        setNewRange(null);
    };

    const handleRename = async (activity: FootprintActivity, title: string) => {
        await updateFootprintActivity({ ...activity, title: title || undefined });
        setSelected((s) => (s && s.id === activity.id ? { ...s, title: title || undefined } : s));
    };

    const handleDelete = async (activity: FootprintActivity) => {
        if (!user) return;
        await deleteFootprintActivity(activity.id, user.uid);
        setSelected(null);
    };

    const handleWriteTravelog = async (activity: FootprintActivity) => {
        if (!user) return;
        const places = activityToTravelogPlaces(activity, 0);
        const id = `log_${generateId()}`;
        await saveTravelog({
            id,
            userId: user.uid,
            title: activity.title || places[0]?.name || '새 여행기',
            summary: '',
            theme: '기록',
            memberCounts: { me: 1, partner: 0, family: 0, friends: 0 },
            sourceContext: 'trace_only',
            startDate: ymd(activity.startAt),
            endDate: ymd(activity.endAt),
            status: 'draft',
            isPublic: false,
            recordingMode: 'standard',
            timeline: [],
            places,
            sections: [{ id: generateId(), type: 'text', content: '' }],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        await updateFootprintActivity({
            ...activity,
            travelogIds: Array.from(new Set([...(activity.travelogIds || []), id])),
        });
        router.push(`/travelogs/${id}/edit`);
    };

    if (authLoading) {
        return <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-[#030712]">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>;
    }

    if (!user) {
        return (
            <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-[#030712] px-6 text-center">
                <div>
                    <span className="material-symbols-rounded text-5xl text-slate-300">footprint</span>
                    <p className="mt-3 text-base font-black text-slate-700 dark:text-slate-200">발자취</p>
                    <p className="mt-1 text-sm text-slate-400 max-w-xs mx-auto">
                        로그인하면 사진에서 다녀온 곳을 시간축으로 정리해드려요. 여행기로 쓰지 않아도 기록은 남아요.
                    </p>
                    <button onClick={loginWithGoogle} className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-white">로그인</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#030712] pb-24">
            <div className="mx-auto max-w-[720px] px-4 sm:px-6 pt-6">
                <div className="flex items-start justify-between gap-3 mb-6">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">발자취</h1>
                        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                            다녀온 곳의 원본 기록이에요. 여행기로 쓰지 않아도 여기 남습니다.
                        </p>
                    </div>
                </div>

                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                />
                <button
                    onClick={() => fileRef.current?.click()}
                    disabled={!!progress}
                    className="w-full mb-8 flex items-center justify-center gap-2 rounded-2xl bg-primary/10 hover:bg-primary/15 text-primary px-4 py-3.5 text-sm font-black transition-colors disabled:opacity-60"
                >
                    {progress ? (
                        <>
                            <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            {progress.stage === 'uploading' && `사진 업로드 중… ${progress.done}/${progress.total}`}
                            {progress.stage === 'clustering' && '정리하는 중…'}
                            {progress.stage === 'geocoding' && `장소 확인 중… ${progress.done}/${progress.total}`}
                            {progress.stage === 'saving' && '저장하는 중…'}
                            {progress.stage === 'done' && '완료!'}
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-rounded text-lg">add_photo_alternate</span>
                            사진 추가하기
                        </>
                    )}
                </button>

                {!loadingPoints && days.length === 0 && (
                    <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
                        <span className="material-symbols-rounded text-4xl text-slate-300">footprint</span>
                        <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                            아직 발자취가 없어요. 사진을 추가해보세요.
                        </p>
                    </div>
                )}

                <div className="space-y-8">
                    {days.map((day) => {
                        const dayActivities = activities
                            .filter((a) => ymd(a.startAt) === day)
                            .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
                        const dayPoints = points.filter((p) => ymd(p.timestamp) === day);
                        return (
                            <section key={day}>
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2.5">{day}</h2>
                                <FootprintTimeline
                                    dayDate={day}
                                    activities={dayActivities}
                                    points={dayPoints}
                                    onCreateRange={(range) => handleCreateRange(day, range)}
                                    onSelectActivity={setSelected}
                                />
                                <div className="mt-3 space-y-1.5">
                                    {dayActivities.map((a) => (
                                        <button
                                            key={a.id}
                                            onClick={() => setSelected(a)}
                                            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary/40 transition-colors text-left"
                                        >
                                            <span className="text-[11px] font-black text-slate-400 tabular-nums shrink-0 w-10">
                                                {new Date(a.startAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                            </span>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate flex-1">
                                                {a.title || a.places[0]?.name || '이름 없는 활동'}
                                            </span>
                                            {a.places.length > 1 && (
                                                <span className="text-[10px] font-black text-slate-400 shrink-0">{a.places.length}곳</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>

            <NewActivitySheet
                range={newRange ? { start: newRange.start, end: newRange.end } : null}
                onClose={() => setNewRange(null)}
                onCreate={handleCreateActivity}
            />
            <ActivityDetailSheet
                activity={selected}
                onClose={() => setSelected(null)}
                onRename={handleRename}
                onDelete={handleDelete}
                onWriteTravelog={handleWriteTravelog}
            />
        </div>
    );
}
