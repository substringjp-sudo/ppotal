
import React, { useEffect, useState } from 'react';
import styles from './StationDetailPane.module.css';
import { Station, RailData, Platform } from '../types/railData';

interface RegionNames {
  adm1: Record<string, { shapeName: string; shapeName_en?: string }>;
  adm2: Record<string, { shapeName: string; shapeName_en?: string }>;
}

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
  const [regionNames, setRegionNames] = useState<RegionNames | null>(null);

  useEffect(() => {
    fetch('/data/region_names.json')
      .then(res => res.json())
      .then(data => setRegionNames(data))
      .catch(err => console.error("Failed to load region names:", err));
  }, []);

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

  const prefecture = station.prefecture_id && regionNames ? regionNames.adm1[station.prefecture_id] : null;
  const prefectureName = prefecture?.shapeName || '';
  const prefectureNameEn = prefecture?.shapeName_en || '';

  const city = station.city_id && regionNames ? regionNames.adm2[station.city_id] : null;
  const cityName = city?.shapeName || '';
  const cityNameEn = city?.shapeName_en || '';

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
    <div className={styles.pane}>
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <div className={styles.stationInfoContainer}>
            <span className={styles.stationName}>{station.name}</span>
            <span className={styles.stationNameEn}>{station.name_en}</span>
          </div>
          {(prefectureName || cityName) &&
            <div className={styles.regionNameContainer}>
              <span className={styles.regionName}>
                {prefectureName}{prefectureName && cityName ? ' ' : ''}{cityName}
              </span>
              {(prefectureNameEn || cityNameEn) && (
                <span className={styles.regionNameEn}>
                  {prefectureNameEn}{prefectureNameEn && cityNameEn ? ', ' : ''}{cityNameEn}
                </span>
              )}
            </div>
          }
        </div>
        <div className={styles.headerActions}>
          {isTripInProgress ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              {station.id !== tripStartStationId && (
                <button
                  className={`${styles.tripButton} ${styles.endTrip}`}
                  onClick={() => onEndTrip(station)}
                >
                  End Trip
                </button>
              )}
              <button
                className={`${styles.tripButton}`}
                style={{ backgroundColor: '#e2e8f0', color: '#4a5568' }}
                onClick={() => onCancel && onCancel()}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              className={`${styles.tripButton} ${styles.startTrip}`}
              onClick={() => onStartTrip(station)}
            >
              Start Trip
            </button>
          )}
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>
      </div>
      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.platformContainer}>
            {sortedStationPlatforms.map((p) => {
              const line = lines[p.line];
              if (!line) return null;

              const company = companies && companies[line.corp_id];
              const lineColor = formatColor(line.color);
              const companyColor = company ? formatColor(company.color) : null;
              const finalColor = lineColor || companyColor || '#000000';

              const { left, right } = getDirectionalNeighbors(p);
              const maxNeighbors = Math.max(left.length, right.length);

              // More generous spacing for multiple neighbors
              // Base height 80, 48px per neighbor if >= 3, else 42px
              const spacingFactor = maxNeighbors >= 3 ? 52 : 44;
              const rowHeight = Math.max(80, maxNeighbors * spacingFactor);

              return (
                <div key={p.pid} className={styles.lineRow} style={{ height: rowHeight }}>
                  {/* Neighbor Stations (HTML Labels) */}
                  <div className={`${styles.neighborColumn} ${styles.left}`}>
                    {left.map((entry, index) => {
                      const y = 100 / (left.length + 1) * (index + 1);
                      return (
                        <div key={entry.station.id} className={styles.neighborStation} style={{ top: `${y}%` }}>
                          <div className={styles.neighborInfo}>
                            <div className={styles.neighborStationNameRow}>
                              <span className={styles.neighborStationName}>{entry.station.name}</span>
                              {entry.skippedCount > 0 && <span className={styles.skippedIndicator}>+{entry.skippedCount}</span>}
                            </div>
                            <span className={styles.neighborStationNameEn}>{entry.station.name_en}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className={styles.centerColumn}>
                    <div className={styles.svgWrapper}>
                      <div className={styles.lineNameContainer}>
                        <span className={styles.lineName}>{line.name}</span>
                        <span className={styles.lineNameEn}>{line.name_en}</span>
                      </div>
                      <svg className={styles.connectingLines} viewBox="0 0 1000 100" preserveAspectRatio="none">
                        {(() => {
                          // In 1000-unit viewBox:
                          // Left dots at x=180
                          // Right dots at x=820
                          // Platform centered at x=500
                          const dotLX = 180;
                          const dotRX = 820;
                          const pWidth = getPlatformWidth(p) * 4; // Scale platform width for 1000 units
                          const pStartX = 500 - pWidth / 2;
                          const pEndX = 500 + pWidth / 2;

                          return (
                            <>
                              {/* Left Curves and Dots */}
                              {left.map((entry, index) => {
                                const y = 100 / (left.length + 1) * (index + 1);
                                const connX = pStartX + entry.ratio * pWidth;
                                const dist = connX - dotLX;
                                const handle = dist * 0.4;
                                const d = `M ${connX},50 C ${connX - handle},50 ${dotLX + handle},${y} ${dotLX},${y}`;
                                return (
                                  <g key={entry.station.id}>
                                    <path
                                      d={d}
                                      stroke={finalColor}
                                      strokeWidth="2"
                                      fill="none"
                                      opacity="0.8"
                                      strokeDasharray={entry.skippedCount > 0 ? "4 2" : "none"}
                                    />
                                    <circle cx={dotLX} cy={y} r="3" fill="#fff" stroke={finalColor} strokeWidth="1.5" />
                                  </g>
                                );
                              })}

                              {/* Right Curves and Dots */}
                              {right.map((entry, index) => {
                                const y = 100 / (right.length + 1) * (index + 1);
                                const connX = pStartX + entry.ratio * pWidth;
                                const dist = dotRX - connX;
                                const handle = dist * 0.4;
                                const d = `M ${connX},50 C ${connX + handle},50 ${dotRX - handle},${y} ${dotRX},${y}`;
                                return (
                                  <g key={entry.station.id}>
                                    <path
                                      d={d}
                                      stroke={finalColor}
                                      strokeWidth="2"
                                      fill="none"
                                      opacity="0.8"
                                      strokeDasharray={entry.skippedCount > 0 ? "4 2" : "none"}
                                    />
                                    <circle cx={dotRX} cy={y} r="3" fill="#fff" stroke={finalColor} strokeWidth="1.5" />
                                  </g>
                                );
                              })}

                              {/* Platform Line */}
                              <rect
                                x={pStartX}
                                y={47.5}
                                width={pWidth}
                                height={5}
                                rx={2.5}
                                fill="#fff"
                                stroke={finalColor}
                                strokeWidth="2.5"
                              />
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                  </div>

                  <div className={`${styles.neighborColumn} ${styles.right}`}>
                    {right.map((entry, index) => {
                      const y = 100 / (right.length + 1) * (index + 1);
                      return (
                        <div key={entry.station.id} className={styles.neighborStation} style={{ top: `${y}%` }}>
                          <div className={styles.neighborInfo}>
                            <div className={styles.neighborStationNameRow}>
                              <span className={styles.neighborStationName}>{entry.station.name}</span>
                              {entry.skippedCount > 0 && <span className={styles.skippedIndicator}>+{entry.skippedCount}</span>}
                            </div>
                            <span className={styles.neighborStationNameEn}>{entry.station.name_en}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div >
  );
};

export default StationDetailPane;
