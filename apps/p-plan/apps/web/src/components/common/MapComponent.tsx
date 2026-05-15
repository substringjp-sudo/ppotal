'use client';

import { useEffect, useRef, useState } from 'react';
import { CATEGORY_MAP, DESIGN_TOKENS, isGoogleMapsReady } from '@pplaner/shared';
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';

export interface MapRegion {
    id: string | number;
    name: string;
    type: 'country' | 'prefecture' | 'city';
    countryId?: string;
    prefectureId?: string;
    parentPrefectureId?: string;
}

export interface MapProps {
    center: { lat: number; lng: number };
    zoom: number;
    markers?: Array<{ 
        lat: number; 
        lng: number; 
        title?: string; 
        id?: string; 
        type?: string;
        category?: string;
        subCategory?: string;
        label?: string;
        description?: string;
        day?: number;
        highlighted?: boolean;
        isAdded?: boolean;
        isWishlist?: boolean;
        city?: string;
        prefecture?: string;
        country?: string;
    }>;
    path?: Array<{ lat: number; lng: number }>;
    mapSegments?: Array<{
        path: { lat: number; lng: number }[];
        isInteractive?: boolean;
        insertAfterIndex?: number;
    }>;
    flightPaths?: Array<{ from: { lat: number; lng: number }; to: { lat: number; lng: number } }>;
    highlightedId?: string;
    regions?: Array<MapRegion>;
    isMapPlanningMode?: boolean;
    mapInsertAfterIndex?: number | null;
    onMapClick?: (lat: number, lng: number) => void;
    onMarkerClick?: (id: string, isFromPath?: boolean) => void;
    onMarkerHover?: (id: string | null) => void;
    onPolylineClick?: (insertAfterIndex: number) => void;
    onLoad?: (map: google.maps.Map) => void;
    drawingMode?: boolean;
    onDrawingModeChange?: (isDrawing: boolean) => void;
    onPolygonComplete?: (coords: google.maps.LatLngLiteral[]) => void;
    showDrawingControl?: boolean;
    'aria-label'?: string;
    role?: string;
}

const MARKER_PATHS: Record<string, string> = {
    airport: "M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z",
    accommodation: "M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm0-4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM20 10V7c0-1.1-.9-2-2-2H9v7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-3c0-1.1-.9-2-2-2h-3v-4h4z",
    meal: "M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z",
    shopping: "m20,6h-4c0-2.21-1.79-4-4-4s-4,1.79-4,4h-4c-1.1,0-2,.89-2,2v12c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V8c0-1.11-0.9-2-2-2Zm-8-2c1.1,0,2,0.9,2,2h-4c0-1.1,0.9-2,2-2Zm0,10c-2.21,0-4-1.79-4-4h2c0,1.1,0.9,2,2,2s2-0.9,2-2h2c0,2.21-1.79,4-4,4Z",
    sightseeing: "M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1 1.1-.49 1.1-1.1-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z",
    people: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
    transport: "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z",
    activity: "M13.5 1.5c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zM9.8 9.2c-.4-.7-.1-1.5.5-2.1L13 4.4c.5-.5 1.3-.6 1.9-.2l3.4 2.2c.6.4.8 1.1.5 1.8l-1.3 3.1c-.2.5-.8.8-1.4.7l-4.1-.7-1.5 4.5c-.2.6-.8 1-1.4 1s-1.2-.5-1.3-1.1L8.3 12l-3 3.2c-.5.5-1.3.5-1.8 0s-.5-1.3 0-1.8l4.4-4.2h1.9z",
    railway: "M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-4-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-6H7V6h4v5zm5 0h-4V6h4v5zm1.5 6c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z",
    station: "M12 2c-4.41 0-8 3.59-8 8 0 5.42 7.15 11.41 7.15 11.41s7.15-5.99 7.15-11.41c0-4.41-3.59-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z",
    departure: "M9 3L5 6.99h3V14h2V6.99h3L9 3zm7 14.01V10h-2v7.01h-3L15 21l4-3.99h-3z",
    magic: "M7.5 5.6L10 7 8.6 4.5 10 2 7.5 3.4 5 2l1.4 2.5L5 7zm12 9.8L17 14l1.4 2.5L17 19l2.5-1.4L22 19l-1.4-2.5L22 14zM22 2l-2.5 1.4L17 2l1.4 2.5L17 7l2.5-1.4L22 7l-1.4-2.5zm-7.63 5.29c-.39-.39-1.02-.39-1.41 0L1.29 18.96c-.39.39-.39 1.02 0 1.41l2.34 2.34c.39.39 1.02.39 1.41 0L16.71 11.04c.39-.39.39-1.02 0-1.41l-2.34-2.34z",
    arrival: "M9 21l4-3.99h-3V10H8v7.01H5L9 21zm7-14.01V14h2V6.99h3L15 3l-4 3.99h3z",
    other: "M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
    event: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
    check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    interest: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
};

