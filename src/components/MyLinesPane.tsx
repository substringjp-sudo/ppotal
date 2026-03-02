"use client";

import React, { useMemo } from 'react';
import { RailData, Station, Line, Section, Company } from '../types/railData';
import { useI18n } from '../lib/i18n-context';
import { getLocalizedName, getLocalizedRegion } from '../lib/i18n-utils';
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
}

interface RegionNames {
    adm1: Record<string, { name: string; name_en?: string; name_kr?: string }>;
    adm2: Record<string, { name: string; name_en?: string; name_kr?: string }>;
}

const MyLinesPane: React.FC<MyLinesPaneProps> = ({
    recordedTrips = [],
    onDeleteTrip,
    onResetTrips,
    railData,
    lineLengths = {},
    visitedLineLengths = {},
    className
}) => {
    const { language } = useI18n();
    const t = getTranslations(MY_LINES_TRANSLATIONS, language);
    const [regionNames, setRegionNames] = React.useState<RegionNames | null>(null);
    const [isResetConfirming, setIsResetConfirming] = React.useState(false);

    React.useEffect(() => {
        // Reset confirming state if recorded trips become zero
        if (recordedTrips.length === 0) {
            setIsResetConfirming(false);
        }
    }, [recordedTrips.length]);

    React.useEffect(() => {
        fetch('/data/region_names.json')
            .then(res => res.json())
            .then(data => setRegionNames(data))
            .catch(err => console.error("Failed to load region names:", err));
    }, []);

    const displayTrips = useMemo(() => {
        return [...(recordedTrips || [])].reverse();
    }, [recordedTrips]);


    return (
        <div className={`flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden font-display ${className || ""}`}>
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">history</span>
                    {t.title}
                </h2>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-tight font-semibold">{t.subtitle}</p>
            </div>

            <div className="px-5 py-4">
                {/* Progress Card (Moved from Sidebar) */}
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
                        <div className="mb-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
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

                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-slate-800 dark:text-slate-100">
                            {recordedTrips.length}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                            {language === 'en' ? (recordedTrips.length !== 1 ? t.tripRecord + 's' : t.tripRecord) : t.tripRecord}
                        </span>
                    </div>
                    {recordedTrips.length > 0 && (
                        <div className="flex items-center">
                            {isResetConfirming ? (
                                <div className="flex items-center gap-2 animate-in slide-in-from-right-2 fade-in duration-200">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            setIsResetConfirming(false);
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onMouseUp={(e) => e.stopPropagation()}
                                        className="px-2 py-1 rounded-lg text-[9px] font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        {t.cancel}
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            onResetTrips && onResetTrips();
                                            setIsResetConfirming(false);
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onMouseUp={(e) => e.stopPropagation()}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                                    >
                                        {t.confirm}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setIsResetConfirming(true);
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onMouseUp={(e) => e.stopPropagation()}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-rose-500 hover:text-white hover:bg-rose-500 border border-rose-100 dark:border-rose-900/10 transition-all duration-200 active:scale-95 shadow-sm active:bg-rose-600 group/reset"
                                >
                                    <span className="material-symbols-outlined !text-[13px] group-hover/reset:rotate-12 transition-transform">delete_sweep</span>
                                    {t.deleteAll}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {displayTrips.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center px-8">
                        <div className="size-16 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 !text-3xl">route</span>
                        </div>
                        <p className="text-sm font-bold text-slate-400 dark:text-slate-500">
                            {t.noTrips}
                        </p>
                        <p className="text-[11px] text-slate-400/70 mt-1 uppercase tracking-wider">
                            {t.dragToRecord}
                        </p>
                    </div>
                ) : (
                    displayTrips.map(trip => {
                        const startStation = ((trip.startId && railData) ? railData.stations[trip.startId] : undefined) || (railData ? railData.stations[trip.start] : undefined);
                        const endStation = ((trip.endId && railData) ? railData.stations[trip.endId] : undefined) || (railData ? railData.stations[trip.end] : undefined);

                        const getStationFullInfo = (station: (Station & { lines?: string[] }) | undefined, id: string) => {
                            if (!station) return {
                                nameJa: id, nameSub: '', companyJa: 'Unknown', companySub: '',
                                lineJa: 'Unknown', lineSub: '', lineColor: '#primary',
                                prefJa: '', prefSub: '', cityJa: '', citySub: ''
                            };

                            let compId = '';
                            let lineId = '';

                            if (station.lines && station.lines.length > 0) {
                                const firstLineId = station.lines[0];
                                const parts = firstLineId?.split('::') || [];
                                compId = parts[0] || '';
                                lineId = parts[1] || '';
                            } else if (station.platform_ids && station.platform_ids.length > 0) {
                                const platform = railData?.platforms?.[station.platform_ids[0]];
                                if (platform) {
                                    compId = (platform.company !== undefined && platform.company !== null) ? platform.company.toString() : '';
                                    lineId = (platform.line !== undefined && platform.line !== null) ? platform.line.toString() : '';
                                }
                            }

                            const comp = compId !== '' ? (railData?.companies as Record<string, Company>)?.[compId] : null;
                            const line = lineId !== '' ? (railData?.lines as Record<string, Line>)?.[lineId] : null;

                            const prefLoc = getLocalizedRegion(station.prefecture_id, 'adm1', regionNames, language);
                            const cityLoc = getLocalizedRegion(station.city_id, 'adm2', regionNames, language);

                            return {
                                nameJa: getLocalizedName(station, language),
                                nameSub: language !== 'ja' ? station.name : '',
                                companyJa: comp ? getLocalizedName(comp, language) : (compId || 'Unknown'),
                                companySub: (language !== 'ja' && comp?.name) ? comp.name : '',
                                lineJa: line ? getLocalizedName(line, language) : (lineId || 'Unknown'),
                                lineSub: (language !== 'ja' && line?.name) ? line.name : '',
                                lineColor: line?.color || '#3b82f6',
                                prefJa: prefLoc.primary,
                                prefSub: prefLoc.sub,
                                cityJa: cityLoc.primary,
                                citySub: cityLoc.sub
                            };
                        };

                        const startInfo = getStationFullInfo(startStation, trip.start);
                        const endInfo = getStationFullInfo(endStation, trip.end);

                        const linesUsedMap = new Map<number, { ja: string, sub: string, color: string }>();
                        trip.sectionIds?.forEach((sid: number) => {
                            const section = railData?.sections?.sections?.find((s: Section) => s.id === sid);
                            if (section) {
                                const lData = railData?.lines[section.line_id];
                                if (!linesUsedMap.has(section.line_id)) {
                                    linesUsedMap.set(section.line_id, {
                                        ja: getLocalizedName(lData, language),
                                        sub: language !== 'ja' ? lData?.name || '' : '',
                                        color: lData?.color || '#3b82f6'
                                    });
                                }
                            }
                        });
                        const linesUsed = Array.from(linesUsedMap.values());

                        return (
                            <div
                                key={trip.id}
                                className="group relative bg-white dark:bg-slate-800/40 rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800/50 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden"
                            >
                                {/* Connection Line (Dotted) */}
                                <div
                                    className="absolute left-[38px] top-[38px] bottom-[145px] w-0.5 border-l-2 border-dashed border-slate-200 dark:border-slate-700/50 pointer-events-none z-0"
                                    style={{
                                        // Dynamic adjustment if possible, but 145px is a better estimate for the footer offset
                                        maskImage: 'linear-gradient(to bottom, transparent 15px, black 25px, black calc(100% - 25px), transparent calc(100% - 15px))',
                                        WebkitMaskImage: 'linear-gradient(to bottom, transparent 15px, black 30px, black calc(100% - 30px), transparent calc(100% - 15px))'
                                    }}
                                ></div>

                                {/* Start Station */}
                                <div className="relative z-10 flex gap-4 mb-6">
                                    <div className="size-9 rounded-full bg-white dark:bg-slate-900 border-2 border-primary shadow-[0_0_10px_rgba(28,116,233,0.3)] flex items-center justify-center shrink-0">
                                        <div className="size-2 bg-primary rounded-full"></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between mb-1">
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[10px] font-black text-primary uppercase tracking-wider truncate" title={startInfo.lineJa}>
                                                    {startInfo.lineJa}
                                                </span>
                                                {startInfo.lineSub && (
                                                    <span className="text-[8px] font-bold text-primary/60 uppercase tracking-tight truncate leading-none mt-0.5" title={startInfo.lineSub}>
                                                        {startInfo.lineSub}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end shrink-0 ml-2">
                                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                                                    {startInfo.prefJa} {startInfo.cityJa}
                                                </span>
                                                {(startInfo.prefSub || startInfo.citySub) && (
                                                    <span className="text-[7px] font-bold text-slate-400/50 uppercase tracking-tighter leading-none mt-0.5">
                                                        {startInfo.prefSub} {startInfo.citySub}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <h3 className="text-base font-black text-slate-800 dark:text-slate-100 truncate">
                                            {startInfo.nameJa}
                                        </h3>
                                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                            {startInfo.nameSub}
                                        </p>
                                    </div>
                                </div>

                                {/* Intermediate Info */}
                                <div className="relative z-10 pl-[52px] mb-6">
                                    <div className="flex flex-col gap-2">
                                        {linesUsed.map((line, idx) => (
                                            <div key={idx} className="flex items-center gap-2 min-w-0">
                                                <div className="w-2.5 h-0.5 rounded-full shrink-0" style={{ backgroundColor: line.color }}></div>
                                                <div className="flex items-baseline gap-1.5 min-w-0 overflow-hidden">
                                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate" title={line.ja}>
                                                        {line.ja}
                                                    </span>
                                                    {line.sub && (
                                                        <span className="text-[9px] font-bold text-slate-400 opacity-60 truncate" title={line.sub}>
                                                            {line.sub}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {trip.path.length > 2 && (
                                            <div className="flex items-center gap-1.5 opacity-60">
                                                <span className="material-symbols-outlined !text-[14px] text-slate-400">more_vert</span>
                                                <span className="text-[10px] font-bold text-slate-400 tracking-wider">
                                                    {trip.path.length - 2} {t.stations}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* End Station */}
                                <div className="relative z-10 flex gap-4 mb-5">
                                    <div className="size-9 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center shrink-0">
                                        <div className="size-2 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between mb-1">
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate" title={endInfo.lineJa}>
                                                    {endInfo.lineJa}
                                                </span>
                                                {endInfo.lineSub && (
                                                    <span className="text-[8px] font-bold text-slate-400/60 uppercase tracking-tight truncate leading-none mt-0.5" title={endInfo.lineSub}>
                                                        {endInfo.lineSub}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end shrink-0 ml-2">
                                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                                                    {endInfo.prefJa} {endInfo.cityJa}
                                                </span>
                                                {(endInfo.prefSub || endInfo.citySub) && (
                                                    <span className="text-[7px] font-bold text-slate-400/50 uppercase tracking-tighter leading-none mt-0.5">
                                                        {endInfo.prefSub} {endInfo.citySub}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <h3 className="text-base font-black text-slate-800 dark:text-slate-100 truncate">
                                            {endInfo.nameJa}
                                        </h3>
                                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                            {endInfo.nameSub}
                                        </p>
                                    </div>
                                </div>

                                {/* Card Footer */}
                                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/50">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
                                            <span className="material-symbols-outlined !text-[14px] text-primary">distance</span>
                                            <span className="text-[11px] font-black text-slate-800 dark:text-slate-200">
                                                {Math.round(trip.distance * 10) / 10}
                                                <span className="text-[9px] text-slate-400 ml-0.5 font-bold uppercase">km</span>
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onDeleteTrip && onDeleteTrip(trip.id)}
                                        className="size-8 rounded-lg flex items-center justify-center text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all active:scale-90 border border-transparent hover:border-rose-200"
                                        title={t.deleteTrip}
                                    >
                                        <span className="material-symbols-outlined !text-[20px]">delete</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

MyLinesPane.displayName = 'MyLinesPane';
export default React.memo(MyLinesPane);
