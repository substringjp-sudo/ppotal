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
    const [activeLine, setActiveLine] = React.useState<string | null>(null);

    const toggleLine = React.useCallback((line: string) => {
        setSelectedLines(prev =>
            prev.includes(line) ? prev.filter(l => l !== line) : [...prev, line]
        );
        // Set active line when clicked (for scrolling) - only if selecting? 
        // Or always if it exists in the list? 
        // Requirement: "Click line -> Scroll to sidebar item"
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
                        activeLine={activeLine}
                    />
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                    <MapWithNoSSR>
                        <MapPaneWithNoSSR
                            selectedLines={selectedLines}
                            onLengthsCalculated={setLineLengths}
                            onRailroadClick={toggleLine}
                        />
                    </MapWithNoSSR>
                </div>
            </div>
        </main>
    );
};

export default Page;
