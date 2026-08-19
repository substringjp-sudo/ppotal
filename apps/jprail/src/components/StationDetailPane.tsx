import React, { useEffect, useMemo, useState } from 'react';
import styles from './StationDetailPane.module.css';
import { Station, RailData, Platform } from '../types/railData';
import { getLineColor } from '../lib/lineColors';
import { useI18n } from '../lib/i18n-context';
import { getLocalizedName, getLocalizedAddress, Language } from '../lib/i18n-utils';
import { useRegionNames } from '../hooks/useRegionNames';

import { STATION_DETAIL_TRANSLATIONS, getTranslations } from '../lib/translations';
import { buildRouteGraph, groupOf } from '../lib/routeSearch';
import { countSkippedStations, railNeighbours } from '../lib/dragRouting';
import { Z } from '../lib/layers';


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



interface NeighbourEntry {
  station: Station;
  ratio: number;
  skippedCount: number;
}

/**
 * One line's neighbours, laid out the way the track runs: previous stops to the
 * left, this station in the middle, next stops to the right. The old version
 * drew each line as its own 160px SVG with hairline bezier curves and hardcoded
 * light-mode colours, so six platforms meant a very tall scroll in a pane that
 * is only 500px, and none of it themed.
 */
const NeighbourRow: React.FC<{
  left: NeighbourEntry[];
  right: NeighbourEntry[];
  color: string;
  language: Language;
  platformNumber: number;
}> = ({ left, right, color, language, platformNumber }) => {
  const Side: React.FC<{ entries: NeighbourEntry[]; side: 'left' | 'right' }> = ({ entries, side }) => (
    <div className={`flex-1 min-w-0 flex flex-col gap-1 ${side === 'left' ? 'items-end' : 'items-start'}`}>
      {entries.length === 0 ? (
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider px-1">
          - terminal
        </span>
      ) : (
        entries.map(entry => (
          <div
            key={entry.station.id}
            className={`max-w-full flex items-center gap-1.5 ${side === 'left' ? 'flex-row' : 'flex-row-reverse'}`}
          >
            <div className={`min-w-0 flex flex-col ${side === 'left' ? 'items-end' : 'items-start'}`}>
              <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 truncate max-w-[100px] sm:max-w-[160px] md:max-w-[200px]">
                {getLocalizedName(entry.station, language)}
              </span>
              {language !== 'ja' && (
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 truncate max-w-[100px] sm:max-w-[160px] md:max-w-[200px]">
                  {entry.station.name}
                </span>
              )}
            </div>
            {entry.skippedCount > 0 && (
              <span
                className="shrink-0 px-1 py-px rounded text-[8px] font-black text-white"
                style={{ backgroundColor: color }}
                title={`${entry.skippedCount}`}
              >
                +{entry.skippedCount}
              </span>
            )}
            <span
              className="shrink-0 size-2 rounded-full ring-2 ring-white dark:ring-slate-900"
              style={{ backgroundColor: color }}
            />
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="flex items-center gap-2 sm:gap-3 py-1">
      <Side entries={left} side="left" />

      {/* The station itself, with platform number inside the center circle */}
      <div className="relative shrink-0 flex flex-col items-center px-1">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        <div
          className="relative size-6 sm:size-7 rounded-full border-[2.5px] bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm text-[10px] sm:text-[11px] font-black text-slate-800 dark:text-slate-100 z-10"
          style={{ borderColor: color }}
        >
          {platformNumber}
        </div>
      </div>

      <Side entries={right} side="right" />
    </div>
  );
};

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
  const regionNames = useRegionNames();

  const localizedAddress = getLocalizedAddress(station.prefecture_id, station.city_id, regionNames, language);

  const { stations, platforms, lines: allLines, companies } = railData || { stations: {}, platforms: {}, lines: {}, companies: {} };

  const routeGraph = useMemo(() => (railData ? buildRouteGraph(railData) : null), [railData]);

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

  /**
   * Previous and next stops for one platform's line.
   *
   * Neighbours come from the routing graph and are filtered by the line each
   * edge is actually signed with. The old version read `available_lines`, which
   * also lists every line merely touching the endpoint stations, and then fell
   * back to showing *all* connections when nothing matched — so every line at
   * 東京 listed the same eight neighbours, Shinkansen stops included.
   */
  const getDirectionalNeighbors = (platform: Platform & { pid: string }) => {
    const left: NeighbourEntry[] = [];
    const right: NeighbourEntry[] = [];
    if (!routeGraph) return { left, right };

    const stationId = station.id;
    const lineGroup = groupOf(routeGraph, platform.line);

    const onThisLine = railNeighbours(routeGraph, stationId).filter(edge =>
      edge.lineIds.some(id => groupOf(routeGraph, id) === lineGroup)
    );
    if (onThisLine.length === 0) return { left, right };

    const lineSequence = railData.railroadNetwork?.line_data?.[String(platform.line)]?.stations || [];
    const ownIndex = lineSequence.indexOf(stationId);

    // Keep the nearest edge per neighbour, so parallel sections do not double up.
    const nearest = new Map<string, (typeof onThisLine)[number]>();
    onThisLine.forEach(edge => {
      const held = nearest.get(edge.to);
      if (!held || edge.distance < held.distance) nearest.set(edge.to, edge);
    });

    const candidates = Array.from(nearest.values())
      .map(edge => {
        const neighbour = stations[edge.to];
        if (!neighbour) return null;
        const index = lineSequence.indexOf(edge.to);
        return {
          station: neighbour,
          // Direction along the line where the sequence knows it, longitude otherwise.
          order: index !== -1 && ownIndex !== -1 ? index - ownIndex : neighbour.lon - station.lon,
          skippedCount: countSkippedStations(routeGraph, stationId, edge.to)
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort((a, b) => a.order - b.order);

    candidates.forEach(entry => {
      const item: NeighbourEntry = {
        station: entry.station,
        ratio: entry.order < 0 ? 0 : 1,
        skippedCount: entry.skippedCount
      };
      if (entry.order < 0) left.push(item);
      else right.push(item);
    });

    // A terminal has every neighbour on one side; split so it still reads as a line.
    if (left.length === 0 && right.length > 1) {
      left.push(right.shift()!);
    } else if (right.length === 0 && left.length > 1) {
      right.push(left.pop()!);
    }

    return { left, right };
  };



  return (
    <div style={{ zIndex: Z.detailPane }} className="absolute bottom-0 left-0 right-0 max-h-[60vh] sm:max-h-[500px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-slate-200 dark:border-slate-800  flex flex-col shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.15)] rounded-t-[32px] animate-in slide-in-from-bottom duration-500 ease-out font-display">
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
        <div className="w-full p-2 sm:px-4 sm:py-2 space-y-2">
          {/* Column Header */}
          {sortedStationPlatforms.length > 0 && (
            <div className="flex items-center px-2 sm:px-3 py-1.5 text-[10px] sm:text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/60 mb-1.5">
              <div className="w-40 sm:w-44 md:w-56 shrink-0 text-center">{t.lineName}</div>
              <div className="flex-1 text-center">{t.platformInfo}</div>
            </div>
          )}

          {sortedStationPlatforms.map((p, index) => {
            const line = allLines[p.line];
            if (!line) return null;

            const finalColor = line.color || getLineColor(`${line.corp_id}::${p.line}`, railData) || '#3498db';
            const { left, right } = getDirectionalNeighbors(p);

            return (
              <div
                key={p.pid}
                className="group/row relative w-full rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 p-2 sm:p-2.5 transition-all hover:shadow-lg flex flex-col sm:flex-row sm:items-stretch sm:gap-3"
              >
                {/* Left side: Station/Line Name category box with shaded background (rounded left, straight right) */}
                <div className="flex items-center justify-start p-2.5 sm:p-3 rounded-l-xl rounded-r-none bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 mb-1 sm:mb-0 sm:w-44 md:w-56 sm:shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-1.5 h-4 rounded-full shrink-0" style={{ backgroundColor: finalColor }}></div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white tracking-tight leading-none truncate">
                        {language === 'ja' ? line.name : (isKorean ? (line.name_kr || line.name_en) : line.name_en)}
                      </span>
                      {language !== 'ja' && (
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 italic mt-0.5 truncate">
                          {line.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side: Platform Info column with center-circle platform number */}
                <div className="flex-1 min-w-0 flex flex-col justify-center px-1 sm:px-2 py-1">
                  <NeighbourRow left={left} right={right} color={finalColor} language={language} platformNumber={index + 1} />
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
