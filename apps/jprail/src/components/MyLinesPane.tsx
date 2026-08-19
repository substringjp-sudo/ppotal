"use client";

import React, { useMemo } from 'react';
import { RailData, Station, Line, Section, Company } from '../types/railData';
import { useI18n } from '../lib/i18n-context';
import { getLocalizedName, getLocalizedRegion } from '../lib/i18n-utils';
import { useRegionNames } from '../hooks/useRegionNames';
import { Trip } from '../types/trip';
import { MY_LINES_TRANSLATIONS, getTranslations } from '../lib/translations';

export interface MyLinesPaneProps {
    recordedTrips?: Trip[];
    onDeleteTrip?: (id: string) => void;
    onResetTrips?: () => void;
    railData: RailData | null;
    lineLengths?: Record<string, number>;
    visitedLineLengths?: Record<string, number>;
    className?: string;
    onSyncWithRegionevel?: () => Promise<void>;
    isSyncLoading?: boolean;
    onOpenRouteGenerator?: () => void;
    isReadOnly?: boolean;
    /** Phone density — the same pane renders in the desktop rail and the sheet. */
    isMobile?: boolean;
}

const getStationDisplayName = (
    stationIdOrName: string | undefined,
    fallbackId: string | undefined,
    railData: RailData | null,
    language: string
): string => {
    if (!railData?.stations) return stationIdOrName || fallbackId || '';

    const stations = railData.stations as Record<string, Station>;
    const targetId = fallbackId || stationIdOrName || '';
    let station = stations[targetId];

    if (!station && stationIdOrName) {
        station = stations[stationIdOrName] || Object.values(stations).find(s => s.name === stationIdOrName || s.id === stationIdOrName);
    }

    if (station) {
        return getLocalizedName(station, language as any) || station.name_kr || station.name_en || station.name || targetId;
    }

    return stationIdOrName || targetId;
};

