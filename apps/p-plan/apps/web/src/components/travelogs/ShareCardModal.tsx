'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Travelog,
    syncTravelogPlaces,
    saveTravelog,
    cn,
} from '@pplaner/shared';
import {
    CARD_THEMES,
    renderShareCard,
    canvasToBlob,
    type CardTemplate,
    type CardTheme,
    type ShareCardData,
} from '@/lib/shareCard';

const TEMPLATES: { id: CardTemplate; label: string; hint: string }[] = [
    { id: 'A', label: '매거진', hint: '큰 사진 커버' },
    { id: 'B', label: '분할', hint: '사진 + 정보' },
    { id: 'C', label: '타이포', hint: '사진 없이도' },
    { id: 'D', label: '포토북', hint: '사진 4장' },
];

function buildCardData(travelog: Travelog): ShareCardData {
    const places = syncTravelogPlaces(travelog);
    // 사진: 커버 → 장소 사진 → 이벤트 사진 순으로 모아 중복 제거
    const photos: string[] = [];
    const push = (u?: string) => { if (u && !photos.includes(u)) photos.push(u); };
    push(travelog.coverImageUrl);
    places.forEach((p) => p.photoUrls?.forEach(push));
    travelog.timeline?.forEach((d) => d.events?.forEach((e) => e.imageUrls?.forEach(push)));

    const fmt = (s?: string) => (s ? s.replace(/-/g, '.') : '');
    const dateText = travelog.startDate
        ? `${fmt(travelog.startDate)}${travelog.endDate && travelog.endDate !== travelog.startDate ? ` – ${fmt(travelog.endDate)}` : ''}`
        : '';

    return {
        title: travelog.title || '나의 여행',
        dateText,
        placeCount: places.length,
        dayCount: travelog.timeline?.length || 0,
        themeLabel: travelog.theme || '',
        photoUrls: photos,
    };
}

