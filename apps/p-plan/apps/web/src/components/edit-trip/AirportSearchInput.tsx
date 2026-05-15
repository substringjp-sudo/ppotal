'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { AIRPORTS, Airport, getRecommendedAirports } from '@pplaner/shared';
import { cn } from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '@pplaner/shared';
import { Star } from 'lucide-react';

import { TripRegion } from '@pplaner/shared';
import { useAviation } from '../../hooks/useAviation';

interface AirportSearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    inputClassName?: string;
    label?: string;
    recommendationRegions?: TripRegion[]; // ID 기반으로 변경
    currentLocation?: { lat: number, lng: number };
    align?: 'left' | 'right';
    intent?: 'departure' | 'arrival';
    departureCode?: string; // Add departureCode for route matching
}

export function AirportSearchInput({ 
    value, 
    onChange, 
    placeholder, 
    className, 
    inputClassName, 
    label,
    recommendationRegions = [],
    currentLocation,
    align = 'left',
    intent = 'departure',
    departureCode
}: AirportSearchInputProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [isComposing, setIsComposing] = useState(false);
    const [displayResults, setDisplayResults] = useState<Airport[]>([]);
    const { loading, searchAirports } = useAviation();
    const containerRef = useRef<HTMLDivElement>(null);

    // Helper to get display name from code
    const getDisplayValue = (val: string) => {
        const airport = AIRPORTS.find(a => a.code === val);
        return airport ? `${airport.nameKo} (${airport.code})` : val;
    };

    // Sync local search term with external value
    useEffect(() => {
        // Only sync if not currently focused to avoid fighting with IME
        if (isFocused) return;
        
        const displayValue = getDisplayValue(value);
        if (displayValue !== searchTerm) {
            setSearchTerm(displayValue);
        }
    }, [value, isFocused]);

    const { profile, updateProfile } = useUserStore();
    // favorites from store
    const favorites = useMemo(() => profile?.preferences?.favoriteAirports || [], [profile]);

    const recommended = useMemo(() => {
        return getRecommendedAirports(recommendationRegions, currentLocation, {
            favorites,
            residence: {
                countryId: profile?.residence?.countryId, // ID 기반 추가
                countryKo: profile?.residence?.country,
                regionKo: profile?.residence?.region,
                cityKo: profile?.residence?.region, 
            },
            intent
        });
    }, [recommendationRegions, currentLocation, favorites, profile?.residence, intent]);

    // Update search results when term or dependencies change
    useEffect(() => {
        const updateResults = async () => {
            // Full chosen value check
            if (searchTerm.includes('(') && searchTerm.includes(')')) {
                const codeMatch = searchTerm.match(/\((.*?)\)/);
                if (codeMatch) {
                    setDisplayResults([]);
                    return;
                }
            }

            // If empty, show recommendations
            if (!searchTerm && !departureCode) {
                // If we have coordinates, get nearby airports from server
                if (currentLocation) {
                    const nearby = await searchAirports('', { location: currentLocation });
                    if (nearby.length > 0) {
                        setDisplayResults(nearby);
                        return;
                    }
                }
                
                // Fallback to local recommendations based on metadata
                setDisplayResults(recommended.slice(0, 8));
                return;
            }

            const results = await searchAirports(searchTerm, { departureCode });
            
            // Prioritize recommended airports in the results
            const combined = [
                ...results.filter(a => recommended.some(r => r.code === a.code)),
                ...results.filter(a => !recommended.some(r => r.code === a.code))
            ];
            
            setDisplayResults(combined);
        };

        const timer = setTimeout(updateResults, 150); // Small debounce
        return () => clearTimeout(timer);
    }, [searchTerm, departureCode, recommended, searchAirports]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (airport: Airport) => {
        onChange(airport.code);
        setSearchTerm(`${airport.nameKo} (${airport.code})`);
        setIsOpen(false);
    };

    const toggleFavorite = (e: React.MouseEvent, code: string) => {
        e.stopPropagation();
        const currentFavorites = [...favorites];
        if (currentFavorites.includes(code)) {
            const updated = currentFavorites.filter(c => c !== code);
            updateProfile({
                preferences: {
                    ...(profile?.preferences || { currency: 'KRW', language: 'ko' }),
                    favoriteAirports: updated
                }
            });
        } else {
            if (currentFavorites.length >= 3) {
                alert('즐겨찾기 공항은 최대 3개까지 설정 가능합니다.');
                return;
            }
            const updated = [...currentFavorites, code];
            updateProfile({
                preferences: {
                    ...(profile?.preferences || { currency: 'KRW', language: 'ko' }),
                    favoriteAirports: updated
                }
            });
        }
    };

    return (
        <div className={cn("space-y-1.5 relative", className)} ref={containerRef}>
            {label && <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{label}</label>}
            <div className="relative">
                <input
                    value={searchTerm}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={() => setIsComposing(false)}
                    onChange={(e) => {
                        const newValue = e.target.value;
                        setSearchTerm(newValue);
                        // Do NOT call onChange(newValue) here. 
                        // Only propagate when a selection is made via handleSelect.
                        setIsOpen(true);
                        
                        // If manually cleared, notify parent
                        if (newValue === '') {
                            onChange('');
                        }
                    }}
                    onFocus={() => {
                        setIsFocused(true);
                        setIsOpen(true);
                    }}
                    onBlur={() => {
                        // Delay blurring to allow click events on results to fire
                        setTimeout(() => setIsFocused(false), 200);
                    }}
                    placeholder={placeholder}
                    className={cn(
                        "w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-primary/30 rounded-2xl outline-none font-bold text-sm transition-all",
                        inputClassName
                    )}
                />
                <AnimatePresence>
                    {isOpen && (displayResults.length > 0 || loading) && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={cn(
                                "absolute z-50 w-full min-w-[300px] sm:min-w-[400px] mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden",
                                align === 'left' ? 'left-0' : 'right-0'
                            )}
                        >
                            <div className="max-h-80 overflow-y-auto py-2">
                                {loading && displayResults.length === 0 && (
                                    <div className="px-5 py-8 flex flex-col items-center justify-center text-slate-400 gap-3">
                                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">글로벌 항공 데이터 검색 중...</span>
                                    </div>
                                )}

                                {/* Recommendation Header */}
                                {(!searchTerm && !departureCode) && (
                                    <div className="px-4 py-2 text-[10px] font-black text-primary uppercase tracking-widest border-b border-slate-200/60 dark:border-slate-800 mb-1">
                                        {currentLocation ? '주변 인접 공항 추천' : (intent === 'departure' ? '기본 추천 및 거주지 공항' : '여행 목적지 및 추천 공항')}
                                    </div>
                                )}

                                {/* Route Recommendations Header */}
                                {departureCode && !searchTerm && displayResults.length > 0 && (
                                    <div className="px-4 py-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest border-b border-slate-200/60 dark:border-slate-800 mb-1">
                                        {departureCode} 출발 직항 노선 공항
                                    </div>
                                )}
                                
                                {displayResults.map((airport) => {
                                    const isFavorite = favorites.includes(airport.code);
                                    const isRecommended = recommended.some(r => r.code === airport.code) && !isFavorite;
                                    
                                    return (
                                        <div
                                            key={airport.code}
                                            onClick={() => handleSelect(airport)}
                                            className="w-full px-5 py-4 flex items-start justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left group/item border-b border-slate-200/60 last:border-0 dark:border-slate-800 cursor-pointer"
                                        >
                                            <div className="flex items-start flex-1 min-w-0 mr-4 mt-0.5">
                                                <button
                                                    onClick={(e) => toggleFavorite(e, airport.code)}
                                                    className={cn(
                                                        "mr-3 mt-1.5 transition-all p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700",
                                                        isFavorite ? "text-amber-500" : "text-slate-300 hover:text-slate-400 dark:text-slate-600"
                                                    )}
                                                >
                                                    <Star size={18} fill={isFavorite ? "currentColor" : "none"} strokeWidth={isFavorite ? 2.5 : 2} />
                                                </button>
                                                <div className="flex flex-col min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <span className="text-[15px] font-black text-slate-900 dark:text-white group-hover/item:text-primary transition-colors leading-tight">
                                                            {airport.nameKo}
                                                        </span>
                                                        <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-500 whitespace-nowrap">
                                                            {airport.code}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[11.5px] font-bold text-slate-600 dark:text-slate-400">
                                                            {airport.regionIds.cityName}{airport.regionIds.prefectureName ? `, ${airport.regionIds.prefectureName}` : ''}
                                                        </span>
                                                        <span className="text-[10px] font-medium text-slate-400 leading-relaxed italic">
                                                            {airport.nameEn}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end flex-shrink-0 pt-0.5">
                                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                                                    {airport.regionIds.countryName}
                                                </span>
                                                {isFavorite && (
                                                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-[0.15em] mt-1.5 px-2 py-0.5 bg-amber-500/5 rounded-full">즐겨찾기</span>
                                                )}
                                                {isRecommended && (
                                                    <span className="text-[9px] font-black text-primary uppercase tracking-[0.15em] mt-1.5 px-2 py-0.5 bg-primary/5 rounded-full">추천</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
