import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { useMap, useMapEvents, Pane } from 'react-leaflet';
import JapanMap from './JapanMap';
import MunicipalMap from './MunicipalMap';
import Railroads from './Railroads';
import Stations from './Stations';

const haversineDistance = (coords1, coords2) => {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371; // Earth radius in km
    const dLat = toRad(coords2[1] - coords1[1]);
    const dLon = toRad(coords2[0] - coords1[0]);
    const lat1 = toRad(coords1[1]);
    const lat2 = toRad(coords2[1]);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const MapPane = ({ selectedLines, onRailroadClick, onStationClick, onLengthsCalculated }) => {
    const [prefectures, setPrefectures] = useState(null);
    const [municipalities, setMunicipalities] = useState(null);
    const [railroads, setRailroads] = useState(null);
    const [stations, setStations] = useState(null);
    const [zoomLevel, setZoomLevel] = useState(5);
    const [mapBounds, setMapBounds] = useState(null);
    const [lineLengths, setLineLengths] = useState({});
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
        if (map) {
            setZoomLevel(map.getZoom());
            setMapBounds(map.getBounds());
        }

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
    }, [map]);

    useEffect(() => {
        if (!railroads) return;

        const lengths = {};
        railroads.features.forEach(feature => {
            const company = feature.properties.N02_004;
            const line = feature.properties.N02_003;
            const key = `${company}::${line}`;

            let featureLength = 0;
            const geom = feature.geometry;
            if (!geom) return;

            if (geom.type === 'LineString') {
                for (let i = 0; i < geom.coordinates.length - 1; i++) {
                    featureLength += haversineDistance(geom.coordinates[i], geom.coordinates[i + 1]);
                }
            } else if (geom.type === 'MultiLineString') {
                geom.coordinates.forEach(lineString => {
                    for (let i = 0; i < lineString.length - 1; i++) {
                        featureLength += haversineDistance(lineString[i], lineString[i + 1]);
                    }
                });
            }

            lengths[key] = (lengths[key] || 0) + featureLength;
        });

        // Round to 1 decimal place
        const roundedLengths = {};
        for (const key in lengths) {
            roundedLengths[key] = Math.round(lengths[key] * 10) / 10;
        }

        setLineLengths(roundedLengths);
        if (onLengthsCalculated) {
            onLengthsCalculated(roundedLengths);
        }
    }, [railroads, onLengthsCalculated]);

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
        const prefFeature = prefectures?.features.find(f => f.properties.shapeName === prefName);
        if (prefFeature?.properties.bounds) map.fitBounds(prefFeature.properties.bounds);
    }, [prefectures, map]);

    const handleRailroadClick = useCallback(line => setSelectedLines(p => p.includes(line) ? p.filter(l => l !== line) : [...p, line]), []);
    const handleStationClick = useCallback(name => setHighlightedStations(p => p.includes(name) ? p.filter(s => s !== name) : [...p, name]), []);

    const visibleStations = useMemo(() => {
        if (!stations || !mapBounds || zoomLevel <= 8) return null;
        const data = {};
        const features = stations.features;
        const len = features.length;

        for (let i = 0; i < len; i++) {
            const s = features[i];
            const geom = s.geometry;
            if (!geom) continue;

            let rawCoords = geom.coordinates;
            if (geom.type === 'LineString' && Array.isArray(rawCoords[0])) {
                rawCoords = rawCoords[0];
            }

            if (Array.isArray(rawCoords) && rawCoords.length >= 2 && typeof rawCoords[0] === 'number') {
                const lat = rawCoords[1];
                const lng = rawCoords[0];

                // Fast bounds check
                if (lat >= mapBounds.getSouth() && lat <= mapBounds.getNorth() &&
                    lng >= mapBounds.getWest() && lng <= mapBounds.getEast()) {

                    const name = s.properties.N02_005;
                    const key = `${s.properties.N02_004}::${s.properties.N02_003}`;

                    if (!data[name]) data[name] = { coords: [lat, lng], lines: [] };
                    data[name].lines.push(key);
                }
            }
        }
        return data;
    }, [stations, mapBounds, zoomLevel]);

    const hierarchicalStations = useMemo(() => {
        if (!stations) return null;
        const hierarchy = {};
        stations.features.forEach(s => {
            const company = s.properties.N02_004;
            const line = s.properties.N02_003;
            const stationName = s.properties.N02_005;

            if (!hierarchy[company]) hierarchy[company] = {};
            if (!hierarchy[company][line]) hierarchy[company][line] = {};

            // Just store station names for now, or more if needed
            hierarchy[company][line][stationName] = true;
        });
        console.log('Hierarchical Stations Structure:', hierarchy);
        return hierarchy;
    }, [stations]);

    return (
        <>
            <Pane name="prefecture-fill" style={{ zIndex: 410 }}>
                <JapanMap
                    className="japan-map-fill"
                    prefectures={prefectures}
                    onPrefectureClick={handlePrefectureClick}
                    getColor={getColor}
                    interactive={zoomLevel <= 8}
                    zoom={zoomLevel}
                />
            </Pane>
            <Pane name="municipal-lines" style={{ zIndex: 412 }}>
                {zoomLevel > 8 && (
                    <MunicipalMap
                        className="municipal-map"
                        municipalities={municipalities}
                        getColor={getColor}
                        zoom={zoomLevel}
                    />
                )}
            </Pane>
            <Pane name="prefecture-outline" style={{ zIndex: 415 }}>
                {zoomLevel > 8 &&
                    <JapanMap
                        className="japan-map-outline"
                        prefectures={prefectures}
                        getColor={getColor}
                        outlineOnly={true}
                        interactive={false}
                        zoom={zoomLevel}
                    />
                }
            </Pane>
            <Pane name="railroads" style={{ zIndex: 420 }}>
                <Railroads
                    className="railroads-component"
                    railroads={railroads}
                    selectedLines={selectedLines}
                    onRailroadClick={handleRailroadClick}
                    getColor={getColor}
                    zoom={zoomLevel}
                />
            </Pane>
            <Pane name="stations" style={{ zIndex: 500 }}>
                {visibleStations &&
                    <Stations
                        processedStations={visibleStations}
                        highlightedStations={highlightedStations}
                        handleStationClick={handleStationClick}
                        zoom={zoomLevel}
                        getColor={getColor}
                        selectedLines={selectedLines}
                    />
                }
            </Pane>
        </>
    );
};

export default memo(MapPane);
