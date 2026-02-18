import { useState, useEffect } from 'react';

export const useMapData = () => {
    const [prefectures, setPrefectures] = useState<any>(null);
    const [municipalities, setMunicipalities] = useState<any>(null);
    const [railroadNetwork, setRailroadNetwork] = useState<any>(null);
    const [stationMasterList, setStationMasterList] = useState<any>(null);
    const [hierarchy, setHierarchy] = useState<any>(null);

    useEffect(() => {
        fetch('/data/geoBoundaries-JPN-ADM1_simplified.geojson').then(res => res.json()).then(setPrefectures);
        fetch('/data/geoBoundaries-JPN-ADM2_simplified.geojson').then(res => res.json()).then(setMunicipalities);
        fetch('/data/systematic_railroad_network.json').then(res => res.json()).then(setRailroadNetwork);
        fetch('/data/station_master_list.json').then(res => res.json()).then(setStationMasterList);
        fetch('/data/station_hierarchy.json').then(res => res.json()).then(setHierarchy);
    }, []);

    return {
        prefectures,
        municipalities,
        railroadNetwork,
        stationMasterList,
        hierarchy
    };
};
