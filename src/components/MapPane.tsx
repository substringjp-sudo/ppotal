import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { useMap, useMapEvents, Pane } from 'react-leaflet';
import JapanMap from './JapanMap';
import MunicipalMap from './MunicipalMap';
import Railroads from './Railroads';
import Stations from './Stations';

const MapPane = () => {
    const [prefectures, setPrefectures] = useState(null);
    const [municipalities, setMunicipalities] = useState(null);
    const [railroads, setRailroads] = useState(null);
    const [stations, setStations] = useState(null);
    const [selectedLines, setSelectedLines] = useState([]);
    const [zoomLevel, setZoomLevel] = useState(5);
    const [mapBounds, setMapBounds] = useState(null);
    const [highlightedStations, setHighlightedStations] = useState([]);
    const map = useMap();

    const colorPalette = useMemo(() => [
        "#FFC300", "#FF5733", "#C70039", "#900C3F", "#581845",
        "#DAF7A6", "#3A8DDE", "#2F6FAD", "#245282", "#1A3557"
    ], []);

    const getColor = useCallback((name) => {
        if (!name) return "#CCCCCC";
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colorPalette[Math.abs(hash) % colorPalette.length];
    }, [colorPalette]);

    useEffect(() => {
        fetch('/geoBoundaries-JPN-ADM1_simplified.geojson').then(res => res.json()).then(data => {
            const getBounds = (coords) => {
                let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
                coords.flat(Infinity).forEach((c, i) => {
                    if (i % 2 === 0) { if (c < minLng) minLng = c; if (c > maxLng) maxLng = c; }
                    else { if (c < minLat) minLat = c; if (c > maxLat) maxLat = c; }
                });
                return [[minLat, minLng], [maxLat, maxLng]];
            };
            data.features.forEach(f => f.properties.bounds = getBounds(f.geometry.coordinates));
            setPrefectures(data);
        });
        fetch('/geoBoundaries-JPN-ADM2_simplified.geojson').then(res => res.json()).then(setMunicipalities);
        fetch('/N02-22_RailroadSection.geojson').then(res => res.json()).then(setRailroads);
        fetch('/N02-22_Station.geojson').then(res => res.json()).then(setStations).catch(console.error);
    }, []);

    useMapEvents({
        load: (e) => {
            const mapInstance = e.target;
            setZoomLevel(mapInstance.getZoom());
            setMapBounds(mapInstance.getBounds());
        },
        zoomend: (e) => {
            const mapInstance = e.target;
            const newZoom = mapInstance.getZoom();
            setZoomLevel(newZoom);
        },
        moveend: (e) => {
            setMapBounds(e.target.getBounds());
        },
    });

    const handlePrefectureClick = useCallback((prefName) => {
        const feature = prefectures?.features.find(f => f.properties.shapeName === prefName);
        if (feature?.properties.bounds) map.fitBounds(feature.properties.bounds);
    }, [prefectures, map]);

    const handleRailroadClick = useCallback(line => setSelectedLines(p => p.includes(line) ? p.filter(l => l !== line) : [...p, line]), []);
    const handleStationClick = useCallback(name => setHighlightedStations(p => p.includes(name) ? p.filter(s => s !== name) : [...p, name]), []);

    const visibleStations = useMemo(() => {
        if (!stations || !mapBounds) return null;
        const data = {};
        stations.features.forEach(s => {
            if (mapBounds.contains(s.geometry.coordinates.slice().reverse())) {
                const name = s.properties.N02_005;
                if (!data[name]) data[name] = { coords: s.geometry.coordinates.slice().reverse(), lines: [] };
                data[name].lines.push(s.properties.N02_003);
            }
        });
        return data;
    }, [stations, mapBounds]);

    return (
        <>
            <Pane name="prefecture-fill" style={{ zIndex: 410 }}>
                <JapanMap 
                    prefectures={prefectures} 
                    onPrefectureClick={handlePrefectureClick} 
                    getColor={getColor} 
                    interactive={zoomLevel <= 8}
                />
            </Pane>
            <Pane name="municipal-lines" style={{ zIndex: 412 }}>
                {zoomLevel > 8 && <MunicipalMap municipalities={municipalities} getColor={getColor} />}
            </Pane>
            <Pane name="prefecture-outline" style={{ zIndex: 415 }}>
                {zoomLevel > 8 && 
                    <JapanMap 
                        prefectures={prefectures} 
                        getColor={getColor} 
                        outlineOnly={true} 
                        interactive={false}
                    />
                }
            </Pane>
            <Pane name="railroads" style={{ zIndex: 420 }}>
                <Railroads 
                    railroads={railroads} 
                    selectedLines={selectedLines} 
                    onRailroadClick={handleRailroadClick} 
                    getColor={getColor} 
                />
            </Pane>
            <Pane name="stations" style={{ zIndex: 430 }}>
                {visibleStations &&
                    <Stations 
                        processedStations={visibleStations} 
                        highlightedStations={highlightedStations} 
                        handleStationClick={handleStationClick} 
                        zoom={zoomLevel} 
                        getColor={getColor}
                    />
                }
            </Pane>
        </>
    );
};

export default memo(MapPane);
