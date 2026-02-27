
import React, { useEffect, useState } from 'react';
import styles from './StationDetailPane.module.css';
import { Station, RailData, Company, Line, Platform } from '../types';

interface RegionNames {
    adm1: Record<string, { shapeName: string }>;
    adm2: Record<string, { shapeName: string }>;
}

interface StationDetailPaneProps {
  station: Station;
  railData: RailData;
  onClose: () => void;
}

const buildSectionsByIdMap = (sections: any[]): Map<number, any> => {
  const map = new Map<number, any>();
  if (Array.isArray(sections)) {
    for (const section of sections) {
      map.set(section.id, section);
    }
  }
  return map;
};

const StationDetailPane: React.FC<StationDetailPaneProps> = ({ station, railData, onClose }) => {
  const [regionNames, setRegionNames] = useState<RegionNames | null>(null);

  useEffect(() => {
    fetch('/data/region_names.json')
      .then(res => res.json())
      .then(data => setRegionNames(data))
      .catch(err => console.error("Failed to load region names:", err));
  }, []);

  if (!railData) return null;

  const { stations, platforms, lines, companies, sections, railroadGraph } = railData;

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
              if (deltaLon < 0) { 
                if (!leftStations.find(s => s.id === neighborStation.id)) leftStations.push(neighborStation);
              } else { 
                if (!rightStations.find(s => s.id === neighborStation.id)) rightStations.push(neighborStation);
              }
            } else {
              if (deltaLat < 0) { 
                if (!leftStations.find(s => s.id === neighborStation.id)) leftStations.push(neighborStation);
              } else { 
                if (!rightStations.find(s => s.id === neighborStation.id)) rightStations.push(neighborStation);
              }
            }
          }
        }
        return { leftStations, rightStations };
      };

  const prefectureName = station.prefecture_id && regionNames ? regionNames.adm1[station.prefecture_id]?.shapeName : '';
  const cityName = station.city_id && regionNames ? regionNames.adm2[station.city_id]?.shapeName : '';

  const formatColor = (colorStr: string | undefined): string | null => {
    if (!colorStr) return null;
    const sanitizedColor = colorStr.startsWith('#') ? colorStr.substring(1) : colorStr;
    if (/^[0-9a-fA-F]{6}$/.test(sanitizedColor)) {
        return `#${sanitizedColor}`;
    }
    return null;
  }

  return (
    <div className={styles.pane}>
      <div className={styles.header}>
        <div className={styles.stationInfoContainer}>
            <div className={styles.stationNameWrapper}>
                <span className={styles.stationName}>{station.name}</span>
                {(prefectureName || cityName) && 
                <span className={styles.regionName}>({prefectureName}{prefectureName && cityName ? ' ' : ''}{cityName})</span>
                }
            </div>
            <span className={styles.stationNameEn}>{station.name_en}</span>
        </div>
        <button onClick={onClose} className={styles.closeButton}>×</button>
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

              const { leftStations, rightStations } = getDirectionalNeighbors(p);

              return (
                <div key={p.code} className={styles.lineRow}>
                    <div className={`${styles.neighborColumn} ${styles.left}`}>
                        {leftStations.map((s, index) => {
                             const y = 100 / (leftStations.length + 1) * (index + 1);
                             return (
                                <div key={s.id} className={styles.neighborStation} style={{top: `${y}%`}}>
                                    <div className={styles.neighborInfo}>
                                        <span className={styles.neighborStationName}>{s.name}</span>
                                        <span className={styles.neighborStationNameEn}>{s.name_en}</span>
                                    </div>
                                    <div className={styles.neighborDot} style={{backgroundColor: finalColor}}></div>
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
                            <svg className={styles.connectingLines} viewBox="0 0 100 100" preserveAspectRatio="none">
                                {leftStations.map((s, index) => {
                                    const y = 100 / (leftStations.length + 1) * (index + 1);
                                    const pathD = `M 50,50 C 20,50 20,${y} 0,${y}`;
                                    return <path key={s.id} d={pathD} stroke={finalColor} strokeWidth="2.5" fill="none" />
                                })}
                                {rightStations.map((s, index) => {
                                    const y = 100 / (rightStations.length + 1) * (index + 1);
                                    const pathD = `M 50,50 C 80,50 80,${y} 100,${y}`;
                                    return <path key={s.id} d={pathD} stroke={finalColor} strokeWidth="2.5" fill="none" />
                                })}
                            </svg>
                            <div className={styles.centerPoint} style={{borderColor: finalColor}}></div>
                        </div>
                    </div>
            
                    <div className={`${styles.neighborColumn} ${styles.right}`}>
                        {rightStations.map((s, index) => {
                            const y = 100 / (rightStations.length + 1) * (index + 1);
                            return (
                                <div key={s.id} className={styles.neighborStation} style={{top: `${y}%`}}>
                                    <div className={styles.neighborDot} style={{backgroundColor: finalColor}}></div>
                                    <div className={styles.neighborInfo}>
                                        <span className={styles.neighborStationName}>{s.name}</span>
                                        <span className={styles.neighborStationNameEn}>{s.name_en}</span>
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
    </div>
  );
};

export default StationDetailPane;
