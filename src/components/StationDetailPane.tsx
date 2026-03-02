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



  return (
    <div className="absolute bottom-0 left-0 right-0 max-h-[60vh] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-slate-200 dark:border-slate-800 z-[1100] flex flex-col shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.15)] rounded-t-[32px] animate-in slide-in-from-bottom duration-500 ease-out font-display">
      {/* Premium Compact Header Section */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-2.5 sm:py-3.5 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800/50 rounded-t-[32px] flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <div className="size-8 sm:size-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
            <span className="material-symbols-outlined text-lg sm:text-xl">location_on</span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white leading-tight tracking-tight truncate">
                {language === 'ja' ? station.name : getLocalizedName(station, language)}
              </h2>
              {language !== 'ja' && (
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 italic uppercase tracking-wider truncate">
                  {station.name}
                </span>
              )}
            </div>
            {regionNames && (
              <div className="flex items-center gap-1 mt-0.5 text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">
                <span className="truncate">
                  {localizedAddress}
                </span>
              </div>
            )}
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
        <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {sortedStationPlatforms.map((p, index) => {
            const line = lines[p.line];
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
              <div key={p.pid} className="group/row relative w-full rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 p-4 transition-all hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/30">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-50 dark:border-slate-800/50">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black w-5 h-5 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                      {getOrdinal(index + 1)}
                    </span>
                    <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: finalColor }}></div>
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white tracking-tight leading-none">
                        {line.name}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 italic mt-0.5">
                        {isKorean ? line.name_kr || line.name_en : line.name_en}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Refined Compact Diagram Visual */}
                {(() => {
                  const maxN = Math.max(left.length, right.length, 1);
                  const vSpacing = 110;
                  const totalHeight = 300 + (maxN - 1) * vSpacing;
                  const centerY = totalHeight / 2;

                  // Adjusted display height for a more compact look
                  const displayHeight = Math.min(240, totalHeight * 0.5);

                  const pWidth = 120;
                  const pL = 500 - pWidth / 2;
                  const pR = 500 + pWidth / 2;

                  return (
                    <div className="relative w-full overflow-hidden flex justify-center" style={{ height: `${displayHeight}px` }}>
                      <svg
                        viewBox={`0 0 1000 ${totalHeight}`}
                        className="h-full aspect-[1000/totalHeight]"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        {/* Center Platform Indicator - More refined */}
                        <g>
                          <rect
                            x={pL} y={centerY - 20} width={pWidth} height={40}
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
                            const signW = 240;
                            const signH = 80;
                            const signX = 20;
                            const anchorX = signX + signW + 40;
                            const platAnchorX = pL - 40;

                            const cp1X = anchorX + (platAnchorX - anchorX) * 0.5;
                            const d = `M ${anchorX},${y} C ${cp1X},${y} ${platAnchorX - (platAnchorX - anchorX) * 0.5},${centerY} ${platAnchorX},${centerY}`;

                            return (
                              <g key={entry.station.id}>
                                <path d={d} stroke={finalColor} strokeWidth="4" fill="none" opacity="0.3" strokeLinecap="round" />
                                <circle cx={anchorX} cy={y} r="8" fill="white" stroke={finalColor} strokeWidth="2.5" />
                                <circle cx={platAnchorX} cy={centerY} r="8" fill="white" stroke={finalColor} strokeWidth="2.5" />

                                <g transform={`translate(${signX}, ${y - signH / 2})`}>
                                  <rect width={signW} height={signH} rx="12" fill="white" stroke="#e2e8f0" strokeWidth="2" />
                                  <text x={signW / 2} y={35} textAnchor="middle" fontSize="22" fontWeight="900" fill="#1e293b" fontFamily="Pretendard">
                                    {entry.station.name}
                                  </text>
                                  <text x={signW / 2} y={60} textAnchor="middle" fontSize="12" fontWeight="700" fill="#64748b" fontFamily="Pretendard">
                                    {isKorean ? entry.station.name_kr || entry.station.name_en : entry.station.name_en}
                                  </text>
                                  {entry.skippedCount > 0 && (
                                    <g transform={`translate(${signW - 40}, 8)`}>
                                      <rect width={32} height={18} rx="9" fill="#fef2f2" />
                                      <text x="16" y="13" textAnchor="middle" fontSize="10" fontWeight="900" fill="#ef4444">+{entry.skippedCount}</text>
                                    </g>
                                  )}
                                </g>
                              </g>
                            );
                          })}

                          {right.map((entry, i) => {
                            const y = centerY + (i - (right.length - 1) / 2) * vSpacing;
                            const signW = 240;
                            const signH = 80;
                            const signX = 1000 - signW - 20;
                            const anchorX = signX - 40;
                            const platAnchorX = pR + 40;

                            const cp1X = platAnchorX + (anchorX - platAnchorX) * 0.5;
                            const d = `M ${platAnchorX},${centerY} C ${cp1X},${centerY} ${anchorX - (anchorX - platAnchorX) * 0.5},${y} ${anchorX},${y}`;

                            return (
                              <g key={entry.station.id}>
                                <path d={d} stroke={finalColor} strokeWidth="4" fill="none" opacity="0.3" strokeLinecap="round" />
                                <circle cx={anchorX} cy={y} r="8" fill="white" stroke={finalColor} strokeWidth="2.5" />
                                <circle cx={platAnchorX} cy={centerY} r="8" fill="white" stroke={finalColor} strokeWidth="2.5" />

                                <g transform={`translate(${signX}, ${y - signH / 2})`}>
                                  <rect width={signW} height={signH} rx="12" fill="white" stroke="#e2e8f0" strokeWidth="2" />
                                  <text x={signW / 2} y={35} textAnchor="middle" fontSize="22" fontWeight="900" fill="#1e293b" fontFamily="Pretendard">
                                    {entry.station.name}
                                  </text>
                                  <text x={signW / 2} y={60} textAnchor="middle" fontSize="12" fontWeight="700" fill="#64748b" fontFamily="Pretendard">
                                    {isKorean ? entry.station.name_kr || entry.station.name_en : entry.station.name_en}
                                  </text>
                                  {entry.skippedCount > 0 && (
                                    <g transform={`translate(${signW - 40}, 8)`}>
                                      <rect width={32} height={18} rx="9" fill="#fef2f2" />
                                      <text x="16" y="13" textAnchor="middle" fontSize="10" fontWeight="900" fill="#ef4444">+{entry.skippedCount}</text>
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
