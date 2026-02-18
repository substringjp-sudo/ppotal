"use client";

import dynamic from 'next/dynamic';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { translateName } from '../lib/lineUtils';
import { Language, UI_TRANSLATIONS } from '../lib/translations';
import { trackEvent } from '../lib/gtag';
import html2canvas from 'html2canvas';
import HowToModal from '../components/HowToModal';

const MapWithNoSSR = dynamic(() => import('../components/Map'), {
    ssr: false
});

const MapPaneWithNoSSR = dynamic(() => import('../components/MapPane'), { ssr: false });
const SidebarWithNoSSR = dynamic(() => import('../components/Sidebar'), { ssr: false });
const MyLinesPaneWithNoSSR = dynamic(() => import('../components/MyLinesPane'), { ssr: false });
const MobileLinePreviewWithNoSSR = dynamic(() => import('../components/Mobile/MobileLinePreview'), { ssr: false });
const MobileStationPreviewWithNoSSR = dynamic(() => import('../components/Mobile/MobileStationPreview'), { ssr: false });
const LineDetailPaneWithNoSSR = dynamic(() => import('../components/LineDetailPane'), { ssr: false });



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

const MobileBottomSheet = dynamic(() => import('../components/Mobile/MobileBottomSheet'), { ssr: false });
const MobileEditLinePanelWithNoSSR = dynamic(() => import('../components/Mobile/MobileEditLinePanel'), { ssr: false });
const RouteCreationPanelWithNoSSR = dynamic(() => import('../components/Mobile/RouteCreationPanel'), { ssr: false });
const RulerOverlayWithNoSSR = dynamic(() => import('../components/RulerOverlay'), { ssr: false });