export default function ShareCardModal({
    travelog,
    isAuthor,
    authorName,
    authorPhotoURL,
    onClose,
    onPublished,
}: {
    travelog: Travelog;
    isAuthor: boolean;
    authorName?: string | null;
    authorPhotoURL?: string | null;
    onClose: () => void;
    onPublished?: (updated: Travelog) => void;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [template, setTemplate] = useState<CardTemplate>('A');
    const [theme, setTheme] = useState<CardTheme>(CARD_THEMES[0]);
    const [rendering, setRendering] = useState(true);
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState(false);
    const [published, setPublished] = useState(travelog.status === 'published' && travelog.isPublic);

    const data = useMemo(() => buildCardData(travelog), [travelog]);
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/travelogs/${travelog.id}` : '';

    // 템플릿/테마 변경 시 다시 그린다
    useEffect(() => {
        let alive = true;
        setRendering(true);
        (async () => {
            if (!canvasRef.current) return;
            await renderShareCard(canvasRef.current, template, theme, data);
            if (alive) setRendering(false);
        })();
        return () => { alive = false; };
    }, [template, theme, data]);

    const getBlob = async () => (canvasRef.current ? canvasToBlob(canvasRef.current) : null);

    const handleDownload = async () => {
        const blob = await getBlob();
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(travelog.title || 'travelog').replace(/[^\w가-힣-]+/g, '_')}_${template}.png`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleShare = async () => {
        setBusy(true);
        try {
            const blob = await getBlob();
            const file = blob ? new File([blob], 'pplaner-card.png', { type: 'image/png' }) : null;
            const nav = navigator as any;
            if (file && nav.canShare?.({ files: [file] })) {
                await nav.share({ files: [file], title: travelog.title, text: `${travelog.title} · PPLANER`, url: shareUrl });
            } else if (nav.share) {
                await nav.share({ title: travelog.title, text: `${travelog.title} · PPLANER`, url: shareUrl });
            } else {
                // 폴백: 이미지 저장 + 링크 복사
                await handleDownload();
                await handleCopyLink();
            }
        } catch { /* 사용자가 취소 */ } finally {
            setBusy(false);
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch { /* noop */ }
    };

    const handlePublish = async () => {
        setBusy(true);
        try {
            // 발행 시 작성자 정보를 비정규화하고 집계 카운터를 초기화한다 (소셜 발견용).
            const updated: Travelog = {
                ...travelog,
                status: 'published',
                isPublic: true,
                authorName: authorName || travelog.authorName || '여행자',
                authorPhotoURL: authorPhotoURL || travelog.authorPhotoURL || '',
                saveCount: travelog.saveCount ?? 0,
                likeCount: travelog.likeCount ?? 0,
            };
            await saveTravelog(updated);
            setPublished(true);
            onPublished?.(updated);
        } catch (e) {
            console.error('공개 실패:', e);
        } finally {
            setBusy(false);
        }
    };

    const needsPublish = isAuthor && !published;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-[28px] bg-white dark:bg-slate-900 shadow-2xl"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl z-10">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-rounded text-primary">ios_share</span>
                        공유 카드
                    </h2>
                    <button onClick={onClose} className="w-9 h-9 rounded-xl grid place-items-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition" aria-label="닫기">
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>

                <div className="grid md:grid-cols-[1fr_320px] gap-6 p-6">
                    {/* 미리보기 */}
                    <div className="flex items-start justify-center">
                        <div className="relative w-full max-w-[360px] aspect-[4/5] rounded-2xl overflow-hidden shadow-xl bg-slate-100 dark:bg-slate-800">
                            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                            {rendering && (
                                <div className="absolute inset-0 grid place-items-center bg-slate-100/60 dark:bg-slate-800/60">
                                    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 컨트롤 */}
                    <div className="space-y-5">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">템플릿</p>
                            <div className="grid grid-cols-2 gap-2">
                                {TEMPLATES.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTemplate(t.id)}
                                        className={cn('rounded-xl border px-3 py-2.5 text-left transition-all',
                                            template === t.id
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300')}
                                    >
                                        <span className="block text-xs font-semibold text-slate-900 dark:text-white">{t.label}</span>
                                        <span className="block text-xs text-slate-400">{t.hint}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">테마</p>
                            <div className="flex flex-wrap gap-2">
                                {CARD_THEMES.map((th) => (
                                    <button
                                        key={th.id}
                                        onClick={() => setTheme(th)}
                                        title={th.name}
                                        className={cn('w-9 h-9 rounded-full border-2 transition-all',
                                            theme.id === th.id ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent')}
                                        style={{ backgroundImage: `linear-gradient(135deg, ${th.from}, ${th.to})` }}
                                        aria-label={th.name}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="pt-2 space-y-2.5">
                            {needsPublish ? (
                                <button
                                    onClick={handlePublish}
                                    disabled={busy}
                                    className="w-full rounded-xl bg-primary text-white py-3 text-sm font-bold hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-rounded text-lg">public</span>
                                    {busy ? '공개 중…' : '공개하고 공유하기'}
                                </button>
                            ) : (
                                <button
                                    onClick={handleShare}
                                    disabled={busy || rendering}
                                    className="w-full rounded-xl bg-primary text-white py-3 text-sm font-bold hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-rounded text-lg">ios_share</span>
                                    {busy ? '준비 중…' : '공유하기'}
                                </button>
                            )}

                            <div className="grid grid-cols-2 gap-2.5">
                                <button
                                    onClick={handleDownload}
                                    disabled={rendering}
                                    className="rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-primary hover:text-primary transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    <span className="material-symbols-rounded text-base">download</span>
                                    이미지 저장
                                </button>
                                <button
                                    onClick={handleCopyLink}
                                    className="rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-primary hover:text-primary transition flex items-center justify-center gap-1.5"
                                >
                                    <span className="material-symbols-rounded text-base">{copied ? 'check' : 'link'}</span>
                                    {copied ? '복사됨' : '링크 복사'}
                                </button>
                            </div>

                            {needsPublish && (
                                <p className="text-xs text-slate-400 leading-relaxed text-center pt-1">
                                    공개하면 링크를 가진 누구나 이 여행기를 볼 수 있어요.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
