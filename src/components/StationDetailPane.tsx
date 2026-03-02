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
  const { isKorean, language } = useI18n();
  const t = getTranslations(STATION_DETAIL_TRANSLATIONS, language);
  const [regionNames, setRegionNames] = useState<RegionNames | null>(null);

  useEffect(() => {
    fetch('/data/region_names.json')
      .then(res => res.json())
      .then(data => setRegionNames(data))
      .catch(err => console.error("Failed to load region names:", err));
  }, []);

  const localizedAddress = getLocalizedAddress(station.prefecture_id, station.city_id, regionNames, language);

  const { stations, platforms, lines: allLines, companies } = railData || { stations: {}, platforms: {}, lines: {}, companies: {} };

  const sortedStationPlatforms = station.platform_ids
    .map(pid => ({ ...platforms[pid], pid }))
    .filter(p => p && allLines[p.line])
    .sort((a, b) => {
      const lineA = allLines[a.line];
      const lineB = allLines[b.line];
      if (!lineA || !lineB) return 0;
      if (lineA.corp_id !== lineB.corp_id) {
        return (lineA.corp_id as number) - (lineB.corp_id as number);
      }
      return (a.line as number) - (b.line as number);
    });

  // Get unique lines for the station header chips
  const stationLines = Array.from(new Set(sortedStationPlatforms.map(p => p.line)))
    .map(lid => allLines[lid])
    .filter(Boolean);

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



  return (
    <div className="absolute bottom-0 left-0 right-0 max-h-[60vh] sm:max-h-[500px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-slate-200 dark:border-slate-800 z-[1100] flex flex-col shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.15)] rounded-t-[32px] animate-in slide-in-from-bottom duration-500 ease-out font-display">
      {/* Premium Compact Header Section */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-2 sm:py-3 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800/50 rounded-t-[32px] flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <div className="size-8 sm:size-9 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
            <span className="material-symbols-outlined text-lg sm:text-xl">location_on</span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-baseline gap-2 overflow-hidden">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight tracking-tight truncate flex-shrink-0">
                {language === 'ja' ? station.name : getLocalizedName(station, language)}
              </h2>
              {language !== 'ja' && (
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 italic uppercase tracking-wider truncate flex-shrink">
                  {station.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 overflow-hidden mt-0.5">
              {regionNames && (
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate shrink-0">
                  {localizedAddress}
                </span>
              )}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mask-fade-right py-0.5 shrink">
                {stationLines.map(line => (
                  <div
                    key={line.id}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200/50 dark:border-slate-700/50"
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: line.color || getLineColor(`${line.corp_id}::${line.id}`, railData) || '#3498db' }}></div>
                    <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {language === 'ja' ? line.name : (isKorean ? (line.name_kr || line.name_en) : line.name_en)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            {isTripInProgress ? (
              <div className="flex items-center gap-1.5">
                {station.id !== tripStartStationId && (
                  <button
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[9px] shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-1"
                    onClick={() => onEndTrip(station)}
                  >
                    <span className="material-symbols-outlined text-[12px]">flag</span>
                    {t.arr}
                  </button>
                )}
                <button
                  className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black uppercase tracking-widest text-[9px] hover:bg-slate-300 dark:hover:bg-slate-600 transition-all active:scale-95"
                  onClick={() => onCancel && onCancel()}
                >
                  <span className="material-symbols-outlined text-[12px] sm:hidden">close</span>
                  <span className="hidden sm:inline">{t.cancel}</span>
                </button>
              </div>
            ) : (
              <button
                className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[9px] shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-1.5"
                onClick={() => onStartTrip(station)}
              >
                <span className="material-symbols-outlined text-[12px]">play_arrow</span>
                {t.start}
              </button>
            )}
          </div>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center active:scale-90"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-950/20">
        <div className="w-full p-2 sm:px-4 sm:py-2 space-y-1.5 sm:space-y-2">
          {sortedStationPlatforms.map((p, index) => {
            const line = allLines[p.line];
            if (!line) return null;

            const finalColor = line.color || getLineColor(`${line.corp_id}::${p.line}`, railData) || '#3498db';
            const { left, right } = getDirectionalNeighbors(p);

            // Ordinal number helper
            const getOrdinal = (n: number) => {
              if (language === 'en') {
                const s = ["th", "st", "nd", "rd"];
                const v = n % 100;
                return n + (s[(v - 20) % 10] || s[v] || s[0]);
              }
              return n;
            };

            return (
              <div key={p.pid} className="group/row relative w-full rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 p-2 sm:p-3 transition-all hover:shadow-lg">
                <div className="flex items-center justify-between mb-1 pb-1.5 border-b border-slate-50 dark:border-slate-800/50">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black w-4 h-4 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                      {getOrdinal(index + 1)}
                    </span>
                    <div className="w-1 h-3 rounded-full" style={{ backgroundColor: finalColor }}></div>
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white tracking-tight leading-none">
                        {language === 'ja' ? line.name : (isKorean ? (line.name_kr || line.name_en) : line.name_en)}
                      </span>
                      {language !== 'ja' && (
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 italic mt-0.5">
                          {line.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Refined Compact Diagram Visual */}
                {(() => {
                  const maxN = Math.max(left.length, right.length, 1);
                  const vSpacing = 80; // reduced
                  const totalHeight = 200 + (maxN - 1) * vSpacing; // reduced
                  const centerY = totalHeight / 2;

                  // Adjusted display height for a more compact look
                  const displayHeight = Math.min(160, totalHeight * 0.5); // reduced

                  const basePWidth = 140;
                  const pLength = p.length || 200;
                  const pWidth = Math.min(300, Math.max(80, basePWidth * (pLength / 220)));
                  const pL = 500 - pWidth / 2;
                  const pR = 500 + pWidth / 2;

                  return (
                    <div className="relative w-full overflow-hidden flex justify-center bg-slate-50/30 dark:bg-slate-900/10 rounded-xl" style={{ height: `${displayHeight}px` }}>
                      <svg
                        viewBox={`0 0 1000 ${totalHeight}`}
                        className="h-full aspect-[1000/totalHeight]"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        {/* Center Platform Indicator - More refined */}
                        <g>
                          <rect
                            x={pL} y={centerY - 18} width={pWidth} height={36}
                            fill="#0f172a" rx="4"
                          />
                          <rect
                            x={pL + 4} y={centerY - 2} width={pWidth - 8} height={4}
                            fill={finalColor} rx="2"
                          />
                        </g>

                        {/* Connections and Neighbor Signs */}
                        <g>
                          {left.map((entry, i) => {
                            const y = centerY + (i - (left.length - 1) / 2) * vSpacing;
                            const signW = 220;
                            const signH = 70;
                            const signX = 10; // Closer to left edge
                            const anchorX = signX + signW + 30;
                            const platAnchorX = pL - 60; // Increased distance from platform

                            const cp1X = anchorX + (platAnchorX - anchorX) * 0.5;
                            const d = `M ${anchorX},${y} C ${cp1X},${y} ${platAnchorX - (platAnchorX - anchorX) * 0.5},${centerY} ${platAnchorX},${centerY}`;

                            const mainName = language === 'ja' ? entry.station.name : getLocalizedName(entry.station, language);
                            const subName = entry.station.name;

                            return (
                              <g key={entry.station.id}>
                                <path d={d} stroke={finalColor} strokeWidth="3" fill="none" opacity="0.3" strokeLinecap="round" />
                                <circle cx={anchorX} cy={y} r="7" fill="white" stroke={finalColor} strokeWidth="2" />
                                <circle cx={platAnchorX} cy={centerY} r="7" fill="white" stroke={finalColor} strokeWidth="2" />

                                <g transform={`translate(${signX}, ${y - signH / 2})`}>
                                  <rect width={signW} height={signH} rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
                                  <text x={signW / 2} y={32} textAnchor="middle" fontSize="20" fontWeight="900" fill="#1e293b" fontFamily="Pretendard">
                                    {mainName}
                                  </text>
                                  {language !== 'ja' && (
                                    <text x={signW / 2} y={56} textAnchor="middle" fontSize="11" fontWeight="700" fill="#64748b" fontFamily="Pretendard">
                                      {subName}
                                    </text>
                                  )}
                                  {entry.skippedCount > 0 && (
                                    <g transform={`translate(${signW - 38}, 6)`}>
                                      <rect width={30} height={16} rx="8" fill="#fef2f2" />
                                      <text x="15" y="12" textAnchor="middle" fontSize="9" fontWeight="900" fill="#ef4444">+{entry.skippedCount}</text>
                                    </g>
                                  )}
                                </g>
                              </g>
                            );
                          })}

                          {right.map((entry, i) => {
                            const y = centerY + (i - (right.length - 1) / 2) * vSpacing;
                            const signW = 220;
                            const signH = 70;
                            const signX = 1000 - signW - 10; // Closer to right edge
                            const anchorX = signX - 30;
                            const platAnchorX = pR + 60; // Increased distance from platform

                            const cp1X = platAnchorX + (anchorX - platAnchorX) * 0.5;
                            const d = `M ${platAnchorX},${centerY} C ${cp1X},${centerY} ${anchorX - (anchorX - platAnchorX) * 0.5},${y} ${anchorX},${y}`;

                            const mainName = language === 'ja' ? entry.station.name : getLocalizedName(entry.station, language);
                            const subName = entry.station.name;

                            return (
                              <g key={entry.station.id}>
                                <path d={d} stroke={finalColor} strokeWidth="3" fill="none" opacity="0.3" strokeLinecap="round" />
                                <circle cx={anchorX} cy={y} r="7" fill="white" stroke={finalColor} strokeWidth="2" />
                                <circle cx={platAnchorX} cy={centerY} r="7" fill="white" stroke={finalColor} strokeWidth="2" />

                                <g transform={`translate(${signX}, ${y - signH / 2})`}>
                                  <rect width={signW} height={signH} rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
                                  <text x={signW / 2} y={32} textAnchor="middle" fontSize="20" fontWeight="900" fill="#1e293b" fontFamily="Pretendard">
                                    {mainName}
                                  </text>
                                  {language !== 'ja' && (
                                    <text x={signW / 2} y={56} textAnchor="middle" fontSize="11" fontWeight="700" fill="#64748b" fontFamily="Pretendard">
                                      {subName}
                                    </text>
                                  )}
                                  {entry.skippedCount > 0 && (
                                    <g transform={`translate(${signW - 38}, 6)`}>
                                      <rect width={30} height={16} rx="8" fill="#fef2f2" />
                                      <text x="15" y="12" textAnchor="middle" fontSize="9" fontWeight="900" fill="#ef4444">+{entry.skippedCount}</text>
                                    </g>
                                  )}
                                </g>
                              </g>
                            );
                          })}
                        </g>
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
