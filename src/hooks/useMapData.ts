import { useState, useEffect } from 'react';
import type { FeatureCollection } from 'geojson';

export interface BoundaryLOD {
    low: FeatureCollection | null;
    mid: FeatureCollection | null;
    high: FeatureCollection | null;
}

let cachedMapDataPromise: Promise<{ prefectures: BoundaryLOD, municipalities: BoundaryLOD }> | null = null;

export const useMapData = () => {
    const [prefectures, setPrefectures] = useState<BoundaryLOD | null>(null);
    const [municipalities, setMunicipalities] = useState<BoundaryLOD | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadBoundaries = async () => {
            try {
                setIsLoading(true);

                if (!cachedMapDataPromise) {
                    cachedMapDataPromise = (async () => {
                        const [pLow, pMid, pHigh, mLow, mMid, mHigh] = await Promise.all([
                            fetch('/data/adm1_low.geojson').then(res => res.json()),
                            fetch('/data/adm1_mid.geojson').then(res => res.json()),
                            fetch('/data/geoBoundaries-JPN-ADM1_simplified.geojson').then(res => res.json()),
                            fetch('/data/adm2_low.geojson').then(res => res.json()),
                            fetch('/data/adm2_mid.geojson').then(res => res.json()),
                            fetch('/data/geoBoundaries-JPN-ADM2_simplified.geojson').then(res => res.json()),
                        ]);

                        return {
                            prefectures: { low: pLow, mid: pMid, high: pHigh },
                            municipalities: { low: mLow, mid: mMid, high: mHigh }
                        };
                    })();
                }

                const data = await cachedMapDataPromise;
                setPrefectures(data.prefectures);
                setMunicipalities(data.municipalities);
            } catch (err) {
                console.error("Error loading map data:", err);
                cachedMapDataPromise = null;
            } finally {
                setIsLoading(false);
            }
        };

        loadBoundaries();
    }, []);

    return {
        prefectures,
        municipalities,
        isLoading
    };
};
