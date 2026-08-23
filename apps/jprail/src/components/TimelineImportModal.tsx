"use client";

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { TimelineIcon, CloseIcon, ExternalLinkIcon, UploadIcon, LockIcon, WarningIcon, TimelineGuideSection } from '@ppotal/ui';
import { RailData } from '../types/railData';
import { Trip } from '../types/trip';
import { useI18n } from '../lib/i18n-context';
import { getLocalizedName } from '../lib/i18n-utils';
import { TIMELINE_IMPORT_TRANSLATIONS, getTranslations } from '../lib/translations';
import { Z } from '../lib/layers';

import { parseTimeline } from '../lib/timeline/parse';
import { StationIndex } from '../lib/timeline/stationIndex';
import { matchAll, mergeAdjacent, DEFAULT_MATCH_OPTIONS, isPointInJapan } from '../lib/timeline/match';
import { createClientRouter } from '../lib/timeline/clientRouter';
import type { CandidateRoute, MatchResult, Router } from '../lib/timeline/types';

export interface TimelineImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    railData: RailData | null;
    /**
     * The app's own station-to-station router, already wired to the graph
     * (`MainPageClient`'s `lineDetailData.getShortestPath`). Optional because
     * it is only ready once the map has finished loading — the modal shows a
     * "still loading" state rather than crashing when it isn't.
     */
    getShortestPath: ((start: string, end: string, allowedLines?: string[]) =>
        Promise<{ path: string[]; distance: number; geometries: [number, number][][]; sectionIds: number[] } | null>) | null;
    onImportTrips: (trips: Trip[], onProgress?: (done: number, total: number) => void) => Promise<void> | void;
}

type Phase = 'intro' | 'analyzing' | 'review' | 'importing' | 'error';

/**
 * Opens the real Google Maps app if it's installed. Not a deep link into a
 * specific settings screen — Google doesn't publish one we can rely on
 * staying correct across app versions — so the modal always leads with the
 * numbered steps and treats this as a shortcut, not the instructions.
 */
const OPEN_MAPS_APP_HREF = {
    ios: 'comgooglemaps://', // documented by Google: developers.google.com/maps/documentation/urls/ios-urlscheme
    android: 'https://www.google.com/maps' // opens in the installed app via Android App Links, or the browser
};

/** Wraps the app's own router with a cache so the pure matching library can call it efficiently. */
export function makeAppRouter(
    getShortestPath: NonNullable<TimelineImportModalProps['getShortestPath']>
): Router {
    const cache = new Map<string, Promise<CandidateRoute | null>>();

    return (fromId, toId) => {
        const key = `${fromId}>${toId}`;
        const existing = cache.get(key);
        if (existing) return existing;

        const p = (async () => {
            const r = await getShortestPath(fromId, toId);
            if (!r) return null;
            const geometry = r.geometries.flat();
            if (geometry.length < 2) return null;
            const route: CandidateRoute = {
                fromStationId: fromId,
                toStationId: toId,
                geometry,
                stationIds: r.path,
                // The app's own convention is kilometres (see Trip.distance); the
                // matching library works in metres throughout, so it is converted
                // once here rather than carrying two units through the library.
                distance: r.distance * 1000,
                sectionIds: r.sectionIds.map(Number),
                lineIds: []
            };
            return route;
        })();

        cache.set(key, p);
        return p;
    };
}

const confidenceTone = (c: number) =>
    c >= 0.75 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
        : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30';

