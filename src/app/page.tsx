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

const Page = () => {
    const [selectedLines, setSelectedLines] = React.useState<string[]>([]);
    const [lineLengths, setLineLengths] = React.useState<Record<string, number>>({});
    const [visitedLineLengths, setVisitedLineLengths] = React.useState<Record<string, number>>({});
    const [recordedTrips, setRecordedTrips] = React.useState<any[]>([]);
    const [activeLine, setActiveLine] = React.useState<string | null>(null);

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
    }, []);

    // Save to localStorage on change
    React.useEffect(() => {
        if (recordedTrips.length > 0) {
            localStorage.setItem('jprail_trips', JSON.stringify(recordedTrips));
        }
    }, [recordedTrips]);

    const handleRecordTrip = React.useCallback((trip: any) => {
        setRecordedTrips(prev => [...prev, trip]);
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

    return (
        <main style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            overflow: 'hidden'
        }}>
            <h1 style={{
                textAlign: 'center',
                padding: '10px 0',
                margin: 0,
                borderBottom: '1px solid #ccc',
                fontSize: '24px',
                fontWeight: 'bold'
            }}>
                Japan Railroad Map
            </h1>
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
                    />
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                    <MapWithNoSSR>
                        <MapPaneWithNoSSR
                            selectedLines={selectedLines}
                            recordedTrips={recordedTrips}
                            onRecordTrip={handleRecordTrip}
                            onLengthsCalculated={setLineLengths}
                            onVisitedLengthsCalculated={setVisitedLineLengths}
                            onRailroadClick={toggleLine}
                        />
                    </MapWithNoSSR>
                </div>
            </div>
        </main>
    );
};

export default Page;
