'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    rankPlaceCandidates, cn,
    type PlaceCandidate, type ScoredCandidate, type CandidateContext,
} from '@pplaner/shared';
import { getNearbyCandidates, promoteChosenCandidate } from '@/lib/nearbyPlaces';

/**
 * 카드가 활성화된 순간(= 사용자가 이 장소를 막 떠올리기 시작하는 순간)에 조용히
 * 붙는 후보 칩. PlaceCandidatePicker(전체 시트)를 매번 여는 대신, 타이핑을 막지
 * 않는 한 줄짜리 제안으로 둔다 — 마음에 들면 탭, 아니면 그냥 이어서 쓰면 된다.
 */
export default function PlaceCandidateChips({
    lat, lng, context, onPick, onOpenFull,
}: {
    lat?: number;
    lng?: number;
    context: CandidateContext;
    onPick: (picked: { name: string; placeId?: string; lat?: number; lng?: number; address?: string }) => void;
    onOpenFull: () => void;
}) {
    const [raw, setRaw] = useState<PlaceCandidate[] | null>(null);

    useEffect(() => {
        let alive = true;
        if (lat == null || lng == null) { setRaw([]); return; }
        setRaw(null);
        getNearbyCandidates(lat, lng).then((list: PlaceCandidate[]) => {
            if (alive) setRaw(list);
        });
        return () => { alive = false; };
        // 조회는 좌표에만 의존한다 — 체류시간 등이 미세하게 흔들려도 다시 부를 이유가 없다.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lat, lng]);

    // 순위는 따로 계산한다. 계획 사전 정보는 여행을 비동기로 읽어온 뒤에야 도착하는데,
    // 조회와 묶여 있으면 늦게 온 계획이 순위에 반영되지 않는다.
    const candidates = useMemo<ScoredCandidate[] | null>(
        () => (raw === null ? null : rankPlaceCandidates(raw, context)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [raw, context.dwellMinutes, context.photoCount, context.timeOfDay, context.visitDate, context.plannedPlaces],
    );

    if (lat == null || lng == null) return null;
    if (candidates && candidates.length === 0) return null; // 조용히 사라짐 — 강요하지 않는다

    const top = candidates?.[0];
    const topReason = (top?.reason === '계획에 있던 곳' || top?.reason === '가고 싶다고 저장한 곳')
        ? top.reason : undefined;

    const choose = (c: ScoredCandidate) => {
        onPick({ name: c.name, placeId: c.placeId, lat: c.lat, lng: c.lng, address: c.address });
        void promoteChosenCandidate(lat, lng, c);
    };

    return (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide -mx-0.5 px-0.5 pb-0.5">
            {/* 1순위가 계획에서 온 거라면 그 사실을 라벨로 밝힌다 — 왜 이게 떴는지 알아야 믿고 누른다 */}
            <span className={cn(
                'shrink-0 text-[10px] font-black uppercase tracking-widest',
                topReason ? 'text-primary' : 'text-slate-400',
            )}>
                {topReason || '여기 맞아요?'}
            </span>
            {candidates === null ? (
                <>
                    <div className="h-6 w-16 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse shrink-0" />
                    <div className="h-6 w-20 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse shrink-0" />
                </>
            ) : (
                <>
                    {candidates.slice(0, 3).map((c, i) => (
                        <button
                            key={c.placeId}
                            type="button"
                            onClick={() => choose(c)}
                            className={cn(
                                'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap transition-colors',
                                i === 0
                                    ? 'bg-primary/10 text-primary hover:bg-primary/20'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
                            )}
                        >
                            {c.name}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={onOpenFull}
                        className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-primary transition-colors"
                    >
                        다른 곳…
                    </button>
                </>
            )}
        </div>
    );
}
