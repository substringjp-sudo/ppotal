'use client';

import React, { useEffect } from 'react';
import { geodataEngine } from '@pplaner/shared/src/lib/geodata-engine';
import { aviationEngine } from '@pplaner/shared/src/lib/aviation-engine';
import { FirestoreGeodataProvider } from '@pplaner/shared/src/lib/firestore-geodata-provider';
import { FirestoreAviationProvider } from '@pplaner/shared/src/lib/firestore-aviation-provider';
import { db } from '@pplaner/shared/src/lib/firebase';

export default function GeodataProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const init = async () => {
            try {
                // Initialize Geodata
                geodataEngine.setProvider(new FirestoreGeodataProvider(db));
                await geodataEngine.initialize();
                
                // Initialize Aviation
                aviationEngine.setProvider(new FirestoreAviationProvider(db));
                await aviationEngine.ensureInitialized();
                
                console.log('PPLANER: Data engines (Geo/Aviation) initialized with Firestore');
            } catch (e) {
                console.error('Failed to initialize data engines', e);
            }
        };
        init();
    }, []);

    return <>{children}</>;
}