const MyLinesPane: React.FC<MyLinesPaneProps> = ({
    recordedTrips = [],
    onDeleteTrip,
    onResetTrips,
    railData,
    lineLengths = {},
    visitedLineLengths = {},
    className,
    onSyncWithRegionevel,
    isSyncLoading,
    onOpenRouteGenerator,
    isReadOnly = false,
    isMobile = false
}) => {
    const { language } = useI18n();
    const t = getTranslations(MY_LINES_TRANSLATIONS, language);
    const regionNames = useRegionNames();
    const [isResetConfirming, setIsResetConfirming] = React.useState(false);

    React.useEffect(() => {
        if (recordedTrips.length === 0) {
            setIsResetConfirming(false);
        }
    }, [recordedTrips.length]);

    const displayTrips = useMemo(() => {
        return [...(recordedTrips || [])].reverse();
    }, [recordedTrips]);

    return (
        <div className={`flex flex-col h-full bg-transparent overflow-hidden font-display ${className || ""}`}>
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
                <div>
                    <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-xl">history</span>
                        {t.title}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-tight font-semibold">{t.subtitle}</p>
                </div>
                {onOpenRouteGenerator && (
                    <button
                        onClick={onOpenRouteGenerator}
                        disabled={isReadOnly}
                        className={`flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold transition-all shrink-0 ${isMobile ? 'h-11' : 'py-1.5'} ${isReadOnly
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                            : 'bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-95'}`}
                        title={isReadOnly ? (language === 'ko' ? '도트/스퀘어/허니콤 모드에서는 경로 생성이 비활성화됩니다.' : 'Route generator disabled in tile mode') : undefined}
                    >
                        <span className="material-symbols-outlined text-base">alt_route</span>
                        {t.generateRoute || '경로 생성'}
                    </button>
                )}
            </div>

            {/* Read-only banner in tile mode */}
            {isReadOnly && (
                <div className="mx-4 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-amber-500 !text-[18px] shrink-0 mt-0.5">lock</span>
                    <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 leading-snug">
                        {language === 'ko'
                            ? '도트/스퀘어/허니콤 모드에서는 지도가 읽기 전용으로 전환되어 노선 편집 및 경로 생성이 비활성화됩니다.'
                            : language === 'ja'
                                ? 'ドット/スクエア/ハニカム表示ではマップが読み取り専用になり、路線編集・経路生成が無効化されます。'
                                : 'Map editing and route generation are disabled in Dot/Square/Hex lattice view.'}
                    </p>
                </div>
            )}

            <div className="px-5 py-4">
                {/* Progress Card */}
                {(() => {
                    let totalKm = 0;
                    let visitedKm = 0;
                    Object.values(lineLengths).forEach((len) => {
                        totalKm += len as number;
                    });
                    Object.values(visitedLineLengths).forEach((len) => {
                        visitedKm += len as number;
                    });
                    const totalPercent = totalKm > 0 ? (visitedKm / totalKm) * 100 : 0;

                    return (
                        <div className="mb-4 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-md border border-slate-100 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t.totalProgress}</span>
                                <span className="text-sm font-black text-primary">{totalPercent.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                                <div
                                    className="bg-primary h-full rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${totalPercent}%` }}
                                />
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                                    {visitedKm.toLocaleString(undefined, { maximumFractionDigits: 1 })} / {totalKm.toLocaleString(undefined, { maximumFractionDigits: 1 })} KM
                                </p>
                                <p className="text-[10px] text-primary uppercase tracking-wider font-bold">
                                    {Object.keys(visitedLineLengths).length}{t.lines}
                                </p>
                            </div>
                        </div>
                    );
                })()}

                {/* Clear All Trips button & Confirmation dialog */}
                {recordedTrips.length > 0 && onResetTrips && (
                    <div className="mb-4">
                        {!isResetConfirming ? (
                            <button
                                onClick={() => setIsResetConfirming(true)}
                                disabled={isReadOnly}
                                className={`w-full px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${isMobile ? 'h-11' : 'py-2'} ${isReadOnly
                                    ? 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                    : 'border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-98'}`}
                            >
                                <span className="material-symbols-outlined text-sm">delete_forever</span>
                                {(t as any).clearAllTrips || '모든 여행 기록 초기화'}
                            </button>
                        ) : (
                            <div className="p-3 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/30 flex flex-col gap-2 animate-in fade-in duration-200">
                                <p className="text-xs font-bold text-red-700 dark:text-red-300 text-center">
                                    {(t as any).confirmClearTrips || '모든 여행 기록을 정말 삭제하시겠습니까?'}
                                </p>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                    <button
                                        onClick={() => {
                                            onResetTrips();
                                            setIsResetConfirming(false);
                                        }}
                                        className={`rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow transition-all active:scale-95 ${isMobile ? 'h-11' : 'py-1.5'}`}
                                    >
                                        {(t as any).yesDelete || '예, 초기화'}
                                    </button>
                                    <button
                                        onClick={() => setIsResetConfirming(false)}
                                        className={`rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all ${isMobile ? 'h-11' : 'py-1.5'}`}
                                    >
                                        {t.cancel || '취소'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Trip List */}
            <div className="flex-1 overflow-y-auto px-5 pb-6 custom-scrollbar">
                {displayTrips.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">route</span>
                        <p className="text-xs font-bold">{t.noTrips}</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {displayTrips.map((trip) => {
                            const dateStr = trip.createdAt ? new Date(trip.createdAt).toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            }) : '';

                            const startId = trip.startId || (trip.path && trip.path.length > 0 ? trip.path[0] : undefined);
                            const endId = trip.endId || (trip.path && trip.path.length > 0 ? trip.path[trip.path.length - 1] : undefined);

                            const startName = getStationDisplayName(trip.start, startId, railData, language);
                            const endName = getStationDisplayName(trip.end, endId, railData, language);

                            const titleText = startName && endName
                                ? `${startName} → ${endName}`
                                : (trip.name || `Trip #${trip.id.slice(-4)}`);

                            return (
                                <div
                                    key={trip.id}
                                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-all group relative"
                                >
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                                            <h3 className="font-bold text-xs text-slate-800 dark:text-white truncate">
                                                {titleText}
                                            </h3>
                                        </div>
                                        {onDeleteTrip && (
                                            <button
                                                onClick={() => !isReadOnly && onDeleteTrip(trip.id)}
                                                disabled={isReadOnly}
                                                className={`transition-colors rounded-lg flex items-center justify-center ${isMobile ? 'size-11 -mr-2' : 'p-1'} ${isReadOnly
                                                    ? 'text-slate-200 dark:text-slate-700 cursor-not-allowed'
                                                    : 'text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'}`}
                                                title={t.deleteTrip || '여행 삭제'}
                                            >
                                                <span className="material-symbols-outlined text-base">delete</span>
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                                        <span>{(trip.distance || 0).toFixed(1)} km · {(trip.sectionIds || []).length} {(t as any).sections || '구간'}</span>
                                        {dateStr && <span>{dateStr}</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyLinesPane;
