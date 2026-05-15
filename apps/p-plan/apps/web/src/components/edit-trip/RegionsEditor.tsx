'use client';

import { useState, useMemo } from 'react';
import { useTripStore } from '@pplaner/shared';
import TripMap from '@/components/common/TripMap';
import { useRegionSearch, RegionMetadata } from '@/hooks/useRegionSearch';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@pplaner/shared';

export default function RegionsEditor() {
    const trip = useTripStore((state) => state.currentTrip);
    const updateTrip = useTripStore((state) => state.updateTrip);

    const [newLocation, setNewLocation] = useState('');
    const { search } = useRegionSearch();
    const [suggestions, setSuggestions] = useState<RegionMetadata[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isComposing, setIsComposing] = useState(false);

    if (!trip) return null;

    const handleLocationInputChange = async (val: string) => {
        setNewLocation(val);
        if (val.trim().length >= 1) {
            const results = await search(val);
            setSuggestions(results);
            setSelectedIndex(-1);
        } else {
            setSuggestions([]);
            setSelectedIndex(-1);
        }
    };

    const addLocation = (region: RegionMetadata) => {
        const regionIdStr = String(region.id);
        if (trip.locations?.regions?.some(r => String(r.id) === regionIdStr)) {
            setNewLocation('');
            setSuggestions([]);
            setSelectedIndex(-1);
            return;
        }

        const newRegion: any = {
            id: regionIdStr,
            type: region.type,
            name: region.name,
            countryId: region.country ? String(region.country) : undefined,
            prefectureId: region.prefecture ? String(region.prefecture) : undefined,
        };

        if (region.type === 'country') {
            newRegion.countryId = regionIdStr;
        } else if (region.type === 'prefecture') {
            newRegion.prefectureId = regionIdStr;
        } else if (region.type === 'city') {
            newRegion.cityId = regionIdStr;
        }

        const newRegions = [...(trip.locations?.regions || []), newRegion];

        updateTrip({
            locations: {
                ...trip.locations,
                regionNames: Array.from(new Set([...(trip.locations?.regionNames || []), region.name])),
                regions: newRegions
            }
        });

        setNewLocation('');
        setSuggestions([]);
        setSelectedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (suggestions.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter') {
            if (isComposing) return;
            e.preventDefault();
            if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                addLocation(suggestions[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            setSuggestions([]);
            setSelectedIndex(-1);
        }
    };

    const removeLocation = (regionId: string) => {
        console.log('[RegionsEditor] Attempting to remove region:', regionId);
        console.log('[RegionsEditor] Current regions:', trip.locations?.regions?.map(r => ({ id: r.id, type: typeof r.id, name: r.name })));

        const newRegions = trip.locations!.regions!.filter(r => String(r.id) !== regionId);
        const removedRegion = trip.locations!.regions!.find(r => String(r.id) === regionId);
        
        if (!removedRegion) {
            console.warn('[RegionsEditor] Could not find region to remove with ID:', regionId);
            return;
        }

        const newNames = trip.locations!.regionNames!.filter(name => name !== removedRegion.name);

        console.log('[RegionsEditor] New names:', newNames);
        console.log('[RegionsEditor] New regions count:', newRegions.length);

        updateTrip({
            locations: {
                ...trip.locations,
                regionNames: newNames,
                regions: newRegions
            }
        });
    };

    return (
        <div className="flex flex-col gap-8 pb-20">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500">
                    <span className="material-symbols-rounded">map</span>
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">여행 지역 설정</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">방문할 국가와 도시를 선택하여 지도를 완성하세요.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                <div className="xl:col-span-5 space-y-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">도시 / 국가 검색</label>
                            <div className="relative">
                                <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                                <input
                                    type="text"
                                    value={newLocation}
                                    onChange={(e) => handleLocationInputChange(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onCompositionStart={() => setIsComposing(true)}
                                    onCompositionEnd={() => setIsComposing(false)}
                                    placeholder="어디로 떠나시나요? (도시, 국가 검색)"
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all h-[52px]"
                                />
                                
                                <AnimatePresence>
                                    {suggestions.length > 0 && (
                                        <motion.div 
                                            initial={{ opacity:0, y: 10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y: 10 }}
                                            className="absolute z-[100] left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto"
                                        >
                                            {suggestions.map((s, i) => (
                                                <button
                                                    key={`${s.type}-${s.id}`}
                                                    onClick={() => addLocation(s)}
                                                    onMouseEnter={() => setSelectedIndex(i)}
                                                    className={cn(
                                                        "w-full text-left px-4 py-3 border-b border-slate-200/60 dark:border-slate-800 last:border-0 transition-all flex items-center gap-3",
                                                        selectedIndex === i ? "bg-primary/10" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                                                    )}
                                                >
                                                    <span className="material-symbols-rounded text-lg text-slate-400">location_on</span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{s.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{(s as any).parentName || s.type}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="space-y-3 pt-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">선택된 여행지</p>
                                {((trip.locations?.regions?.length ?? 0) > 0) ? (
                                    <div className="flex flex-wrap gap-2">
                                        {trip.locations!.regions!.map((region) => (
                                            <span 
                                                key={`${region.type}-${region.id}`} 
                                                className={cn(
                                                    "px-3 py-1.5 text-[11px] font-bold rounded-xl flex items-center gap-2 border transition-all shadow-sm",
                                                    region.type === 'country' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30' :
                                                    region.type === 'prefecture' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30' :
                                                    'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30'
                                                )}
                                            >
                                                <span className="material-symbols-rounded text-sm">{(region.type === 'country' ? 'public' : 'location_city')}</span>
                                                {region.name}
                                                <button onClick={() => removeLocation(String(region.id))} className="material-symbols-rounded text-sm opacity-40 hover:opacity-100 font-black hover:text-red-500 transition-colors ml-1">close</button>
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-10 flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                        <span className="material-symbols-rounded text-4xl text-slate-200 dark:text-slate-700">map_search</span>
                                        <p className="text-xs font-bold text-slate-400 text-center">아직 추가된 여행지가 없습니다.<br/>검색을 통해 지역을 추가해보세요.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="xl:col-span-7 h-[500px] xl:h-[600px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                    <TripMap trip={trip} viewMode="basic" />
                </div>
            </div>
        </div>
    );
}
