import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Sparkles, List as ListIcon, Map as MapIcon, MapPin, 
    CheckCircle2, Plus, Tag as TagIcon, PackageOpen 
} from 'lucide-react';
import { WishlistItem, MainCategory, CATEGORY_MAP, useWishlistStore, useTripStore, cn } from '@pplaner/shared';
import { getRecommendedWishlistItems } from '@pplaner/shared';
import TripMap from '../../common/TripMap';

interface InterestsImportSelectorProps {
    onClose: () => void;
    onImport: (item: WishlistItem) => void;
}

export const InterestsImportSelector: React.FC<InterestsImportSelectorProps> = ({ onClose, onImport }) => {
    const { items: globalWishlist } = useWishlistStore();
    const { currentTrip } = useTripStore();
    const bucketList = currentTrip?.bucketList || [];

    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const [highlightedId, setHighlightedId] = useState<string | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<MainCategory | null>(null);
    const [selectedCountry, setSelectedCountry] = useState<string | 'all'>('all');
    const [selectedRegion, setSelectedRegion] = useState<string | 'all'>('all');
    const [selectedCity, setSelectedCity] = useState<string | 'all'>('all');

    const placeOptions = useMemo(() => {
        const countries = new Map<string, string>(); 
        const regionsMap = new Map<string, Map<string, string>>();
        const citiesMap = new Map<string, Map<string, string>>();

        globalWishlist.forEach(item => {
            if (item.place) {
                const { country, countryId, prefecture: region, prefectureId, city, cityId } = item.place as any;
                if (country || countryId) {
                    const cKey = String(countryId || country || '');
                    countries.set(cKey, String(country || countryId || ''));
                    if (region || prefectureId) {
                        const rKey = String(prefectureId || region || '');
                        if (!regionsMap.has(cKey)) regionsMap.set(cKey, new Map());
                        regionsMap.get(cKey)!.set(rKey, String(region || prefectureId || ''));
                        if (city || cityId) {
                            const ctKey = cityId || city || '';
                            if (!citiesMap.has(rKey)) citiesMap.set(rKey, new Map());
                            citiesMap.get(rKey)!.set(ctKey, city || cityId || '');
                        }
                    }
                }
            }
        });

        const sortMap = (m: Map<string, string>) => 
            Array.from(m.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));

        return {
            countries: sortMap(countries),
            regionsMap: Object.fromEntries(Array.from(regionsMap.entries()).map(([k, v]) => [k, sortMap(v)])),
            citiesMap: Object.fromEntries(Array.from(citiesMap.entries()).map(([k, v]) => [k, sortMap(v)]))
        };
    }, [globalWishlist]);

    const filteredWishlist = useMemo(() => {
        return globalWishlist.filter(item => {
            const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                (item.place?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = !filterCategory || item.mainCategory === filterCategory;
            const p = item.place as any;
            const matchesCountry = selectedCountry === 'all' || (p?.countryId === selectedCountry) || (!p?.countryId && p?.country === selectedCountry);
            const matchesRegion = selectedRegion === 'all' || (p?.prefectureId === selectedRegion) || (!p?.prefectureId && p?.prefecture === selectedRegion);
            const matchesCity = selectedCity === 'all' || (p?.cityId === selectedCity) || (!p?.cityId && p?.city === selectedCity);
            return matchesSearch && matchesCategory && matchesCountry && matchesRegion && matchesCity;
        });
    }, [globalWishlist, searchQuery, filterCategory, selectedCountry, selectedRegion, selectedCity]);

    const recommendations = useMemo(() => {
        if (!currentTrip) return [];
        return getRecommendedWishlistItems(filteredWishlist, currentTrip);
    }, [filteredWishlist, currentTrip]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-4xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
                <div className="p-8 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">내 위시리스트에서 가져오기</h2>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">여행 지역 근처의 위시리스트 항목</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-400'}`}><ListIcon className="w-4 h-4" /></button>
                            <button onClick={() => setViewMode('map')} className={`p-2 rounded-lg transition-all ${viewMode === 'map' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-400'}`}><MapIcon className="w-4 h-4" /></button>
                        </div>
                        <button onClick={onClose} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all text-slate-400"><X className="w-6 h-6" /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-y-auto p-8 pt-6">
                        {globalWishlist.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center"><PackageOpen className="w-10 h-10 text-slate-300" /></div>
                                <div><h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">위시리스트가 비어 있습니다</h3></div>
                            </div>
                        ) : viewMode === 'map' ? (
                            <div className="h-full min-h-[550px] rounded-[3rem] overflow-hidden border border-slate-200 dark:border-slate-800 relative">
                                <TripMap 
                                    trip={currentTrip!} 
                                    viewMode="bucketlist" 
                                    markers={recommendations.filter((r: any) => r.item.place?.lat).map((r: any) => ({
                                        lat: r.item.place!.lat!, lng: r.item.place!.lng!, title: r.item.title, id: r.item.id, type: 'interest', category: r.item.mainCategory || 'etc', isAdded: bucketList.some(b => b.wishlistId === r.item.id)
                                    }))} 
                                    highlightedId={highlightedId} 
                                    onMarkerClick={setHighlightedId} 
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {recommendations.map((rec: any) => {
                                    const isAdded = bucketList.some(b => b.wishlistId === rec.item.id);
                                    return (
                                        <div key={rec.item.id} className={cn("p-4 rounded-3xl border-2 transition-all flex items-center gap-4", isAdded ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200' : 'bg-white dark:bg-slate-900 border-slate-200 hover:border-indigo-500/50 shadow-sm')}>
                                            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                                                {rec.item.imageUrls?.[0] ? <img src={rec.item.imageUrls[0]} className="w-full h-full object-cover" /> : <TagIcon className="w-6 h-6 text-slate-300 m-5" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-sm truncate">{rec.item.title}</h4>
                                                <p className="text-[10px] text-slate-500 truncate">{rec.item.place?.name || rec.item.mainCategory}</p>
                                            </div>
                                            {!isAdded && <button onClick={() => onImport(rec.item)} className="p-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900"><Plus className="w-4 h-4" /></button>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