export function tripFromResult(result: MatchResult, railData: RailData | null): Trip | null {
    const best = result.candidates[0];
    if (!best) return null;
    const { route } = best;
    const fromName = railData?.stations[route.fromStationId]?.name ?? route.fromStationId;
    const toName = railData?.stations[route.toStationId]?.name ?? route.toStationId;
    return {
        id: `timeline_${result.segment.startTime}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date(result.segment.startTime).toISOString(),
        start: fromName,
        end: toName,
        startId: route.fromStationId,
        endId: route.toStationId,
        distance: route.distance / 1000,
        path: route.stationIds,
        waypoints: [route.fromStationId, route.toStationId],
        geometries: [route.geometry],
        sectionIds: route.sectionIds
    };
}

export const TimelineImportModal: React.FC<TimelineImportModalProps> = ({
    isOpen,
    onClose,
    railData,
    getShortestPath,
    onImportTrips
}) => {
    const { language } = useI18n();
    const t = getTranslations(TIMELINE_IMPORT_TRANSLATIONS, language);

    const [phase, setPhase] = useState<Phase>('intro');
    const [fileNames, setFileNames] = useState<string[]>([]);
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<MatchResult[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const fileInputRef = useRef<HTMLInputElement>(null);
    const runToken = useRef(0);

    const stationIndex = useMemo(
        () => (railData ? StationIndex.fromMaster(railData.stations as any) : null),
        [railData]
    );
    const stationPos = useCallback((id: string) => {
        const s = railData?.stations[id];
        return s ? { lat: s.lat, lon: s.lon } : null;
    }, [railData]);

    const reset = useCallback(() => {
        setPhase('intro');
        setFileNames([]);
        setProgress({ done: 0, total: 0 });
        setImportProgress({ done: 0, total: 0 });
        setError(null);
        setResults([]);
        setSelected(new Set());
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    const handleClose = useCallback(() => {
        reset();
        onClose();
    }, [reset, onClose]);

    const handleFiles = useCallback(async (fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) return;
        if (!railData || !stationIndex) {
            setError(t.mapNotReady);
            setPhase('error');
            return;
        }

        const files = Array.from(fileList);
        setFileNames(files.map(f => f.name));
        setPhase('analyzing');
        setError(null);
        setProgress({ done: 0, total: 0 });

        // Guards against a stale run finishing after the modal was closed and
        // reopened with a new file — the async loop below has no other way to
        // know it should stop writing into state.
        const token = ++runToken.current;

        try {
            const roots = await Promise.all(files.map(async f => {
                try {
                    return JSON.parse(await f.text());
                } catch {
                    return null;
                }
            }));
            const validRoots = roots.filter(r => r !== null);
            if (validRoots.length === 0) {
                if (token !== runToken.current) return;
                setError(t.parseFailed);
                setPhase('error');
                return;
            }

            const { segments } = parseTimeline(validRoots);
            // Pre-filter to segments with coordinates in Japan AND relevant hints (rail or unknown)
            // Explicit non-rail activities (foot, road, cycling, flight, etc.) are skipped immediately for 10x speed.
            const targetSegments = segments.filter(s => {
                if (s.trace.length === 0) return false;
                if (s.hint !== 'rail' && s.hint !== 'unknown') return false;
                const f = s.trace[0];
                const l = s.trace[s.trace.length - 1];
                return isPointInJapan(f.lat, f.lon) || isPointInJapan(l.lat, l.lon);
            });

            if (targetSegments.length === 0) {
                if (token !== runToken.current) return;
                setError(t.noSegmentsFound);
                setPhase('error');
                return;
            }

            // Use client-side in-memory router (0.02ms per path lookup, 0 network latency)
            const router = createClientRouter(railData);
            const matched = await matchAll(
                targetSegments, stationIndex, router, stationPos, DEFAULT_MATCH_OPTIONS,
                (done, total) => { if (token === runToken.current) setProgress({ done, total }); },
                12
            );
            if (token !== runToken.current) return;

            const merged = mergeAdjacent(matched);
            setResults(merged);
            // Pre-select every segment the matcher is confident about; the
            // rest stay visible but unchecked, so nothing is imported without
            // the person having looked at it.
            setSelected(new Set(
                merged.filter(r => r.candidates.length > 0).map(r => r.segment.id)
            ));
            setPhase('review');
        } catch (e) {
            if (token !== runToken.current) return;
            console.error('Timeline import failed', e);
            setError(t.parseFailed);
            setPhase('error');
        }
    }, [railData, stationIndex, stationPos, t]);

    const toggle = useCallback((id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const matchedResults = useMemo(() => results.filter(r => r.candidates.length > 0), [results]);
    const unmatchedResults = useMemo(() => results.filter(r => r.candidates.length === 0), [results]);

    const handleImport = useCallback(async () => {
        const trips = matchedResults
            .filter(r => selected.has(r.segment.id))
            .map(r => tripFromResult(r, railData))
            .filter((t): t is Trip => t !== null);

        if (trips.length === 0) return;

        setPhase('importing');
        setImportProgress({ done: 0, total: trips.length });

        try {
            await onImportTrips(trips, (done, total) => {
                setImportProgress({ done, total });
            });
            setTimeout(() => {
                handleClose();
            }, 300);
        } catch (err) {
            console.error('Import failed', err);
            setError(t.parseFailed);
            setPhase('error');
        }
    }, [matchedResults, selected, railData, onImportTrips, handleClose, t]);

    if (!isOpen) return null;

    const dateFmt = (ms: number) => new Date(ms).toLocaleDateString(
        language === 'ko' ? 'ko-KR' : language === 'ja' ? 'ja-JP' : 'en-US',
        { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    );

    return (
        <div style={{ zIndex: Z.modal }} className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg h-[92vh] sm:h-[84vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <TimelineIcon className="w-5 h-5 text-primary shrink-0" />
                        <div className="leading-tight min-w-0">
                            <h3 className="font-bold text-slate-800 dark:text-white text-sm truncate">{t.title}</h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">{t.subtitle}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="shrink-0 size-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        aria-label={t.close}
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    {phase === 'intro' && (
                        <div className="p-4 flex flex-col gap-4">
                            <section>
                                <TimelineGuideSection language={language as 'ko' | 'ja' | 'en'} />
                            </section>

                            <div className="h-px bg-slate-100 dark:bg-slate-800" />

                            <section>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
                                >
                                    <UploadIcon className="w-8 h-8 text-primary" />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t.pickFile}</span>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500">{t.pickFileHint}</span>
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json,application/json"
                                    multiple
                                    className="hidden"
                                    onChange={e => handleFiles(e.target.files)}
                                />
                            </section>
                        </div>
                    )}

                    {phase === 'analyzing' && (
                        <div className="h-full flex flex-col items-center justify-center gap-4 p-6">
                            <div className="size-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
                            <div className="text-center">
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{t.analyzing}</p>
                                {progress.total > 0 && (
                                    <p className="text-xs text-slate-400 mt-1">{t.analyzingProgress(progress.done, progress.total)}</p>
                                )}
                            </div>
                            {progress.total > 0 && (
                                <div className="w-full max-w-xs h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-200"
                                        style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {phase === 'importing' && (
                        <div className="h-full flex flex-col items-center justify-center gap-5 p-6 animate-in fade-in duration-300">
                            <div className="relative flex items-center justify-center size-14">
                                <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                <TimelineIcon className="w-6 h-6 text-primary animate-pulse" />
                            </div>
                            <div className="text-center">
                                <p className="text-base font-bold text-slate-800 dark:text-slate-100">{t.importing}</p>
                                {importProgress.total > 0 ? (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
                                        {t.importingProgress(importProgress.done, importProgress.total)}
                                    </p>
                                ) : (
                                    <p className="text-xs text-slate-400 mt-1.5">{t.importing}</p>
                                )}
                            </div>
                            {importProgress.total > 0 && (
                                <div className="w-full max-w-sm flex flex-col items-center gap-2">
                                    <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-inner p-0.5">
                                        <div
                                            className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-150 ease-out"
                                            style={{
                                                width: `${Math.max(4, Math.round((importProgress.done / importProgress.total) * 100))}%`
                                            }}
                                        />
                                    </div>
                                    <span className="text-[11px] font-bold text-primary dark:text-blue-400">
                                        {Math.round((importProgress.done / importProgress.total) * 100)}%
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {phase === 'error' && (
                        <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                            <WarningIcon className="w-8 h-8 text-amber-500" />
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{error}</p>
                            <button
                                onClick={reset}
                                className="mt-2 px-4 h-10 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer"
                            >
                                {t.backToFile}
                            </button>
                        </div>
                    )}

                    {phase === 'review' && (
                        <div className="flex flex-col h-full">
                            <div className="px-4 pt-3 pb-2 shrink-0 flex items-center justify-between">
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                    {t.reviewSubtitle(matchedResults.length, results.length)}
                                </p>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setSelected(new Set(matchedResults.map(r => r.segment.id)))}
                                        className="text-[10px] font-bold text-primary px-2 h-7 rounded-lg hover:bg-primary/10"
                                    >
                                        {t.selectAll}
                                    </button>
                                    <button
                                        onClick={() => setSelected(new Set())}
                                        className="text-[10px] font-bold text-slate-400 px-2 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                        {t.selectNone}
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 pb-3 flex flex-col gap-2">
                                {matchedResults.map(r => {
                                    const best = r.candidates[0];
                                    const fromName = getLocalizedName(
                                        railData?.stations[best.route.fromStationId] as any, language
                                    ) || best.route.fromStationId;
                                    const toName = getLocalizedName(
                                        railData?.stations[best.route.toStationId] as any, language
                                    ) || best.route.toStationId;
                                    const checked = selected.has(r.segment.id);
                                    return (
                                        <label
                                            key={r.segment.id}
                                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${checked
                                                ? 'border-primary/30 bg-primary/5'
                                                : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggle(r.segment.id)}
                                                className="mt-1 size-4 rounded border-slate-300 dark:border-slate-600 accent-primary shrink-0"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                                        {fromName} → {toName}
                                                    </p>
                                                    <span className={`shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-md ${confidenceTone(best.confidence)}`}>
                                                        {best.confidence >= 0.75 ? t.confidenceHigh : t.confidenceMedium}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                                                    <span>{dateFmt(r.segment.startTime)}</span>
                                                    <span>·</span>
                                                    <span>{t.distanceKm(best.route.distance / 1000)}</span>
                                                    {best.notes.includes('merged') && (
                                                        <>
                                                            <span>·</span>
                                                            <span>{t.mergedBadge}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })}

                                {unmatchedResults.length > 0 && (
                                    <div className="mt-1 flex flex-col gap-1.5">
                                        {unmatchedResults.map(r => (
                                            <div
                                                key={r.segment.id}
                                                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 opacity-70"
                                            >
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold truncate">
                                                    {dateFmt(r.segment.startTime)}
                                                </span>
                                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 shrink-0">
                                                    {t.unmatchedLabel}
                                                    {r.rejectedBecause && t.rejectReasons[r.rejectedBecause]
                                                        ? ` · ${t.rejectReasons[r.rejectedBecause]}` : ''}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer, review phase only */}
                {phase === 'review' && (
                    <div className="p-3 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center gap-2">
                        <button
                            onClick={reset}
                            className="h-11 px-3 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            {t.backToFile}
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={selected.size === 0}
                            className={`flex-1 h-11 rounded-xl text-sm font-bold transition-all ${selected.size === 0
                                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                : 'bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-[0.99]'}`}
                        >
                            {t.importButton(selected.size)}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimelineImportModal;
