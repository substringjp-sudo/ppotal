import React, { useEffect, useState } from 'react';
import styles from './StationDetailPane.module.css';
import { Station, RailData, Platform } from '../types/railData';
import { getLineColor } from '../lib/lineColors';
import { useI18n } from '../lib/i18n-context';
import { getLocalizedName, getLocalizedAddress, RegionNames } from '../lib/i18n-utils';

const TRANSLATIONS = {
  ko: {
    arr: '도착',
    cancel: '취소',
    start: '시작',
    platform: '번 승강장',
  },
  en: {
    arr: 'Arr',
    cancel: 'Cancel',
    start: 'Start',
    platform: ' Platform',
  },
  ja: {
    arr: '到着',
    cancel: 'キャンセル',
    start: '開始',
    platform: '番線',
  }
};

export interface StationDetailPaneProps {
  station: Station;
  railData: RailData;
  onClose: () => void;
  isTripInProgress: boolean;
  tripStartStationId: string | null;
  onStartTrip: (station: Station) => void;
  onEndTrip: (station: Station) => void;
  onCancel?: () => void;
}


const StationDetailPane: React.FC<StationDetailPaneProps> = ({
  station,
  railData,
  onClose,
  isTripInProgress,
  tripStartStationId,
  onStartTrip,
  onEndTrip,
  onCancel
}) => {
  const { isKorean, isJapanese, language } = useI18n();
  const t = TRANSLATIONS[language as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;
  const [regionNames, setRegionNames] = useState<RegionNames | null>(null);

  useEffect(() => {
    fetch('/data/region_names.json')
      .then(res => res.json())
      .then(data => setRegionNames(data))
      .catch(err => console.error("Failed to load region names:", err));
  }, []);

  const localizedAddress = getLocalizedAddress(station.prefecture_id, station.city_id, regionNames, language);

  const { stations, platforms, lines, companies } = railData || { stations: {}, platforms: {}, lines: {}, companies: {} };

  if (!railData) return null;

  const sortedStationPlatforms = station.platform_ids
    .map(pid => ({ ...platforms[pid], pid }))
    .filter(p => p && lines[p.line])
    .sort((a, b) => {
      const lineA = lines[a.line];
      const lineB = lines[b.line];
      if (!lineA || !lineB) return 0;
      if (lineA.corp_id !== lineB.corp_id) {
        return (lineA.corp_id as number) - (lineB.corp_id as number);
      }
      return (a.line as number) - (b.line as number);
    });

  const getDirectionalNeighbors = (platform: Platform & { pid: string }) => {
    const left: { station: Station; ratio: number; skippedCount: number }[] = [];
    const right: { station: Station; ratio: number; skippedCount: number }[] = [];
    const currentStation = station;

    const railroadGraph = railData.railroadGraph;
    if (!railroadGraph || !railroadGraph.platformGraph) return { left, right };

    // Try primary lookup by unique platform ID (pid), fallback to platform code
    const platformConnections = railroadGraph.platformGraph[currentStation.id]?.[platform.pid] ||
      railroadGraph.platformGraph[currentStation.id]?.[platform.code] || [];

    const totalPoints = platform.geometries && platform.geometries[0] ? platform.geometries[0].length : 2;

    for (const conn of platformConnections) {
      const ratio = totalPoints > 1 ? conn.point_index / (totalPoints - 1) : 0.5;
      for (const neighborInfo of conn.neighbors) {
        const neighborId = neighborInfo.station_id;
        const neighborStation = stations[neighborId];
        if (!neighborStation) continue;

        const entry = {
          station: neighborStation,
          ratio,
          skippedCount: neighborInfo.skipped?.length || 0
        };

        if (ratio <= 0.5) {
          if (!left.find(e => e.station.id === neighborStation.id)) {
            left.push(entry);
          }
        } else {
          if (!right.find(e => e.station.id === neighborStation.id)) {
            right.push(entry);
          }
        }
      }
    }
    return { left, right };
  };

  const formatColor = (colorStr: string | undefined): string | null => {
    if (!colorStr) return null;
    const sanitizedColor = colorStr.startsWith('#') ? colorStr.substring(1) : colorStr;
    if (/^[0-9a-fA-F]{6}$/.test(sanitizedColor)) {
      return `#${sanitizedColor}`;
    }
    return null;
  }

  const getPlatformWidth = (p: Platform) => {
    // 100m = 8 units in our 100-unit viewBox
    // typical platform is 100-200m -> 8-16 units
    // shinkansen is 400m -> 32 units
    const length = p.length || 150;
    const width = Math.min(60, length * 0.08);
    return Math.max(8, width); // Minimum width to be visible
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 max-h-[50vh] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-slate-200 dark:border-slate-800 z-[1100] flex flex-col shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.15)] rounded-t-[32px] animate-in slide-in-from-bottom duration-500 ease-out font-display">
      {/* Premium Header Section */}
      <div className="flex-shrink-0 px-3 sm:px-6 py-3 sm:py-5 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800/50 rounded-t-[24px] sm:rounded-t-[32px] flex flex-row items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-5 min-w-0 flex-1">
          <div className="size-8 sm:size-12 rounded-lg sm:rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
            <span className="material-symbols-outlined text-lg sm:text-2xl">location_on</span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-tight tracking-tight truncate max-w-[120px] sm:max-w-none">
                {language === 'ja' ? station.name : getLocalizedName(station, language)}
              </h2>
              {language !== 'ja' && (
                <span className="text-[10px] sm:text-sm font-bold text-slate-400 dark:text-slate-500 italic uppercase tracking-wider truncate max-w-[80px] sm:max-w-none">
                  {station.name}
                </span>
              )}

              {/* Trip Buttons - Moved next to name for mobile accessibility */}
              <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                {isTripInProgress ? (
                  <div className="flex items-center gap-1.5">
                    {station.id !== tripStartStationId && (
                      <button
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[8px] sm:text-[10px] shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-1"
                        onClick={() => onEndTrip(station)}
                      >
                        <span className="material-symbols-outlined text-[10px]">flag</span>
                        {t.arr}
                      </button>
                    )}
                    <button
                      className="px-2 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black uppercase tracking-widest text-[8px] sm:text-[10px] hover:bg-slate-300 dark:hover:bg-slate-600 transition-all active:scale-95"
                      onClick={() => onCancel && onCancel()}
                    >
                      <span className="material-symbols-outlined text-[10px] sm:hidden">close</span>
                      <span className="hidden sm:inline">{t.cancel}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    className="px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[8px] sm:text-[10px] shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-1.5 group"
                    onClick={() => onStartTrip(station)}
                  >
                    <span className="material-symbols-outlined text-[10px]">play_arrow</span>
                    {t.start}
                  </button>
                )}
              </div>
            </div>
            {regionNames && (
              <div className="flex items-center gap-1 mt-1 text-[9px] sm:text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">
                <span className="material-symbols-outlined text-[10px] sm:text-xs">map</span>
                <span className="text-slate-400 dark:text-slate-500 truncate">
                  {localizedAddress}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center active:scale-90"
          >
            <span className="material-symbols-outlined text-xl sm:text-2xl">close</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-950/20">
        <div className="max-w-5xl mx-auto p-6 space-y-8">
          {sortedStationPlatforms.map((p, index) => {
            const line = lines[p.line];
            if (!line) return null;

            const finalColor = line.color || getLineColor(`${line.corp_id}::${p.line}`, railData) || '#3498db';

            const { left, right } = getDirectionalNeighbors(p);
            const maxNeighbors = Math.max(left.length, right.length);
            const rowHeight = Math.max(160, maxNeighbors * 70 + 80);

            // Ordinal number helper
            const getOrdinal = (n: number) => {
              if (language === 'en') {
                const s = ["th", "st", "nd", "rd"];
                const v = n % 100;
                return n + (s[(v - 20) % 10] || s[v] || s[0]) + t.platform;
              }
              return n + t.platform;
            };

            return (
              <div key={p.pid} className="group/row relative w-full rounded-3xl bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 p-6 transition-all hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-black/30" style={{ height: rowHeight }}>

                {/* Section Title Header: Top Left */}
                <div className="absolute top-0 left-0 right-0 h-10 flex items-center px-6 border-b border-slate-50 dark:border-slate-800/50">
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {getOrdinal(index + 1)}
                    </span>
                    <div className="w-1 h-3 rounded-full" style={{ backgroundColor: finalColor }}></div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-black text-slate-800 dark:text-white tracking-tight leading-none">
                        {line.name}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 italic leading-none">
                        {isKorean ? line.name_kr || line.name_en : line.name_en}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Left Side: Next Stations */}
                <div className="absolute top-[calc(50%+12px)] -translate-y-1/2 left-6 w-[110px] md:w-[140px] space-y-3 z-10 pointer-events-none">
                  {left.map((entry, i) => {
                    const yOffset = (i - (left.length - 1) / 2) * 70;
                    return (
                      <div
                        key={entry.station.id}
                        className="absolute left-0 w-full pointer-events-auto transition-transform hover:scale-105"
                        style={{ top: '50%', transform: `translateY(calc(-50% + ${yOffset}px))` }}
                      >
                        <div className="group/card flex flex-col bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl p-2.5 shadow-sm hover:shadow-md transition-all">
                          <div className="flex items-center justify-between mb-0.5 min-w-0">
                            <span className="text-[11px] font-black text-slate-800 dark:text-white truncate leading-tight">{entry.station.name}</span>
                            {entry.skippedCount > 0 && (
                              <span className="text-[7px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full font-black text-slate-500 ml-1">
                                +{entry.skippedCount}
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 truncate uppercase tracking-tight italic leading-none">
                            {isKorean ? entry.station.name_kr || entry.station.name_en : entry.station.name_en}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Right Side: Next Stations */}
                <div className="absolute top-[calc(50%+12px)] -translate-y-1/2 right-6 w-[110px] md:w-[140px] space-y-3 z-10 pointer-events-none">
                  {right.map((entry, i) => {
                    const yOffset = (i - (right.length - 1) / 2) * 70;
                    return (
                      <div
                        key={entry.station.id}
                        className="absolute right-0 w-full pointer-events-auto transition-transform hover:scale-105"
                        style={{ top: '50%', transform: `translateY(calc(-50% + ${yOffset}px))` }}
                      >
                        <div className="group/card flex flex-col items-end text-right bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl p-2.5 shadow-sm hover:shadow-md transition-all">
                          <div className="flex items-center justify-end mb-0.5 min-w-0 w-full">
                            {entry.skippedCount > 0 && (
                              <span className="text-[7px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full font-black text-slate-500 mr-1">
                                +{entry.skippedCount}
                              </span>
                            )}
                            <span className="text-[11px] font-black text-slate-800 dark:text-white truncate leading-tight">{entry.station.name}</span>
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 truncate uppercase tracking-tight italic leading-none">
                            {isKorean ? entry.station.name_kr || entry.station.name_en : entry.station.name_en}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Connection SVG */}
                <div className="absolute top-[20px] left-0 right-0 bottom-0 z-0">
                  <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
                    {(() => {
                      // Internal coordinate adjustments to account for header offset
                      const dotLX = 150;
                      const dotRX = 850;
                      const baseWidth = getPlatformWidth(p) * 4;
                      const pWidth = Math.max(120, baseWidth);
                      const pStartX = 500 - pWidth / 2;
                      const pEndX = 500 + pWidth / 2;
                      const centerY = 500;

                      return (
                        <>
                          {left.map((entry, i) => {
                            const y = centerY + (i - (left.length - 1) / 2) * 110;
                            const connX = pStartX + entry.ratio * pWidth;
                            const handle = (connX - dotLX) * 0.4;
                            const d = `M ${connX},${centerY} C ${connX - handle},${centerY} ${dotLX + handle},${y} ${dotLX},${y}`;
                            return (
                              <g key={entry.station.id}>
                                <path
                                  d={d}
                                  stroke={finalColor}
                                  strokeWidth="2.5"
                                  fill="none"
                                  className="opacity-20 transition-all group-hover/row:opacity-100"
                                  strokeDasharray={entry.skippedCount > 0 ? "8 6" : "none"}
                                />
                                <circle cx={dotLX} cy={y} r="4.5" className="fill-white dark:fill-slate-900" stroke={finalColor} strokeWidth="2" />
                              </g>
                            );
                          })}

                          {right.map((entry, i) => {
                            const y = centerY + (i - (right.length - 1) / 2) * 110;
                            const connX = pStartX + entry.ratio * pWidth;
                            const handle = (dotRX - connX) * 0.4;
                            const d = `M ${connX},${centerY} C ${connX + handle},${centerY} ${dotRX - handle},${y} ${dotRX},${y}`;
                            return (
                              <g key={entry.station.id}>
                                <path
                                  d={d}
                                  stroke={finalColor}
                                  strokeWidth="2.5"
                                  fill="none"
                                  className="opacity-20 transition-all group-hover/row:opacity-100"
                                  strokeDasharray={entry.skippedCount > 0 ? "8 6" : "none"}
                                />
                                <circle cx={dotRX} cy={y} r="4.5" className="fill-white dark:fill-slate-900" stroke={finalColor} strokeWidth="2" />
                              </g>
                            );
                          })}

                          {/* Center Platform Bar */}
                          <rect
                            x={pStartX}
                            y={centerY - 15}
                            width={pWidth}
                            height={30}
                            rx={15}
                            className="fill-white dark:fill-slate-800 shadow-xl shadow-black/10"
                            stroke={finalColor}
                            strokeWidth="4"
                          />
                          {/* Inner Platform Decoration */}
                          <rect
                            x={pStartX + 8}
                            y={centerY - 4}
                            width={pWidth - 16}
                            height={8}
                            rx={4}
                            fill={finalColor}
                            opacity="0.15"
                          />
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StationDetailPane;
