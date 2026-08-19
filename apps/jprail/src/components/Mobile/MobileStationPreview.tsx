import React from 'react';

import { getLineColor } from '../../lib/lineColors';
import { RailData, Station } from '../../types/railData';
import { useI18n } from '../../lib/i18n-context';
import { getLocalizedName, getLocalizedAddress } from '../../lib/i18n-utils';
import { useRegionNames } from '../../hooks/useRegionNames';

import { MOBILE_STATION_PREVIEW_TRANSLATIONS, getTranslations } from '../../lib/translations';


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
    /**
     * Rendered inside the bottom sheet rather than as a floating card. The
     * sheet already provides the surface, the title and the scroll, so the
     * card's own chrome and height cap would only fight it.
     */
    inSheet?: boolean;
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
    onCancel,
    inSheet = false
}) => {
    const { language } = useI18n();
    const t = getTranslations(MOBILE_STATION_PREVIEW_TRANSLATIONS, language);
    const regionNames = useRegionNames();

    const address = getLocalizedAddress(station.prefecture_id, station.city_id, regionNames, language);
    const stationName = getLocalizedName(station, language);
    const stationNameSecondary = language === 'ja' ? station.name_en : station.name;

    return (
        <div className={inSheet
            ? "flex flex-col gap-3"
            : "mx-2 my-1 px-4 py-3.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[24px] border border-white/40 dark:border-slate-800/50 shadow-lg animate-in slide-in-from-top duration-300 flex flex-col gap-3"}>
            {/* Header: Name and Trip Control. In the sheet the name is already
                in the sheet's own header, so only the trip control repeats. */}
            <div className="flex items-center justify-between gap-2">
                {!inSheet && (
                <div className="flex flex-col min-w-0 flex-1">
                    {true && (
                    <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="text-lg font-black text-slate-900 dark:text-white truncate">
                            {stationName}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 italic uppercase truncate">
                            {stationNameSecondary}
                        </span>
                    </div>
                    )}

                    {address && (
                        <div className="flex items-center gap-1 mt-0.5 text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">
                            <span className="material-symbols-outlined text-[10px]">map</span>
                            {address}
                        </div>
                    )}
                </div>
                )}

                {/* Trip Toggle Section: Top Right */}
                <div className={inSheet ? 'flex-1' : 'flex-shrink-0'}>
                    {!isTripInProgress ? (
                        <button
                            onClick={() => onStartTrip && onStartTrip(station)}
                            className={`px-4 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center gap-1 ${inSheet ? 'h-12 w-full justify-center' : 'py-1.5'}`}
                        >
                            <span className="material-symbols-outlined text-xs">play_arrow</span>
                            {t.start}
                        </button>
                    ) : (
                        <div className={`flex items-center gap-1.5 ${inSheet ? 'w-full' : ''}`}>
                            {tripStartStationId !== station.id && (
                                <button
                                    onClick={() => onEndTrip && onEndTrip(station)}
                                    className={`px-4 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1 ${inSheet ? 'h-12 flex-1 justify-center' : 'py-1.5'}`}
                                >
                                    <span className="material-symbols-outlined text-xs">flag</span>
                                    {t.arr}
                                </button>
                            )}
                            <button
                                onClick={() => onCancel && onCancel()}
                                className={`rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center active:scale-95 transition-all ${inSheet ? 'w-11 h-11' : 'w-7 h-7'}`}
                            >
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Lines List: Vertical List */}
            <div className={inSheet
                ? "flex flex-col gap-1.5 px-0.5"
                : "flex flex-col gap-1.5 px-0.5 max-h-[160px] overflow-y-auto no-scrollbar"}>
                {lines.map(lineId => {
                    const [company, line] = lineId.split('::');
                    const companyInfo = railData?.companies[company];
                    const lineInfo = railData?.lines[line];
                    const color = lineInfo?.color || getLineColor(lineId, railData) || '#999';

                    return (
                        <div
                            key={lineId}
                            onClick={() => onLineClick && onLineClick(lineId)}
                            className={`flex items-center gap-3 bg-slate-50/50 dark:bg-slate-800/40 px-2 rounded-xl border border-slate-100 dark:border-slate-800/50 active:scale-[0.98] transition-all cursor-pointer ${inSheet ? 'min-h-[56px] py-2' : 'p-2'}`}
                            style={{ borderLeft: `3px solid ${color}` }}
                        >
                            <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xs font-black text-slate-800 dark:text-white truncate">
                                        {getLocalizedName(lineInfo, language) || line}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 italic truncate uppercase">
                                        {language === 'ja' ? lineInfo?.name_en : lineInfo?.name}
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate tracking-tight">
                                        {getLocalizedName(companyInfo, language) || company}
                                    </span>
                                    <span className="text-[8px] font-medium text-slate-400 dark:text-slate-600 truncate uppercase">
                                        {language === 'ja' ? companyInfo?.name_en : companyInfo?.name}
                                    </span>
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
