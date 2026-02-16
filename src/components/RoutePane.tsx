
import React, { useState, useEffect } from 'react';
import { Language } from '../lib/translations';
import { trackEvent } from '../lib/gtag';

interface RoutePaneProps {
    startStation: string | null;
    endStation: string | null;
    onSetStartStation: (name: string) => void;
    onSetEndStation: (name: string) => void;
    routeResult: any | null; // RouteResult from RoutingGraph
    onSwapStations: () => void;
    language: Language;
}

const RoutePane: React.FC<RoutePaneProps> = ({
    startStation,
    endStation,
    onSetStartStation,
    onSetEndStation,
    routeResult,
    onSwapStations,
    language
}) => {
    const [stationList, setStationList] = useState<{ id: string, name: string, primary_name: string }[]>([]);
    const [startInput, setStartInput] = useState(startStation || '');
    const [endInput, setEndInput] = useState(endStation || '');

    // Autocomplete state
    const [startSuggestions, setStartSuggestions] = useState<any[]>([]);
    const [endSuggestions, setEndSuggestions] = useState<any[]>([]);

    useEffect(() => {
        setStartInput(startStation || '');
    }, [startStation]);

    useEffect(() => {
        setEndInput(endStation || '');
    }, [endStation]);

    useEffect(() => {
        if (routeResult && routeResult.totalDistance > 0) {
            trackEvent('route_search_success', 'engagement', `${startStation} to ${endStation}`, Math.round(routeResult.totalDistance));
        }
    }, [routeResult, startStation, endStation]);

    useEffect(() => {
        // Load station master list for autocomplete
        fetch('/data/station_master_list.json')
            .then(res => res.json())
            .then((data: Record<string, any>) => {
                const names = new Set<string>();
                const list: any[] = [];
                Object.values(data).forEach((group: any) => {
                    if (!names.has(group.primary_name)) {
                        names.add(group.primary_name);
                        list.push({ name: group.primary_name });
                    }
                });
                setStationList(list.sort((a, b) => a.name.localeCompare(b.name)));
            })
            .catch(err => {
                console.error("Failed to load station master list", err);
            });
    }, []);

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

    const selectStart = (name: string) => {
        setStartInput(name);
        onSetStartStation(name);
        setStartSuggestions([]);
        trackEvent('route_set_start', 'interaction', name);
    };

    const selectEnd = (name: string) => {
        setEndInput(name);
        onSetEndStation(name);
        setEndSuggestions([]);
        trackEvent('route_set_end', 'interaction', name);
    };

    const swap = () => {
        const temp = startInput;
        setStartInput(endInput);
        setEndInput(temp);
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
                                <li key={s.name} onClick={() => selectStart(s.name)} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee' }}>
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
                                <li key={s.name} onClick={() => selectEnd(s.name)} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee' }}>
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
