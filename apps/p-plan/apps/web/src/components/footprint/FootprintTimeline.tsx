'use client';

import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn, type FootprintActivity, type FootprintPoint } from '@pplaner/shared';

const DRAG_THRESHOLD_PX = 6;

const ACTIVITY_COLOR: Record<string, string> = {
    visit: 'bg-primary',
    wander: 'bg-emerald-500',
    transit: 'bg-indigo-400',
    unknown: 'bg-slate-400',
};

interface FootprintTimelineProps {
    dayDate: string; // YYYY-MM-DD
    activities: FootprintActivity[];
    points: FootprintPoint[];
    onCreateRange: (range: { start: Date; end: Date }) => void;
    onSelectActivity: (activity: FootprintActivity) => void;
}

/**
 * 하루치 시간축 타임라인.
 *
 * 빈 구간을 드래그하면 그 범위로 새 활동을 만들고, 그냥 클릭하면 클릭한 지점 앞의
 * 활동 끝 시각부터 클릭 지점까지를 새 활동으로 채운다 — 빈칸 없이 활동을 채워나가는
 * 방식. 클릭/드래그 구분은 홀드 타이머가 아니라 포인터 이동 거리로 판단한다(더 안정적).
 * 기존 활동 위를 클릭하면 새로 만들지 않고 그 활동을 연다.
 */
export default function FootprintTimeline({
    dayDate, activities, points, onCreateRange, onSelectActivity,
}: FootprintTimelineProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    // 제스처 판정의 근거는 ref에 둔다 — pointermove가 같은 프레임 안에서 여러 번 몰아
    // 들어오면 state 클로저가 낡은 값을 참조해 dragging=true 판정이 씹히는 경우가
    // 있었다(직접 재현·확인함). ref는 항상 최신값이라 이 문제가 없다. state는 오직
    // 선택 영역을 화면에 그리기 위한 용도로만 미러링한다.
    const dragInfo = useRef<{ startX: number; currentX: number; dragging: boolean } | null>(null);
    const [dragVisual, setDragVisual] = useState<{ startX: number; currentX: number; dragging: boolean } | null>(null);

    const dayStart = new Date(`${dayDate}T00:00:00`);
    const dayMs = 24 * 60 * 60 * 1000;

    const xToTime = useCallback((clientX: number): Date => {
        const rect = trackRef.current?.getBoundingClientRect();
        if (!rect) return dayStart;
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        return new Date(dayStart.getTime() + ratio * dayMs);
    }, [dayStart, dayMs]);

    const timeToPct = (iso: string) => {
        const t = new Date(iso).getTime();
        return Math.min(100, Math.max(0, ((t - dayStart.getTime()) / dayMs) * 100));
    };

    const findActivityAt = (time: Date) => activities.find((a) => {
        const s = new Date(a.startAt).getTime();
        const e = new Date(a.endAt).getTime();
        return time.getTime() >= s && time.getTime() < e;
    });

    const handlePointerDown = (e: React.PointerEvent) => {
        trackRef.current?.setPointerCapture(e.pointerId);
        dragInfo.current = { startX: e.clientX, currentX: e.clientX, dragging: false };
        setDragVisual(dragInfo.current);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        const info = dragInfo.current;
        if (!info) return;
        const moved = Math.abs(e.clientX - info.startX);
        info.currentX = e.clientX;
        info.dragging = info.dragging || moved > DRAG_THRESHOLD_PX;
        setDragVisual({ ...info });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        const info = dragInfo.current;
        dragInfo.current = null;
        setDragVisual(null);
        if (!info) return;
        const clickTime = xToTime(e.clientX);

        if (info.dragging) {
            const startTime = xToTime(info.startX);
            const [start, end] = startTime <= clickTime ? [startTime, clickTime] : [clickTime, startTime];
            if (end.getTime() - start.getTime() > 60_000) { // 1분 미만 드래그는 무시
                onCreateRange({ start, end });
            }
            return;
        }

        const existing = findActivityAt(clickTime);
        if (existing) {
            onSelectActivity(existing);
            return;
        }
        const prevEnding = activities
            .filter((a) => new Date(a.endAt).getTime() <= clickTime.getTime())
            .sort((a, b) => new Date(b.endAt).getTime() - new Date(a.endAt).getTime())[0];
        const start = prevEnding ? new Date(prevEnding.endAt) : dayStart;
        if (clickTime.getTime() - start.getTime() > 60_000) {
            onCreateRange({ start, end: clickTime });
        }
    };

    const dragBounds = dragVisual?.dragging
        ? [xToTime(dragVisual.startX).getTime(), xToTime(dragVisual.currentX).getTime()].sort((a, b) => a - b)
        : null;

    return (
        <div className="select-none">
            <div className="flex justify-between text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-1 px-0.5">
                <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
            </div>
            <div
                ref={trackRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="relative h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/60 overflow-hidden cursor-crosshair touch-none"
            >
                {/* 시간 눈금 */}
                {[0, 25, 50, 75, 100].map((p) => (
                    <div key={p} className="absolute top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700/60" style={{ left: `${p}%` }} />
                ))}

                {/* 발자취 점 — 데이터가 있다는 표시 */}
                {points.map((pt) => (
                    <div
                        key={pt.id}
                        className="absolute top-1 w-0.5 h-2 rounded-full bg-slate-400/50 dark:bg-slate-500/50 pointer-events-none"
                        style={{ left: `${timeToPct(pt.timestamp)}%` }}
                    />
                ))}

                {/* 확정된 활동들 — 클릭 판정은 트랙의 onPointerUp이 findActivityAt으로 일괄 처리한다
                    (여기서 따로 onClick을 걸면 버블링된 pointerup과 겹쳐 두 번 열린다). */}
                {activities.map((a) => {
                    const left = timeToPct(a.startAt);
                    const width = Math.max(0.6, timeToPct(a.endAt) - left);
                    return (
                        <motion.div
                            key={a.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={cn(
                                'absolute top-3 bottom-3 rounded-lg flex items-center justify-center overflow-hidden px-1 pointer-events-none',
                                ACTIVITY_COLOR[a.type] || ACTIVITY_COLOR.unknown,
                            )}
                            style={{ left: `${left}%`, width: `${width}%` }}
                            title={a.title || a.places[0]?.name || '활동'}
                        >
                            {width > 8 && (
                                <span className="text-[9px] font-black text-white truncate">
                                    {a.title || a.places[0]?.name}
                                </span>
                            )}
                        </motion.div>
                    );
                })}

                {/* 드래그 중인 선택 영역 */}
                {dragBounds && (
                    <div
                        className="absolute top-1 bottom-1 rounded-lg bg-primary/25 border-2 border-primary/60 pointer-events-none"
                        style={{
                            left: `${((dragBounds[0] - dayStart.getTime()) / dayMs) * 100}%`,
                            width: `${((dragBounds[1] - dragBounds[0]) / dayMs) * 100}%`,
                        }}
                    />
                )}
            </div>
        </div>
    );
}