const Page = () => {
    const [selectedLines, setSelectedLines] = React.useState<string[]>([]);
    const [lineLengths, setLineLengths] = React.useState<Record<string, number>>({});
    const [visitedLineLengths, setVisitedLineLengths] = React.useState<Record<string, number>>({});
    const [recordedTrips, setRecordedTrips] = React.useState<any[]>([]);
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [activeLine, setActiveLine] = React.useState<string | null>(null);
    const [lineDetailData, setLineDetailData] = React.useState<{
        segments: any[],
        visitedEdges: Set<string>,
        visitedStations: Set<string>,
        nodes: Map<string, any>,
        getShortestPath: any
    } | null>(null);
    const [zoomToLine, setZoomToLine] = React.useState<string | null>(null);
    const [zoomToStation, setZoomToStation] = React.useState<string | null>(null);
    const [showMyRoutes, setShowMyRoutes] = React.useState(false);
    const [styleSettings, setStyleSettings] = React.useState<MapStyleSettings>(DEFAULT_STYLE_SETTINGS);
    const [language, setLanguage] = React.useState<Language>('en');
    const [selectedStation, setSelectedStation] = React.useState<{ name: string, lines: string[] } | null>(null);
    const [isMobile, setIsMobile] = React.useState(false);

    // Edit Mode State
    const [isEditMode, setIsEditMode] = React.useState(false);
    const [draftTrip, setDraftTrip] = React.useState<any>(null);
    const [tempPath, setTempPath] = React.useState<string[]>([]);
    const [editPanelHeight, setEditPanelHeight] = React.useState(72);
    const [isHowToOpen, setIsHowToOpen] = React.useState(false);

    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
            if (window.innerWidth > 768) setIsEditMode(false); // Auto-exit edit mode on resize to desktop
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const exportMap = async () => {
        const mapElement = document.querySelector('.leaflet-container') as HTMLElement;
        if (!mapElement) return;
        // Hide UI elements for clean screenshot
        const controls = document.querySelectorAll('.leaflet-control, .map-custom-control, .edit-mode-ui');
        controls.forEach(c => (c as HTMLElement).style.display = 'none');
        try {
            const canvas = await html2canvas(mapElement, {
                useCORS: true,
                backgroundColor: '#a0c4ff',
                ignoreElements: (element: Element) => element.classList.contains('edit-mode-ui')
            } as any);
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

    const handleZoomToLine = React.useCallback((lineKey: string) => {
        setZoomToLine(lineKey);
        setTimeout(() => setZoomToLine(null), 2000);
    }, []);

    const handleZoomToStation = React.useCallback((stationName: string) => {
        setZoomToStation(stationName);
        setTimeout(() => setZoomToStation(null), 2000);
    }, []);

    React.useEffect(() => {
        fetch('/data/station_hierarchy.json')
            .then(res => res.json())
            .then((data: Record<string, Record<string, any>>) => {
                const allKeys: string[] = [];
                Object.entries(data).forEach(([comp, lines]) => {
                    Object.keys(lines).forEach(line => allKeys.push(`${comp}::${line}`));
                });
                setSelectedLines(allKeys);
            })
            .catch(err => console.error("Failed to load hierarchy for initial selection", err));
    }, []);

    React.useEffect(() => {
        const saved = localStorage.getItem('jprail_trips');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setRecordedTrips(parsed);
            } catch (e) {
                console.error("Failed to parse saved trips", e);
            }
        }
        setIsLoaded(true);
    }, []);

    React.useEffect(() => {
        if (isLoaded) localStorage.setItem('jprail_trips', JSON.stringify(recordedTrips));
    }, [recordedTrips, isLoaded]);

    const handleRecordTrip = React.useCallback((trip: any) => {
        setRecordedTrips(prev => {
            if (prev.find(t => t.id === trip.id)) return prev;
            trackEvent('record_trip', 'engagement', `${trip.start} to ${trip.end}`, Math.round(trip.distance));
            return [...prev, trip];
        });
    }, []);

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
        if (isEditMode && !isMobile) return;
        setActiveLine(line);
        if (!isEditMode) setSelectedStation(null); // Clear station selection only if not in edit mode
        setSelectedLines(prev => {
            let next = prev.includes(line) ? prev : [...prev, line];
            if (next.length > 1 && next.includes("__NONE__")) next = next.filter(l => l !== "__NONE__");
            return next;
        });
    }, [isEditMode, isMobile]);

    const handleLineClick = React.useCallback((line: string) => {
        setActiveLine(line);
        setSelectedStation(null); // Clear station selection
        setZoomTarget({ type: 'line', id: line });
        setSelectedLines(prev => {
            let next = prev.includes(line) ? prev : [...prev, line];
            if (next.length > 1 && next.includes("__NONE__")) next = next.filter(l => l !== "__NONE__");
            return next;
        });
    }, []);

    const handleStationClick = React.useCallback((stationName: string, lines?: string[]) => {
        if (isEditMode) return; // Disable in edit mode
        console.log("Station clicked:", stationName);
        setSelectedStation({ name: stationName, lines: lines || [] });
        if (!isMobile) setActiveLine(null); // Clear active line on desktop if needed, or keep for context
    }, [isMobile, isEditMode]);

    const handleResetTrips = React.useCallback(() => {
        if (window.confirm('모든 이동 기록을 삭제하시겠습니까?')) {
            setRecordedTrips([]);
            setVisitedLineLengths({});
            localStorage.removeItem('jprail_trips');
            trackEvent('reset_all_trips', 'engagement', 'confirm');
        }
    }, [trackEvent]);

    const handleDeleteLineHistory = React.useCallback((lineId: string) => {
        if (!window.confirm('이 노선의 이동 기록을 모두 삭제하시겠습니까?')) return;
        setRecordedTrips(prev => prev.filter(trip => true)); // Simplistic implementation as before
    }, []);

    const [lineIdMapping, setLineIdIdMapping] = React.useState<Map<string, string>>(new Map());
    const setLineIdMapping = React.useCallback((mapping: Map<string, string>) => {
        setLineIdIdMapping(mapping);
    }, []);

    React.useEffect(() => {
        if (lineIdMapping.size > 0) { }
    }, [lineIdMapping]);

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

    const handleDeleteTrip = React.useCallback((id: string) => {
        setRecordedTrips(prev => prev.filter(t => t.id !== id));
        trackEvent('delete_trip', 'engagement', id);
    }, []);

    const [isMobileSheetOpen, setIsMobileSheetOpen] = React.useState(false);

    const handleMapClick = React.useCallback(() => {
        if (!isMobile || isEditMode) return; // Disable clearing in edit mode (or handle differently)

        // When clicking empty space on mobile:
        // 1. Deselect active station
        // 2. Clear active line (to hide overlay)
        // 3. Close bottom sheet? -> USER REQUEST: "Close bottom sheet"

        // Clearing logic:
        setSelectedStation(null);
        setActiveLine(null);
        setIsMobileSheetOpen(false);
    }, [isMobile, isEditMode]);

    // Edit Mode Handlers
    const handleDraftComplete = React.useCallback((trip: any) => {
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

    return (
        <main style={{
            display: 'flex', flexDirection: 'column',
            backgroundColor: '#eee', backgroundImage: 'radial-gradient(#ccc 0.5px, transparent 0.5px)', backgroundSize: '10px 10px'
        }}>
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

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
                                <a href="/credits" style={{ fontSize: '12px', color: '#666', textDecoration: 'none' }}>
                                    {UI_TRANSLATIONS.about_credits[language]}
                                </a>
                                <button
                                    onClick={() => setIsHowToOpen(true)}
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
                                    onClick={() => setIsHowToOpen(true)}
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        border: '1px solid #3498db',
                                        backgroundColor: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#3498db',
                                        fontWeight: 'bold',
                                        fontSize: '16px'
                                    }}
                                >
                                    ?
                                </button>
                            </div>
                        )
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                            {/* Desktop Header Content... */}
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
                                    backgroundColor: '#fff',
                                    border: '1px solid #e74c3c',
                                    color: '#e74c3c',
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

                {/* Mobile Preview Area (Overlay) */}

                <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
                    {isMobile && isEditMode && (
                        <div className="edit-mode-ui" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1200 }}>
                            <RouteCreationPanelWithNoSSR
                                isDragging={tempPath.length > 0}
                                tempPath={tempPath}
                                draftTrip={draftTrip}
                                onAdd={() => {
                                    if (draftTrip) {
                                        handleRecordTrip(draftTrip);
                                        setDraftTrip(null); // Clear draft to allow new addition
                                        // Keep isEditMode true
                                    }
                                }}
                                onDiscard={() => {
                                    setDraftTrip(null);
                                    setTempPath([]);
                                }}
                                onFinish={() => {
                                    setIsEditMode(false);
                                    setDraftTrip(null);
                                    setTempPath([]);
                                }}
                                language={language}
                                onHeightChange={setEditPanelHeight}
                            />
                            {/* Grid Overlay: Rulers for Edges removed in favor of dynamic RulerOverlay */}
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
                            {selectedStation ? (
                                <div style={{ padding: '10px' }}>
                                    <MobileStationPreviewWithNoSSR
                                        stationName={selectedStation.name}
                                        lines={selectedStation.lines}
                                        language={language}
                                        onLineClick={(lineId: string) => {
                                            handleRailroadClick(lineId);
                                            // Optional: Scroll to line preview or just set active
                                        }}
                                    />
                                </div>
                            ) : activeLine && lineDetailData ? (
                                <div style={{ padding: '0', maxHeight: '30vh', overflow: 'hidden' }}>
                                    <MobileLinePreviewWithNoSSR
                                        lineId={activeLine}
                                        visitedEdges={lineDetailData.visitedEdges}
                                        segments={lineDetailData.segments}
                                        nodes={lineDetailData.nodes}
                                        language={language}
                                        selectedLines={selectedLines}
                                        onToggleLine={toggleLine}
                                    />
                                </div>
                            ) : null}
                        </div>
                    )}
                    {/* Desktop Left Sidebar */}
                    {!isMobile && (
                        <div style={{ width: '350px', height: '100%', borderRight: '1px solid #ddd', background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                <SidebarWithNoSSR selectedLines={selectedLines} onToggleLine={toggleLine} onSetSelectedLines={setSelectedLinesList} lineLengths={lineLengths} visitedLineLengths={visitedLineLengths} activeLine={activeLine} onLineClick={handleLineClick} language={language} />
                            </div>
                        </div>
                    )}

                    {/* Main Map */}
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
                                    zoomToLine={zoomToLine}
                                    zoomToStation={zoomToStation}
                                    onLineDetailData={setLineDetailData}
                                    zoomTarget={zoomTarget}
                                    onZoomComplete={() => setZoomTarget(null)}
                                    styleSettings={styleSettings}
                                    language={language}
                                    isMobile={isMobile}
                                    selectedStation={selectedStation?.name}
                                    onMapClick={handleMapClick}
                                    isEditMode={isEditMode}
                                    draftTrip={draftTrip}
                                    onDraftComplete={handleDraftComplete}
                                    onDragUpdate={handleDragUpdate}
                                    rulerTopOffset={editPanelHeight}
                                />
                            </MapWithNoSSR>
                        </div>
                        {/* Desktop Bottom Pane */}
                        {!isMobile && lineDetailData && activeLine && (
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
                                    language={language}
                                    onToggleLine={toggleLine}
                                />
                            </div>
                        )}
                    </div>

                    {/* Desktop Right Sidebar */}
                    {!isMobile && (
                        <div style={{ width: '300px', height: '100%', borderLeft: '1px solid #ddd', background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', zIndex: 1000, overflowY: 'auto' }}>
                            <MyLinesPaneWithNoSSR visitedLineLengths={visitedLineLengths} lineLengths={lineLengths} onLineClick={handleLineClick} onDeleteLineHistory={handleDeleteLineHistory} activeLine={activeLine} language={language} recordedTrips={recordedTrips} onDeleteTrip={handleDeleteTrip} />
                        </div>
                    )}
                </div>

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
                                        onLineClick={(line) => {
                                            handleLineClick(line);
                                            if (isMobile) setIsMobileSheetOpen(false);
                                        }}
                                        language={language}
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
                                    <MyLinesPaneWithNoSSR
                                        visitedLineLengths={visitedLineLengths}
                                        lineLengths={lineLengths}
                                        onLineClick={(line) => {
                                            handleLineClick(line);
                                            if (isMobile) setIsMobileSheetOpen(false);
                                        }}
                                        onDeleteLineHistory={handleDeleteLineHistory}
                                        activeLine={activeLine}
                                        language={language}
                                        recordedTrips={recordedTrips}
                                        onDeleteTrip={handleDeleteTrip}
                                    />
                                )
                            }
                        ]}
                    />
                )}

                {/* Mobile Edit Mode Bottom Panel */}
                {isMobile && isEditMode && activeLine && lineDetailData && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1300 }}>
                        <MobileEditLinePanelWithNoSSR
                            lineId={activeLine}
                            segments={lineDetailData.segments}
                            nodes={lineDetailData.nodes}
                            visitedEdges={lineDetailData.visitedEdges}
                            visitedStations={lineDetailData.visitedStations}
                            onPathCreate={handleStationPathCreate}
                            onClose={() => setActiveLine(null)}
                            language={language}
                        />
                    </div>
                )}
            </div>


            <HowToModal
                isOpen={isHowToOpen}
                onClose={() => setIsHowToOpen(false)}
                currentLanguage={language}
            />
        </main >
    );
};




export default Page;
