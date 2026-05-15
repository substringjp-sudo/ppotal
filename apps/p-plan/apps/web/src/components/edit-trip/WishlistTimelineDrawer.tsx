'use client';
import { useWishlistStore } from '@pplaner/shared';
import { useTripStore } from '@pplaner/shared';
import { TripEvent, BucketListItem } from '@pplaner/shared';
import { WishlistItem, MainCategory, CATEGORY_MAP } from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import Image from 'next/image';
import MapComponent from '@/components/common/MapComponent';
import { 
    LayoutGrid, List, Map as MapIcon, Search, Sparkles, X, 
    ChevronDown, Filter, Trash2, CheckCircle2, Plus, Info,
    Image as ImageIcon 
} from 'lucide-react';



interface WishlistTimelineDrawerProps {
    onSelectItem: (item: any) => void;
    onClose: () => void;
}

export default function WishlistTimelineDrawer({ onSelectItem, onClose }: WishlistTimelineDrawerProps) {
    const { currentTrip } = useTripStore();
    const globalWishlist = useWishlistStore((state) => state.items);
    const { updateItems, deleteItems } = useWishlistStore();

    // Normalize BucketListItem to WishlistItem format
    const normalizeBucketItem = (item: BucketListItem): WishlistItem => {
        if (item.wishlistId) {
            const globalItem = globalWishlist.find(gi => gi.id === item.wishlistId);
            if (globalItem) return { ...globalItem, ...item, id: globalItem.id } as WishlistItem; 
        }
        return {
            ...item,
            id: item.id,
            title: item.title,
            description: item.description,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            imageUrls: item.imageUrl ? [item.imageUrl] : [],
            place: item.place ? {
                ...item.place,
                city: (item as any).city, // Backup for existing data
                prefecture: (item as any).prefecture,
                country: (item as any).country
            } : undefined,
            mainCategory: item.mainCategory as MainCategory,
        } as WishlistItem;
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'card' | 'grouped' | 'map'>('card');
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const [listScope, setListScope] = useState<'trip' | 'all'>('trip');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    // Place Filters
    const [selectedCountry, setSelectedCountry] = useState<string | 'all'>('all');
    const [selectedRegion, setSelectedRegion] = useState<string | 'all'>('all');
    const [selectedCity, setSelectedCity] = useState<string | 'all'>('all');

    const combinedWishlist = useMemo(() => {
        // 1. 여행 버킷 리스트 가져오기 (Firestore)
        const tripBucketList = (currentTrip?.bucketList || []).map(normalizeBucketItem);
        
        // 2. 전역 위시리스트 가져오기
        const combined = [...tripBucketList];
        const bucketWishlistIds = new Set(tripBucketList.map(i => i.wishlistId).filter(Boolean));
        const bucketLocalIds = new Set(tripBucketList.map(i => i.id));
        
        // 3. 전역 항목 중 버킷에 아직 없는 것들만 추가
        globalWishlist.forEach(item => {
            if (!bucketWishlistIds.has(item.id) && !bucketLocalIds.has(item.id)) {
                combined.push(item);
            }
        });
        
        // 4. [FIX] 전역 위시리스트에서 명시적으로 삭제된 항목이 버킷 리스트에 남아있는 경우 필터링
        // (사용자가 "전체 위시리스트" 탭을 볼 때 유령 항목이 보이지 않도록 함)
        if (listScope === 'all') {
            // 전역에 없는 wishlistId를 가진 버킷 항목은 제외하거나 별도 표시할 수 있음
            // 여기서는 정합성을 위해 전역 위시리스트를 기준으로 함
            return combined.filter(item => {
                if (item.wishlistId) {
                    return globalWishlist.some(gi => gi.id === item.wishlistId);
                }
                return true;
            });
        }

        return combined;
    }, [globalWishlist, currentTrip?.bucketList, listScope]);


    // Extract unique place options
    const placeOptions = useMemo(() => {
        const countries = new Set<string>();
        const regionsMap: Record<string, Set<string>> = {};
        const citiesMap: Record<string, Set<string>> = {};

        combinedWishlist.forEach(item => {
            if (item.place) {
                const { country, prefecture: region, city } = item.place;
                if (country) {
                    countries.add(country);
                    if (region) {
                        if (!regionsMap[country]) regionsMap[country] = new Set();
                        regionsMap[country].add(region);
                        if (city) {
                            if (!citiesMap[region]) citiesMap[region] = new Set();
                            citiesMap[region].add(city);
                        }
                    }
                }
            }
        });

        return {
            countries: Array.from(countries).sort(),
            regionsMap: Object.fromEntries(Object.entries(regionsMap).map(([k, v]) => [k, Array.from(v).sort()])),
            citiesMap: Object.fromEntries(Object.entries(citiesMap).map(([k, v]) => [k, Array.from(v).sort()]))
        };
    }, [combinedWishlist]);

    const isItemAdded = (wishlistId: string) => {
        return currentTrip?.bucketList.some(b => b.wishlistId === wishlistId) || false;
    };


    const tripRegions = currentTrip?.locations.regions || [];
    const tripRegionNames = tripRegions.map(r => r.name);

    const filteredItems = combinedWishlist.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = !filterCategory || item.mainCategory === filterCategory;
        
        // Place filters
        const matchesCountry = selectedCountry === 'all' || item.place?.country === selectedCountry;
        const matchesRegion = selectedRegion === 'all' || item.place?.prefecture === selectedRegion;
        const matchesCity = selectedCity === 'all' || item.place?.city === selectedCity;
        
        // Scope filtering
        let matchesScope = true;
        if (listScope === 'trip') {
            // Check if item is already in current trip's bucket list
            const isInBucketList = currentTrip?.bucketList.some(b => b.wishlistId === item.id || b.id === item.id);
            
            if (isInBucketList) {
                matchesScope = true;
            } else if (tripRegions.length > 0) {
                matchesScope = tripRegions.some(tr => 
                    (tr.type === 'country' && item.place?.countryId === tr.id) ||
                    (tr.type === 'prefecture' && item.place?.prefectureId === tr.id) ||
                    (tr.type === 'city' && item.place?.cityId === tr.id)
                );
            } else {
                matchesScope = false; // "trip" scope and no regions = empty by default unless in bucket list
            }
        }
        
        return matchesSearch && matchesCategory && matchesScope && matchesCountry && matchesRegion && matchesCity;
    });

    const categories = Array.from(new Set(combinedWishlist.map(i => i.mainCategory || '기타')));

    const groupedItems = filteredItems.reduce((acc, item) => {
        const cat = item.mainCategory || '기타';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {} as Record<string, typeof combinedWishlist>);

    const markers = useMemo(() => filteredItems
        .filter(item => item.place?.lat !== undefined && item.place?.lng !== undefined)
        .map(item => ({
            lat: item.place!.lat!,
            lng: item.place!.lng as number,
            title: item.title,
            id: item.id,
            type: 'wishlist',
            category: (item.mainCategory || 'other') as string,
            isAdded: isItemAdded(item.id),
            city: item.place?.city,
            prefecture: item.place?.prefecture,
            country: item.place?.country
        })), [filteredItems, currentTrip?.bucketList]);

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedIds(newSelected);
        if (newSelected.size > 0) setIsSelectionMode(true);
        else setIsSelectionMode(false);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredItems.length) {
            setSelectedIds(new Set());
            setIsSelectionMode(false);
        } else {
            setSelectedIds(new Set(filteredItems.map(i => i.id)));
            setIsSelectionMode(true);
        }
    };

    const handleBulkDelete = () => {
        if (confirm(`${selectedIds.size}개의 항목을 삭제하시겠습니까?`)) {
            deleteItems(Array.from(selectedIds));
            setSelectedIds(new Set());
            setIsSelectionMode(false);
        }
    };

    const handleBulkCategoryChange = (category: string) => {
        updateItems(Array.from(selectedIds), { mainCategory: category as any });
        setSelectedIds(new Set());
        setIsSelectionMode(false);
    };

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed inset-y-0 right-0 w-full lg:w-[420px] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl z-[1000]"
        >
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
                <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-rounded text-primary">auto_awesome</span>
                        관심 리스트
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Timeline에 추가할 항목을 선택하세요</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mr-2">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400'}`}
                            title="리스트 형태"
                        >
                            <span className="material-symbols-rounded text-sm font-bold">view_headline</span>
                        </button>
                        <button
                            onClick={() => setViewMode('card')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'card' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400'}`}
                            title="카드 형태"
                        >
                            <span className="material-symbols-rounded text-sm font-bold">format_list_bulleted</span>
                        </button>
                        <button
                            onClick={() => setViewMode('grouped')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grouped' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400'}`}
                            title="그룹화 형태"
                        >
                            <span className="material-symbols-rounded text-sm font-bold">grid_view</span>
                        </button>
                        <button
                            onClick={() => setViewMode('map')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'map' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400'}`}
                            title="지도 형태"
                        >
                            <span className="material-symbols-rounded text-sm font-bold">map</span>
                        </button>
                    </div>


                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <span className="material-symbols-rounded text-slate-400">close</span>
                    </button>
                </div>
            </div>

            {/* Scope Switcher & Filter & Search */}
            <div className="p-6 space-y-4 pb-0">
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl relative">
                    <button
                        onClick={() => setListScope('trip')}
                        className={`flex-1 py-1.5 px-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${listScope === 'trip' ? 'bg-white dark:bg-slate-700 shadow-md text-primary' : 'text-slate-400'}`}
                    >
                        <span className="material-symbols-rounded text-sm">near_me</span>
                        현재 여행지
                    </button>
                    <button
                        onClick={() => setListScope('all')}
                        className={`flex-1 py-1.5 px-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${listScope === 'all' ? 'bg-white dark:bg-slate-700 shadow-md text-primary' : 'text-slate-400'}`}
                    >
                        <span className="material-symbols-rounded text-sm">public</span>
                        전체 위시리스트
                    </button>
                    
                    {filteredItems.length > 0 && (
                        <button
                            onClick={toggleSelectAll}
                            className={`absolute -bottom-7 right-1 text-[9px] font-black uppercase tracking-tighter transition-colors ${selectedIds.size === filteredItems.length ? 'text-primary' : 'text-slate-400'}`}
                        >
                            {selectedIds.size === filteredItems.length ? '전체 해제' : '전체 선택'}
                        </button>
                    )}
                </div>

                <div className="relative">
                    <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                    <input
                        type="text"
                        placeholder="항목 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary/50"
                    />
                </div>

                {/* Place Filters (Cascading) */}
                <div className="grid grid-cols-3 gap-2">
                    <select
                        value={selectedCountry}
                        onChange={(e) => {
                            setSelectedCountry(e.target.value);
                            setSelectedRegion('all');
                            setSelectedCity('all');
                        }}
                        className="bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-[10px] font-black uppercase py-2 px-3 focus:ring-1 focus:ring-primary/30 cursor-pointer appearance-none scrollbar-hide"
                    >
                        <option value="all">국가 전체</option>
                        {placeOptions.countries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select
                        value={selectedRegion}
                        onChange={(e) => {
                            setSelectedRegion(e.target.value);
                            setSelectedCity('all');
                        }}
                        disabled={selectedCountry === 'all'}
                        className="bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-[10px] font-black uppercase py-2 px-3 focus:ring-1 focus:ring-primary/30 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed appearance-none scrollbar-hide"
                    >
                        <option value="all">지역 전체</option>
                        {selectedCountry !== 'all' && placeOptions.regionsMap[selectedCountry]?.map(r => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                    <select
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        disabled={selectedRegion === 'all'}
                        className="bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-[10px] font-black uppercase py-2 px-3 focus:ring-1 focus:ring-primary/30 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed appearance-none scrollbar-hide"
                    >
                        <option value="all">도시 전체</option>
                        {selectedRegion !== 'all' && placeOptions.citiesMap[selectedRegion]?.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                        onClick={() => setFilterCategory(null)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap transition-all border ${!filterCategory
                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                            : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'
                            }`}
                    >
                        전체
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilterCategory(cat)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap transition-all border ${filterCategory === cat
                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
                {viewMode === 'map' ? (
                    <div className="h-full relative">
                        <MapComponent
                            center={
                                filteredItems.find(item => item.place)?.place
                                    ? { lat: filteredItems.find(item => item.place)!.place!.lat!, lng: filteredItems.find(item => item.place)!.place!.lng! }
                                    : { lat: 35.681236, lng: 139.767125 } // Default to Tokyo if no items with location
                            }
                            zoom={12}
                            markers={markers}
                            regions={currentTrip?.locations.regions}
                            highlightedId={highlightedId || undefined}
                            onMarkerClick={(id: string) => setHighlightedId(id)}
                        />

                        {/* Selected Item Preview on Map */}
                        <AnimatePresence>
                            {highlightedId && (
                                <motion.div
                                    initial={{ y: 50, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 50, opacity: 0 }}
                                    className="absolute bottom-6 left-4 right-4 z-10"
                                >
                                    {filteredItems.find(item => item.id === highlightedId) && (() => {
                                        const item = filteredItems.find(i => i.id === highlightedId)!;
                                        return (
                                            <div className="bg-white dark:bg-slate-900/90 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-black text-slate-900 dark:text-white truncate">{item.title}</h4>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{item.place?.name}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => onSelectItem(item)}
                                                        className="px-4 py-2 bg-primary text-white text-[10px] font-black uppercase rounded-xl hover:bg-primary/90 transition-all"
                                                    >
                                                        추가하기
                                                    </button>
                                                    <button
                                                        onClick={() => setHighlightedId(null)}
                                                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                    >
                                                        <span className="material-symbols-rounded text-sm">close</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-50 px-10">
                        <span className="material-symbols-rounded text-4xl mb-2 text-slate-300">inventory_2</span>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                            {listScope === 'trip' ? '현재 여행 지역내에\n저장된 항목이 없습니다' : '일치하는 항목이 없습니다'}
                        </p>
                        {listScope === 'trip' && (
                            <button 
                                onClick={() => setListScope('all')}
                                className="mt-4 text-[10px] font-black text-primary border-b border-primary/30 pb-0.5"
                            >
                                전체 위시리스트 보기
                            </button>
                        )}
                    </div>
                ) : viewMode === 'list' ? (
                    <div className="p-6 space-y-1 pt-0">
                        {filteredItems.map(item => (
                            <WishlistSimpleRow 
                                key={item.id} 
                                item={item} 
                                isSelected={selectedIds.has(item.id)}
                                isSelectionMode={isSelectionMode}
                                onToggle={() => toggleSelect(item.id)}
                                onSelect={onSelectItem} 
                            />
                        ))}
                    </div>
                ) : viewMode === 'card' ? (
                    <div className="p-6 space-y-3 pt-0">
                        {filteredItems.map(item => (
                            <WishlistItemCard 
                                key={item.id} 
                                item={item} 
                                isSelected={selectedIds.has(item.id)}
                                isSelectionMode={isSelectionMode}
                                onToggle={() => toggleSelect(item.id)}
                                onSelect={onSelectItem} 
                            />
                        ))}
                    </div>
                ) : (
                    <div className="p-6 pt-0 space-y-8">
                        {(Object.entries(groupedItems) as [string, any[]][]).map(([cat, items]) => (
                            <div key={cat} className="space-y-3">
                                <div className="flex items-center gap-2 mb-1 px-1">
                                    <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">{cat}</span>
                                    <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div>
                                    <span className="text-[10px] font-bold text-slate-400">{items.length}</span>
                                </div>
                                <div className="space-y-3">
                                {items.map((item: any) => (
                                    <WishlistItemCard 
                                        key={item.id} 
                                        item={item} 
                                        isSelected={selectedIds.has(item.id)}
                                        isSelectionMode={isSelectionMode}
                                        onToggle={() => toggleSelect(item.id)}
                                        onSelect={onSelectItem} 
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {/* Bulk Action Bar */}
            <AnimatePresence>
                {isSelectionMode && (
                    <motion.div
                        key="bulk-action-bar-drawer"
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-6 z-[110] min-w-[320px]"
                    >
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{selectedIds.size} Selected</span>
                            <button onClick={() => { setSelectedIds(new Set()); setIsSelectionMode(false); }} className="text-[10px] font-bold text-primary text-left">Clear</button>
                        </div>
                        
                        <div className="h-8 w-px bg-slate-800"></div>
                        
                        <div className="flex items-center gap-2">
                            <select 
                                onChange={(e) => handleBulkCategoryChange(e.target.value)}
                                className="bg-slate-800 border-none rounded-xl text-[10px] font-black uppercase py-2 px-3 focus:ring-0 cursor-pointer"
                                value=""
                            >
                                <option value="" disabled>분류 변경</option>
                                {Object.keys(CATEGORY_MAP).map(cat => (
                                    <option key={cat} value={cat}>{CATEGORY_MAP[cat as keyof typeof CATEGORY_MAP].label}</option>
                                ))}
                            </select>
                            
                            <button 
                                onClick={handleBulkDelete}
                                className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                                title="삭제"
                            >
                                <span className="material-symbols-rounded text-sm font-bold">delete</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/20 border-t border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic text-center leading-relaxed">
                    팁: 항목을 클릭하여 해당 일자의 타임라인에 즉시 추가할 수 있습니다.
                </p>
            </div>
        </motion.div>
    );
}

function WishlistSimpleRow({ item, isSelected, isSelectionMode, onToggle, onSelect }: { item: WishlistItem; isSelected: boolean; isSelectionMode: boolean; onToggle: () => void; onSelect: (item: WishlistItem) => void }) {

    return (
        <div className="relative group">
            <button
                onClick={() => isSelectionMode ? onToggle() : onSelect(item)}
                className={`w-full py-2.5 px-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl flex items-center gap-3 text-left transition-colors ${isSelected ? 'bg-primary/5 border-primary/20 border outline-none' : 'border-transparent border'}`}
            >
                {isSelectionMode ? (
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                        {isSelected && <span className="material-symbols-rounded text-[14px] text-white font-black">check</span>}
                    </div>
                ) : (
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 flex items-center justify-center border border-slate-200 dark:border-slate-800 relative">
                        {item.imageUrls?.[0] ? (
                            <Image 
                                src={item.imageUrls[0]} 
                                alt="" 
                                fill 
                                className="object-cover" 
                            />
                        ) : (
                            <span className="material-symbols-rounded text-sm text-slate-400">
                                {item.mainCategory === 'meal' ? 'restaurant' : 'map_marker'}
                            </span>
                        )}
                    </div>

                )}
                <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-bold text-slate-700 dark:text-slate-200 truncate">{item.title}</h4>
                    <div className="flex items-center gap-2 -mt-0.5">
                        <p className="text-[10px] text-slate-400 truncate flex-shrink-1">
                            {item.place?.name}
                        </p>
                        {item.place?.country && (
                            <span className="text-[8px] font-black text-slate-400/60 bg-slate-100 dark:bg-slate-800 px-1 rounded flex-shrink-0">
                                {item.place.country.substring(0, 2)}
                            </span>
                        )}
                        {item.place?.prefecture && (
                            <span className="text-[8px] font-black text-slate-400/60 bg-slate-100 dark:bg-slate-800 px-1 rounded flex-shrink-0">
                                {item.place.prefecture}
                            </span>
                        )}
                    </div>
                </div>
                {!isSelectionMode && (
                    <span className="material-symbols-rounded text-slate-300 group-hover:text-primary text-lg transition-colors">add_circle</span>
                )}
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                className={`absolute left-0 top-0 bottom-0 w-8 flex items-center justify-start pl-2 transition-opacity ${isSelectionMode ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}
            >
                <div className="w-4 h-4 rounded bg-white border border-slate-300 shadow-sm" />
            </button>
        </div>
    );
}

function WishlistItemCard({ item, isSelected, isSelectionMode, onToggle, onSelect }: { item: WishlistItem; isSelected: boolean; isSelectionMode: boolean; onToggle: () => void; onSelect: (item: WishlistItem) => void }) {

    return (
        <div className="relative group">
            <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => isSelectionMode ? onToggle() : onSelect(item)}
                className={`w-full p-4 bg-white dark:bg-slate-800/40 border rounded-2xl flex items-center gap-4 text-left group transition-all shadow-sm hover:shadow-xl hover:shadow-primary/5 ${isSelected ? 'border-primary bg-primary/[0.02]' : 'border-slate-200 dark:border-slate-800/80 hover:border-primary/40'}`}
            >
                {isSelectionMode ? (
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                        {isSelected && <span className="material-symbols-rounded text-xs text-white font-black">check</span>}
                    </div>
                ) : (
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 flex-shrink-0 border border-slate-200 dark:border-slate-800 flex items-center justify-center relative">
                        {item.imageUrls && item.imageUrls.length > 0 ? (
                            <Image 
                                src={item.imageUrls[0]} 
                                alt={item.title} 
                                fill 
                                className="object-cover" 
                            />
                        ) : (
                            <span className="material-symbols-rounded text-primary/40 text-2xl group-hover:text-primary transition-colors">
                                {item.mainCategory === 'meal' ? 'restaurant' :
                                    item.mainCategory === 'sightseeing' ? 'museum' :
                                        item.mainCategory === 'shopping' ? 'shopping_bag' : 'map_marker'}
                            </span>
                        )}
                    </div>

                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-primary/60 bg-primary/5 px-1.5 py-0.5 rounded uppercase tracking-wider">{item.mainCategory}</span>
                        {item.place?.country && (
                            <span className="text-[9px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-1.5 py-0.5 rounded">
                                {item.place.country}
                            </span>
                        )}
                        {item.place?.prefecture && (
                            <span className="text-[9px] font-black text-primary/60 bg-primary/10 dark:bg-primary/20 px-1.5 py-0.5 rounded">
                                {item.place.prefecture}
                            </span>
                        )}
                    </div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white truncate mt-1">{item.title}</h4>
                    {item.place && (
                        <div className="flex items-center gap-2 mt-1 opacity-70">
                            <p className="text-[11px] text-slate-500 font-bold truncate flex items-center gap-1">
                                <span className="material-symbols-rounded text-[13px]">location_on</span>
                                {item.place.name}
                            </p>
                            {item.place.city && (
                                <span className="text-[9px] font-black text-primary/60 bg-primary/10 dark:bg-primary/20 px-1.5 rounded">
                                    {item.place.city}
                                </span>
                            )}
                        </div>
                    )}
                </div>
                {!isSelectionMode && (
                    <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all">
                        <span className="material-symbols-rounded text-slate-400 group-hover:text-white text-lg transition-colors">add</span>
                    </div>
                )}
            </motion.button>
            {!isSelectionMode && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggle(); }}
                    className="absolute -left-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:scale-110 z-10"
                >
                    <div className="w-3 h-3 rounded-[3px] border-2 border-slate-300" />
                </button>
            )}
        </div>
    );
}
