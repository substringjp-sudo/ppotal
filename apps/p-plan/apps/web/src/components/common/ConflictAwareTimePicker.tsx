'use client';

import { useMemo } from 'react';

/**
 * 충돌 인지 시간 선택기.
 *
 * 같은 날 이미 잡아둔 다른 일정을 점유 블록으로 보여주고, 현재 선택이 겹치면
 * 경고한다. 비어있는 시간대는 바로 고를 수 있는 칩으로 제안한다.
 * 순수 클라이언트 계산이라 서버/구글 비용이 없다.
 */

export interface BusyEvent {
    title: string;
    startTime?: string; // "HH:mm"
    endTime?: string;
}

interface ConflictAwareTimePickerProps {
    startTime?: string;
    endTime?: string;
    busy: BusyEvent[];
    onChange: (patch: { startTime?: string; endTime?: string }) => void;
    /**
     * false면 자체 시간 입력칸을 숨기고 충돌 타임라인/경고/빈 시간 칩만 렌더한다.
     * 이미 다른 시간 입력 UI가 있는 편집기에 시각화만 얹을 때 사용.
     */
    showInputs?: boolean;
}

const toMin = (t?: string): number | null => {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
};

const toStr = (min: number): string => {
    const clamped = Math.max(0, Math.min(24 * 60, Math.round(min)));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/** [a1,a2) 와 [b1,b2) 가 겹치는지 (양수 길이 기준) */
const overlaps = (a1: number, a2: number, b1: number, b2: number) => a1 < b2 && b1 < a2;

interface Interval {
    title: string;
    start: number;
    end: number; // end===start 이면 시간 미상(점 표시)
}

export default function ConflictAwareTimePicker({
    startTime,
    endTime,
    busy,
    onChange,
    showInputs = true,
}: ConflictAwareTimePickerProps) {
    const busyIntervals = useMemo<Interval[]>(() => {
        return busy
            .map((b) => {
                const s = toMin(b.startTime);
                if (s === null) return null;
                const e = toMin(b.endTime);
                return { title: b.title || '다른 일정', start: s, end: e !== null && e > s ? e : s };
            })
            .filter((x): x is Interval => x !== null)
            .sort((a, b) => a.start - b.start);
    }, [busy]);

    const selStart = toMin(startTime);
    const selEndRaw = toMin(endTime);
    const selEnd = selStart !== null && selEndRaw !== null && selEndRaw > selStart ? selEndRaw : selStart;

    // 표시 구간(시간축) 계산: 데이터 기반으로 여유 있게
    const { winStart, winEnd } = useMemo(() => {
        const points: number[] = [];
        for (const iv of busyIntervals) points.push(iv.start, iv.end);
        if (selStart !== null) points.push(selStart);
        if (selEnd !== null) points.push(selEnd);
        if (points.length === 0) return { winStart: 8 * 60, winEnd: 22 * 60 };
        const lo = Math.min(...points);
        const hi = Math.max(...points);
        const start = Math.max(0, Math.floor((lo - 60) / 60) * 60);
        const end = Math.min(24 * 60, Math.ceil((hi + 60) / 60) * 60);
        return { winStart: start, winEnd: Math.max(end, start + 120) };
    }, [busyIntervals, selStart, selEnd]);

    const span = winEnd - winStart || 1;
    const pct = (min: number) => `${((min - winStart) / span) * 100}%`;

    // 현재 선택과 겹치는 일정
    const conflicts = useMemo<Interval[]>(() => {
        if (selStart === null || selEnd === null || selEnd <= selStart) return [];
        return busyIntervals.filter((iv) => iv.end > iv.start && overlaps(selStart, selEnd, iv.start, iv.end));
    }, [busyIntervals, selStart, selEnd]);

    // 빈 시간대 계산 (윈도우 내, 30분 이상 간격)
    const freeSlots = useMemo(() => {
        const merged: Array<{ start: number; end: number }> = [];
        for (const iv of busyIntervals) {
            if (iv.end <= iv.start) continue;
            const last = merged[merged.length - 1];
            if (last && iv.start <= last.end) last.end = Math.max(last.end, iv.end);
            else merged.push({ start: iv.start, end: iv.end });
        }
        const gaps: Array<{ start: number; end: number }> = [];
        let cursor = winStart;
        for (const m of merged) {
            if (m.start - cursor >= 30) gaps.push({ start: cursor, end: m.start });
            cursor = Math.max(cursor, m.end);
        }
        if (winEnd - cursor >= 30) gaps.push({ start: cursor, end: winEnd });
        return gaps.slice(0, 4);
    }, [busyIntervals, winStart, winEnd]);

    const hasConflict = conflicts.length > 0;
    const inputCls =
        'w-full rounded-lg border px-2.5 py-2 text-sm outline-none transition dark:bg-slate-900 dark:text-slate-100';

    return (
        <div className="space-y-2">
            {/* 시간 입력 */}
            {showInputs && (
                <div className="grid grid-cols-2 gap-2">
                    <input
                        type="time"
                        value={startTime || ''}
                        onChange={(e) => onChange({ startTime: e.target.value })}
                        title="시작 시간"
                        className={`${inputCls} ${
                            hasConflict
                                ? 'border-red-300 dark:border-red-800'
                                : 'border-slate-200 focus:border-slate-400 dark:border-slate-700'
                        }`}
                    />
                    <input
                        type="time"
                        value={endTime || ''}
                        onChange={(e) => onChange({ endTime: e.target.value })}
                        title="종료 시간"
                        className={`${inputCls} ${
                            hasConflict
                                ? 'border-red-300 dark:border-red-800'
                                : 'border-slate-200 focus:border-slate-400 dark:border-slate-700'
                        }`}
                    />
                </div>
            )}

            {/* 하루 타임라인 (다른 일정 = 점유 블록) */}
            {(busyIntervals.length > 0 || selStart !== null) && (
                <div>
                    <div className="relative h-8 w-full overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                        {busyIntervals.map((iv, i) =>
                            iv.end > iv.start ? (
                                <div
                                    key={i}
                                    className="absolute top-0 h-full bg-slate-300/80 dark:bg-slate-600/80"
                                    style={{ left: pct(iv.start), width: pct(iv.end) === pct(iv.start) ? '2px' : `${((iv.end - iv.start) / span) * 100}%` }}
                                    title={`${iv.title} (${toStr(iv.start)}~${toStr(iv.end)})`}
                                />
                            ) : (
                                <div
                                    key={i}
                                    className="absolute top-0 h-full w-0.5 bg-slate-400"
                                    style={{ left: pct(iv.start) }}
                                    title={`${iv.title} (${toStr(iv.start)})`}
                                />
                            )
                        )}
                        {/* 현재 선택 */}
                        {selStart !== null && selEnd !== null && selEnd > selStart && (
                            <div
                                className={`absolute top-0 h-full rounded-sm ${
                                    hasConflict ? 'bg-red-500/70' : 'bg-blue-500/70'
                                }`}
                                style={{ left: pct(selStart), width: `${((selEnd - selStart) / span) * 100}%` }}
                            />
                        )}
                    </div>
                    <div className="mt-0.5 flex justify-between text-[9px] text-slate-400">
                        <span>{toStr(winStart)}</span>
                        <span>{toStr(winEnd)}</span>
                    </div>
                </div>
            )}

            {/* 충돌 경고 */}
            {hasConflict && (
                <p className="text-[11px] font-bold text-red-500">
                    ⚠ {conflicts.map((c) => `${c.title}(${toStr(c.start)}~${toStr(c.end)})`).join(', ')} 와(과)
                    시간이 겹쳐요.
                </p>
            )}

            {/* 빈 시간대 빠른 선택 */}
            {freeSlots.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400">빈 시간</span>
                    {freeSlots.map((slot, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() =>
                                onChange({
                                    startTime: toStr(slot.start),
                                    endTime: toStr(Math.min(slot.end, slot.start + 120)),
                                })
                            }
                            className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300"
                        >
                            {toStr(slot.start)}~{toStr(slot.end)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
