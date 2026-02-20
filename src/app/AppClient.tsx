"use client";

import dynamic from 'next/dynamic';
import React from 'react';

import { Language } from '../lib/translations';
import { trackEvent } from '../lib/gtag';
import HowToModal from '../components/HowToModal';
import { useRailData } from '../hooks/useRailData';

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

const AppClient = () => {
    const [selectedLines, setSelectedLines] = React.useState<string[]>([]);
    const [lineLengths, setLineLengths] = React.useState<Record<string, number>>({});
    const [visitedLineLengths, setVisitedLineLengths] = React.useState<Record<string, number>>({});
    const [recordedTrips, setRecordedTrips] = React.useState<any[]>([]);
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [activeLine, setActiveLine] = React.useState<string | null>(null);
    const [lineDetailData, setLineDetailData] = React.useState<{ segments: any[], visitedEdges: Set<string>, nodes: Map<string, any>, getShortestPath: any } | null>(null);
    const [showMyRoutes, setShowMyRoutes] = React.useState(false);
    const [styleSettings, setStyleSettings] = React.useState<MapStyleSettings>(DEFAULT_STYLE_SETTINGS);
    const [language, setLanguage] = React.useState<Language>('ja');
    const [showHowTo, setShowHowTo] = React.useState(false);
    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Routing State
    const [sideMode, setSideMode] = React.useState<'lines' | 'route'>('lines');
    const [routeStart, setRouteStart] = React.useState<string | null>(null);
    const [routeEnd, setRouteEnd] = React.useState<string | null>(null);
    const [routeResult, setRouteResult] = React.useState<any | null>(null);

    // Load all lines on first load
    const { railData } = useRailData();

    React.useEffect(() => {
        if (railData && railData.hierarchy) {
            const allKeys: string[] = [];
            Object.entries(railData.hierarchy).forEach(([comp, lines]: [string, any]) => {
                Object.keys(lines).forEach(line => allKeys.push(`${comp}::${line}`));
            });
            setSelectedLines(allKeys);
        }
    }, [railData]);

    // Initial load from localStorage
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

    // Save to localStorage
    React.useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('jprail_trips', JSON.stringify(recordedTrips));
        }
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
            if (next.length > 1 && next.includes("__NONE__")) {
                next = next.filter(l => l !== "__NONE__");
            }
            return next;
        });
    }, []);

    const setSelectedLinesList = React.useCallback((lines: string[]) => {
        setSelectedLines(lines);
    }, []);

    const [zoomTarget, setZoomTarget] = React.useState<{ type: 'line' | 'station', id: string } | null>(null);

    const handleRailroadClick = React.useCallback((line: string) => {
        setActiveLine(line);
        setSelectedLines(prev => {
            let next = prev.includes(line) ? prev : [...prev, line];
            if (next.length > 1 && next.includes("__NONE__")) {
                next = next.filter(l => l !== "__NONE__");
            }
            return next;
        });
    }, []);

    const handleLineClick = React.useCallback((line: string) => {
        setActiveLine(line);
        setZoomTarget({ type: 'line', id: line });
        setSelectedLines(prev => {
            let next = prev.includes(line) ? prev : [...prev, line];
            if (next.length > 1 && next.includes("__NONE__")) {
                next = next.filter(l => l !== "__NONE__");
            }
            return next;
        });
    }, []);

    const handleStationClick = React.useCallback((id: string, lines?: string[]) => {
        console.log("Station clicked:", id);
    }, []);

    const handleResetTrips = React.useCallback(() => {
        if (window.confirm('모든 이동 기록을 삭제하시겠습니까?')) {
            setRecordedTrips([]);
            setVisitedLineLengths({});
            localStorage.removeItem('jprail_trips');
            trackEvent('reset_all_trips', 'engagement', 'confirm');
        }
    }, []);

    const handleDeleteLineHistory = React.useCallback((lineId: string) => {
        if (!window.confirm('이 노선의 이동 기록을 모두 삭제하시겠습니까?')) return;

        setRecordedTrips(prev => prev.filter(trip => {
            return true;
        }));
    }, []);

    const [lineIdMapping, setLineIdIdMapping] = React.useState<Map<string, string>>(new Map());
    const setLineIdMapping = React.useCallback((mapping: Map<string, string>) => {
        setLineIdIdMapping(mapping);
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

    const handleDeleteTrip = React.useCallback((id: string) => {
        setRecordedTrips(prev => {
            const next = prev.filter(t => t.id !== id);
            return next;
        });
        trackEvent('delete_trip', 'engagement', id);
    }, []);

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
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#2c3e50', letterSpacing: '-1.5px' }}>
                        JapanRailNote
                    </h1>
                    <a
                        href="/credits"
                        style={{
                            fontSize: '11px',
                            color: '#999',
                            textDecoration: 'none',
                            padding: '2px 8px',
                            border: '1px solid #eee',
                            borderRadius: '10px',
                            transition: 'all 0.2s',
                            fontWeight: '600'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.color = '#3498db';
                            e.currentTarget.style.borderColor = '#3498db';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.color = '#999';
                            e.currentTarget.style.borderColor = '#eee';
                        }}
                    >
                        Data Sources
                    </a>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                    <div style={{ display: 'flex', gap: '20px', color: '#666' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase' }}>Lines</div>
                            <div style={{ fontSize: '18px', fontWeight: '900', color: '#2c3e50' }}>{stats.lines}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase' }}>Stations</div>
                            <div style={{ fontSize: '18px', fontWeight: '900', color: '#2c3e50' }}>{stats.stations}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase' }}>Distance</div>
                            <div style={{ fontSize: '18px', fontWeight: '900', color: '#2c3e50' }}>{stats.distance}<span style={{ fontSize: '10px', marginLeft: '2px' }}>km</span></div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase' }}>Companies</div>
                            <div style={{ fontSize: '18px', fontWeight: '900', color: '#2c3e50' }}>{stats.companies}</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                        {(['ja', 'ko', 'en'] as Language[]).map(lang => (
                            <button
                                key={lang}
                                onClick={() => {
                                    setLanguage(lang);
                                    trackEvent('change_language', 'setting', lang);
                                }}
                                style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: language === lang ? 'bold' : 'normal',
                                    backgroundColor: language === lang ? '#3498db' : '#fff',
                                    color: language === lang ? '#fff' : '#666',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                {lang.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => {
                                setShowHowTo(true);
                                trackEvent('open_howto', 'ui_interaction', 'header_button');
                            }}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#3498db',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '20px',
                                cursor: 'pointer',
                                fontWeight: '800',
                                fontSize: '12px',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 4px 10px rgba(52, 152, 219, 0.3)'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = '#2980b9';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = '#3498db';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            HOW TO
                        </button>
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
                            onClick={() => {
                                setSideMode('lines');
                                trackEvent('tab_switch', 'ui_interaction', 'lines');
                            }}
                            style={{
                                flex: 1, padding: '10px', border: 'none', background: sideMode === 'lines' ? '#fff' : '#f5f5f5',
                                fontWeight: 'bold', color: sideMode === 'lines' ? '#2c3e50' : '#999', cursor: 'pointer'
                            }}
                        >
                            Lines
                        </button>
                        <button
                            onClick={() => {
                                setSideMode('route');
                                trackEvent('tab_switch', 'ui_interaction', 'route');
                            }}
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
                                language={language}
                                routeStart={routeStart}
                                routeEnd={routeEnd}
                                onRouteResult={setRouteResult}
                                isMobile={isMobile}
                            />
                        </MapWithNoSSR>
                    </div>
                    {lineDetailData && activeLine && (
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
                                railData={railData}
                            />
                        </div>
                    )}
                </div>

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
                        recordedTrips={recordedTrips}
                        onDeleteTrip={handleDeleteTrip}
                        railData={railData}
                    />
                </div>
            </div>

            <HowToModal
                isOpen={showHowTo}
                onClose={() => setShowHowTo(false)}
            />
        </main>
    );
};

export default AppClient;
