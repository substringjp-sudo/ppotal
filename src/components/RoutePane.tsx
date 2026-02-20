
import React, { useState, useEffect } from 'react';
import { Language } from '../lib/translations';
import { trackEvent } from '../lib/gtag';
import { RailData } from '../types/railData';

interface RoutePaneProps {
    startStation: string | null;
    endStation: string | null;
    onSetStartStation: (id: string) => void;
    onSetEndStation: (id: string) => void;
    routeResult: any | null; // RouteResult from RoutingGraph
    onSwapStations: () => void;
    language: Language;
    railData?: RailData | null;
}

const RoutePane: React.FC<RoutePaneProps> = ({
    startStation,
    endStation,
    onSetStartStation,
    onSetEndStation,
    routeResult,
    onSwapStations,
    language,
    railData
}) => {
    const [stationList, setStationList] = useState<{ id: string, name: string, primary_name: string }[]>([]);
    const [startInput, setStartInput] = useState(startStation || '');
    const [endInput, setEndInput] = useState(endStation || '');

    // Autocomplete state
    const [startSuggestions, setStartSuggestions] = useState<any[]>([]);
    const [endSuggestions, setEndSuggestions] = useState<any[]>([]);

    useEffect(() => {
        if (startStation && railData?.stations?.[startStation]) {
            setStartInput(railData.stations[startStation].name);
        } else {
            setStartInput('');
        }
    }, [startStation, railData]);

    useEffect(() => {
        if (endStation && railData?.stations?.[endStation]) {
            setEndInput(railData.stations[endStation].name);
        } else {
            setEndInput('');
        }
    }, [endStation, railData]);

    useEffect(() => {
        if (routeResult && routeResult.totalDistance > 0) {
            const startName = startStation && railData?.stations?.[startStation] ? railData.stations[startStation].name : startStation;
            const endName = endStation && railData?.stations?.[endStation] ? railData.stations[endStation].name : endStation;
            trackEvent('route_search_success', 'engagement', `${startName} to ${endName}`, Math.round(routeResult.totalDistance));
        }
    }, [routeResult, startStation, endStation, railData]);

    useEffect(() => {
        if (!railData?.stations) return;

        const names = new Set<string>();
        const list: any[] = [];

        Object.values(railData.stations).forEach((station) => {
            // Assuming station.name is the primary name we want to index
            if (!names.has(station.name)) {
                names.add(station.name);
                list.push({ name: station.name, id: station.id, primary_name: station.name });
            }
        });

        setStationList(list.sort((a, b) => a.name.localeCompare(b.name)));
    }, [railData]);

    const filterStations = (input: string) => {
        if (!input) return [];
        return stationList
            .filter(s => s.name.startsWith(input) || s.name.includes(input))
            .slice(0, 10);
    };

    const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setStartInput(val);
        setStartSuggestions(filterStations(val));
        if (val === '') onSetStartStation('');
    };

    const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setEndInput(val);
        setEndSuggestions(filterStations(val));
        if (val === '') onSetEndStation('');
    };

    const selectStart = (id: string, name: string) => {
        setStartInput(name);
        onSetStartStation(id);
        setStartSuggestions([]);
        trackEvent('route_set_start', 'interaction', name);
    };

    const selectEnd = (id: string, name: string) => {
        setEndInput(name);
        onSetEndStation(id);
        setEndSuggestions([]);
        trackEvent('route_set_end', 'interaction', name);
    };

    const swap = () => {
        // Just call onSwapStations and let the parent swap the IDs.
        // The useEffect will update the input fields.
        onSwapStations();
        trackEvent('route_swap', 'interaction', 'swap');
    };

    const formatDistance = (d: number) => {
        return d ? d.toFixed(1) + ' km' : '0 km';
    };

    return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'Pretendard, sans-serif' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '15px', fontWeight: '900', color: '#2c3e50', borderBottom: '3px solid #e74c3c', paddingBottom: '8px' }}>
                Route Planner
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#666', marginBottom: '4px' }}>START</label>
                    <input
                        type="text"
                        value={startInput}
                        onChange={handleStartChange}
                        placeholder="Station Name"
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px' }}
                    />
                    {startSuggestions.length > 0 && (
                        <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ddd', borderRadius: '4px', zIndex: 1000, margin: 0, padding: 0, listStyle: 'none', maxHeight: '150px', overflowY: 'auto' }}>
                            {startSuggestions.map(s => (
                                <li key={s.id} onClick={() => selectStart(s.id, s.name)} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee' }}>
                                    {s.name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button onClick={swap} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#666' }}>
                        ⇅
                    </button>
                </div>

                <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#666', marginBottom: '4px' }}>END</label>
                    <input
                        type="text"
                        value={endInput}
                        onChange={handleEndChange}
                        placeholder="Station Name"
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px' }}
                    />
                    {endSuggestions.length > 0 && (
                        <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ddd', borderRadius: '4px', zIndex: 1000, margin: 0, padding: 0, listStyle: 'none', maxHeight: '150px', overflowY: 'auto' }}>
                            {endSuggestions.map(s => (
                                <li key={s.id} onClick={() => selectEnd(s.id, s.name)} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee' }}>
                                    {s.name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {routeResult && routeResult.legs ? (
                    <div>
                        <div style={{ marginBottom: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '6px' }}>
                            <div style={{ fontSize: '12px', color: '#666' }}>Total Distance</div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2c3e50' }}>{formatDistance(routeResult.totalDistance)}</div>
                            <div style={{ fontSize: '12px', color: '#666' }}>Transfers: {routeResult.transferCount}</div>
                        </div>

                        {routeResult.legs.map((leg: any, idx: number) => (
                            <div key={idx} style={{ marginBottom: '0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#333', flexShrink: 0 }}></div>
                                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{leg.fromStation.name}</div>
                                </div>

                                <div style={{
                                    borderLeft: leg.type === 'TRANSFER' ? '3px dotted #999' : '3px solid #2ecc71',
                                    marginLeft: '4px',
                                    padding: '10px 0 10px 15px',
                                    minHeight: '40px'
                                }}>
                                    {leg.type === 'TRANSFER' ? (
                                        <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                                            Transfer ({formatDistance(leg.distance)})
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '12px' }}>
                                            <div style={{ fontWeight: 'bold', color: '#27ae60' }}>
                                                {leg.lineId ? leg.lineId.split('::')[1] : 'Rail'}
                                            </div>
                                            <div style={{ color: '#666' }}>{formatDistance(leg.distance)}</div>
                                        </div>
                                    )}
                                </div>

                                {idx === routeResult.legs.length - 1 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#333', flexShrink: 0 }}></div>
                                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{leg.toStation.name}</div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>
                        Select stations to route.
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoutePane;
