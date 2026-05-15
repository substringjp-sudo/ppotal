'use client';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTripStore } from '@pplaner/shared';
import { saveTrip } from '@pplaner/shared';

export default function TripSyncProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const saveTimeout = useRef<number | null>(null);
    const isFirstLoad = useRef(true);

    useEffect(() => {
        // Subscribe to Zustand store changes
        const unsubscribe = useTripStore.subscribe((state, prevState) => {
            if (isFirstLoad.current) {
                isFirstLoad.current = false;
                return;
            }

            if (user && state.currentTrip && state.currentTrip !== prevState.currentTrip) {
                // Debounce the save operation (1 second)
                if (saveTimeout.current) {
                    window.clearTimeout(saveTimeout.current);
                }
                
                // Keep a reference to the trip to save to close over
                const tripToSave = state.currentTrip;
                
                saveTimeout.current = window.setTimeout(async () => {
                    try {
                        await saveTrip(tripToSave, { 
                            uid: user.uid, 
                            name: user.displayName || 'Unknown', 
                            photoURL: user.photoURL || undefined 
                        });
                        console.log('Trip auto-synced to Firestore');
                    } catch (error) {
                        console.error('Failed to auto-sync trip:', error);
                    }
                }, 1000);
            }
        });

        return () => {
            unsubscribe();
            if (saveTimeout.current) clearTimeout(saveTimeout.current);
        };
    }, [user]);

    return <>{children}</>;
}
