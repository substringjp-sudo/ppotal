import React, { useEffect, useState } from 'react';
import styles from './StationDetailPane.module.css';
import { Station, RailData, Platform } from '../types/railData';
import { getLineColor } from '../lib/lineColors';
import { useI18n } from '../lib/i18n-context';
import { getLocalizedName, getLocalizedAddress, RegionNames } from '../lib/i18n-utils';

import { STATION_DETAIL_TRANSLATIONS, getTranslations } from '../lib/translations';


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
  const t = getTranslations(STATION_DETAIL_TRANSLATIONS, language);
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
              <div key={p.pid} className="group/row relative w-full rounded-3xl bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 px-0 py-6 transition-all hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-black/30">

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

                {/* Dynamic Diagram: Truly Editor-Style Visualization */}
                {(() => {
                  const maxNeighbors = Math.max(left.length, right.length, 1);
                  const vSpacing = 140;
                  // totalHeight is dynamic based on neighbor count, but we use a constant factor for display height
                  const totalHeight = 400 + (maxNeighbors - 1) * vSpacing;
                  const centerY = totalHeight / 2;

                  // SCALE FACTOR: This ensures that 1 unit in SVG equals 0.6px in reality across ALL cards.
                  // This fixes "signs having different sizes" problem.
                  const displayHeight = totalHeight * 0.6;

                  const pWidth = 140;
                  const pL = 500 - pWidth / 2;
                  const pR = 500 + pWidth / 2;

                  const platAnchorLX = pL - 50;
                  const platAnchorRX = pR + 50;

                  return (
                    <div className="relative w-full overflow-hidden" style={{ height: `${displayHeight}px`, marginTop: '3.5rem' }}>
                      <svg
                        viewBox={`0 0 1000 ${totalHeight}`}
                        className="w-full h-full"
                        preserveAspectRatio="none" // Stretching horizontally to fill the "view 좌우 끝"
                      >
                        {/* 1. Center Platform (Sharp Rectangle) */}
                        <g>
                          <rect
                            x={pL} y={centerY - 25} width={pWidth} height={50}
                            fill="black" className="dark:fill-white"
                          />
                          <rect
                            x={pL} y={centerY - 4} width={pWidth} height={8}
                            fill={finalColor}
                          />
                        </g>

                        {/* 2. Main Connection Lines & Stations */}
                        {left.map((entry, i) => {
                          const y = centerY + (i - (left.length - 1) / 2) * vSpacing;
                          const signW = 200;
                          const signH = 90;
                          const signX = 0;
                          const anchorX = signX + signW + 60;

                          const handle = (platAnchorLX - anchorX) * 0.55;
                          const d = `M ${anchorX},${y} C ${anchorX + handle},${y} ${platAnchorLX - handle},${centerY} ${platAnchorLX},${centerY}`;

                          return (
                            <g key={entry.station.id} className="group/station">
                              <path d={d} stroke={finalColor} strokeWidth="10" fill="none" opacity="0.2" className="transition-opacity group-hover/station:opacity-100" strokeLinecap="round" />

                              <circle cx={platAnchorLX} cy={centerY} r="16" fill="white" stroke={finalColor} strokeWidth="4" />
                              <circle cx={platAnchorLX} cy={centerY} r="6" fill={finalColor} />

                              <circle cx={anchorX} cy={y} r="16" fill="white" stroke={finalColor} strokeWidth="4" />
                              <circle cx={anchorX} cy={y} r="6" fill={finalColor} />

                              {/* Station Sign */}
                              <g transform={`translate(${signX}, ${y - signH / 2})`}>
                                <rect x="2" y="2" width={signW - 4} height={signH - 4} fill="white" stroke="black" strokeWidth="4" />
                                <text x={signW / 2} y={35} textAnchor="middle" fontSize="28" fontWeight="900" fill="black" fontFamily="Pretendard">
                                  {entry.station.name}
                                </text>
                                <text x={signW / 2} y={70} textAnchor="middle" fontSize="14" fontWeight="700" fill="#666" fontFamily="Pretendard">
                                  {isKorean ? entry.station.name_kr || entry.station.name_en : entry.station.name_en}
                                </text>
                                {entry.skippedCount > 0 && (
                                  <g transform={`translate(${signW - 35}, 5)`}>
                                    <rect width={30} height={20} fill="#f0f0f0" stroke="black" strokeWidth="1" />
                                    <text x="15" y="15" textAnchor="middle" fontSize="12" fontWeight="900" fill="#cc0000">+{entry.skippedCount}</text>
                                  </g>
                                )}
                              </g>
                            </g>
                          );
                        })}

                        {right.map((entry, i) => {
                          const y = centerY + (i - (right.length - 1) / 2) * vSpacing;
                          const signW = 200;
                          const signH = 90;
                          const signX = 1000 - signW;
                          const anchorX = signX - 60;

                          const handle = (anchorX - platAnchorRX) * 0.55;
                          const d = `M ${platAnchorRX},${centerY} C ${platAnchorRX + handle},${centerY} ${anchorX - handle},${y} ${anchorX},${y}`;

                          return (
                            <g key={entry.station.id} className="group/station">
                              <path d={d} stroke={finalColor} strokeWidth="10" fill="none" opacity="0.2" className="transition-opacity group-hover/station:opacity-100" strokeLinecap="round" />

                              <circle cx={platAnchorRX} cy={centerY} r="16" fill="white" stroke={finalColor} strokeWidth="4" />
                              <circle cx={platAnchorRX} cy={centerY} r="6" fill={finalColor} />

                              <circle cx={anchorX} cy={y} r="16" fill="white" stroke={finalColor} strokeWidth="4" />
                              <circle cx={anchorX} cy={y} r="6" fill={finalColor} />

                              {/* Station Sign */}
                              <g transform={`translate(${signX}, ${y - signH / 2})`}>
                                <rect x="2" y="2" width={signW - 4} height={signH - 4} fill="white" stroke="black" strokeWidth="4" />
                                <text x={signW / 2} y={35} textAnchor="middle" fontSize="28" fontWeight="900" fill="black" fontFamily="Pretendard">
                                  {entry.station.name}
                                </text>
                                <text x={signW / 2} y={70} textAnchor="middle" fontSize="14" fontWeight="700" fill="#666" fontFamily="Pretendard">
                                  {isKorean ? entry.station.name_kr || entry.station.name_en : entry.station.name_en}
                                </text>
                                {entry.skippedCount > 0 && (
                                  <g transform={`translate(${signW - 35}, 5)`}>
                                    <rect width={30} height={20} fill="#f0f0f0" stroke="black" strokeWidth="1" />
                                    <text x="15" y="15" textAnchor="middle" fontSize="12" fontWeight="900" fill="#cc0000">+{entry.skippedCount}</text>
                                  </g>
                                )}
                              </g>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StationDetailPane;
