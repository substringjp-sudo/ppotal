'use client';

import { useEffect, useState } from 'react';
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
    const [candidates, setCandidates] = useState<ScoredCandidate[] | null>(null);

    useEffect(() => {
        let alive = true;
        if (lat == null || lng == null) { setCandidates([]); return; }
        setCandidates(null);
        getNearbyCandidates(lat, lng).then((raw: PlaceCandidate[]) => {
            if (alive) setCandidates(rankPlaceCandidates(raw, context));
        });
        return () => { alive = false; };
        // context 값(체류시간 등)이 아주 미세하게 바뀔 때마다 재조회할 필요는 없다 —
        // 좌표가 같으면 캐시로 즉시 응답되므로, 좌표 변경 시에만 다시 부른다.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lat, lng]);

    if (lat == null || lng == null) return null;
    if (candidates && candidates.length === 0) return null; // 조용히 사라짐 — 강요하지 않는다

    const choose = (c: ScoredCandidate) => {
        onPick({ name: c.name, placeId: c.placeId, lat: c.lat, lng: c.lng, address: c.address });
        void promoteChosenCandidate(lat, lng, c);
    };

    return (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide -mx-0.5 px-0.5 pb-0.5">
            <span className="shrink-0 text-[10px] font-black text-slate-400 uppercase tracking-widest">여기 맞아요?</span>
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
