"use client";

import React, { useMemo } from 'react';
import { HistoryIcon, RouteIcon, TimelineIcon, LockIcon, TrashIcon, SidebarFrame, ProgressCard } from '@ppotal/ui';
import { RailData, Station } from '../types/railData';
import { useI18n } from '../lib/i18n-context';
import { getLocalizedName } from '../lib/i18n-utils';
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
    onOpenTimelineImport?: () => void;
    isReadOnly?: boolean;
    isMobile?: boolean;
    onClose?: () => void;
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
    onOpenRouteGenerator,
    isReadOnly = false,
    isMobile = false,
    onOpenTimelineImport,
    onClose,
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

    const progressData = useMemo(() => {
        let totalKm = 0;
        let visitedKm = 0;
        Object.values(lineLengths).forEach((len) => {
            totalKm += len as number;
        });
        Object.values(visitedLineLengths).forEach((len) => {
            visitedKm += len as number;
        });
        const percent = totalKm > 0 ? (visitedKm / totalKm) * 100 : 0;
        return { totalKm, visitedKm, percent };
    }, [lineLengths, visitedLineLengths]);

    return (
        <SidebarFrame
            className={className}
            icon={<HistoryIcon className="w-5 h-5 text-primary" />}
            title={t.title}
            subtitle={t.subtitle}
            onClose={onClose}
            headerExtra={
                <div className="space-y-3">
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        {onOpenRouteGenerator && (
                            <button
                                onClick={onOpenRouteGenerator}
                                disabled={isReadOnly}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-bold transition-all ${isMobile ? 'h-11' : 'py-2'} ${isReadOnly
                                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                                    : 'bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-95 cursor-pointer'}`}
                                title={isReadOnly ? (language === 'ko' ? '도트/스퀘어/허니콤 모드에서는 경로 생성이 비활성화됩니다.' : 'Route generator disabled in tile mode') : undefined}
                            >
                                <RouteIcon className="w-4 h-4" />
                                <span>{t.generateRoute || '경로 생성'}</span>
                            </button>
                        )}
                        {onOpenTimelineImport && (
                            <button
                                onClick={onOpenTimelineImport}
                                disabled={isReadOnly}
                                className={`flex items-center justify-center gap-1.5 px-3 rounded-xl border transition-all ${isMobile ? 'h-11' : 'py-2'} ${isReadOnly
                                    ? 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-primary hover:text-primary active:scale-95 cursor-pointer shadow-2xs'}`}
                                title={language === 'ko' ? 'Google 타임라인 가져오기' : language === 'ja' ? 'Google Timeline 読み込み' : 'Import Google Timeline'}
                            >
                                <TimelineIcon className="w-4 h-4" />
                                <span className="text-xs font-bold">Timeline</span>
                            </button>
                        )}
                    </div>

                    {/* Read-only banner in tile mode */}
                    {isReadOnly && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                            <LockIcon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 leading-snug">
                                {language === 'ko'
                                    ? '도트/스퀘어/허니콤 모드에서는 지도가 읽기 전용으로 전환되어 노선 편집 및 경로 생성이 비활성화됩니다.'
                                    : language === 'ja'
                                        ? 'ドット/スクエア/ハニカム表示ではマップが読み取り専用になり、路線編集・経路生成が無効化されます。'
                                        : 'Map editing and route generation are disabled in Dot/Square/Hex lattice view.'}
                            </p>
                        </div>
                    )}

                    {/* Progress Card */}
                    <ProgressCard
                        label={t.totalProgress}
                        percent={progressData.percent}
                    >
                        <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                            <span>{progressData.visitedKm.toFixed(1)} km</span>
                            <span className="text-slate-400 dark:text-slate-500">/ {progressData.totalKm.toFixed(1)} km</span>
                        </div>
                    </ProgressCard>

                    {/* Clear All Trips button & Confirmation dialog */}
                    {recordedTrips.length > 0 && onResetTrips && (
                        <div>
                            {!isResetConfirming ? (
                                <button
                                    onClick={() => !isReadOnly && setIsResetConfirming(true)}
                                    disabled={isReadOnly}
                                    className={`w-full flex items-center justify-center gap-1.5 rounded-xl border text-xs font-bold transition-all ${isMobile ? 'h-11' : 'py-2'} ${isReadOnly
                                        ? 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                        : 'border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-98 cursor-pointer'}`}
                                >
                                    <TrashIcon className="w-3.5 h-3.5" />
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
                                            className={`rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow transition-all active:scale-95 cursor-pointer ${isMobile ? 'h-11' : 'py-1.5'}`}
                                        >
                                            {(t as any).yesDelete || '예, 초기화'}
                                        </button>
                                        <button
                                            onClick={() => setIsResetConfirming(false)}
                                            className={`rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all active:scale-95 cursor-pointer ${isMobile ? 'h-11' : 'py-1.5'}`}
                                        >
                                            {(t as any).cancel || '취소'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            }
        >
            {displayTrips.length === 0 ? (
                <div className="text-center py-12 px-4">
                    <p className="text-sm font-bold text-slate-400 dark:text-slate-500 mb-1">{t.noTrips}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-600">지도를 드래그하여 첫 탑승 경로를 기록해보세요!</p>
                </div>
            ) : (
                <div className="space-y-2 pb-8">
                    {displayTrips.map((trip) => {
                        const startName = getStationDisplayName(trip.start, trip.startId, railData, language);
                        const endName = getStationDisplayName(trip.end, trip.endId, railData, language);
                        const isRoundTrip = trip.startId === trip.endId && trip.sectionIds && trip.sectionIds.length > 2;

                        return (
                            <div
                                key={trip.id}
                                className="group relative bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col gap-1.5"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                            {isRoundTrip ? `${startName} (순환)` : `${startName} → ${endName}`}
                                        </h4>
                                    </div>
                                    {onDeleteTrip && (
                                        <button
                                            onClick={() => onDeleteTrip(trip.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded-md transition-all cursor-pointer"
                                            title="삭제"
                                        >
                                            <TrashIcon className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-semibold px-0.5">
                                    <span>{trip.distance ? `${trip.distance.toFixed(1)} km` : ''} · {trip.sectionIds?.length || 0}구간</span>
                                    <span>{trip.createdAt ? new Date(trip.createdAt).toLocaleDateString(language === 'ko' ? 'ko-KR' : 'ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </SidebarFrame>
    );
};

export default MyLinesPane;
