
import React, { useState, useEffect, useMemo } from 'react';
import { trackEvent } from '../lib/gtag';
import { RailData } from '../types/railData';
import { useI18n } from '../lib/i18n-context';
import { getLocalizedName } from '../lib/i18n-utils';

interface Leg {
    fromStation: { id: string; name: string; name_en?: string };
    toStation: { id: string; name: string; name_en?: string };
    distance: number;
    type: 'TRIP' | 'TRANSFER';
    lineId?: string;
}

interface RouteResult {
    totalDistance: number;
    transferCount: number;
    legs: Leg[];
}

interface RoutePaneProps {
    startStation: string | null;
    endStation: string | null;
    onSetStartStation: (id: string) => void;
    onSetEndStation: (id: string) => void;
    routeResult: RouteResult | null;
    onSwapStations: () => void;
    railData?: RailData | null;
}

const TRANSLATIONS = {
    ko: {
        title: '경로 탐색',
        start: '출발',
        end: '도착',
        placeholder: '역명 입력',
        totalDistance: '총 이동 거리',
        transfers: (count: number) => `환승: ${count}회`,
        transfer: '환승',
        rail: '철도',
        noSelection: '역을 선택하여 경로를 탐색하세요.'
    },
    en: {
        title: 'Route Planner',
        start: 'START',
        end: 'END',
        placeholder: 'Station Name',
        totalDistance: 'Total Distance',
        transfers: (count: number) => `Transfers: ${count}`,
        transfer: 'Transfer',
        rail: 'Rail',
        noSelection: 'Select stations to route.'
    },
    ja: {
        title: 'ルート検索',
        start: '出発',
        end: '到着',
        placeholder: '駅名を入力',
        totalDistance: '総移動距離',
        transfers: (count: number) => `乗換: ${count}回`,
        transfer: '乗換',
        rail: '鉄道',
        noSelection: '駅を選択してルートを検索してください。'
    }
};

const RoutePane: React.FC<RoutePaneProps> = ({
    startStation,
    endStation,
    onSetStartStation,
    onSetEndStation,
    routeResult,
    onSwapStations,
    railData
}) => {
    const { language } = useI18n();
    const t = TRANSLATIONS[language as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;
    const [startInput, setStartInput] = useState(startStation || '');
    const [endInput, setEndInput] = useState(endStation || '');

    // Autocomplete state
    const [startSuggestions, setStartSuggestions] = useState<{ id: string, name: string, name_en?: string }[]>([]);
    const [endSuggestions, setEndSuggestions] = useState<{ id: string, name: string, name_en?: string }[]>([]);

    useEffect(() => {
        if (startStation && railData?.stations?.[startStation]) {
            Promise.resolve().then(() => setStartInput(railData.stations[startStation].name));
        } else {
            Promise.resolve().then(() => setStartInput(''));
        }
    }, [startStation, railData]);

    useEffect(() => {
        if (endStation && railData?.stations?.[endStation]) {
            Promise.resolve().then(() => setEndInput(railData.stations[endStation].name));
        } else {
            Promise.resolve().then(() => setEndInput(''));
        }
    }, [endStation, railData]);

    useEffect(() => {
        if (routeResult && routeResult.totalDistance > 0) {
            const startName = startStation && railData?.stations?.[startStation] ? railData.stations[startStation].name : startStation;
            const endName = endStation && railData?.stations?.[endStation] ? railData.stations[endStation].name : endStation;
            trackEvent('route_search_success', 'engagement', `${startName} to ${endName}`, Math.round(routeResult.totalDistance));
        }
    }, [routeResult, startStation, endStation, railData]);

    const stationList = useMemo(() => {
        if (!railData?.stations) return [];

        const names = new Set<string>();
        const list: { id: string; name: string; primary_name: string; name_en?: string }[] = [];

        Object.values(railData.stations).forEach((station) => {
            if (!names.has(station.name)) {
                names.add(station.name);
                list.push({
                    name: station.name,
                    id: station.id,
                    primary_name: station.name,
                    name_en: station.name_en
                });
            }
        });

        return list.sort((a, b) => a.name.localeCompare(b.name));
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
                {t.title}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#666', marginBottom: '4px' }}>{t.start}</label>
                    <input
                        type="text"
                        value={startInput}
                        onChange={handleStartChange}
                        placeholder={t.placeholder}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px' }}
                    />
                    {startSuggestions.length > 0 && (
                        <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ddd', borderRadius: '4px', zIndex: 1000, margin: 0, padding: 0, listStyle: 'none', maxHeight: '150px', overflowY: 'auto' }}>
                            {startSuggestions.map(s => (
                                <li key={s.id} onClick={() => selectStart(s.id, s.name)} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee', display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{s.name}</span>
                                    {s.name_en && <span style={{ fontSize: '11px', color: '#888' }}>{s.name_en}</span>}
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
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#666', marginBottom: '4px' }}>{t.end}</label>
                    <input
                        type="text"
                        value={endInput}
                        onChange={handleEndChange}
                        placeholder={t.placeholder}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px' }}
                    />
                    {endSuggestions.length > 0 && (
                        <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ddd', borderRadius: '4px', zIndex: 1000, margin: 0, padding: 0, listStyle: 'none', maxHeight: '150px', overflowY: 'auto' }}>
                            {endSuggestions.map(s => (
                                <li key={s.id} onClick={() => selectEnd(s.id, s.name)} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee', display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{s.name}</span>
                                    {s.name_en && <span style={{ fontSize: '11px', color: '#888' }}>{s.name_en}</span>}
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
                            <div style={{ fontSize: '12px', color: '#666' }}>{t.totalDistance}</div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2c3e50' }}>{formatDistance(routeResult.totalDistance)}</div>
                            <div style={{ fontSize: '12px', color: '#666' }}>{t.transfers(routeResult.transferCount)}</div>
                        </div>

                        {routeResult.legs.map((leg, idx: number) => (
                            <div key={idx} style={{ marginBottom: '0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#333', flexShrink: 0 }}></div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{language === 'ja' ? leg.fromStation.name : (leg.fromStation.name_en || leg.fromStation.name)}</div>
                                        {language !== 'ja' && <div style={{ fontSize: '11px', color: '#888' }}>{leg.fromStation.name}</div>}
                                    </div>
                                </div>

                                <div style={{
                                    borderLeft: leg.type === 'TRANSFER' ? '3px dotted #999' : '3px solid #2ecc71',
                                    marginLeft: '4px',
                                    padding: '10px 0 10px 15px',
                                    minHeight: '40px'
                                }}>
                                    {leg.type === 'TRANSFER' ? (
                                        <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                                            {t.transfer} ({formatDistance(leg.distance)})
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '12px' }}>
                                            <div style={{ fontWeight: 'bold', color: '#27ae60' }}>
                                                {leg.lineId ? leg.lineId.split('::')[1] : t.rail}
                                            </div>
                                            <div style={{ color: '#666' }}>{formatDistance(leg.distance)}</div>
                                        </div>
                                    )}
                                </div>

                                {idx === routeResult.legs.length - 1 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#333', flexShrink: 0 }}></div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{language === 'ja' ? leg.toStation.name : (leg.toStation.name_en || leg.toStation.name)}</div>
                                            {language !== 'ja' && <div style={{ fontSize: '11px', color: '#888' }}>{leg.toStation.name}</div>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>
                        {t.noSelection}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoutePane;
