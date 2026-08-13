"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FeatureCollection } from 'geojson';
import { RailData } from '../types/railData';
import { Trip } from '../types/trip';
import { useI18n } from '../lib/i18n-context';
import { trackEvent } from '../lib/gtag';
import { themeOf, MapThemeId } from '../lib/mapThemes';
import { MapShapeMode } from '../lib/lineShapes';
import { buildIsoToInternal } from '../lib/prefectures';
import { JPRAIL_ACHIEVEMENTS } from '../lib/achievements';
import {
    ShareBlockId, ShareScope, ShareScopeKind, SHARE_BLOCKS,
    availableScopes, computeShareStats
} from '../lib/shareCard';
import { drawShareCard, CARD_SIZE } from '../lib/shareCardRender';

export interface ShareCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    trips: Trip[];
    railData: RailData | null;
    lineLengths: Record<string, number>;
    prefectures: FeatureCollection | null;
    regionNames: { adm1?: Record<string, { name?: string; name_en?: string; name_kr?: string }> } | null;
    themeId: MapThemeId;
    shapeMode: MapShapeMode;
}

type Delivery = 'share' | 'copy' | 'download';

const TEXT = {
    ko: {
        title: '공유 카드', scope: '무엇에 대한 카드인가요', include: '담을 내용',
        all: '전체', prefecture: '도도부현', company: '회사', line: '노선',
        map: '지도', totals: '총계', lines: '노선 완주율', prefectures: '도도부현 정복', badges: '업적', period: '기간',
        download: '이미지 저장', copy: '이미지 복사', share: 'SNS에 공유',
        copied: '복사했어요. 붙여넣기 하세요', preparing: '만드는 중…',
        nothing: '아직 기록한 여행이 없어요. 지도에서 역과 역 사이를 드래그해 기록해 보세요.',
        km: 'km', stations: '역', lineCount: '노선', companies: '회사',
        reached: '도도부현 방문', tip: '휴대폰에서는 공유 버튼이 앱을 바로 열어 줍니다.'
    },
    en: {
        title: 'Share card', scope: 'What is this card about', include: 'What to include',
        all: 'Everything', prefecture: 'Prefecture', company: 'Operator', line: 'Line',
        map: 'Map', totals: 'Totals', lines: 'Line progress', prefectures: 'Prefectures', badges: 'Badges', period: 'Period',
        download: 'Save image', copy: 'Copy image', share: 'Share',
        copied: 'Copied — paste it in', preparing: 'Drawing…',
        nothing: 'No trips recorded yet. Drag between two stations on the map to record one.',
        km: 'km', stations: 'stations', lineCount: 'lines', companies: 'operators',
        reached: 'prefectures reached', tip: 'On a phone, Share opens the app directly.'
    },
    ja: {
        title: '共有カード', scope: '何についてのカードですか', include: '含める内容',
        all: '全体', prefecture: '都道府県', company: '会社', line: '路線',
        map: '地図', totals: '合計', lines: '路線の走破率', prefectures: '都道府県制覇', badges: '実績', period: '期間',
        download: '画像を保存', copy: '画像をコピー', share: '共有',
        copied: 'コピーしました。貼り付けてください', preparing: '作成中…',
        nothing: 'まだ記録がありません。地図で駅から駅へドラッグして記録してみてください。',
        km: 'km', stations: '駅', lineCount: '路線', companies: '会社',
        reached: '都道府県を訪問', tip: 'スマートフォンでは共有ボタンからアプリを直接開けます。'
    }
};

