"use client";

import dynamic from 'next/dynamic';
import React from 'react';

const MapWithNoSSR = dynamic(() => import('../components/Map'), {
    ssr: false
});

const MapPaneWithNoSSR = dynamic(() => import('../components/MapPane'), {
    ssr: false
});

const Page = () => {

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
            <div style={{ flex: 1, position: 'relative' }}>
                <MapWithNoSSR>
                    <MapPaneWithNoSSR />
                </MapWithNoSSR>
            </div>
        </main>
    );
};

export default Page;