export default function MapComponent({ 
    center, 
    zoom, 
    markers = [], 
    path = [],
    mapSegments = [],
    flightPaths = [],
    highlightedId,
    regions = [],
    isMapPlanningMode = false,
    mapInsertAfterIndex = null,
    onMapClick, 
    onMarkerClick,
    onMarkerHover,
    onPolylineClick,
    onLoad,
    'aria-label': ariaLabel,
    role
}: MapProps) {
    const [isMounted, setIsMounted] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const markersRef = useRef<Map<string, { marker: any; infoWindow?: google.maps.InfoWindow }>>(new Map());
    const iconCacheRef = useRef<Map<string, google.maps.Icon | google.maps.Symbol>>(new Map());
    const polylinesRef = useRef<google.maps.Polyline[]>([]);
    const flightPolylinesRef = useRef<google.maps.Polyline[]>([]);
    const clustererRef = useRef<MarkerClusterer | null>(null);
    const [MarkerLib, setMarkerLib] = useState<google.maps.MarkerLibrary | null>(null);
    const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
    const initialBoundsFitDoneRef = useRef(false);
    const prevRegionsRef = useRef<string>("");
    const hoverInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);

    useEffect(() => {
        setIsMounted(true);

        if (isGoogleMapsReady()) {
            setIsGoogleLoaded(true);
        } else {
            // Script might still be loading, check again shortly
            const timer = setTimeout(() => {
                if (isGoogleMapsReady()) {
                    setIsGoogleLoaded(true);
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    useEffect(() => {
        if (isMounted && ref.current && !map && isGoogleLoaded) {
            const initMap = async () => {
                if (!isGoogleMapsReady()) return;
                
                const newMap = new window.google.maps.Map(ref.current!, {
                    center,
                    zoom,
                    mapId: 'f3e7c8d9a0b1c2d3',
                    disableDefaultUI: true,
                    clickableIcons: false,
                });

                try {
                    const lib = await window.google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
                    setMarkerLib(lib);
                } catch (e) {
                    console.warn("Advanced Marker library failed to load, falling back to legacy markers.");
                }

                newMap.addListener('click', (e: google.maps.MapMouseEvent) => {
                    if (e.latLng && onMapClick) {
                        onMapClick(e.latLng.lat(), e.latLng.lng());
                    }
                });

                setMap(newMap);
                if (onLoad) onLoad(newMap);
            };

            initMap();
        }
    }, [isMounted, isGoogleLoaded, center, zoom, onMapClick, map, onLoad]);

    const fallbackRectsRef = useRef<google.maps.Rectangle[]>([]);
    const geoJsonFeaturesRef = useRef<google.maps.Data.Feature[]>([]);

    // Handle center and zoom updates from props
    useEffect(() => {
        if (map && center) {
            map.setCenter(center);
        }
    }, [map, center]);

    useEffect(() => {
        if (map && zoom !== undefined) {
            map.setZoom(zoom);
        }
    }, [map, zoom]);

    // Handle region boundaries and map viewport
    useEffect(() => {
        if (!map) return;

        const updateMapFeatures = async () => {
            if (!isGoogleMapsReady()) return;
            const regionBounds = new window.google.maps.LatLngBounds();
            let hasPolygons = false;

            // Clear existing data features
            geoJsonFeaturesRef.current.forEach((f: google.maps.Data.Feature) => map.data.remove(f));
            geoJsonFeaturesRef.current = [];

            // Style with premium indigo/violet theme
            map.data.setStyle({
                fillColor: DESIGN_TOKENS.colors.primary.DEFAULT,
                fillOpacity: 0.15,
                strokeColor: DESIGN_TOKENS.colors.primary.DEFAULT,
                strokeWeight: 2,
                strokeOpacity: 0.6,
                clickable: false,
                visible: true,
                zIndex: 10
            });

            if (regions && regions.length > 0) {
                // 1. Fetch and Draw Polygons
                const countriesToFetch = new Set<string>();
                regions.forEach(r => {
                    const rId = r.id.toString();
                    // PPLANER IDs are CCCPPP or CCC where CCC is country.
                    // Prefix is country ID.
                    const rawCid = r.countryId || (rId.length >= 3 ? rId.slice(0, 3) : rId);
                    const cid = parseInt(rawCid).toString();
                    if (cid && !isNaN(parseInt(cid))) {
                        countriesToFetch.add(cid);
                    }
                });

                console.log('[MapComponent] Processing regions:', regions);

                const fetchPromises = Array.from(countriesToFetch).map(async (countryId) => {
                    try {
                        const dataUrl = `/data/region/geoms/country_topo/${countryId}.json`;
                        console.log(`[MapComponent] Fetching topo data from: ${dataUrl}`);
                        const response = await fetch(dataUrl);
                        if (!response.ok) {
                            console.warn(`[MapComponent] Failed to fetch topo for ${countryId}: ${response.status}`);
                            return null;
                        }
                        const topoData = await response.json();
                        const geometries = topoData.objects?.prefectures?.geometries || [];
                        if (geometries.length === 0) return null;

                        const featureCollection = {
                            type: 'FeatureCollection',
                            features: geometries.map((g: any) => ({
                                type: 'Feature',
                                properties: g.properties,
                                geometry: g.geometry
                            }))
                        };

                        const addedFeatures = map.data.addGeoJson(featureCollection);
                        
                        addedFeatures.forEach(feature => {
                            const fId = feature.getProperty('id')?.toString();
                            if (!fId) {
                                map.data.remove(feature);
                                return;
                            }

                            // fId is typically the full prefecture ID (e.g., 410011)
                            // fCountryId is the prefix (e.g., 410)
                            const fCountryId = fId.length >= 3 ? fId.slice(0, 3) : fId;
                            const fPrefId = fId;

                            const isMatch = regions.some(r => {
                                const rIdStr = r.id.toString();
                                const rParentIdStr = (r.prefectureId || r.parentPrefectureId)?.toString();
                                const rCountryIdStr = r.countryId?.toString();

                                // Match by country
                                if (r.type === 'country' && parseInt(fCountryId).toString() === parseInt(rIdStr).toString()) return true;
                                
                                // Match by prefecture ID
                                if (r.type === 'prefecture' && fPrefId === rIdStr) return true;
                                
                                // Match city by its parent prefecture or its own ID if it matches a prefecture geometry
                                if (r.type === 'city') {
                                    if (rParentIdStr && fPrefId === rParentIdStr) return true;
                                    if (fPrefId === rIdStr) return true;
                                }
                                return false;
                            });

                            if (isMatch) {
                                console.log(`[MapComponent] Highlighting feature: ${fId} for region match`);
                                feature.toGeoJson((gj: any) => {
                                    const processGeometry = (geom: any) => {
                                        if (geom.type === 'Polygon') {
                                            geom.coordinates[0].forEach((coord: any) => {
                                                regionBounds.extend({ lng: coord[0], lat: coord[1] });
                                            });
                                        } else if (geom.type === 'MultiPolygon') {
                                            geom.coordinates.forEach((poly: any) => {
                                                poly[0].forEach((coord: any) => {
                                                    regionBounds.extend({ lng: coord[0], lat: coord[1] });
                                                });
                                            });
                                        }
                                    };
                                    processGeometry(gj.geometry);
                                    hasPolygons = true;
                                });
                                geoJsonFeaturesRef.current.push(feature);
                            } else {
                                map.data.remove(feature);
                            }
                        });
                    } catch (error) {
                        console.error('[MapComponent] Region boundary error:', error);
                    }
                });

                await Promise.all(fetchPromises);

                // 2. Zoom Fallback (Geocoder) - Ensure we have good bounds even if polygons missing
                const geocoder = new window.google.maps.Geocoder();
                const zoomPromises = regions.map(async (r) => {
                    try {
                        const result = await geocoder.geocode({ address: r.name });
                        if (result.results?.[0]?.geometry?.viewport) {
                            regionBounds.union(result.results[0].geometry.viewport);
                        } else if (result.results?.[0]?.geometry?.location) {
                            regionBounds.extend(result.results[0].geometry.location);
                        }
                    } catch (e) {
                        console.warn('[MapComponent] Geocode fallback failed for:', r.name);
                    }
                });
                await Promise.all(zoomPromises);

                // 3. Final Zoom Adjustment
                if (!regionBounds.isEmpty()) {
                    console.log('[MapComponent] Fitting bounds to selected regions');
                    map.fitBounds(regionBounds, { top: 100, right: 100, bottom: 100, left: 100 });
                }
            }
        };

        updateMapFeatures();
    }, [map, regions]);

    // Handle polyline for path
    useEffect(() => {
        if (!map) return;
        polylinesRef.current.forEach((p: google.maps.Polyline) => p.setMap(null));
        polylinesRef.current = [];

        if (mapSegments && mapSegments.length > 0) {
            mapSegments.forEach(segment => {
                if (segment.path.length < 2) return;
                
                const isSelected = isMapPlanningMode && segment.insertAfterIndex !== undefined && segment.insertAfterIndex === mapInsertAfterIndex;
                
                // Add glow/shadow effect for the path
                const glowPolyline = new window.google.maps.Polyline({
                    path: segment.path,
                    geodesic: true,
                    strokeColor: isMapPlanningMode ? (isSelected ? '#f472b6' : '#93c5fd') : '#6366f1',
                    strokeOpacity: 0.15,
                    strokeWeight: isMapPlanningMode && isSelected ? 12 : 10,
                    map: map,
                    zIndex: isSelected ? 95 : 5
                });
                polylinesRef.current.push(glowPolyline);

                const polyProps: google.maps.PolylineOptions = {
                    path: segment.path,
                    geodesic: true,
                    strokeColor: isMapPlanningMode ? (isSelected ? '#ec4899' : '#3b82f6') : '#4f46e5',
                    strokeOpacity: isMapPlanningMode ? (isSelected ? 1.0 : 0.6) : 0.9,
                    strokeWeight: isMapPlanningMode && isSelected ? 5 : 4,
                    map: map,
                    clickable: isMapPlanningMode && segment.isInteractive,
                    zIndex: isSelected ? 100 : 10
                };

                // Add dotted lines or arrows based on mode/selection
                if (isMapPlanningMode) {
                    if (isSelected) {
                        polyProps.strokeOpacity = 0;
                        polyProps.icons = [{
                            icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3, strokeColor: '#ec4899' },
                            offset: '0',
                            repeat: '15px'
                        }];
                    } else {
                        polyProps.icons = [{
                            icon: { 
                                path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW, 
                                scale: 2.5, 
                                strokeWeight: 2, 
                                fillOpacity: 1, 
                                fillColor: '#ffffff',
                                strokeColor: '#3b82f6'
                            },
                            offset: '50%'
                        }];
                    }
                } else {
                    polyProps.icons = [{
                        icon: { 
                            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW, 
                            scale: 2.5, 
                            strokeWeight: 2, 
                            fillOpacity: 1, 
                            fillColor: '#ffffff',
                            strokeColor: '#4f46e5'
                        },
                        offset: '0', 
                        repeat: '120px'
                    }];
                }

                const mainPolyline = new window.google.maps.Polyline(polyProps);
                
                if (isMapPlanningMode && segment.isInteractive && onPolylineClick && segment.insertAfterIndex !== undefined) {
                    mainPolyline.addListener('click', () => {
                        onPolylineClick(segment.insertAfterIndex!);
                    });
                }
                
                polylinesRef.current.push(mainPolyline);
            });
        } else if (path && path.length > 1) {
            const glowPolyline = new window.google.maps.Polyline({
                path: path, geodesic: true, strokeColor: '#6366f1', strokeOpacity: 0.15, strokeWeight: 12, map: map
            });
            polylinesRef.current.push(glowPolyline);

            const mainPolyline = new window.google.maps.Polyline({
                path: path, geodesic: true, strokeColor: '#4f46e5', strokeOpacity: 0.9, strokeWeight: 5,
                icons: [{
                    icon: { 
                        path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW, 
                        scale: 2.5, 
                        strokeWeight: 2, 
                        fillOpacity: 1, 
                        fillColor: '#ffffff',
                        strokeColor: '#4f46e5'
                    },
                    offset: '0', 
                    repeat: '120px'
                }],
                map: map
            });
            polylinesRef.current.push(mainPolyline);
        }
    }, [map, path, mapSegments, isMapPlanningMode, mapInsertAfterIndex, onPolylineClick]);

    // Handle Flight Paths
    useEffect(() => {
        if (!map) return;
        flightPolylinesRef.current.forEach((p: google.maps.Polyline) => p.setMap(null));
        flightPolylinesRef.current = [];

        if (flightPaths && flightPaths.length > 0) {
            flightPaths.forEach(fp => {
                const dashPoly = new window.google.maps.Polyline({
                    path: [fp.from, fp.to], 
                    geodesic: true, 
                    strokeColor: '#818cf8', 
                    strokeOpacity: 0.4, 
                    strokeWeight: 4,
                    icons: [{
                        icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.8, scale: 2, strokeWeight: 2 },
                        offset: '0', 
                        repeat: '20px'
                    }],
                    map: map
                });
                flightPolylinesRef.current.push(dashPoly);

                const heading = window.google.maps.geometry?.spherical 
                    ? window.google.maps.geometry.spherical.computeHeading(
                        new window.google.maps.LatLng(fp.from.lat, fp.from.lng),
                        new window.google.maps.LatLng(fp.to.lat, fp.to.lng)
                    ) 
                    : 0;

                const flightPoly = new window.google.maps.Polyline({
                    path: [fp.from, fp.to], 
                    geodesic: true, 
                    strokeColor: '#6366f1', 
                    strokeOpacity: 0.6, 
                    strokeWeight: 2,
                    icons: [{
                        icon: {
                            path: "M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z",
                            scale: 1.2, 
                            fillColor: '#4f46e5', 
                            fillOpacity: 1, 
                            strokeWeight: 1.5, 
                            strokeColor: 'white', 
                            rotation: heading
                        },
                        offset: '50%',
                    }],
                    map: map
                });
                flightPolylinesRef.current.push(flightPoly);
            });
        }
    }, [map, flightPaths]);

    const getIconByMarkerType = (type?: string, category?: string, isHighlighted?: boolean, label?: string, isAdded?: boolean, day?: number, isWishlist?: boolean) => {
        const cacheKey = `${type}-${category}-${isHighlighted}-${label}-${isAdded}-${day}-${isWishlist}`;
        if (iconCacheRef.current.has(cacheKey)) return iconCacheRef.current.get(cacheKey)!;

        // Base color system - Premium Palette
        let iconColor = '#6366f1'; // Indigo base
        let secondaryColor = '#4f46e5';
        let glowColor = 'rgba(99, 102, 241, 0.4)';

        if (isAdded) {
            iconColor = '#10b981'; secondaryColor = '#059669'; glowColor = 'rgba(16, 185, 129, 0.4)';
        } else if (type === 'airport' || category === 'Transport') {
            iconColor = '#3b82f6'; secondaryColor = '#2563eb'; glowColor = 'rgba(59, 130, 246, 0.4)';
        } else if (type === 'accommodation' || category === 'Stay') {
            iconColor = '#8b5cf6'; secondaryColor = '#7c3aed'; glowColor = 'rgba(139, 92, 246, 0.4)';
        } else if (category && (CATEGORY_MAP as any)[category]) {
            iconColor = (CATEGORY_MAP as any)[category].color;
            secondaryColor = iconColor.includes('#') ? `${iconColor}dd` : iconColor;
            glowColor = `${iconColor}44`;
        } else if (isWishlist || type === 'wishlist') {
            iconColor = '#f43f5e'; secondaryColor = '#e11d48'; glowColor = 'rgba(244, 63, 94, 0.4)';
        }

        const typeLower = type?.toLowerCase();
        const categoryLower = category?.toLowerCase();
        
        let normalizedCategory = categoryLower;
        if (categoryLower === 'restaurant' || categoryLower === 'food' || typeLower === 'restaurant') normalizedCategory = 'meal';
        if (categoryLower === 'shopping_bag' || categoryLower === 'store') normalizedCategory = 'shopping';
        if (categoryLower === 'explore' || categoryLower === 'museum' || typeLower === 'attraction') normalizedCategory = 'sightseeing';
        if (categoryLower === 'person' || categoryLower === 'people') normalizedCategory = 'people';
        if (categoryLower === 'bed' || categoryLower === 'hotel') normalizedCategory = 'accommodation';
        if (typeLower === 'interest') normalizedCategory = 'interest';

        let pathKey = isAdded ? 'check' : (typeLower === 'airport' ? 'airport' : (normalizedCategory || (typeLower === 'accommodation' ? 'accommodation' : typeLower) || 'event'));
        if (!MARKER_PATHS[pathKey]) pathKey = 'event';
        const pathIcon = MARKER_PATHS[pathKey];

        const baseSize = markers.length > 300 ? 24 : (markers.length > 50 ? 32 : 40);
        const size = isHighlighted ? baseSize * 1.3 : baseSize;
        const half = size / 2;
        const iconSize = size * 0.55;

        let svg = '';

        if (isHighlighted) {
            // Premium Active Marker with Outer Ring (Pulse Effect simulation)
            svg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="${size + 16}" height="${size + 24}" viewBox="-8 -8 ${size + 16} ${size + 24}">
                    <defs>
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                        <linearGradient id="grad-active" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style="stop-color:${iconColor};stop-opacity:1" />
                            <stop offset="100%" style="stop-color:${secondaryColor};stop-opacity:1" />
                        </linearGradient>
                    </defs>
                    
                    <!-- Pulsing outer circle -->
                    <circle cx="${half}" cy="${half}" r="${half + 6}" fill="${glowColor}">
                        <animate attributeName="r" values="${half + 2};${half + 8};${half + 2}" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
                    </circle>

                    <!-- Main Pin Body -->
                    <path d="M ${half} ${size + 4} C ${half + 8} ${size - 4} ${size} ${size - 8} ${size} ${half} C ${size} ${half / 2} ${size * 0.75} 0 ${half} 0 C ${half / 4} 0 0 ${half / 2} 0 ${half} C 0 ${size - 8} ${half - 8} ${size - 4} ${half} ${size + 4} Z" fill="white" filter="url(#glow)" />
                    <path d="M ${half} ${size + 2} C ${half + 6} ${size - 4} ${size - 2} ${size - 8} ${size - 2} ${half} C ${size - 2} ${half / 2 + 2} ${size * 0.75} 2 ${half} 2 C ${half / 4 + 2} 2 2 ${half / 2 + 2} 2 ${half} C 2 ${size - 8} ${half - 6} ${size - 4} ${half} ${size + 2} Z" fill="url(#grad-active)" />
                    
                    <!-- Center Icon -->
                    <g transform="translate(${(size - iconSize) / 2}, ${(size - iconSize) / 2.5}) scale(${iconSize / 24})">
                        <path d="${pathIcon}" fill="white" />
                    </g>

                    <!-- Sequence Label if available -->
                    ${label ? `
                        <g transform="translate(${size - 2}, ${2})">
                            <circle cx="6" cy="6" r="8" fill="#ffffff" stroke="${secondaryColor}" stroke-width="1.5" />
                            <text x="6" y="6" font-family="Pretendard, sans-serif" font-size="9" font-weight="900" fill="${secondaryColor}" text-anchor="middle" dominant-baseline="middle">${label}</text>
                        </g>
                    ` : ''}
                </svg>
            `;
        } else {
            // Standard Premium Pin
            svg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 8}" viewBox="0 0 ${size} ${size + 8}">
                    <defs>
                        <linearGradient id="grad-${cacheKey}" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style="stop-color:${iconColor};stop-opacity:1" />
                            <stop offset="100%" style="stop-color:${secondaryColor};stop-opacity:1" />
                        </linearGradient>
                        <filter id="shadow-${cacheKey}" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="rgba(0,0,0,0.2)"/>
                        </filter>
                    </defs>
                    <g filter="url(#shadow-${cacheKey})">
                        <path d="M ${half} ${size + 4} C ${half + 6} ${size - 2} ${size} ${size - 6} ${size} ${half} C ${size} ${half / 2} ${size * 0.75} 0 ${half} 0 C ${half / 4} 0 0 ${half / 2} 0 ${half} C 0 ${size - 6} ${half - 6} ${size - 2} ${half} ${size + 4} Z" fill="white" />
                        <path d="M ${half} ${size + 2} C ${half + 5} ${size - 2} ${size - 2} ${size - 6} ${size - 2} ${half} C ${size - 2} ${half / 2 + 2} ${size * 0.75} 2 ${half} 2 C ${half / 4 + 2} 2 2 ${half / 2 + 2} 2 ${half} C 2 ${size - 6} ${half - 5} ${size - 2} ${half} ${size + 2} Z" fill="url(#grad-${cacheKey})" />
                        
                        <g transform="translate(${(size - iconSize) / 2}, ${(size - iconSize) / 2.5}) scale(${iconSize / 24})">
                            <path d="${pathIcon}" fill="white" fill-opacity="0.9" />
                        </g>
                    </g>
                    ${label ? `
                        <g transform="translate(${size - 4}, 0)">
                            <circle cx="5" cy="5" r="7" fill="${secondaryColor}" stroke="white" stroke-width="1" />
                            <text x="5" y="5" font-family="Pretendard, sans-serif" font-size="8" font-weight="900" fill="white" text-anchor="middle" dominant-baseline="middle">${label}</text>
                        </g>
                    ` : ''}
                </svg>
            `;
        }

        const iconInstance = {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/\s+/g, ' '))}`,
            scaledSize: isHighlighted ? new window.google.maps.Size(size + 16, size + 24) : new window.google.maps.Size(size, size + 8),
            anchor: isHighlighted ? new window.google.maps.Point(half + 8, size + 12) : new window.google.maps.Point(half, size + 4),
            labelOrigin: new window.google.maps.Point(half, half)
        };
        iconCacheRef.current.set(cacheKey, iconInstance);
        return iconInstance;
    };


    const getInfoWindowContent = (mInfo: any, isTooltip = false) => {
        const categoryLabel = mInfo.category ? (CATEGORY_MAP as any)[mInfo.category]?.label : (mInfo.type === 'accommodation' ? '숙소' : '장소');
        const regionInfo = [mInfo.country, mInfo.prefecture, mInfo.city].filter(Boolean).join(' > ');
        
        return `
            <div style="padding: ${isTooltip ? '10px 14px' : '16px'}; min-width: ${isTooltip ? 'auto' : '280px'}; max-width: 320px; font-family: 'Pretendard', -apple-system, sans-serif; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); border: 1px solid rgba(255, 255, 255, 0.5);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <span style="font-size: 10px; font-weight: 900; color: #6366f1; background: #eef2ff; padding: 2px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.05em;">
                        ${categoryLabel}
                    </span>
                    ${mInfo.subCategory ? `<span style="font-size: 10px; font-weight: 700; color: #94a3b8;">•</span> <span style="font-size: 10px; font-weight: 700; color: #64748b;">${mInfo.subCategory}</span>` : ''}
                </div>
                <h3 style="margin: 0; font-size: ${isTooltip ? '15px' : '18px'}; font-weight: 800; color: #0f172a; line-height: 1.4; letter-spacing: -0.02em;">${mInfo.title}</h3>
                
                ${!isTooltip && regionInfo ? `
                    <div style="display: flex; align-items: center; gap: 4px; margin-top: 8px;">
                        <span style="font-size: 11px; font-weight: 600; color: #64748b; background: #f1f5f9; padding: 3px 8px; border-radius: 8px;">${regionInfo}</span>
                    </div>
                ` : ''}
 
                ${!isTooltip && mInfo.address ? `
                    <p style="font-size: 12px; font-weight: 500; color: #475569; margin: 10px 0 0 0; display: flex; align-items: start; gap: 6px;">
                        <span style="font-size: 14px; color: #6366f1; opacity: 0.8;">📍</span>
                        <span style="line-height: 1.5;">${mInfo.address}</span>
                    </p>
                ` : ''}
                
                ${!isTooltip && mInfo.description ? `
                    <div style="font-size: 12px; color: #64748b; margin-top: 12px; line-height: 1.6; background: #f8fafc; padding: 10px; border-radius: 12px; border-left: 4px solid #6366f1; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
                        ${mInfo.description}
                    </div>
                ` : ''}
 
                ${!isTooltip ? `
                    <div style="margin-top: 14px; border-top: 1px solid #f1f5f9; padding-top: 10px; display: flex; justify-content: flex-end;">
                        <span style="font-size: 11px; font-weight: 700; color: #6366f1; cursor: pointer;">상세보기 →</span>
                    </div>
                ` : ''}
            </div>
        `;
    };


    const lastHighlightedIdRef = useRef<string | null>(null);

    const staticMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());

    useEffect(() => {
        if (!map) return;

        const updateMarkers = () => {
            if (!isGoogleMapsReady()) return;

            if (!clustererRef.current) {
                clustererRef.current = new MarkerClusterer({ 
                    map,
                    algorithm: new SuperClusterAlgorithm({ radius: 60, maxZoom: 15 }),
                });
            }

            if (!hoverInfoWindowRef.current) {
                hoverInfoWindowRef.current = new window.google.maps.InfoWindow({
                    disableAutoPan: true
                });
            }

            const incomingIds = new Set(markers.map(m => m.id).filter(Boolean) as string[]);
            const newClusterMarkers: google.maps.Marker[] = [];
            
            markersRef.current.forEach((item, id) => {
                if (!incomingIds.has(id)) {
                    clustererRef.current?.removeMarker(item.marker);
                    item.marker.setMap(null);
                    item.infoWindow?.close();
                    markersRef.current.delete(id);
                }
            });

            markers.forEach((mInfo) => {
                if (!mInfo.id) return;
                const isSelected = mInfo.id === highlightedId;
                const icon = getIconByMarkerType(mInfo.type, mInfo.category, isSelected, mInfo.label, mInfo.isAdded, mInfo.day, mInfo.isWishlist);
                let existing = markersRef.current.get(mInfo.id);

                if (existing) {
                    const marker = existing.marker;
                    if (marker.getPosition()?.lat() !== mInfo.lat || marker.getPosition()?.lng() !== mInfo.lng) {
                        marker.setPosition({ lat: mInfo.lat, lng: mInfo.lng });
                    }
                    marker.setIcon(icon);
                    marker.setZIndex(isSelected ? 3000 : (mInfo.isWishlist ? 100 : 500));
                    
                    if (mInfo.isWishlist) {
                        clustererRef.current?.removeMarker(marker);
                        if (marker.getMap() !== map) marker.setMap(map);
                    } else {
                        if (marker.getMap() !== null) marker.setMap(null);
                        newClusterMarkers.push(marker);
                    }
                    
                    // Update InfoWindow content even if existing
                    existing.infoWindow?.setContent(getInfoWindowContent(mInfo));
                } else {
                    const marker = new window.google.maps.Marker({
                        position: { lat: mInfo.lat, lng: mInfo.lng },
                        map: mInfo.isWishlist ? map : null,
                        title: mInfo.title,
                        icon: icon,
                        zIndex: isSelected ? 3000 : (mInfo.isWishlist ? 100 : 500),
                    });

                    const infoWindow = new window.google.maps.InfoWindow({
                        content: getInfoWindowContent(mInfo)
                    });

                    marker.addListener('mouseover', () => {
                        if (hoverInfoWindowRef.current) {
                            hoverInfoWindowRef.current.setContent(getInfoWindowContent(mInfo, true));
                            hoverInfoWindowRef.current.open(map, marker);
                        }
                        if (onMarkerHover) onMarkerHover(mInfo.id!);
                    });

                    marker.addListener('mouseout', () => {
                        hoverInfoWindowRef.current?.close();
                        if (onMarkerHover) onMarkerHover(null);
                    });

                    marker.addListener('click', () => {
                        hoverInfoWindowRef.current?.close();
                        // Only open detailed InfoWindow if it's NOT a wishlist item (redundancy check)
                        if (!mInfo.isWishlist) {
                            infoWindow.open(map, marker);
                        }
                        if (onMarkerClick) onMarkerClick(mInfo.id!);
                    });

                    markersRef.current.set(mInfo.id, { marker, infoWindow });
                    if (mInfo.isWishlist) {
                        marker.setMap(map);
                    } else {
                        newClusterMarkers.push(marker);
                    }
                }
            });

            // Handle clustering refresh more stably
            if (newClusterMarkers.length > 0) {
                clustererRef.current.clearMarkers();
                clustererRef.current.addMarkers(newClusterMarkers);
            } else {
                clustererRef.current.clearMarkers();
            }
            
            lastHighlightedIdRef.current = highlightedId || null;
        };

        // Slight debounce
        const timer = setTimeout(updateMarkers, 100);
        return () => clearTimeout(timer);
    }, [map, markers, highlightedId, onMarkerClick]);

    if (!isMounted) return <div className="w-full h-full min-h-[400px] bg-slate-50 dark:bg-slate-800 flex items-center justify-center rounded-3xl" />;

    return (
        <div className="relative w-full h-full min-h-[500px] rounded-3xl overflow-hidden group shadow-2xl">
            <div ref={ref} className="w-full h-full min-h-[500px]" aria-label={ariaLabel} role={role} />
            
            {/* Drawing controls removed as per requirement */}
        </div>
    );
}
