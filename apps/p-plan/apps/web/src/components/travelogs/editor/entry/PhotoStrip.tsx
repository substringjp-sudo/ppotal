'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@pplaner/shared';

/** 히어로 컷 점수 — 비전 모델 없이 해상도 + 종횡비 상식만으로 */
function heroScore(w: number, h: number): number {
    if (!w || !h) return 0;
    const r = w / h;
    let aspect = 1;
    if (r < 0.66) aspect = Math.max(0.2, r / 0.66);
    else if (r > 1.6) aspect = Math.max(0.2, 1.6 / r);
    const area = Math.min(w * h, 2_000_000) / 2_000_000;
    return aspect * (0.5 + 0.5 * area);
}

/**
 * 장소 카드의 사진 — 히어로 1장(=대표) + 필름스트립.
 *
 * · 대표 지정에 "설정 모드" 같은 단계가 없다. 필름스트립에서 마음에 드는 컷을 누르면
 *   그게 앞으로 온다. 미지정이면 치수 휴리스틱이 가장 히어로다운 컷을 한 번 골라둔다.
 * · 자동 클러스터링은 반드시 잘못 묶는다. 그래서 각 컷에 "빼기 / 새 장소로 분리"를 둬
 *   값싸게 복구할 수 있게 한다.
 * · 쓰는 중인 카드(active)는 히어로를 키워 "지금 이 사진들 얘기 중"을 유지한다.
 */
export default function PhotoStrip({
    photos, cover, active, onPickCover, onRemovePhoto, onSplitPhoto,
}: {
    photos: string[];
    cover?: string;
    active?: boolean;
    onPickCover: (url: string) => void;
    onRemovePhoto?: (url: string) => void;
    onSplitPhoto?: (url: string) => void;
}) {
    const [dims, setDims] = useState<Record<string, { w: number; h: number }>>({});
    const [menuFor, setMenuFor] = useState<string | null>(null);
    const autoPicked = useRef(false);
    const hero = cover && photos.includes(cover) ? cover : photos[0];

    useEffect(() => {
        let alive = true;
        photos.forEach((url) => {
            if (dims[url]) return;
            const im = new window.Image();
            im.onload = () => {
                if (!alive) return;
                setDims((prev) => (prev[url] ? prev : { ...prev, [url]: { w: im.naturalWidth || 1, h: im.naturalHeight || 1 } }));
            };
            im.src = url;
        });
        return () => { alive = false; };
    }, [photos, dims]);

    useEffect(() => {
        if (autoPicked.current || cover) return;
        const measured = photos.filter((p) => dims[p]);
        if (measured.length < Math.min(photos.length, 2)) return;
        let best = photos[0]; let bestScore = -1;
        for (const p of measured) {
            const s = heroScore(dims[p].w, dims[p].h);
            if (s > bestScore) { bestScore = s; best = p; }
        }
        autoPicked.current = true;
        if (best && best !== hero) onPickCover(best);
    }, [dims, cover, photos, hero, onPickCover]);

    if (photos.length === 0) return null;

    return (
        <div className="space-y-1.5">
            <div className={cn(
                'relative rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 transition-all duration-300',
                active ? 'aspect-[3/2]' : 'aspect-[16/7]',
            )}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <span className="absolute top-2 left-2 rounded-full bg-black/55 backdrop-blur px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-1">
                    <span className="material-symbols-rounded text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    대표
                </span>
                {photos.length > 1 && (
                    <span className="absolute top-2 right-2 rounded-full bg-black/55 backdrop-blur px-2.5 py-1 text-[10px] font-black text-white tabular-nums">
                        {photos.length}장
                    </span>
                )}
            </div>

            {photos.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                    {photos.map((url) => (
                        <div key={url} className="relative shrink-0">
                            <button
                                type="button"
                                onClick={() => onPickCover(url)}
                                onContextMenu={(e) => { e.preventDefault(); setMenuFor(menuFor === url ? null : url); }}
                                className={cn('relative h-14 w-14 rounded-lg overflow-hidden block transition ring-2',
                                    url === hero ? 'ring-primary' : 'ring-transparent hover:ring-slate-300 dark:hover:ring-slate-600')}
                                aria-label="이 사진을 대표로"
                                aria-pressed={url === hero}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                            </button>
                            {(onRemovePhoto || onSplitPhoto) && (
                                <button
                                    type="button"
                                    onClick={() => setMenuFor(menuFor === url ? null : url)}
                                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-900/80 text-white grid place-items-center opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100 transition"
                                    aria-label="사진 옵션"
                                >
                                    <span className="material-symbols-rounded text-[13px]">more_horiz</span>
                                </button>
                            )}
                            {menuFor === url && (
                                <div className="absolute z-20 top-16 left-0 w-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
                                    {onSplitPhoto && (
                                        <button
                                            type="button"
                                            onClick={() => { onSplitPhoto(url); setMenuFor(null); }}
                                            className="w-full px-3 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                        >
                                            <span className="material-symbols-rounded text-base text-primary">call_split</span>
                                            새 장소로 분리
                                        </button>
                                    )}
                                    {onRemovePhoto && (
                                        <button
                                            type="button"
                                            onClick={() => { onRemovePhoto(url); setMenuFor(null); }}
                                            className="w-full px-3 py-2.5 text-left text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2"
                                        >
                                            <span className="material-symbols-rounded text-base">delete</span>
                                            사진 빼기
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
