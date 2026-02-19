import { useState, useEffect } from 'react';

export const useMapData = () => {
    const [prefectures, setPrefectures] = useState<any>(null);
    const [municipalities, setMunicipalities] = useState<any>(null);

    useEffect(() => {
        fetch('/data/geoBoundaries-JPN-ADM1_simplified.geojson').then(res => res.json()).then(setPrefectures);
        fetch('/data/geoBoundaries-JPN-ADM2_simplified.geojson').then(res => res.json()).then(setMunicipalities);
    }, []);

    return {
        prefectures,
        municipalities
    };
};
