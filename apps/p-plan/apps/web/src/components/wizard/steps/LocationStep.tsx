import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@pplaner/shared';
import { useWizardStore } from '@pplaner/shared';
import MapComponent from '@/components/common/MapComponent';
import { resolveRegionIdsFromPlace, reverseGeocodeIds, RegionIds } from '@pplaner/shared';
import { useRegionSearch } from '@/hooks/useRegionSearch';

interface Prediction {
    placeId: string;
    description: string;
    mainText: string;
    secondaryText: string;
    types: string[];
}

export default function LocationStep() {
    const { 
        locations, 
        locationDetails, 
        addLocation, 
        removeLocation, 
        clearLocations, 
        isLocationUndecided, 
        setLocationUndecided 
    } = useWizardStore();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesService = useRef<google.maps.places.PlacesService | null>(null);
    const geocoder = useRef<google.maps.Geocoder | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);

    const { search: searchInternalRegions, isSearching: isSearchingInternal } = useRegionSearch();
    const [internalRegions, setInternalRegions] = useState<any[]>([]);

    // Initialize Google Maps services
    useEffect(() => {
        if (typeof window !== 'undefined' && window.google && !autocompleteService.current) {
            autocompleteService.current = new google.maps.places.AutocompleteService();
            geocoder.current = new google.maps.Geocoder();
        }
    }, []);

    const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);

        if (!value.trim()) {
            setPredictions([]);
            setInternalRegions([]);
            return;
        }

        // 1. Local region tree search (Server-side)
        if (value.length >= 1) {
            searchInternalRegions(value).then(results => {
                setInternalRegions(results);
            });
        }
        
        // 2. Google Places Autocomplete
        if (autocompleteService.current) {
            autocompleteService.current.getPlacePredictions(
                { input: value, types: ['(regions)'] },
                (results, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                        setPredictions(results.map(r => ({
                            placeId: r.place_id,
                            description: r.description,
                            mainText: r.structured_formatting.main_text,
                            secondaryText: r.structured_formatting.secondary_text,
                            types: r.types || []
                        })));
                    } else {
                        setPredictions([]);
                    }
                }
            );
        }
    };

    const handleSelectPrediction = async (prediction: Prediction) => {
        if (locations.length >= 5) return;

        if (placesService.current) {
            placesService.current.getDetails(
                { placeId: prediction.placeId, fields: ['address_components', 'geometry'] },
                async (place, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                        const regionIds = await resolveRegionIdsFromPlace(place);
                        console.log('[LocationStep] Resolved regionIds from Google Place:', prediction.mainText, regionIds);
                        addLocation(prediction.mainText, regionIds);
                    } else {
                        addLocation(prediction.mainText);
                    }
                }
            );
        } else {
            addLocation(prediction.mainText);
        }
        
        setSearchQuery('');
        setPredictions([]);
    };

    // Convert store locationDetails to MapComponent regions format
    const mapRegions = locationDetails.map(ld => {
        if (!ld.regionIds) return null;
        
        const { cityId, prefectureId, countryId } = ld.regionIds;
        if (cityId) return { 
            id: cityId, 
            type: 'city' as const, 
            name: ld.name,
            parentPrefectureId: prefectureId,
            countryId: countryId
        };
        if (prefectureId) return { 
            id: prefectureId, 
            type: 'prefecture' as const, 
            name: ld.name,
            countryId: countryId
        };
        if (countryId) return { 
            id: countryId, 
            type: 'country' as const, 
            name: ld.name,
            countryId: countryId
        };
        
        return null;
    }).filter(Boolean) as Array<{ id: string; type: 'country' | 'prefecture' | 'city'; name: string; parentPrefectureId?: string; countryId?: string }>;

    return (
        <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
                hidden: { opacity: 0 },
                visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.1 }
                }
            }}
            className="space-y-6"
        >
            <motion.div 
                variants={{
                    hidden: { opacity: 0, y: -10 },
                    visible: { opacity: 1, y: 0 }
                }}
                className="flex items-center justify-between px-2"
            >
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-primary rounded-full" />
                        어디로 떠나시나요?
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 mt-1 pl-4 uppercase tracking-[0.2em]">지역 선택 (최대 5개)</p>
                </div>
                <label className="flex items-center gap-3 cursor-pointer group">
                    <span className="text-[10px] font-black text-slate-500 group-hover:text-primary transition-colors">장소 미정</span>
                    <input
                        type="checkbox"
                        checked={isLocationUndecided}
                        onChange={(e) => setLocationUndecided(e.target.checked)}
                        className="w-5 h-5 rounded-lg border-2 border-slate-200 checked:bg-primary checked:border-primary transition-all appearance-none cursor-pointer"
                        aria-label="장소 미정 선택"
                    />
                </label>
            </motion.div>

            <div className={cn("grid grid-cols-1 lg:grid-cols-12 gap-6 h-[500px] transition-all", isLocationUndecided && "opacity-20 grayscale pointer-events-none")}>
                {/* Search & List Section */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 group-focus-within:text-primary transition-colors">
                            <span className="material-symbols-rounded text-lg">search</span>
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder="도시, 지역 검색..."
                            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold outline-none ring-primary/10 focus:ring-4 focus:border-primary transition-all shadow-sm shadow-slate-200/50 dark:shadow-none"
                            aria-label="장소 검색"
                        />
                        
                        <AnimatePresence>
                            {(predictions.length > 0 || internalRegions.length > 0) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[400px] overflow-y-auto"
                                >
                                    {/* Internal Regions (Direct Match) */}
                                    {internalRegions.length > 0 && (
                                        <div className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between">
                                            <span className="text-[9px] font-black text-primary uppercase tracking-widest italic">Fast Direct Search</span>
                                            {isSearchingInternal && <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
                                        </div>
                                    )}
                                    {internalRegions.map(region => (
                                        <button
                                            key={`internal-${region.id}`}
                                            onClick={() => {
                                                const standardIds: RegionIds = {
                                                    countryId: region.countryId || (region.type === 'country' ? region.id : undefined),
                                                    prefectureId: region.prefectureId || (region.type === 'prefecture' ? region.id : undefined),
                                                    cityId: region.type === 'city' ? region.id : undefined
                                                };
                                                console.log('[LocationStep] Selected internal region ids:', region.name, standardIds);
                                                addLocation(region.name, standardIds);
                                                setSearchQuery('');
                                                setInternalRegions([]);
                                                setPredictions([]);
                                            }}
                                            className="w-full p-4 flex items-center gap-3 hover:bg-primary/5 transition-all text-left border-b border-slate-200/60 dark:border-slate-800 last:border-0 group/internal"
                                        >
                                            <span className="material-symbols-rounded text-primary/60 group-hover/internal:scale-110 transition-transform">
                                                {region.type === 'country' ? 'public' : region.type === 'prefecture' ? 'domain' : 'location_city'}
                                            </span>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <p className="text-[11px] font-black text-slate-900 dark:text-white">{region.name}</p>
                                                    <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[8px] font-black uppercase tracking-tighter shadow-sm">
                                                        {region.type}
                                                    </span>
                                                </div>
                                                {region.parentName && <p className="text-[9px] font-bold text-slate-400">{region.parentName}</p>}
                                            </div>
                                            <span className="material-symbols-rounded text-slate-200 text-sm">add_circle</span>
                                        </button>
                                    ))}

                                    {/* Google Results */}
                                    {predictions.length > 0 && (
                                        <div className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 px-4 py-2">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Global Places</span>
                                        </div>
                                    )}
                                    {predictions.map(p => {
                                        const isPrefecture = p.types?.includes('administrative_area_level_1');
                                        const isCity = p.types?.includes('locality') || p.types?.includes('sublocality') || p.types?.includes('administrative_area_level_2');

                                        return (
                                            <button
                                                key={p.placeId}
                                                onClick={() => handleSelectPrediction(p)}
                                                className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left border-b border-slate-200/60 dark:border-slate-800 last:border-0 group/pred"
                                            >
                                                <span className="material-symbols-rounded text-slate-300 dark:text-slate-600 group-hover/pred:text-primary transition-colors">
                                                    {isPrefecture ? 'domain' : 'location_on'}
                                                </span>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <p className="text-[11px] font-black text-slate-900 dark:text-white">{p.mainText}</p>
                                                        {isPrefecture && (
                                                            <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[8px] font-black uppercase tracking-tighter shadow-sm">
                                                                도/현
                                                            </span>
                                                        )}
                                                        {isCity && (
                                                            <span className="px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[8px] font-black uppercase tracking-tighter shadow-sm">
                                                                시/지역
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[9px] font-bold text-slate-400">{p.secondaryText}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>

                    </div>

                    <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 space-y-4 overflow-y-auto shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">선택된 장소 {locations.length}/5</h4>
                            {locations.length > 0 && (
                                <button
                                    onClick={clearLocations}
                                    className="text-[9px] font-black text-red-400 hover:text-red-500 transition-colors uppercase"
                                >
                                    전체 삭제
                                </button>
                            )}
                        </div>

                        <div className="space-y-2">
                            <AnimatePresence mode="popLayout">
                                {locations.map((loc, idx) => (
                                    <motion.div
                                        key={loc}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 group/loc"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center">
                                                {idx + 1}
                                            </span>
                                            <span className="text-xs font-black text-slate-900 dark:text-white">{loc}</span>
                                        </div>
                                        <button
                                            onClick={() => removeLocation(loc)}
                                            className="material-symbols-rounded text-slate-300 hover:text-red-400 transition-colors text-lg opacity-0 group-hover/loc:opacity-100"
                                            aria-label={`${loc} 삭제`}
                                        >
                                            close
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {locations.length === 0 && (
                                <div className="py-12 text-center space-y-2">
                                    <span className="material-symbols-rounded text-slate-200 dark:text-slate-800 text-4xl">travel_explore</span>
                                    <p className="text-[10px] font-bold text-slate-400 italic">가고 싶은 지역을<br />검색하여 추가해보세요</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Map Section */}
                <motion.div 
                    variants={{
                        hidden: { opacity: 0, x: 20 },
                        visible: { opacity: 1, x: 0 }
                    }}
                    className="lg:col-span-8 relative rounded-[32px] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none"
                >
                    <MapComponent
                        center={{ lat: 36.5, lng: 128.0 }} // 한국/일본 중심부 부근
                        zoom={5}
                        regions={mapRegions}
                        onLoad={(map: google.maps.Map) => {
                            mapRef.current = map;
                            placesService.current = new google.maps.places.PlacesService(map);
                        }}
                    />

                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-full shadow-2xl border border-white/20 dark:border-slate-800">
                        <p className="text-[10px] font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                            선택하고 싶은 지역을 자유롭게 검색하세요
                        </p>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
