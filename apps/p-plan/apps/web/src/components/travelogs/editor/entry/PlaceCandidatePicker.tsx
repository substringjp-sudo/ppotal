'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    rankPlaceCandidates, cn,
    type PlaceCandidate, type ScoredCandidate, type CandidateContext,
} from '@pplaner/shared';
import { getNearbyCandidates, promoteChosenCandidate } from '@/lib/nearbyPlaces';

/**
 * 장소 후보 고르기.
 *
 * 사진 좌표로 찍은 자동 이름이 틀렸을 때, 처음부터 검색하게 만들지 않는다.
 * 주변 후보를 미리 받아 체류시간·시각·사진수로 정렬해 보여주고, 한 번 눌러 고친다.
 * 고른 결과는 좌표 캐시 맨 앞으로 올라가 다음 사람에게도 도움이 된다.
 */
export default function PlaceCandidatePicker({
    lat, lng, context, currentName, onPick, onClose,
}: {
    lat?: number;
    lng?: number;
    context: CandidateContext;
    currentName: string;
    onPick: (picked: { name: string; placeId?: string; lat?: number; lng?: number; address?: string }) => void;
    onClose: () => void;
}) {
    const [candidates, setCandidates] = useState<ScoredCandidate[] | null>(null);
    const [manual, setManual] = useState(currentName);

    useEffect(() => {
        let alive = true;
        if (lat == null || lng == null) { setCandidates([]); return; }
        getNearbyCandidates(lat, lng).then((raw: PlaceCandidate[]) => {
            if (alive) setCandidates(rankPlaceCandidates(raw, context));
        });
        return () => { alive = false; };
    }, [lat, lng, context]);

    const choose = (c: ScoredCandidate) => {
        onPick({ name: c.name, placeId: c.placeId, lat: c.lat, lng: c.lng, address: c.address });
        if (lat != null && lng != null) void promoteChosenCandidate(lat, lng, c);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full sm:max-w-md max-h-[80vh] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden"
            >
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">여기가 어디였나요?</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg grid place-items-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="닫기">
                        <span className="material-symbols-rounded text-lg">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {candidates === null ? (
                        <div className="p-6 space-y-2">
                            {[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
                        </div>
                    ) : candidates.length === 0 ? (
                        <p className="px-5 py-6 text-sm text-slate-400">
                            {lat == null ? '이 사진에는 위치 정보가 없어요. 이름을 직접 적어주세요.' : '주변에서 찾은 장소가 없어요. 직접 적어주세요.'}
                        </p>
                    ) : (
                        <ul className="py-1">
                            {candidates.slice(0, 12).map((c, i) => (
                                <li key={c.placeId}>
                                    <button
                                        onClick={() => choose(c)}
                                        className="w-full px-5 py-3 flex items-start gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                                    >
                                        <span className={cn('mt-0.5 w-7 h-7 rounded-lg grid place-items-center shrink-0',
                                            i === 0 ? 'bg-primary/15 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-400')}>
                                            <span className="material-symbols-rounded text-base">
                                                {i === 0 ? 'recommend' : 'place'}
                                            </span>
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-semibold text-slate-900 dark:text-white truncate">{c.name}</span>
                                            <span className="block text-xs font-semibold text-slate-400 truncate">
                                                {[
                                                    c.distanceMeters != null ? `${c.distanceMeters}m` : null,
                                                    c.reason,
                                                    c.address,
                                                ].filter(Boolean).join(' · ')}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* 직접 입력은 마지막 수단 — 첫 수단이 아니다 */}
                <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                    <input
                        value={manual}
                        onChange={(e) => setManual(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && manual.trim()) { onPick({ name: manual.trim() }); onClose(); }
                        }}
                        placeholder="직접 입력"
                        className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                        onClick={() => { if (manual.trim()) { onPick({ name: manual.trim() }); onClose(); } }}
                        className="rounded-xl bg-primary px-4 text-xs font-semibold text-white shrink-0"
                    >
                        확인
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
