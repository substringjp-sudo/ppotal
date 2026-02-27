import React from 'react';
import styles from './StationDetailPane.module.css';

// Type definitions based on rail_data_schema.md in public/rail
// FIX: Added name_en to Station interface
interface Station {
  id: string;
  name: string;
  name_en: string;
  lat: number;
  lon: number;
  platform_ids: string[];
}

interface Platform {
  code: string; // platform_id
  name: string;
  line: number; // line_id
}

interface Line {
  id: number;
  name: string;
  name_en: string;
  color: string;
  corp_id: number; // For sorting
}

interface Section {
  id: number;
  line_id: number;
  start_station: string;
  end_station: string;
}

interface RailData {
  stations: Record<string, Station>;
  platforms: Record<string, Platform>;
  lines: Record<string, Line>;
  sections: {
    sections: Section[];
  };
  railroadGraph: Record<string, Record<string, number[]>>;
}

interface StationDetailPaneProps {
  station: Station;
  railData: RailData;
  onClose: () => void;
}

// Helper to get contrasting text color
const getTextColorForBackground = (hexColor: string): string => {
    if (!hexColor || hexColor.length !== 6) return '#000000';
    const r = parseInt(hexColor.substring(0, 2), 16);
    const g = parseInt(hexColor.substring(2, 4), 16);
    const b = parseInt(hexColor.substring(4, 6), 16);
    const luminance = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (luminance > 128) ? '#000000' : '#FFFFFF';
};

// Helper to build sections Map
const buildSectionsByIdMap = (sections: Section[]): Map<number, Section> => {
  const map = new Map<number, Section>();
  if (Array.isArray(sections)) {
    for (const section of sections) {
      map.set(section.id, section);
    }
  }
  return map;
};

const StationDetailPane: React.FC<StationDetailPaneProps> = ({ station, railData, onClose }) => {
  if (!railData) return null;

  const { stations, platforms, lines, sections, railroadGraph } = railData;

  const sectionsById = React.useMemo(() => buildSectionsByIdMap(sections.sections), [sections.sections]);

  const sortedStationPlatforms = station.platform_ids
    .map(pid => platforms[pid])
    .filter(p => p && lines[p.line])
    .sort((a, b) => {
        const lineA = lines[a.line];
        const lineB = lines[b.line];
        if (!lineA || !lineB) return 0;
        if (lineA.corp_id !== lineB.corp_id) {
            return lineA.corp_id - lineB.corp_id;
        }
        return a.line - b.line;
    });

  const getDirectionalNeighbors = (platform: Platform) => {
    const leftStations: Station[] = [];
    const rightStations: Station[] = [];
    const currentStation = station;
    const targetLineId = platform.line;

    const neighborStationIds = railroadGraph[currentStation.id]
      ? Object.keys(railroadGraph[currentStation.id])
      : [];

    for (const neighborId of neighborStationIds) {
      const neighborStation = stations[neighborId];
      if (!neighborStation) continue;

      const connectingSectionIds = railroadGraph[currentStation.id][neighborId];
      if (!connectingSectionIds || connectingSectionIds.length === 0) continue;

      const isOnTargetLine = connectingSectionIds.some(sectionId => {
          const section = sectionsById.get(sectionId);
          return section && section.line_id === targetLineId;
      });

      if (isOnTargetLine) {
        const deltaLon = neighborStation.lon - currentStation.lon;
        const deltaLat = neighborStation.lat - currentStation.lat;

        if (Math.abs(deltaLon) > Math.abs(deltaLat)) {
          if (deltaLon < 0) { // West
            if (!leftStations.find(s => s.id === neighborStation.id)) leftStations.push(neighborStation);
          } else { // East
            if (!rightStations.find(s => s.id === neighborStation.id)) rightStations.push(neighborStation);
          }
        } else {
          if (deltaLat < 0) { // South
            if (!leftStations.find(s => s.id === neighborStation.id)) leftStations.push(neighborStation);
          } else { // North
            if (!rightStations.find(s => s.id === neighborStation.id)) rightStations.push(neighborStation);
          }
        }
      }
    }
    return { leftStations, rightStations };
  };

  return (
    <div className={styles.pane}>
      <div className={styles.header}>
        {/* FIX: Add English name below main station name */}
        <h2>
            {station.name}
            <span className={styles.stationNameEn}>{station.name_en}</span>
        </h2>
        <button onClick={onClose} className={styles.closeButton}>×</button>
      </div>
      <div className={styles.content}>
        <div className={styles.section}>
          {/* FIX: Removed h3 title */}
          <div className={styles.platformContainer}>
            {sortedStationPlatforms.map((p) => {
              const line = lines[p.line];
              if (!line) return null;

              const { leftStations, rightStations } = getDirectionalNeighbors(p);
              const textColor = getTextColorForBackground(line.color);

              return (
                <div key={p.code} className={styles.platformRow}>
                  <div className={styles.directionColumn}>
                    {leftStations.length > 0 ? (
                      leftStations.map(s => (
                        <div key={s.id} className={styles.directionPill} style={{ backgroundColor: `#${line.color}`, color: textColor }}>
                          {/* FIX: Add English name for neighbor station */}
                          <span className={styles.directionStationName}>{s.name}</span>
                          <span className={styles.directionStationNameEn}>{s.name_en}</span>
                        </div>
                      ))
                    ) : (
                      <div className={styles.directionPill} style={{ backgroundColor: '#808080' }}>
                        <span>종점</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.platformTrack}>
                    <div className={styles.platformInfo} style={{ borderColor: `#${line.color}` }}>
                      {/* FIX: Add English name for line */}
                      <span className={styles.platformLineName}>{line.name}</span>
                      <span className={styles.platformLineNameEn}>{line.name_en}</span>
                    </div>
                  </div>
                  <div className={styles.directionColumn}>
                    {rightStations.length > 0 ? (
                      rightStations.map(s => (
                        <div key={s.id} className={styles.directionPill} style={{ backgroundColor: `#${line.color}`, color: textColor }}>
                           {/* FIX: Add English name for neighbor station */}
                          <span className={styles.directionStationName}>{s.name}</span>
                          <span className={styles.directionStationNameEn}>{s.name_en}</span>
                        </div>
                      ))
                    ) : (
                      <div className={styles.directionPill} style={{ backgroundColor: '#808080' }}>
                        <span>종점</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StationDetailPane;