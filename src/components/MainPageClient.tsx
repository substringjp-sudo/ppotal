"use client";

import dynamic from 'next/dynamic';
import React from 'react';

import { trackEvent } from '../lib/gtag';
import html2canvas from 'html2canvas';
import HowToModal from './HowToModal';
import { useRailData } from '../hooks/useRailData';
import { useMapData } from '../hooks/useMapData';
import { Trip } from '../types/trip';
import { LineSegment, StationNode } from '../lib/graphUtils';
import { useAuth } from '../lib/auth-context';
import { db } from '../lib/firebase';
import { collection, query, getDocs, setDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';

import { Station } from '../types/railData';
import { MapProps } from './Map';
import MapLoadingIndicator from './MapLoadingIndicator';
import FeedbackModal from './FeedbackModal';

const MapWithNoSSR = dynamic<MapProps>(() => import('./Map'), {
    ssr: false,
    loading: () => <div style={{ height: '100%', width: '100%', backgroundColor: '#a0c4ff' }} />
});

const MapPaneWithNoSSR = dynamic(() => import('./MapPane'), { ssr: false });
import { SidebarProps } from './Sidebar';

const SidebarWithNoSSR = dynamic<SidebarProps>(() => import('./Sidebar'), { ssr: false });
import MyLinesPane from './MyLinesPane';

import type { MobileLinePreviewProps } from './Mobile/MobileLinePreview';
const MobileLinePreviewWithNoSSR = dynamic<MobileLinePreviewProps>(() => import('./Mobile/MobileLinePreview'), { ssr: false });

import type { MobileStationPreviewProps } from './Mobile/MobileStationPreview';
const MobileStationPreviewWithNoSSR = dynamic<MobileStationPreviewProps>(() => import('./Mobile/MobileStationPreview'), { ssr: false });

import type { LineDetailPaneProps } from './LineDetailPane';
const LineDetailPaneWithNoSSR = dynamic<LineDetailPaneProps>(() => import('./LineDetailPane'), { ssr: false });

import type { StationDetailPaneProps } from './StationDetailPane';
const StationDetailPaneWithNoSSR = dynamic<StationDetailPaneProps>(() => import('./StationDetailPane'), { ssr: false });


export interface MapStyleSettings {
    unselected: {
        opacity: number;
        weight: number;
    };
    unvisited: {
        weight: number;
        showOutline: boolean;
        stationSize: number;
    };
    visited: {
        weight: number;
        showOutline: boolean;
        stationSize: number;
    };
}

export const DEFAULT_STYLE_SETTINGS: MapStyleSettings = {
    unselected: {
        opacity: 0.3,
        weight: 1.0,
    },
    unvisited: {
        weight: 2.5,
        showOutline: true,
        stationSize: 1.0,
    },
    visited: {
        weight: 3.5,
        showOutline: true,
        stationSize: 1.2,
    }
};

const MobileBottomSheet = dynamic(() => import('./Mobile/MobileBottomSheet'), { ssr: false });
const MobileEditLinePanelWithNoSSR = dynamic(() => import('./Mobile/MobileEditLinePanel'), { ssr: false });
const RouteCreationPanelWithNoSSR = dynamic(() => import('./Mobile/RouteCreationPanel'), { ssr: false });

const MainPageClient = () => {
    const [selectedLines, setSelectedLines] = React.useState<string[]>([]);
    const [lineLengths, setLineLengths] = React.useState<Record<string, number>>({});
    const [visitedLineLengths, setVisitedLineLengths] = React.useState<Record<string, number>>({});
    const [recordedTrips, setRecordedTrips] = React.useState<Trip[]>([]);
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [activeLine, setActiveLine] = React.useState<string | null>(null);
    const [lineDetailData, setLineDetailData] = React.useState<{
        segments: LineSegment[],
        visitedEdges: Set<string>,
        visitedStations: Set<string>,
        nodes: Map<string, StationNode>,
        getShortestPath: (start: string, end: string, lines: string[]) => { path: string[], distance: number, geometries: [number, number][][], sectionIds: number[] } | null
    } | null>(null);
    const [styleSettings] = React.useState<MapStyleSettings>(DEFAULT_STYLE_SETTINGS);
    const [selectedStation, setSelectedStation] = React.useState<Station | null>(null);
    const [isMobile, setIsMobile] = React.useState(false);

    const [isEditMode, setIsEditMode] = React.useState(false);
    const [draftTrip, setDraftTrip] = React.useState<Trip | null>(null);
    const [tempPath, setTempPath] = React.useState<string[]>([]);
    const [editPanelHeight, setEditPanelHeight] = React.useState(72);
    const [isHowToOpen, setIsHowToOpen] = React.useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = React.useState(false);
    const [isMapTransitioning, setIsMapTransitioning] = React.useState(false);
    const [showLabels, setShowLabels] = React.useState(false);
    const { user, loading: authLoading } = useAuth();

    const toFirestoreTrip = (trip: Trip) => ({
        ...trip,
        geometries: JSON.stringify(trip.geometries)
    });

    const fromFirestoreTrip = (data: Record<string, unknown>): Trip => ({
        ...(data as unknown as Trip),
        geometries: typeof data.geometries === 'string' ? JSON.parse(data.geometries) : data.geometries
    });

    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
            if (window.innerWidth > 768) setIsEditMode(false);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const exportMap = async () => {
        const mapElement = document.querySelector('.leaflet-container') as HTMLElement;
        if (!mapElement) return;
        const controls = document.querySelectorAll('.leaflet-control, .map-custom-control, .edit-mode-ui');
        controls.forEach(c => (c as HTMLElement).style.display = 'none');
        try {
            const canvas = await html2canvas(mapElement, {
                useCORS: true,
                backgroundColor: '#a0c4ff',
                ignoreElements: (element: Element) => element.classList?.contains('edit-mode-ui') ?? false
            } as Parameters<typeof html2canvas>[1]);
            const link = document.createElement('a');
            link.download = `jprail-map-${new Date().toISOString().slice(0, 10)}.png`;
            link.href = canvas.toDataURL();
            link.click();
            trackEvent('export_map', 'engagement', 'png');
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            controls.forEach(c => (c as HTMLElement).style.display = '');
        }
    };

    const { railData, isLoading: isRailLoading } = useRailData();
    const { isLoading: isMapDataLoading } = useMapData();

    const isTotalLoading = !isLoaded || isRailLoading || isMapDataLoading;

    React.useEffect(() => {
        if (railData && railData.hierarchy) {
            const allKeys: string[] = [];
            const hierarchyData = (railData.hierarchy.companies || railData.hierarchy);
            Object.entries(hierarchyData).forEach(([companyId, companyObj]) => {
                const lines = companyObj.lines || companyObj;
                Object.keys(lines).forEach(lineId => allKeys.push(`${companyId}::${lineId}`));
            });
            setSelectedLines(allKeys);
        }
    }, [railData]);

    React.useEffect(() => {
        if (typeof window === 'undefined') return;

        const loadInitialData = async () => {
            if (authLoading) return;
            try {
                const saved = localStorage.getItem('jprail_trips');
                let localTrips: Trip[] = [];
                if (saved) {
                    localTrips = JSON.parse(saved);
                }

                if (user) {
                    const tripsRef = collection(db, `users/${user.uid}/trips`);
                    const q = query(tripsRef);
                    const querySnapshot = await getDocs(q);
                    const cloudTrips: Trip[] = [];
                    querySnapshot.forEach((doc) => {
                        cloudTrips.push(fromFirestoreTrip(doc.data()));
                    });

                    if (cloudTrips.length === 0 && localTrips.length > 0) {
                        const batch = writeBatch(db);
                        localTrips.forEach(trip => {
                            const tRef = doc(db, `users/${user.uid}/trips`, trip.id);
                            batch.set(tRef, toFirestoreTrip(trip));
                        });
                        await batch.commit();
                        setRecordedTrips(localTrips);
                    } else {
                        setRecordedTrips(cloudTrips.length > 0 ? cloudTrips : localTrips);
                    }
                } else {
                    setRecordedTrips(localTrips);
                }
            } catch (e) {
                console.error("Failed to load initial trips", e);
            } finally {
                setIsLoaded(true);
            }
        };

        loadInitialData();
    }, [user, authLoading]);

    React.useEffect(() => {
        if (isLoaded && typeof window !== 'undefined') {
            try {
                localStorage.setItem('jprail_trips', JSON.stringify(recordedTrips));
            } catch (e) {
                console.error("Failed to save trips to localStorage", e);
            }
        }
    }, [recordedTrips, isLoaded]);

    const handleRecordTrip = React.useCallback(async (trip: Trip) => {
        setRecordedTrips(prev => {
            if (prev.find(t => t.id === trip.id)) return prev;
            return [...prev, trip];
        });

        trackEvent('record_trip', 'engagement', `${trip.start} to ${trip.end}`, Math.round(trip.distance));

        if (user) {
            try {
                await setDoc(doc(db, `users/${user.uid}/trips`, trip.id), toFirestoreTrip(trip));
            } catch (e) {
                console.error("Cloud sync failed", e);
            }
        }
    }, [user]);

    const toggleLine = React.useCallback((line: string) => {
        setSelectedLines(prev => {
            const isSelected = prev.includes(line);
            trackEvent('line_toggle', 'interaction', line, isSelected ? 0 : 1);
            let next = isSelected ? prev.filter(l => l !== line) : [...prev, line];
            if (next.length > 1 && next.includes("__NONE__")) next = next.filter(l => l !== "__NONE__");
            return next;
        });
    }, []);

    const setSelectedLinesList = React.useCallback((lines: string[]) => {
        setSelectedLines(lines);
    }, []);

    const [zoomTarget, setZoomTarget] = React.useState<{ type: 'line' | 'station', id: string } | null>(null);

    const handleRailroadClick = React.useCallback((line: string) => {
        setActiveLine(line);
        setSelectedStation(null);

        setSelectedLines(prev => {
            if (prev.includes(line)) return prev;
            let next = [...prev, line];
            if (next.length > 1 && next.includes("__NONE__")) next = next.filter(l => l !== "__NONE__");
            return next;
        });

        trackEvent('railroad_click', 'interaction', line);
    }, []);

    const handleLineClick = React.useCallback((line: string) => {
        setActiveLine(line);
        setSelectedStation(null);
        setZoomTarget({ type: 'line', id: line });
        setSelectedLines(prev => {
            let next = prev.includes(line) ? prev : [...prev, line];
            if (next.length > 1 && next.includes("__NONE__")) next = next.filter(l => l !== "__NONE__");
            return next;
        });
    }, []);

    const handleStationClick = React.useCallback((stationId: string) => {
        if (isEditMode && tempPath.length > 0) return;
        if (!railData?.stations) return;

        const station = (railData.stations as { [key: string]: Station })[stationId];

        if (station) {
            // Close any existing popups by temporarily setting to null
            setSelectedStation(null);

            setTimeout(() => {
                setSelectedStation(station);
                setActiveLine(null);
                if (isMobile) {
                    setIsMobileSheetOpen(false);
                }
                trackEvent('station_click', 'interaction', station.name);
            }, 0);
        }
    }, [isMobile, isEditMode, tempPath.length, railData]);

    const handleResetTrips = React.useCallback(() => {
        if (window.confirm('Are you sure you want to delete all trip records?')) {
            setRecordedTrips([]);
            setVisitedLineLengths({});
            localStorage.removeItem('jprail_trips');
            trackEvent('reset_all_trips', 'engagement', 'confirm');
        }
    }, []);

    const setLineIdMapping = React.useCallback(() => {
    }, []);

    const stats = React.useMemo(() => {
        const visitedLineIds = Object.keys(visitedLineLengths);
        const lineCount = visitedLineIds.length;
        const distanceCount = Math.round(Object.values(visitedLineLengths).reduce((sum, val) => sum + val, 0) * 10) / 10;
        const companySet = new Set<string>();
        visitedLineIds.forEach(id => {
            const company = id.split('::')[0];
            if (company) companySet.add(company);
        });
        const stationSet = new Set<string>();
        recordedTrips.forEach(trip => {
            if (trip.path) trip.path.forEach((sid: string) => stationSet.add(sid));
        });
        return {
            lines: lineCount,
            stations: stationSet.size,
            distance: distanceCount,
            companies: companySet.size
        };
    }, [visitedLineLengths, recordedTrips]);

    const handleDeleteTrip = React.useCallback(async (id: string) => {
        setRecordedTrips(prev => prev.filter(t => t.id !== id));
        trackEvent('delete_trip', 'engagement', id);

        if (user) {
            try {
                await deleteDoc(doc(db, `users/${user.uid}/trips`, id));
            } catch (e) {
                console.error("Cloud delete failed", e);
            }
        }
    }, [user]);

    const [isMobileSheetOpen, setIsMobileSheetOpen] = React.useState(false);

    const handleMapClick = React.useCallback(() => {
        if (!isMobile || isEditMode) return;
        setSelectedStation(null);
        setActiveLine(null);
        setIsMobileSheetOpen(false);
    }, [isMobile, isEditMode]);

    const handleDraftComplete = React.useCallback((trip: Trip) => {
        setDraftTrip(trip);
        setTempPath([]);
    }, []);

    const handleDragUpdate = React.useCallback((waypoints: string[]) => {
        setTempPath(waypoints);
    }, []);

    const handleStationPathCreate = React.useCallback((startId: string, endId: string) => {
        if (!lineDetailData?.getShortestPath || !activeLine) return;

        const pathData = lineDetailData.getShortestPath(startId, endId, [activeLine]);
        if (pathData) {
            const trip = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                start: lineDetailData.nodes.get(startId)?.name || startId,
                end: lineDetailData.nodes.get(endId)?.name || endId,
                ...pathData,
                waypoints: [startId, endId]
            };
            setDraftTrip(trip);
            setTempPath([]);
        }
    }, [lineDetailData, activeLine]);

    const mobilePreviewLines = React.useMemo(() => {
        if (!selectedStation || !railData?.platforms || !railData.lines) return [];
        const lineIds = selectedStation.platform_ids
            .map(platformId => railData.platforms[platformId]?.line)
            .filter((lineId, index, self) => lineId !== undefined && self.indexOf(lineId) === index);
        return lineIds.map(lineId => {
            const line = railData.lines[lineId];
            if (!line) return null;
            return `${line.corp_id}::${line.id}`;
        }).filter((id): id is string => !!id);
    }, [selectedStation, railData]);

    return (
        <div style={{
            display: 'flex', flexDirection: 'column',
            backgroundColor: '#eee', backgroundImage: 'radial-gradient(#ccc 0.5px, transparent 0.5px)', backgroundSize: '10px 10px'
        }}>
            <div style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative',
                maxWidth: '1920px',
                margin: '0 auto',
                width: '100%',
                boxShadow: '0 0 40px rgba(0,0,0,0.1)'
            }}>
                <a
                    href="#main-content"
                    style={{
                        position: 'absolute',
                        left: '-9999px',
                        top: 'auto',
                        width: '1px',
                        height: '1px',
                        overflow: 'hidden',
                        zIndex: -1,
                        backgroundColor: '#3498db',
                        color: '#fff',
                        padding: '10px 20px',
                        borderRadius: '0 0 8px 8px',
                        textDecoration: 'none',
                        fontWeight: 'bold'
                    }}
                    onFocus={(e) => {
                        e.currentTarget.style.left = '50%';
                        e.currentTarget.style.transform = 'translateX(-50%)';
                        e.currentTarget.style.width = 'auto';
                        e.currentTarget.style.height = 'auto';
                        e.currentTarget.style.zIndex = '10001';
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.left = '-9999px';
                        e.currentTarget.style.width = '1px';
                        e.currentTarget.style.height = '1px';
                        e.currentTarget.style.zIndex = '-1';
                    }}
                >
                    Skip to main content
                </a>

                <header style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #ccc',
                    zIndex: 100, boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#2c3e50', letterSpacing: '-1.5px' }}>
                            {isMobile && isEditMode ? 'Edit Mode' : 'JapanRailNote'}
                        </h1>
                        {!isMobile && (
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>

                                <button
                                    onClick={() => setIsHowToOpen(true)}
                                    aria-label="View Usage Tips"
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        border: '1px solid #3498db',
                                        backgroundColor: 'transparent',
                                        color: '#3498db',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Tips
                                </button>
                                <button
                                    onClick={() => setIsFeedbackOpen(true)}
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        border: '1px solid #3b82f6',
                                        backgroundColor: 'transparent',
                                        color: '#3b82f6',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Feedback
                                </button>
                            </div>
                        )}
                    </div>
                    {isMobile ? (
                        isEditMode ? (
                            <button
                                onClick={() => {
                                    setIsEditMode(false);
                                    setDraftTrip(null);
                                    setTempPath([]);
                                }}
                                style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#2c3e50',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontWeight: 'bold',
                                    fontSize: '14px'
                                }}
                            >
                                Finish
                            </button>
                        ) : (
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={exportMap}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '4px',
                                        border: '1px solid #ddd',
                                        backgroundColor: '#fff',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        color: '#2c3e50'
                                    }}
                                    aria-label="Export Map"
                                >
                                    Export
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditMode(true);
                                        setIsMobileSheetOpen(false);
                                        setSelectedStation(null);
                                        setActiveLine(null);
                                    }}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '4px',
                                        border: '1px solid #ddd',
                                        backgroundColor: '#fff',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        color: '#2c3e50'
                                    }}
                                    aria-label="Edit Route"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => setIsFeedbackOpen(true)}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '4px',
                                        border: '1px solid #3b82f6',
                                        backgroundColor: '#fff',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        color: '#3b82f6',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Feedback
                                </button>
                            </div>
                        )
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Lines</span>
                                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }}>{stats.lines}</span>
                            </div>
                            <div style={{ height: '30px', width: '1px', background: '#ccc' }}></div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Distance</span>
                                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }}>{stats.distance}km</span>
                            </div>
                            <div style={{ height: '30px', width: '1px', background: '#ccc' }}></div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Stations</span>
                                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }}>{stats.stations}</span>
                            </div>
                            <div style={{ height: '30px', width: '1px', background: '#ccc' }}></div>
                            <button
                                onClick={handleResetTrips}
                                style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#e74c3c',
                                    border: '1px solid #e74c3c',
                                    color: '#fff',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '12px'
                                }}
                            >
                                Reset
                            </button>
                            <button
                                onClick={exportMap}
                                style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#2c3e50',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '12px'
                                }}
                            >
                                Export
                            </button>
                        </div>
                    )}
                </header>

                <main id="main-content" style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }} tabIndex={-1}>
                    {isMobile && isEditMode && (
                        <div className="edit-mode-ui" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1200 }}>
                            <RouteCreationPanelWithNoSSR
                                isDragging={tempPath.length > 0}
                                tempPath={tempPath}
                                draftTrip={draftTrip}
                                onAdd={() => {
                                    if (draftTrip) {
                                        handleRecordTrip(draftTrip);
                                        setDraftTrip(null);
                                    }
                                }}
                                onDiscard={() => {
                                    setDraftTrip(null);
                                    setTempPath([]);
                                }}
                                onHeightChange={setEditPanelHeight}
                                railData={railData}
                            />
                        </div>
                    )}

                    {isMobile && !isEditMode && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            zIndex: 1100,
                            backgroundColor: 'rgba(255,255,255,0.95)',
                            borderBottom: '1px solid #ddd',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                        }}>
                            {selectedStation && railData ? (
                                <div style={{ padding: '10px' }}>
                                    <MobileStationPreviewWithNoSSR
                                        station={selectedStation}
                                        lines={mobilePreviewLines}
                                        onLineClick={(lineId: string) => {
                                            handleRailroadClick(lineId);
                                        }}
                                        railData={railData}
                                    />
                                </div>
                            ) : activeLine && lineDetailData && railData ? (
                                <div style={{ padding: '0', maxHeight: '30vh', overflow: 'hidden' }}>
                                    <MobileLinePreviewWithNoSSR
                                        lineId={activeLine}
                                        visitedEdges={lineDetailData.visitedEdges}
                                        segments={lineDetailData.segments}
                                        nodes={lineDetailData.nodes}
                                        visitedStations={lineDetailData.visitedStations}
                                        selectedLines={selectedLines}
                                        onToggleLine={toggleLine}
                                        railData={railData}
                                    />
                                </div>
                            ) : null}
                        </div>
                    )}

                    {!isMobile && (
                        <div style={{ width: '350px', height: '100%', borderRight: '1px solid #ddd', background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                <SidebarWithNoSSR selectedLines={selectedLines} onToggleLine={toggleLine} onSetSelectedLines={setSelectedLinesList} lineLengths={lineLengths} visitedLineLengths={visitedLineLengths} activeLine={activeLine} onLineClick={handleLineClick} />
                            </div>
                        </div>
                    )}

                    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                            <MapWithNoSSR>
                                <MapPaneWithNoSSR
                                    selectedLines={selectedLines}
                                    recordedTrips={recordedTrips}
                                    onRecordTrip={handleRecordTrip}
                                    onRailroadClick={handleRailroadClick}
                                    onStationClick={handleStationClick}
                                    onSetSelectedLines={setSelectedLinesList}
                                    onSetActiveLine={setActiveLine}
                                    onLengthsCalculated={setLineLengths}
                                    onVisitedLengthsCalculated={setVisitedLineLengths}
                                    onLineMappingCreated={setLineIdMapping}
                                    activeLine={activeLine}
                                    onLineDetailData={setLineDetailData}
                                    zoomTarget={zoomTarget}
                                    onZoomComplete={() => setZoomTarget(null)}
                                    styleSettings={styleSettings}
                                    isMobile={isMobile}
                                    selectedStation={selectedStation?.name}
                                    onMapClick={handleMapClick}
                                    showLabels={showLabels}
                                    onToggleLabels={() => setShowLabels(prev => !prev)}
                                    isEditMode={isEditMode}
                                    draftTrip={draftTrip}
                                    onDraftComplete={handleDraftComplete}
                                    onDragUpdate={handleDragUpdate}
                                    rulerTopOffset={editPanelHeight}
                                    onTransitionStateChange={setIsMapTransitioning}
                                />
                            </MapWithNoSSR>
                            <MapLoadingIndicator isLoading={isTotalLoading} isTransitioning={isMapTransitioning} />
                        </div>
                        {!isMobile && lineDetailData && activeLine && railData && (
                            <div style={{ position: 'relative', zIndex: 1100 }}>
                                <LineDetailPaneWithNoSSR
                                    lineId={activeLine}
                                    segments={lineDetailData.segments}
                                    nodes={lineDetailData.nodes}
                                    visitedEdges={lineDetailData.visitedEdges}
                                    selectedLines={selectedLines}
                                    getShortestPath={lineDetailData.getShortestPath}
                                    onRecordTrip={handleRecordTrip}
                                    onStationClick={handleStationClick}
                                    onClose={() => setActiveLine(null)}
                                    onToggleLine={toggleLine}
                                    railData={railData}
                                />
                            </div>
                        )}
                        {!isMobile && selectedStation && railData && (
                            <div style={{ position: 'relative', zIndex: 1100 }}>
                                <StationDetailPaneWithNoSSR
                                    station={selectedStation}
                                    railData={railData}
                                    onClose={() => setSelectedStation(null)}
                                />
                            </div>
                        )}
                    </div>

                    {!isMobile && (
                        <div style={{ width: '300px', height: '100%', borderLeft: '1px solid #ddd', background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', zIndex: 1000, overflowY: 'auto' }}>
                            <MyLinesPane
                                recordedTrips={recordedTrips}
                                onDeleteTrip={handleDeleteTrip}
                                railData={railData}
                            />
                        </div>
                    )}

                    {isMobile && !isEditMode && (
                        <MobileBottomSheet
                            isOpen={isMobileSheetOpen}
                            onToggle={setIsMobileSheetOpen}
                            onExpand={() => {
                                setSelectedStation(null);
                                setActiveLine(null);
                            }}
                            tabs={[
                                {
                                    id: 'sidebar',
                                    label: 'Line List',
                                    summary: (
                                        <div style={{ textAlign: 'center', color: '#666', fontSize: '14px', fontWeight: '500' }}>
                                            Select Lines to Display
                                        </div>
                                    ),
                                    content: (
                                        <SidebarWithNoSSR
                                            selectedLines={selectedLines}
                                            onToggleLine={toggleLine}
                                            onSetSelectedLines={setSelectedLinesList}
                                            lineLengths={lineLengths}
                                            visitedLineLengths={visitedLineLengths}
                                            activeLine={activeLine}
                                            onLineClick={(line: string) => {
                                                handleLineClick(line);
                                                if (isMobile) setIsMobileSheetOpen(false);
                                            }}
                                        />
                                    )
                                },
                                {
                                    id: 'mylines',
                                    label: 'Usage History',
                                    summary: (
                                        <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', fontWeight: 'bold', color: '#555' }}>
                                            <span>{stats.lines} Lines</span>
                                            <span>{stats.distance} km</span>
                                            <span>{stats.stations} Stns</span>
                                        </div>
                                    ),
                                    content: (
                                        <MyLinesPane
                                            recordedTrips={recordedTrips}
                                            onDeleteTrip={handleDeleteTrip}
                                            railData={railData}
                                        />
                                    )
                                }
                            ]}
                        />
                    )}

                    {isMobile && isEditMode && activeLine && lineDetailData && (
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1300 }}>
                            <MobileEditLinePanelWithNoSSR
                                lineId={activeLine}
                                segments={lineDetailData.segments}
                                nodes={lineDetailData.nodes}
                                visitedEdges={lineDetailData.visitedEdges}
                                visitedStations={lineDetailData.visitedStations}
                                onPathCreate={handleStationPathCreate}
                                onClose={() => setIsEditMode(false)}
                                railData={railData}
                            />
                        </div>
                    )}
                </main>
            </div >

            <HowToModal
                isOpen={isHowToOpen}
                onClose={() => setIsHowToOpen(false)}
            />

            <FeedbackModal
                isOpen={isFeedbackOpen}
                onClose={() => setIsFeedbackOpen(false)}
            />
        </div >
    );
};

export default MainPageClient;
