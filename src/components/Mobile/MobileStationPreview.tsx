import React from 'react';

import { getLineColor } from '../../lib/lineColors';
import { RailData, Station } from '../../types/railData';

export interface MobileStationPreviewProps {
    station: Station;
    lines: string[]; // List of line IDs (Company::LineName)
    onLineClick?: (lineId: string) => void;
    railData: RailData | null;
    isTripInProgress?: boolean;
    tripStartStationId?: string | null;
    onStartTrip?: (station: Station) => void;
    onEndTrip?: (station: Station) => void;
    onCancel?: () => void;
}

interface RegionNames {
    adm1: Record<string, { shapeName: string; shapeName_en?: string }>;
    adm2: Record<string, { shapeName: string; shapeName_en?: string }>;
}

const MobileStationPreview: React.FC<MobileStationPreviewProps> = ({
    station,
    lines,
    onLineClick,
    railData,
    isTripInProgress = false,
    tripStartStationId = null,
    onStartTrip,
    onEndTrip,
    onCancel
}) => {
    const [regionNames, setRegionNames] = React.useState<RegionNames | null>(null);

    React.useEffect(() => {
        fetch('/data/region_names.json')
            .then(res => res.json())
            .then(data => setRegionNames(data))
            .catch(err => console.error("Failed to load region names:", err));
    }, []);

    const prefecture = station.prefecture_id && regionNames ? regionNames.adm1[station.prefecture_id] : null;
    const prefectureName = prefecture?.shapeName || '';
    const city = station.city_id && regionNames ? regionNames.adm2[station.city_id] : null;
    const cityName = city?.shapeName || '';

    const prefectureNameEn = prefecture?.shapeName_en || '';
    const cityNameEn = city?.shapeName_en || '';

    return (
        <div className="mx-2 my-1 px-4 py-3.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[24px] border border-white/40 dark:border-slate-800/50 shadow-lg animate-in slide-in-from-top duration-300 flex flex-col gap-3">
            {/* Header: Name and Trip Control */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="text-lg font-black text-slate-900 dark:text-white truncate">
                            {station.name}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 italic uppercase truncate">
                            {station.name_en}
                        </span>
                    </div>

                    {(prefectureName || cityName) && (
                        <div className="flex items-center gap-1 mt-0.5 text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">
                            <span className="material-symbols-outlined text-[10px]">map</span>
                            {prefectureName} {cityName}
                            <span className="mx-0.5 opacity-30">|</span>
                            <span className="truncate opacity-75">{prefectureNameEn}{prefectureNameEn && cityNameEn ? ', ' : ''}{cityNameEn}</span>
                        </div>
                    )}
                </div>

                {/* Trip Toggle Section: Top Right */}
                <div className="flex-shrink-0">
                    {!isTripInProgress ? (
                        <button
                            onClick={() => onStartTrip && onStartTrip(station)}
                            className="px-3 py-1.5 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-xs">play_arrow</span>
                            Start
                        </button>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            {tripStartStationId !== station.id && (
                                <button
                                    onClick={() => onEndTrip && onEndTrip(station)}
                                    className="px-3 py-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-xs">flag</span>
                                    Arr
                                </button>
                            )}
                            <button
                                onClick={() => onCancel && onCancel()}
                                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center active:scale-95 transition-all"
                            >
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Lines List: Vertical List */}
            <div className="flex flex-col gap-1.5 px-0.5 max-h-[160px] overflow-y-auto no-scrollbar">
                {lines.map(lineId => {
                    const [company, line] = lineId.split('::');
                    const companyInfo = railData?.companies[company];
                    const lineInfo = railData?.lines[line];
                    const color = lineInfo?.color || getLineColor(lineId, railData) || '#999';

                    return (
                        <div
                            key={lineId}
                            onClick={() => onLineClick && onLineClick(lineId)}
                            className="flex items-center gap-3 bg-slate-50/50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800/50 active:scale-[0.98] transition-all"
                            style={{ borderLeft: `3px solid ${color}` }}
                        >
                            <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xs font-black text-slate-800 dark:text-white truncate">
                                        {lineInfo?.name || line}
                                    </span>
                                    {lineInfo?.name_en && (
                                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 italic truncate uppercase">
                                            {lineInfo.name_en}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate tracking-tight">
                                        {companyInfo?.name || company}
                                    </span>
                                    {companyInfo?.name_en && (
                                        <span className="text-[8px] font-medium text-slate-400 dark:text-slate-600 truncate uppercase">
                                            {companyInfo.name_en}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <span className="material-symbols-outlined text-slate-300 text-sm">chevron_right</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MobileStationPreview;
