"use client";

import dynamic from 'next/dynamic';
import React from 'react';

const MapWithNoSSR = dynamic(() => import('../components/Map'), {
    ssr: false
});

const MapPaneWithNoSSR = dynamic(() => import('../components/MapPane'), {
    ssr: false
});

const SidebarWithNoSSR = dynamic(() => import('../components/Sidebar'), {
    ssr: false
});

const LineDetailPaneWithNoSSR = dynamic(() => import('../components/LineDetailPane'), {
    ssr: false
});

const MapStylePanelWithNoSSR = dynamic(() => import('../components/MapStylePanel'), {
    ssr: false
});

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

const DEFAULT_STYLE_SETTINGS: MapStyleSettings = {
    unselected: {
        opacity: 0.5,
        weight: 1.0,
    },
    unvisited: {
        weight: 1.3,
        showOutline: true,
        stationSize: 1.0,
    },
    visited: {
        weight: 1.5,
        showOutline: true,
        stationSize: 1.0,
    }
};

const Page = () => {
    const [selectedLines, setSelectedLines] = React.useState<string[]>([]);
    const [lineLengths, setLineLengths] = React.useState<Record<string, number>>({});
    const [visitedLineLengths, setVisitedLineLengths] = React.useState<Record<string, number>>({});
    const [recordedTrips, setRecordedTrips] = React.useState<any[]>([]);
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [activeLine, setActiveLine] = React.useState<string | null>(null);
    const [lineDetailData, setLineDetailData] = React.useState<{ segments: any[], visitedEdges: Set<string>, nodes: Map<string, any>, getShortestPath: any } | null>(null);
    const [zoomToLine, setZoomToLine] = React.useState<string | null>(null);
    const [zoomToStation, setZoomToStation] = React.useState<string | null>(null);
    const [showMyRoutes, setShowMyRoutes] = React.useState(false);
    const [styleSettings, setStyleSettings] = React.useState<MapStyleSettings>(DEFAULT_STYLE_SETTINGS);

    // Zoom handlers
    const handleZoomToLine = React.useCallback((lineKey: string) => {
        setZoomToLine(lineKey);
        // Clear after a delay to allow re-triggering if needed, or handle in useEffect
        setTimeout(() => setZoomToLine(null), 2000);
    }, []);

    const handleZoomToStation = React.useCallback((stationName: string) => {
        setZoomToStation(stationName);
        setTimeout(() => setZoomToStation(null), 2000);
    }, []);

    // Initial load from localStorage
    React.useEffect(() => {
        const saved = localStorage.getItem('jprail_trips');
        if (saved) {
            try {
                setRecordedTrips(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse saved trips', e);
            }
        }
        const savedStyle = localStorage.getItem('jprail_style');
        if (savedStyle) {
            try {
                // Merge with defaults to handle versioning
                const parsed = JSON.parse(savedStyle);
                setStyleSettings(prev => ({
                    unselected: { ...prev.unselected, ...parsed.unselected },
                    unvisited: { ...prev.unvisited, ...parsed.unvisited },
                    visited: { ...prev.visited, ...parsed.visited },
                }));
            } catch (e) {
                console.error('Failed to parse saved style', e);
            }
        }
        setIsLoaded(true);
    }, []);

    // Save to localStorage on change
    React.useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('jprail_trips', JSON.stringify(recordedTrips));
            localStorage.setItem('jprail_style', JSON.stringify(styleSettings));
        }
    }, [recordedTrips, styleSettings, isLoaded]);

    const handleRecordTrip = React.useCallback((newTrip: any) => {
        setRecordedTrips(prev => {
            const getStationFingerprint = (path: string[]) =>
                path.map(id => {
                    const parts = id.split('::');
                    return parts.length >= 3 ? parts[2] : id;
                }).join(',');

            const newPathFingerprint = getStationFingerprint(newTrip.path);
            const reversedNewPathFingerprint = getStationFingerprint([...newTrip.path].reverse());

            // 1. Robust Match: Same Start/End station names (User intention)
            // This handles cases where pathfinder might return slightly different nodes between sessions
            let existingIndex = prev.findIndex(t => {
                return (t.start === newTrip.start && t.end === newTrip.end) ||
                    (t.start === newTrip.end && t.end === newTrip.start);
            });

            // 2. Secondary Match: Exact station sequence fingerprint (Alternative paths)
            if (existingIndex === -1) {
                existingIndex = prev.findIndex(t => {
                    const pFingerprint = getStationFingerprint(t.path);
                    return pFingerprint === newPathFingerprint || pFingerprint === reversedNewPathFingerprint;
                });
            }

            if (existingIndex !== -1) {
                // Toggle: Remove if already exists
                return prev.filter((_, i) => i !== existingIndex);
            }
            // Add if new
            return [...prev, newTrip];
        });
    }, []);

    const handleResetTrips = React.useCallback(() => {
        if (typeof window !== 'undefined' && window.confirm('이동 기록을 모두 초기화하시겠습니까?')) {
            setRecordedTrips([]);
        }
    }, []);

    const toggleLine = React.useCallback((line: string) => {
        setSelectedLines(prev =>
            prev.includes(line) ? prev.filter(l => l !== line) : [...prev, line]
        );
        setActiveLine(line);
    }, []);

    const setSelectedLinesList = React.useCallback((lines: string[]) => {
        setSelectedLines(lines);
    }, []);

    const handleRailroadClick = React.useCallback((line: string) => {
        setActiveLine(line);
        // Ensure it's in selected lines for visualization
        setSelectedLines(prev => prev.includes(line) ? prev : [...prev, line]);
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

    return (
        <main style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            overflow: 'hidden',
            backgroundColor: '#eee',
            backgroundImage: 'radial-gradient(#ccc 0.5px, transparent 0.5px)',
            backgroundSize: '10px 10px'
        }}>
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 20px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid #ccc',
                zIndex: 100,
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#2c3e50', letterSpacing: '-0.5px' }}>
                        JAPAN RAIL MAP
                    </h1>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                    <div style={{ display: 'flex', gap: '20px', color: '#666' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase' }}>노선 수</div>
                            <div style={{ fontSize: '18px', fontWeight: '900', color: '#2c3e50' }}>{stats.lines}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase' }}>역 수</div>
                            <div style={{ fontSize: '18px', fontWeight: '900', color: '#2c3e50' }}>{stats.stations}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase' }}>이동 거리</div>
                            <div style={{ fontSize: '18px', fontWeight: '900', color: '#2c3e50' }}>{stats.distance}<span style={{ fontSize: '10px', marginLeft: '2px' }}>km</span></div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase' }}>운영사 수</div>
                            <div style={{ fontSize: '18px', fontWeight: '900', color: '#2c3e50' }}>{stats.companies}</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>

                        <button
                            onClick={handleResetTrips}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#fff',
                                color: '#e74c3c',
                                border: '1.5px solid #e74c3c',
                                borderRadius: '20px',
                                cursor: 'pointer',
                                fontWeight: '800',
                                fontSize: '12px',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = '#e74c3c';
                                e.currentTarget.style.color = '#fff';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = '#fff';
                                e.currentTarget.style.color = '#e74c3c';
                            }}
                        >
                            RESET
                        </button>
                    </div>
                </div>
            </header>
            <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                    width: '350px',
                    height: '100%',
                    borderRight: '1px solid #ddd',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    zIndex: 1000,
                    overflowY: 'auto'
                }}>
                    <SidebarWithNoSSR
                        selectedLines={selectedLines}
                        onToggleLine={toggleLine}
                        onSetSelectedLines={setSelectedLinesList}
                        lineLengths={lineLengths}
                        visitedLineLengths={visitedLineLengths}
                        activeLine={activeLine}
                        onResetTrips={handleResetTrips}
                        onZoomToLine={handleZoomToLine}
                    />
                </div>
                <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                        <MapWithNoSSR>
                            <MapPaneWithNoSSR
                                selectedLines={selectedLines}
                                recordedTrips={recordedTrips}
                                onRecordTrip={handleRecordTrip}
                                onLengthsCalculated={setLineLengths}
                                onVisitedLengthsCalculated={setVisitedLineLengths}
                                onRailroadClick={handleRailroadClick}
                                onStationClick={handleZoomToStation}
                                activeLine={activeLine}
                                zoomToLine={zoomToLine}
                                zoomToStation={zoomToStation}
                                onLineDetailData={setLineDetailData}
                                styleSettings={styleSettings}
                            />
                            <MapStylePanelWithNoSSR
                                settings={styleSettings}
                                onSettingsChange={setStyleSettings}
                            />
                        </MapWithNoSSR>
                    </div>
                    {lineDetailData && activeLine && (
                        <div style={{ height: '180px', flexShrink: 0, position: 'relative', zIndex: 1100 }}>
                            <LineDetailPaneWithNoSSR
                                lineId={activeLine}
                                segments={lineDetailData.segments}
                                nodes={lineDetailData.nodes}
                                visitedEdges={lineDetailData.visitedEdges}
                                selectedLines={selectedLines}
                                getShortestPath={lineDetailData.getShortestPath}
                                onRecordTrip={handleRecordTrip}
                                onStationClick={handleZoomToStation}
                                onClose={() => setActiveLine(null)}
                            />
                        </div>
                    )}
                </div>

                {/* My Routes Collapsible Sidebar */}
                <button
                    onClick={() => setShowMyRoutes(!showMyRoutes)}
                    style={{
                        position: 'absolute',
                        right: showMyRoutes ? '300px' : '0',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 1100,
                        width: '30px',
                        height: '100px',
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRight: 'none',
                        borderRadius: '12px 0 0 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        boxShadow: '-2px 0 10px rgba(0,0,0,0.1)',
                        transition: 'right 0.3s ease-in-out',
                        color: '#2c3e50'
                    }}
                >
                    <span style={{ fontSize: '12px' }}>{showMyRoutes ? '▶' : '◀'}</span>
                    <div style={{
                        writingMode: 'vertical-rl',
                        fontSize: '10px',
                        fontWeight: '900',
                        letterSpacing: '1px',
                        color: '#2c3e50'
                    }}>
                        MY ROUTES
                    </div>
                </button>

                <div style={{
                    width: showMyRoutes ? '300px' : '0px',
                    height: '100%',
                    backgroundColor: 'white',
                    borderLeft: showMyRoutes ? '1px solid #ddd' : 'none',
                    zIndex: 1000,
                    overflow: 'hidden',
                    transition: 'width 0.3s ease-in-out',
                    position: 'relative'
                }}>
                    <div style={{ width: '300px', height: '100%', overflowY: 'auto', padding: '20px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#2c3e50' }}>Recorded Trips</h2>
                        {recordedTrips.length === 0 ? (
                            <p style={{ color: '#999', fontSize: '14px' }}>No routes recorded yet.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {recordedTrips.map((trip, idx) => (
                                    <div key={idx} style={{
                                        padding: '12px',
                                        borderRadius: '8px',
                                        background: '#f8f9fa',
                                        border: '1px solid #eee',
                                        transition: 'all 0.2s ease'
                                    }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px', color: '#2c3e50' }}>
                                            {trip.start} ⇌ {trip.end}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>
                                            Distance: {Math.round(trip.distance * 10) / 10} km
                                        </div>
                                        <button
                                            onClick={() => handleRecordTrip(trip)}
                                            style={{
                                                marginTop: '8px',
                                                fontSize: '11px',
                                                color: '#e74c3c',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: 0,
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
};

export default Page;
