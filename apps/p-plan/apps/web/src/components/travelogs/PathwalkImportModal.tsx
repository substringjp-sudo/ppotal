'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    travelogFromPathwalk,
    isValidPathwalkImport,
    samplePathwalkImport,
    saveTravelog,
    useTravelogStore,
    type PathwalkImport,
} from '@pplaner/shared';

/**
 * PATHWALK 인입 모달 (목 플로우).
 *
 * PATHWALK가 넘길 발자취 JSON을 붙여넣거나 샘플로 체험하면, 변환기가 여행기로 만들어
 * 저장한 뒤 편집기로 보낸다. 실제 앱 연동은 PATHWALK 준비 후 소스만 바꾸면 된다.
 */
export default function PathwalkImportModal({
    userId,
    onClose,
}: {
    userId: string;
    onClose: () => void;
}) {
    const router = useRouter();
    const addTravelog = useTravelogStore((s) => s.addTravelog);
    const [json, setJson] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const runImport = async (data: PathwalkImport) => {
        setBusy(true);
        setError(null);
        try {
            const travelog = travelogFromPathwalk(data, userId);
            addTravelog(travelog);
            try {
                await saveTravelog(travelog);
            } catch (e) {
                console.error('PATHWALK 여행기 저장 실패:', e);
            }
            router.push(`/travelogs/${travelog.id}/edit`);
        } catch (e) {
            console.error(e);
            setError('가져오는 중 문제가 생겼어요.');
            setBusy(false);
        }
    };

    const handleImportJson = () => {
        setError(null);
        let parsed: any;
        try {
            parsed = JSON.parse(json);
        } catch {
            setError('JSON 형식이 올바르지 않아요.');
            return;
        }
        if (!isValidPathwalkImport(parsed)) {
            setError('발자취(points)가 없거나 형식이 맞지 않아요. 각 지점에 timestamp·lat·lng가 필요해요.');
            return;
        }
        runImport(parsed);
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-rounded text-primary">footprint</span>
                        PATHWALK에서 가져오기
                    </h2>
                    <button onClick={onClose} className="w-9 h-9 rounded-xl grid place-items-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition" aria-label="닫기">
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        여행 중 PATHWALK가 기록한 발자취를 여행기로 불러와요. 방문한 장소·시간·사진이 자동으로
                        타임라인과 장소로 정리됩니다.
                    </p>

                    {/* 샘플 체험 */}
                    <button
                        onClick={() => runImport(samplePathwalkImport())}
                        disabled={busy}
                        className="w-full rounded-2xl bg-primary/10 hover:bg-primary/15 text-primary py-3.5 text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-rounded text-lg">bolt</span>
                        샘플 발자취로 체험하기
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">또는 직접 붙여넣기</span>
                        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                    </div>

                    <textarea
                        value={json}
                        onChange={(e) => setJson(e.target.value)}
                        rows={6}
                        placeholder={'PATHWALK 발자취 JSON\n{ "points": [ { "timestamp": "...", "lat": 35.6, "lng": 139.7, "placeName": "..." } ] }'}
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-xs font-mono text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none resize-none transition"
                    />

                    {error && <p className="text-xs font-bold text-rose-500">{error}</p>}

                    <button
                        onClick={handleImportJson}
                        disabled={busy || !json.trim()}
                        className="w-full rounded-2xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 py-3.5 text-sm font-semibold hover:opacity-90 transition disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                        {busy ? '가져오는 중…' : '가져와서 여행기 만들기'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
