"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { RailData, Station } from '../types/railData';
import { Trip } from '../types/trip';
import { useI18n } from '../lib/i18n-context';
import { getLocalizedName } from '../lib/i18n-utils';
import { MY_LINES_TRANSLATIONS, getTranslations } from '../lib/translations';
import { findCandidateRoutes, CandidateRoute, RouteSearchResult } from '../lib/routeSearch';

export interface RouteGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    railData: RailData | null;
    onAddTrip: (trip: Trip) => void;
}

interface StationInputProps {
    label: string;
    placeholder: string;
    selectedStation: Station | null;
    onSelectStation: (station: Station | null) => void;
    railData: RailData | null;
    onRemove?: () => void;
    isRemovable?: boolean;
    icon: string;
    iconColor?: string;
}

const StationPickerInput: React.FC<StationInputProps> = ({
    label,
    placeholder,
    selectedStation,
    onSelectStation,
    railData,
    onRemove,
    isRemovable = false,
    icon,
    iconColor = 'text-primary'
}) => {
    const { language } = useI18n();
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const results = useMemo(() => {
        if (!railData || !query.trim()) return [];
        const q = query.toLowerCase().trim();

        const stationsMap = new Map<string, Station>();
        Object.values(railData.stations).forEach(s => {
            const key = `${s.name}-${s.prefecture_id}`;
            if (!stationsMap.has(key)) {
                if (
                    s.name.toLowerCase().includes(q) ||
                    (s.name_en && s.name_en.toLowerCase().includes(q)) ||
                    (s.name_kr && s.name_kr.toLowerCase().includes(q))
                ) {
                    stationsMap.set(key, s);
                }
            }
        });

        return Array.from(stationsMap.values()).slice(0, 10);
    }, [railData, query]);

    return (
        <div className="relative flex flex-col gap-1" ref={containerRef}>
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className={`material-symbols-outlined text-sm ${iconColor}`}>{icon}</span>
                {label}
            </label>

            {selectedStation ? (
                <div className="flex items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className="material-symbols-outlined text-base text-primary">location_on</span>
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                {getLocalizedName(selectedStation, language)}
                            </span>
                            {selectedStation.name_en && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                                    {selectedStation.name_en}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => onSelectStation(null)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            title="변경"
                        >
                            <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        {isRemovable && onRemove && (
                            <button
                                type="button"
                                onClick={onRemove}
                                className="p-1 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                title="삭제"
                            >
                                <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        placeholder={placeholder}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                    />

                    {isOpen && results.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-[1100] max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                            {results.map(st => (
                                <button
                                    key={st.id}
                                    type="button"
                                    onClick={() => {
                                        onSelectStation(st);
                                        setQuery('');
                                        setIsOpen(false);
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors flex items-center justify-between"
                                >
                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                        {getLocalizedName(st, language)}
                                    </span>
                                    {st.name_en && (
                                        <span className="text-[10px] text-slate-400">
                                            {st.name_en}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const RouteGeneratorModal: React.FC<RouteGeneratorModalProps> = ({
    isOpen,
    onClose,
    railData,
    onAddTrip
}) => {
    const { language } = useI18n();
    const t = getTranslations(MY_LINES_TRANSLATIONS, language);

    const [startStation, setStartStation] = useState<Station | null>(null);
    const [endStation, setEndStation] = useState<Station | null>(null);
    const [viaStations, setViaStations] = useState<(Station | null)[]>([]);

    const [searchResult, setSearchResult] = useState<RouteSearchResult | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Reset when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setStartStation(null);
            setEndStation(null);
            setViaStations([]);
            setSearchResult(null);
            setHasSearched(false);
            setIsSearching(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleAddVia = () => {
        setViaStations(prev => [...prev, null]);
    };

    const handleRemoveVia = (index: number) => {
        setViaStations(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleSetVia = (index: number, station: Station | null) => {
        setViaStations(prev => {
            const next = [...prev];
            next[index] = station;
            return next;
        });
    };

    const handleSearchRoutes = () => {
        if (!startStation || !endStation || !railData) return;

        setIsSearching(true);
        setHasSearched(false);

        // Build list of valid waypoints: start -> valid vias -> end
        const validVias = viaStations.filter((v): v is Station => v !== null);
        const waypoints = [startStation, ...validVias, endStation];

        setTimeout(() => {
            const result = findCandidateRoutes(waypoints, railData);
            setSearchResult(result);
            setIsSearching(false);
            setHasSearched(true);
        }, 150);
    };

    const handleSelectRoute = (candidate: CandidateRoute) => {
        if (!startStation || !endStation) return;

        const validVias = viaStations.filter((v): v is Station => v !== null);
        const waypoints = [startStation, ...validVias, endStation];

        const startName = getLocalizedName(startStation, language);
        const endName = getLocalizedName(endStation, language);

        const newTrip: Trip = {
            id: `trip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: `${startName} ~ ${endName}`,
            start: startName,
            end: endName,
            startId: startStation.id,
            endId: endStation.id,
            distance: candidate.distance,
            path: candidate.stationIds,
            waypoints: waypoints.map(w => w.id),
            geometries: candidate.geometries,
            sectionIds: candidate.sectionIds,
            createdAt: new Date().toISOString()
        };

        onAddTrip(newTrip);
        onClose();
    };

    const isSearchDisabled = !startStation || !endStation;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <span className="material-symbols-outlined text-xl">alt_route</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white text-base">
                                {t.createRouteTitle || '경로 자동 생성'}
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                시작역과 도착역 사이의 세부 경로를 찾아 기록을 생성합니다.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
                    {/* Station Inputs */}
                    <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                        {/* Start Station */}
                        <StationPickerInput
                            label={t.startStation || '시작역'}
                            placeholder="시작역 이름을 검색하세요 (예: 東京, Tokyo, 도쿄)"
                            selectedStation={startStation}
                            onSelectStation={setStartStation}
                            railData={railData}
                            icon="trip_origin"
                            iconColor="text-emerald-500"
                        />

                        {/* Via Stations */}
                        {viaStations.map((via, idx) => (
                            <StationPickerInput
                                key={idx}
                                label={`${t.viaStation || '경유역'} ${idx + 1}`}
                                placeholder="경유역 이름을 검색하세요"
                                selectedStation={via}
                                onSelectStation={(st) => handleSetVia(idx, st)}
                                railData={railData}
                                isRemovable={true}
                                onRemove={() => handleRemoveVia(idx)}
                                icon="adjust"
                                iconColor="text-amber-500"
                            />
                        ))}

                        {/* Add Via Button */}
                        <div className="flex justify-start">
                            <button
                                type="button"
                                onClick={handleAddVia}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 transition-colors border border-primary/20"
                            >
                                <span className="material-symbols-outlined text-sm">add</span>
                                {t.addVia || '경유역 추가'}
                            </button>
                        </div>

                        {/* End Station */}
                        <StationPickerInput
                            label={t.endStation || '도착역'}
                            placeholder="도착역 이름을 검색하세요 (예: 新大阪, Shin-Osaka, 신오사카)"
                            selectedStation={endStation}
                            onSelectStation={setEndStation}
                            railData={railData}
                            icon="location_on"
                            iconColor="text-rose-500"
                        />
                    </div>

                    {/* Search Button */}
                    <button
                        type="button"
                        onClick={handleSearchRoutes}
                        disabled={isSearchDisabled || isSearching}
                        className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
                            isSearchDisabled || isSearching
                                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                                : 'bg-primary text-white hover:bg-primary/90 shadow-primary/20 active:scale-[0.99]'
                        }`}
                    >
                        {isSearching ? (
                            <>
                                <span className="animate-spin material-symbols-outlined text-base">progress_activity</span>
                                경로 탐색 중...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-base">search</span>
                                {t.searchRoute || '경로 탐색'}
                            </>
                        )}
                    </button>

                    {/* Search Results */}
                    {hasSearched && searchResult && (
                        <div className="space-y-3 pt-2 animate-in fade-in duration-200">
                            {/* Warning Banner if >= 5 Candidates */}
                            {searchResult.hasTooManyCandidates && (
                                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 text-amber-800 dark:text-amber-300">
                                    <span className="material-symbols-outlined text-lg text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">warning</span>
                                    <div className="text-xs font-semibold leading-relaxed">
                                        <p className="font-bold mb-0.5">
                                            경우의 수가 {searchResult.totalCandidatesCount}개 발견되었습니다.
                                        </p>
                                        <p className="text-[11px] opacity-90">
                                            {t.tooManyCandidatesWarning || '경우의 수가 5개 이상 발견되었습니다. 경유역을 추가하면 더 정확한 경로를 지정할 수 있습니다.'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Candidate List */}
                            {searchResult.candidates.length > 0 ? (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider px-1 flex items-center justify-between">
                                        <span>추천 경로 후보 ({searchResult.candidates.length}개)</span>
                                        <span className="text-[10px] font-normal text-slate-400">원하는 경로를 선택하세요</span>
                                    </h4>

                                    {searchResult.candidates.map((candidate, idx) => (
                                        <div
                                            key={candidate.id}
                                            className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col gap-2.5"
                                        >
                                            {/* Header info */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                                                        {t.routeOption || '경로'} {idx + 1}
                                                    </span>
                                                    {candidate.isShortest && (
                                                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                            {t.shortestRoute || '최단 경로'}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="text-xs font-black text-primary">
                                                    {candidate.distance} KM
                                                </div>
                                            </div>

                                            {/* Lines Used Badges */}
                                            <div className="flex flex-wrap items-center gap-1.5 py-1">
                                                {candidate.lines.map((line, lIdx) => (
                                                    <React.Fragment key={line.id}>
                                                        {lIdx > 0 && (
                                                            <span className="text-slate-300 dark:text-slate-600 text-xs font-bold">➔</span>
                                                        )}
                                                        <span
                                                            className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-sm"
                                                            style={{ backgroundColor: line.color || '#3b82f6' }}
                                                        >
                                                            {line.name}
                                                        </span>
                                                    </React.Fragment>
                                                ))}
                                            </div>

                                            {/* Station snippet */}
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl">
                                                {candidate.stationNames.slice(0, 8).join(' ➔ ')}
                                                {candidate.stationNames.length > 8 && ` ➔ ... (${candidate.stationNames.length}개 역)`}
                                            </div>

                                            {/* Action button */}
                                            <div className="flex justify-end pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSelectRoute(candidate)}
                                                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/90 active:scale-95 transition-all shadow-md shadow-primary/20 flex items-center gap-1.5"
                                                >
                                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                                    {t.selectRoute || '이 경로 선택'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs">
                                    <span className="material-symbols-outlined text-3xl mb-2 text-slate-400 block">search_off</span>
                                    {t.noRouteFound || '경로를 찾을 수 없습니다.'}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
