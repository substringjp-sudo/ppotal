"use client";

import dynamic from 'next/dynamic';
import React from 'react';
import { translateName } from '../lib/lineUtils';
import { Language } from '../lib/translations';

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

const MyLinesPaneWithNoSSR = dynamic(() => import('../components/MyLinesPane'), {
    ssr: false
});

const RoutePaneWithNoSSR = dynamic(() => import('../components/RoutePane'), {
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
    const [language, setLanguage] = React.useState<Language>('ja');

    // Routing State
    const [sideMode, setSideMode] = React.useState<'lines' | 'route'>('lines');
    const [routeStart, setRouteStart] = React.useState<string | null>(null);
    const [routeEnd, setRouteEnd] = React.useState<string | null>(null);
    const [routeResult, setRouteResult] = React.useState<any | null>(null);

    // Zoom handlers
    const handleZoomToLine = React.useCallback((lineKey: string) => {
        setZoomToLine(lineKey);
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

    const [lineIdMapping, setLineIdMapping] = React.useState<Map<string, string>>(new Map());

    const handleDeleteLineHistory = React.useCallback((lineId: string) => {
        const lineName = lineId.split('::')[1] || lineId;
        if (typeof window !== 'undefined' && window.confirm(`'${lineName}' 노선의 모든 이동 기록을 삭제하시겠습니까?`)) {
            const simplifiedLineIdsToDelete = new Set<string>();
            simplifiedLineIdsToDelete.add(lineId);
            lineIdMapping.forEach((fullId, simpleId) => {
                if (fullId === lineId) {
                    simplifiedLineIdsToDelete.add(simpleId);
                }
            });

            setRecordedTrips(prev => prev.filter(trip => {
                return !trip.path.some((sid: string) => {
                    const sidParts = sid.split('::');
                    if (sidParts.length < 2) return false;
                    const sidPrefix = `${sidParts[0]}::${sidParts[1]}`;
                    return simplifiedLineIdsToDelete.has(sidPrefix);
                });
            }));
        }
    }, [lineIdMapping]);

    const setSelectedLinesList = React.useCallback((lines: string[]) => {
        setSelectedLines(lines);
    }, []);

    const [zoomTarget, setZoomTarget] = React.useState<{ type: 'line' | 'station', id: string } | null>(null);

    const handleRailroadClick = React.useCallback((line: string) => {
        setActiveLine(line);
        setSelectedLines(prev => prev.includes(line) ? prev : [...prev, line]);
    }, []);

    const handleLineClick = React.useCallback((line: string) => {
        setActiveLine(line);
        setZoomTarget({ type: 'line', id: line });
        setSelectedLines(prev => prev.includes(line) ? prev : [...prev, line]);
    }, []);

    const handleStationClick = React.useCallback((stationName: string) => {
        // If in routing mode, maybe we want to select start/end?
        // But for now behavior is zoom.
        setZoomTarget({ type: 'station', id: stationName });
        // Future: Check sideMode and setRouteStart/End if empty?
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
                        JapanRailNote
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

                    <div style={{ display: 'flex', gap: '8px', marginRight: '20px' }}>
                        {(['ja', 'en', 'ko'] as Language[]).map(lang => (
                            <button
                                key={lang}
                                onClick={() => setLanguage(lang)}
                                style={{
                                    padding: '4px 10px',
                                    fontSize: '11px',
                                    borderRadius: '4px',
                                    border: '1px solid #ddd',
                                    backgroundColor: language === lang ? '#3498db' : '#fff',
                                    color: language === lang ? '#fff' : '#333',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                {lang === 'ja' ? '日本語' : lang === 'en' ? 'EN' : 'KO'}
                            </button>
                        ))}
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
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
                        <button
                            onClick={() => setSideMode('lines')}
                            style={{
                                flex: 1, padding: '10px', border: 'none', background: sideMode === 'lines' ? '#fff' : '#f5f5f5',
                                fontWeight: 'bold', color: sideMode === 'lines' ? '#2c3e50' : '#999', cursor: 'pointer'
                            }}
                        >
                            Lines
                        </button>
                        <button
                            onClick={() => setSideMode('route')}
                            style={{
                                flex: 1, padding: '10px', border: 'none', background: sideMode === 'route' ? '#fff' : '#f5f5f5',
                                fontWeight: 'bold', color: sideMode === 'route' ? '#2c3e50' : '#999', cursor: 'pointer'
                            }}
                        >
                            Route
                        </button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {sideMode === 'lines' ? (
                            <SidebarWithNoSSR
                                selectedLines={selectedLines}
                                onToggleLine={toggleLine}
                                onSetSelectedLines={setSelectedLinesList}
                                lineLengths={lineLengths}
                                visitedLineLengths={visitedLineLengths}
                                activeLine={activeLine}
                                onLineClick={handleLineClick}
                                language={language}
                                onLanguageChange={setLanguage}
                            />
                        ) : (
                            <RoutePaneWithNoSSR
                                startStation={routeStart}
                                endStation={routeEnd}
                                onSetStartStation={setRouteStart}
                                onSetEndStation={setRouteEnd}
                                routeResult={routeResult}
                                onSwapStations={() => {
                                    const temp = routeStart;
                                    setRouteStart(routeEnd);
                                    setRouteEnd(temp);
                                }}
                                language={language}
                            />
                        )}
                    </div>
                </div>

                <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                        <MapWithNoSSR>
                            <MapPaneWithNoSSR
                                selectedLines={selectedLines}
                                recordedTrips={recordedTrips}
                                onRecordTrip={handleRecordTrip}
                                onRailroadClick={handleRailroadClick}
                                onStationClick={handleStationClick}
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
                                routeStart={routeStart}
                                routeEnd={routeEnd}
                                onRouteResult={setRouteResult}
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
                                onStationClick={handleStationClick}
                                onClose={() => setActiveLine(null)}
                                language={language}
                            />
                        </div>
                    )}
                </div>

                {/* Right Panel: My Lines */}
                <div style={{
                    width: '300px',
                    height: '100%',
                    borderLeft: '1px solid #ddd',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    zIndex: 1000,
                    overflowY: 'auto'
                }}>
                    <MyLinesPaneWithNoSSR
                        visitedLineLengths={visitedLineLengths}
                        lineLengths={lineLengths}
                        onLineClick={handleLineClick}
                        onDeleteLineHistory={handleDeleteLineHistory}
                        activeLine={activeLine}
                        language={language}
                    />
                </div>
            </div>
        </main>
    );
};

export default Page;
