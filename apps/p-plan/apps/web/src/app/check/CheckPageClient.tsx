'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { runQuickCheck, QUICK_CHECK_PERSONAS, type QuickCheckEventInput, type TripWarning } from '@pplaner/shared';
import TripDayPicker from '@/components/common/TripDayPicker';
import ConflictAwareTimePicker from '@/components/common/ConflictAwareTimePicker';
import { useRequireAuth } from '@/components/common/AuthGate';

interface DraftEvent extends QuickCheckEventInput {
    key: string;
}

let seq = 0;
const newKey = () => `e${Date.now().toString(36)}${seq++}`;

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 };

const SEVERITY_META: Record<
    string,
    { label: string; box: string; badge: string }
> = {
    critical: {
        label: '꼭 확인',
        box: 'border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/15',
        badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    },
    warning: {
        label: '확인 필요',
        box: 'border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-900/15',
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    },
    info: {
        label: '참고',
        box: 'border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-900/15',
        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    },
};

const inputCls =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

export default function CheckPageClient() {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [events, setEvents] = useState<DraftEvent[]>([]);
    const [personaId, setPersonaId] = useState('balanced');
    const { isAuthed, login } = useRequireAuth();

    // 즉시 가치 체감용 예시 (일부러 시간이 겹치는 일정을 넣어 점검 결과를 보여줌)
    const fillExample = () => {
        const base = new Date();
        base.setDate(base.getDate() + 14);
        const d1 = base.toISOString().split('T')[0];
        const next = new Date(base);
        next.setDate(next.getDate() + 1);
        const d2 = next.toISOString().split('T')[0];
        setStartDate(d1);
        setEndDate(d2);
        setEvents([
            { key: newKey(), title: '센소지', date: d1, startTime: '10:00', endTime: '11:30', placeName: '아사쿠사' },
            { key: newKey(), title: '도쿄 스카이트리', date: d1, startTime: '11:00', endTime: '12:30', placeName: '' },
            { key: newKey(), title: '시부야 스크램블', date: d2, startTime: '15:00', endTime: '16:30', placeName: '시부야' },
        ]);
    };

    const readyEvents = events.filter((e) => e.title.trim() && e.date);
    const canCheck = !!startDate && readyEvents.length > 0;

    const persona = QUICK_CHECK_PERSONAS.find((p) => p.id === personaId);

    const warnings = useMemo<TripWarning[]>(() => {
        if (!canCheck) return [];
        return runQuickCheck(
            {
                startDate,
                endDate: endDate || startDate,
                events: readyEvents.map(({ key, ...rest }) => rest),
            },
            persona?.style
        ).warnings;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate, JSON.stringify(readyEvents), canCheck, personaId]);

    const sortedWarnings = useMemo(
        () =>
            [...warnings].sort(
                (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
            ),
        [warnings]
    );

    const days = useMemo(() => {
        const map = new Map<string, DraftEvent[]>();
        for (const e of events) {
            if (!e.date || !e.title.trim()) continue;
            const arr = map.get(e.date) || [];
            arr.push(e);
            map.set(e.date, arr);
        }
        return [...map.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, evs]) => ({
                date,
                events: evs
                    .slice()
                    .sort((x, y) => (x.startTime || '99:99').localeCompare(y.startTime || '99:99')),
            }));
    }, [events]);

    const addEvent = () =>
        setEvents((prev) => [
            ...prev,
            { key: newKey(), title: '', date: startDate || '', startTime: '', endTime: '', placeName: '' },
        ]);
    const updateEvent = (key: string, patch: Partial<DraftEvent>) =>
        setEvents((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)));
    const removeEvent = (key: string) =>
        setEvents((prev) => prev.filter((e) => e.key !== key));

    const criticalCount = warnings.filter((w) => w.severity === 'critical').length;

    return (
        <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-10 sm:py-14">
            {/* Header */}
            <header className="mb-8">
                <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    로그인 불필요 · 30초 점검
                </span>
                <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                    내 여행 계획, 문제 없나 점검하기
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    여행 날짜와 일정을 넣으면 <b>겹치는 시간·중복 일정·무리한 동선·운영시간</b> 같은
                    문제를 바로 찾아드려요. 저장 없이 즉시 확인할 수 있어요.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={fillExample}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                        예시로 채워보기
                    </button>
                    <span className="text-xs text-slate-400">계정 없이 무료로 바로 사용</span>
                </div>
            </header>

            {/* Dates */}
            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/40">
                <h2 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                    1. 여행 기간
                </h2>
                <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                        <span className="mb-1 block text-xs font-medium text-slate-500">시작일</span>
                        <input
                            type="date"
                            value={startDate}
                            max={endDate || undefined}
                            onChange={(e) => setStartDate(e.target.value)}
                            className={inputCls}
                        />
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-xs font-medium text-slate-500">종료일</span>
                        <input
                            type="date"
                            value={endDate}
                            min={startDate || undefined}
                            onChange={(e) => setEndDate(e.target.value)}
                            className={inputCls}
                        />
                    </label>
                </div>
            </section>

            {/* Events */}
            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">2. 일정</h2>
                    <button
                        onClick={addEvent}
                        disabled={!startDate}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition enabled:hover:bg-slate-700 disabled:opacity-40 dark:bg-white dark:text-slate-900"
                    >
                        + 일정 추가
                    </button>
                </div>

                {events.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-400">
                        {startDate
                            ? '‘일정 추가’를 눌러 방문할 장소와 시간을 넣어보세요.'
                            : '먼저 여행 기간을 정해주세요.'}
                    </p>
                ) : (
                    <ul className="space-y-3">
                        {events.map((e) => (
                            <li
                                key={e.key}
                                className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/30"
                            >
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="일정 제목 (예: 센소지 방문)"
                                        value={e.title}
                                        onChange={(ev) => updateEvent(e.key, { title: ev.target.value })}
                                        className={`${inputCls} flex-1`}
                                    />
                                    <button
                                        onClick={() => removeEvent(e.key)}
                                        aria-label="일정 삭제"
                                        className="shrink-0 rounded-lg px-2 text-slate-400 transition hover:text-red-500"
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div className="mt-2">
                                    <TripDayPicker
                                        startDate={startDate}
                                        endDate={endDate || startDate}
                                        value={e.date}
                                        onChange={(date) => updateEvent(e.key, { date })}
                                    />
                                </div>
                                <div className="mt-2">
                                    <ConflictAwareTimePicker
                                        startTime={e.startTime}
                                        endTime={e.endTime}
                                        busy={events
                                            .filter(
                                                (o) => o.key !== e.key && o.date === e.date && !!o.startTime
                                            )
                                            .map((o) => ({
                                                title: o.title || '다른 일정',
                                                startTime: o.startTime,
                                                endTime: o.endTime,
                                            }))}
                                        onChange={(patch) => updateEvent(e.key, patch)}
                                    />
                                </div>
                                <div className="mt-2">
                                    <input
                                        type="text"
                                        placeholder="장소(선택)"
                                        value={e.placeName || ''}
                                        onChange={(ev) => updateEvent(e.key, { placeName: ev.target.value })}
                                        className={inputCls}
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                {startDate && (
                    <p className="mt-3 text-[11px] text-slate-400">
                        날짜 선택은 여행 기간({startDate}
                        {endDate && endDate !== startDate ? ` ~ ${endDate}` : ''}) 안으로 제한돼요 — 연·월을
                        오갈 필요가 없죠.
                    </p>
                )}
            </section>

            {/* 여행 타입 — 타입에 따라 경고 강도가 달라짐 */}
            <section className="mb-6">
                <h2 className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                    여행 타입{' '}
                    <span className="font-normal text-slate-400">— 타입에 따라 경고 강도가 달라져요</span>
                </h2>
                <div className="flex flex-wrap gap-2">
                    {QUICK_CHECK_PERSONAS.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => setPersonaId(p.id)}
                            title={p.description}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                                personaId === p.id
                                    ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                {persona?.description && (
                    <p className="mt-1.5 text-[11px] text-slate-400">{persona.description}</p>
                )}
            </section>

            {/* Results */}
            <section aria-live="polite">
                {!canCheck ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400 dark:border-slate-800">
                        여행 기간과 일정을 1개 이상 입력하면 점검 결과가 여기에 바로 표시돼요.
                    </div>
                ) : (
                    <>
                        {/* Summary banner */}
                        <div
                            className={`mb-4 flex items-center gap-3 rounded-2xl border p-4 ${
                                warnings.length === 0
                                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-900/15'
                                    : criticalCount > 0
                                    ? 'border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/15'
                                    : 'border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-900/15'
                            }`}
                        >
                            <div>
                                <p className="text-sm font-black text-slate-900 dark:text-white">
                                    {warnings.length === 0
                                        ? '눈에 띄는 문제가 없어요 👍'
                                        : `${warnings.length}가지 확인할 점을 찾았어요`}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                    {warnings.length === 0
                                        ? '입력한 일정 기준으로 시간 충돌·중복·동선 문제가 발견되지 않았어요.'
                                        : '여행 전에 아래 항목을 한 번 더 확인해보세요.'}
                                </p>
                            </div>
                        </div>

                        {/* Warning list */}
                        {sortedWarnings.length > 0 && (
                            <ul className="mb-6 space-y-3">
                                {sortedWarnings.map((w) => {
                                    const meta = SEVERITY_META[w.severity] || SEVERITY_META.info;
                                    return (
                                        <li key={w.id} className={`rounded-xl border p-4 ${meta.box}`}>
                                            <div className="flex items-start gap-3">
                                                <span
                                                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${meta.badge}`}
                                                >
                                                    {meta.label}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-100">
                                                        {w.message}
                                                    </p>
                                                    {w.suggestion && (
                                                        <p className="mt-1.5 text-xs leading-normal text-slate-500 dark:text-slate-400">
                                                            <span className="mr-1 font-bold text-slate-400">
                                                                이렇게 해보세요 →
                                                            </span>
                                                            {w.suggestion}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}

                        {/* Timeline preview */}
                        {days.length > 0 && (
                            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/40">
                                <h2 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                                    타임라인 미리보기
                                </h2>
                                <div className="space-y-4">
                                    {days.map((d, i) => (
                                        <div key={d.date} className="flex gap-3">
                                            <div className="w-16 shrink-0 pt-0.5">
                                                <div className="text-xs font-black text-slate-900 dark:text-white">
                                                    Day {i + 1}
                                                </div>
                                                <div className="text-[10px] text-slate-400">{d.date}</div>
                                            </div>
                                            <ul className="flex-1 space-y-1.5 border-l border-slate-100 pl-3 dark:border-slate-800">
                                                {d.events.map((ev) => (
                                                    <li key={ev.key} className="text-sm text-slate-700 dark:text-slate-200">
                                                        <span className="font-mono text-xs text-slate-400">
                                                            {ev.startTime || '--:--'}
                                                            {ev.endTime ? `~${ev.endTime}` : ''}
                                                        </span>{' '}
                                                        <span className="font-semibold">{ev.title}</span>
                                                        {ev.placeName ? (
                                                            <span className="text-slate-400"> · {ev.placeName}</span>
                                                        ) : null}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* CTA */}
            <div className="mt-8 rounded-2xl bg-slate-900 p-6 text-center dark:bg-white/5">
                <p className="text-sm font-bold text-white dark:text-slate-100">
                    이 계획을 저장하고 예산·숙소·항공까지 이어서 준비하고 싶다면?
                </p>
                <p className="mt-1 text-xs text-slate-300 dark:text-slate-400">
                    로그인하면 여기서 점검한 일정을 그대로 발전시킬 수 있어요.
                </p>
                {isAuthed ? (
                    <Link
                        href="/trips"
                        className="mt-4 inline-block rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                    >
                        내 여행 만들러 가기
                    </Link>
                ) : (
                    <button
                        type="button"
                        onClick={() => void login()}
                        className="mt-4 inline-block rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                    >
                        로그인하고 계속하기
                    </button>
                )}
            </div>
        </main>
    );
}