const ShareCardModal: React.FC<ShareCardModalProps> = ({
    isOpen, onClose, trips, railData, lineLengths, prefectures, regionNames, themeId, shapeMode
}) => {
    const { language } = useI18n();
    const t = TEXT[language as keyof typeof TEXT] || TEXT.en;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [scopeKind, setScopeKind] = useState<ShareScopeKind>('all');
    const [scopeId, setScopeId] = useState<string>('');
    const [blocks, setBlocks] = useState<Set<ShareBlockId>>(
        () => new Set<ShareBlockId>(['map', 'totals', 'lines', 'prefectures', 'period'])
    );
    const [notice, setNotice] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const choices = useMemo(
        () => availableScopes(trips, railData, regionNames?.adm1 ?? null, language),
        [trips, railData, regionNames, language]
    );

    const scope: ShareScope = useMemo(() => {
        if (scopeKind === 'all') return { kind: 'all', label: t.all };
        const list = scopeKind === 'prefecture' ? choices.prefectures
            : scopeKind === 'company' ? choices.companies : choices.lines;
        const chosen = list.find(s => s.id === scopeId) ?? list[0];
        return chosen ?? { kind: 'all', label: t.all };
    }, [scopeKind, scopeId, choices, t.all]);

    const stats = useMemo(
        () => computeShareStats(trips, railData, lineLengths, scope),
        [trips, railData, lineLengths, scope]
    );

    const badges = useMemo(() => {
        if (!railData) return [];
        return JPRAIL_ACHIEVEMENTS
            .filter(a => a.calcProgress(trips, railData, lineLengths).isUnlocked)
            .map(a => a.title[language as 'ko' | 'en' | 'ja'] ?? a.title.en);
    }, [trips, railData, lineLengths, language]);

    const isoToPrefecture = useMemo(
        () => buildIsoToInternal(regionNames?.adm1 ?? null, (prefectures?.features ?? []) as never),
        [regionNames, prefectures]
    );

    // Redraw whenever anything the card shows changes.
    useEffect(() => {
        if (!isOpen || !railData || !canvasRef.current) return;
        let cancelled = false;
        const draw = async () => {
            // Canvas text falls back to a system font if the webfont has not
            // arrived yet, so wait for it rather than shipping a card in the
            // wrong typeface.
            try { await document.fonts.ready; } catch { /* older browsers */ }
            if (cancelled || !canvasRef.current) return;
            drawShareCard(canvasRef.current, {
                stats, scope, blocks, theme: themeOf(themeId), shapeMode, railData,
                sections: railData.sections?.lod?.high ?? railData.sections?.sections ?? [],
                riddenSectionIds: new Set(trips.flatMap(trip => (trip.sectionIds || []).map(Number))),
                prefectures, badges, isoToPrefecture,
                labels: {
                    title: 'JapanRailNote',
                    scopeLabel: (scope.label ?? t.all).toUpperCase(),
                    km: t.km, stations: t.stations, lines: t.lineCount, companies: t.companies,
                    prefecturesOf: () => t.reached,
                    period: (from, to) => `${from} – ${to}`,
                    footer: 'japanrailnote.com'
                }
            });
        };
        draw();
        return () => { cancelled = true; };
    }, [isOpen, stats, scope, blocks, themeId, shapeMode, railData, trips, prefectures, badges, isoToPrefecture, t]);

    const toBlob = useCallback(async (): Promise<Blob | null> => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png'));
    }, []);

    const filename = useMemo(
        () => `jprail-${scope.kind}-${new Date().toISOString().slice(0, 10)}.png`,
        [scope.kind]
    );

    const message = useMemo(() => {
        const where = scope.kind === 'all' ? '' : ` — ${scope.label}`;
        return `${stats.distance.toLocaleString()}km · ${stats.stations} ${t.stations} · ${stats.lines} ${t.lineCount}${where}\nhttps://japanrailnote.com`;
    }, [stats, scope, t]);

    /**
     * There is no way to hand an image to a tweet through a URL, so the button
     * takes the best route the browser actually offers:
     *
     *  1. the native share sheet with the file attached — on a phone this drops
     *     straight into X, Instagram or a messenger,
     *  2. failing that, the image on the clipboard plus the composer opened, so
     *     it is one paste away,
     *  3. failing that, a plain download.
     */
    const deliver = useCallback(async (preferred: Delivery) => {
        setBusy(true);
        setNotice(null);
        try {
            const blob = await toBlob();
            if (!blob) return;
            const file = new File([blob], filename, { type: 'image/png' });

            if (preferred === 'share' && typeof navigator !== 'undefined'
                && navigator.canShare?.({ files: [file] }) && navigator.share) {
                await navigator.share({ files: [file], text: message });
                trackEvent('share_card', 'engagement', `native_${scope.kind}`);
                return;
            }

            if (preferred !== 'download' && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
                try {
                    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                    setNotice(t.copied);
                    trackEvent('share_card', 'engagement', `clipboard_${scope.kind}`);
                    if (preferred === 'share') {
                        window.open(
                            `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`,
                            '_blank', 'noopener,noreferrer'
                        );
                    }
                    return;
                } catch { /* denied or unsupported; fall through to a download */ }
            }

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);
            trackEvent('share_card', 'engagement', `download_${scope.kind}`);
        } catch (error) {
            // A share sheet the user dismisses rejects; that is not a failure.
            if ((error as { name?: string })?.name !== 'AbortError') {
                console.error('[Share] delivery failed', error);
            }
        } finally {
            setBusy(false);
        }
    }, [toBlob, filename, message, scope.kind, t.copied]);

    useEffect(() => {
        if (!notice) return;
        const timer = setTimeout(() => setNotice(null), 3200);
        return () => clearTimeout(timer);
    }, [notice]);

    if (!isOpen) return null;

    const scopeList = scopeKind === 'prefecture' ? choices.prefectures
        : scopeKind === 'company' ? choices.companies
            : scopeKind === 'line' ? choices.lines : [];

    const blockLabel: Record<ShareBlockId, string> = {
        map: t.map, totals: t.totals, lines: t.lines, prefectures: t.prefectures, badges: t.badges, period: t.period
    };

    return (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#0f172acc] backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />

            <div className="relative w-full max-w-5xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-6 duration-400 flex flex-col">
                <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">ios_share</span>
                        {t.title}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" aria-label="Close">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {trips.length === 0 ? (
                    <div className="p-12 text-center text-sm font-bold text-slate-400">{t.nothing}</div>
                ) : (
                    <div className="flex-1 overflow-y-auto grid md:grid-cols-[1fr_300px] gap-6 p-6">
                        {/* Preview */}
                        <div className="min-w-0">
                            <div className="rounded-2xl overflow-hidden shadow-lg ring-1 ring-black/5 dark:ring-white/10">
                                <canvas
                                    ref={canvasRef}
                                    width={CARD_SIZE}
                                    height={CARD_SIZE}
                                    className="w-full h-auto block"
                                />
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.scope}</h3>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {(['all', 'prefecture', 'company', 'line'] as ShareScopeKind[]).map(kind => {
                                        const list = kind === 'prefecture' ? choices.prefectures
                                            : kind === 'company' ? choices.companies
                                                : kind === 'line' ? choices.lines : [{}];
                                        const disabled = list.length === 0;
                                        return (
                                            <button
                                                key={kind}
                                                disabled={disabled}
                                                onClick={() => { setScopeKind(kind); setScopeId(''); }}
                                                className={`py-2 rounded-xl text-xs font-black transition-all ${scopeKind === kind
                                                    ? 'bg-primary text-white shadow-md'
                                                    : disabled
                                                        ? 'bg-slate-50 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                            >
                                                {t[kind]}
                                            </button>
                                        );
                                    })}
                                </div>
                                {scopeKind !== 'all' && scopeList.length > 0 && (
                                    <select
                                        value={scopeId || scopeList[0].id}
                                        onChange={(e) => setScopeId(e.target.value)}
                                        className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-200 border-none outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        {scopeList.map(option => (
                                            <option key={option.id} value={option.id}>{option.label}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.include}</h3>
                                <div className="flex flex-col gap-1">
                                    {SHARE_BLOCKS.map(id => {
                                        const on = blocks.has(id);
                                        return (
                                            <button
                                                key={id}
                                                onClick={() => setBlocks(prev => {
                                                    const next = new Set(prev);
                                                    if (next.has(id)) next.delete(id); else next.add(id);
                                                    return next;
                                                })}
                                                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${on
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                            >
                                                {blockLabel[id]}
                                                <span className={`material-symbols-outlined !text-[18px] transition-transform ${on ? 'scale-100' : 'scale-0'}`}>
                                                    check_circle
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="mt-auto flex flex-col gap-2">
                                <button
                                    onClick={() => deliver('share')}
                                    disabled={busy}
                                    className="flex items-center justify-center gap-2 py-3.5 px-5 bg-primary hover:brightness-110 text-white font-black rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-60"
                                >
                                    <span className="material-symbols-outlined !text-[20px]">ios_share</span>
                                    {busy ? t.preparing : t.share}
                                </button>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => deliver('copy')}
                                        disabled={busy}
                                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black rounded-xl transition-all disabled:opacity-60"
                                    >
                                        <span className="material-symbols-outlined !text-[17px]">content_copy</span>
                                        {t.copy}
                                    </button>
                                    <button
                                        onClick={() => deliver('download')}
                                        disabled={busy}
                                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black rounded-xl transition-all disabled:opacity-60"
                                    >
                                        <span className="material-symbols-outlined !text-[17px]">download</span>
                                        {t.download}
                                    </button>
                                </div>
                                <p className="text-[10px] font-medium text-slate-400 text-center leading-snug px-2">
                                    {notice ?? t.tip}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShareCardModal;
