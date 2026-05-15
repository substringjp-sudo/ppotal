'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import { cn, isGoogleMapsReady } from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';

interface GoogleMapsSearchProps {
    onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
    initialValue?: string;
    defaultValue?: string;
    placeholder?: string;
    className?: string;
    inputClassName?: string;
    disabled?: boolean;
    locationBias?: { lat: number; lng: number };
    radius?: number; // meters
}

export function GoogleMapsSearch({ 
    onPlaceSelect, 
    initialValue, 
    defaultValue,
    placeholder = "여행지 또는 기록 검색", 
    className,
    inputClassName,
    disabled,
    locationBias,
    radius
}: GoogleMapsSearchProps) {
    const [inputValue, setInputValue] = useState(defaultValue || initialValue || '');
    const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDebouncing, setIsDebouncing] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const debounceTimerRef = useRef<any>(null);
    const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // [OPTIMIZED] 현재 사용자가 입력 중(Focus)이라면 외부 상태에 의한 덮어쓰기를 방지하여
        // 지연된 역지오코딩 업데이트 등으로 인한 검색어 증발 현상을 막습니다.
        if (!isFocused) {
            setInputValue(defaultValue || initialValue || '');
        }
    }, [initialValue, defaultValue, isFocused]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchPredictions = useCallback((input: string) => {
        if (!input.trim()) {
            setPredictions([]);
            setIsLoading(false);
            return;
        }

        if (!isGoogleMapsReady(['places'])) return;

        if (!autocompleteServiceRef.current) {
            autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
        }

        setIsLoading(true);
        const request: google.maps.places.AutocompletionRequest = { input };
        
        if (locationBias && window.google?.maps?.LatLng) {
            request.locationBias = new window.google.maps.LatLng(locationBias.lat, locationBias.lng);
            request.radius = radius || 5000;
        }

        autocompleteServiceRef.current.getPlacePredictions(
            request,
            (results, status) => {
                setIsLoading(false);
                if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                    setPredictions(results);
                    setShowResults(true);
                } else {
                    if (status !== window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                        console.error('Google Maps Search Error:', status);
                    }
                    setPredictions([]);
                    setShowResults(inputValue.length > 0); // 결과 없음 표시를 위해 유지
                }
            }
        );
    }, [locationBias, radius]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);
        
        if (!value.trim()) {
            setIsDebouncing(false);
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            setPredictions([]);
            setShowResults(false);
            return;
        }

        setIsDebouncing(true);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            setIsDebouncing(false);
            fetchPredictions(value);
        }, 300);
    };

    const handlePredictionSelect = (prediction: google.maps.places.AutocompletePrediction) => {
        setInputValue(prediction.structured_formatting.main_text);
        setShowResults(false);
        setPredictions([]); // Clear predictions immediately

        if (!isGoogleMapsReady(['places'])) return;

        if (!placesServiceRef.current) {
            const dummy = document.createElement('div');
            placesServiceRef.current = new window.google.maps.places.PlacesService(dummy);
        }

        setIsLoading(true);
        placesServiceRef.current.getDetails(
            { 
                placeId: prediction.place_id,
                fields: ['name', 'formatted_address', 'geometry', 'address_components', 'url', 'place_id']
            },
            (place, status) => {
                setIsLoading(false);
                if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
                    onPlaceSelect(place);
                }
            }
        );
    };

    const handleClear = () => {
        setInputValue('');
        setPredictions([]);
        setShowResults(false);
    };

    return (
        <div ref={containerRef} className={cn("relative w-full", className)}>
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors z-10" />
                <input
                    type="text"
                    disabled={disabled}
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => {
                        setIsFocused(true);
                        if (predictions.length > 0) setShowResults(true);
                    }}
                    onBlur={() => {
                        // 결과 클릭 시간을 보장하기 위해 약간 지연 후 포커스 해제
                        setTimeout(() => setIsFocused(false), 200);
                    }}
                    placeholder={placeholder}
                    className={cn(
                        "w-full pl-11 pr-12 py-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-800 rounded-2xl focus:border-primary outline-none text-sm font-bold transition-all shadow-sm",
                        inputClassName
                    )}
                />

                {inputValue && !disabled && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors z-10"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
                
                {/* Progress Bar Container */}
                <div className="absolute bottom-0 left-0 right-0 h-[3px] overflow-hidden rounded-b-2xl bg-slate-50 dark:bg-slate-800/50">
                    <AnimatePresence>
                        {(isDebouncing || isLoading) && (
                            <motion.div
                                initial={{ width: '0%', x: 0 }}
                                animate={isDebouncing ? { width: '100%' } : { x: ['-100%', '100%'], width: '30%' }}
                                transition={isDebouncing 
                                    ? { duration: 1, ease: "linear" } 
                                    : { duration: 1.5, repeat: Infinity, ease: "linear" }
                                }
                                className={cn(
                                    "h-full shadow-[0_0_8px_rgba(99,102,241,0.5)]",
                                    isDebouncing ? "bg-amber-400" : "bg-primary"
                                )}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Results Dropdown */}
            <AnimatePresence>
                {showResults && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[250] overflow-hidden"
                        >
                        <div className="max-h-[300px] overflow-y-auto py-2">
                            {predictions.length > 0 ? (
                                predictions.map((prediction) => (
                                    <button
                                        key={prediction.place_id}
                                        type="button"
                                        onClick={() => handlePredictionSelect(prediction)}
                                        className="w-full flex items-start gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors text-left group"
                                    >
                                        <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-primary/10 transition-colors flex-shrink-0">
                                            <MapPin className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-black text-slate-700 dark:text-slate-200 truncate">
                                                {prediction.structured_formatting.main_text}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight truncate">
                                                {prediction.structured_formatting.secondary_text}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            ) : !isLoading && !isDebouncing && (
                                <div className="px-5 py-8 flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-300">
                                        <Search className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm font-black text-slate-600 dark:text-slate-300 mb-1">검색 결과가 없습니다</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter leading-tight">정확한 장소 명칭이나<br/>주소로 검색해보세요</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

