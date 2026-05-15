'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { 
  useWishlistStore, 
  usePageActionStore, 
  WishlistItem, 
  MainCategory, 
  CATEGORY_MAP,
  cn
} from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutGrid, 
  List as ListIcon, 
  Map as MapIcon, 
  CheckSquare, 
  Filter, 
  Tag as TagIcon, 
  PackageOpen, 
  Layers, 
  MapPin, 
  Camera, 
  Info,
  Trash2,
  X
} from 'lucide-react';

import DashboardPageLayout from '@/components/layout/DashboardPageLayout';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import DashboardFilterBar from '@/components/layout/DashboardFilterBar';
import WishlistCard from '@/components/wishlist/WishlistCard';
import WishlistEditor from '@/components/wishlist/WishlistEditor';
import MapComponent from '@/components/common/MapComponent';

type ViewMode = 'grid' | 'list' | 'map';
type GroupBy = 'none' | 'category' | 'type';

const gridClasses = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-8 4xl:grid-cols-10 5xl:grid-cols-12 gap-4";

export default function WishlistPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const tripId = searchParams.get('tripId');
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading && !user) router.replace('/');
    }, [user, loading, router]);

    const { items, deleteItems, updateItems } = useWishlistStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMainCategory, setSelectedMainCategory] = useState<MainCategory | 'all'>('all');
    const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high'>('newest');
    const [groupBy, setGroupBy] = useState<GroupBy>('none');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    const { setPageAction, clearPageAction } = usePageActionStore();
    useEffect(() => {
        setPageAction(() => setIsEditorOpen(true), 'bookmark_add', '아이템 추가');
        return () => clearPageAction();
    }, [setPageAction, clearPageAction]);

    const [editingItem, setEditingItem] = useState<WishlistItem | undefined>(undefined);
    const [highlightedId, setHighlightedId] = useState<string | undefined>(undefined);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState('all');
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
    const [displayLimit, setDisplayLimit] = useState(25);

    // Place Filters
    const [selectedCountry, setSelectedCountry] = useState<string | 'all'>('all');
    const [selectedRegion, setSelectedRegion] = useState<string | 'all'>('all');
    const [selectedCity, setSelectedCity] = useState<string | 'all'>('all');

    // Extract unique place options
    const placeOptions = useMemo(() => {
        const countries = new Set<string>();
        const regionsMap: Record<string, Set<string>> = {};
        const citiesMap: Record<string, Set<string>> = {};

        items.forEach(item => {
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
            regions: regionsMap,
            cities: citiesMap
        };
    }, [items]);

    // Derived filtering logic
    const filteredItems = useMemo(() => {
        let result = [...items];

        // Trip filter
        if (tripId) {
            result = result.filter(item => item.tripId === tripId);
        }

        // Search filter
        if (searchQuery) {
            result = result.filter(item =>
                item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Tab filter
        if (activeTab === 'places') {
            result = result.filter(item => !!item.place);
        } else if (activeTab === 'photos') {
            result = result.filter(item => item.imageUrls && item.imageUrls.length > 0);
        } else if (activeTab === 'memos') {
            result = result.filter(item => !item.place && (!item.imageUrls || item.imageUrls.length === 0));
        }

        // Category filter (only used when not grouping by category or if specific category selected)
        if (selectedMainCategory !== 'all' && groupBy !== 'category') {
            result = result.filter(item => item.mainCategory === selectedMainCategory);
        }

        // Place filters
        if (selectedCountry !== 'all') {
            result = result.filter(item => item.place?.country === selectedCountry);
        }
        if (selectedRegion !== 'all') {
            result = result.filter(item => item.place?.prefecture === selectedRegion);
        }
        if (selectedCity !== 'all') {
            result = result.filter(item => item.place?.city === selectedCity);
        }

        // Sorting
        result.sort((a, b) => {
            if (sortBy === 'newest') {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            if (sortBy === 'price-low') {
                return (a.price || 0) - (b.price || 0);
            }
            if (sortBy === 'price-high') {
                return (b.price || 0) - (a.price || 0);
            }
            return 0;
        });

        return result;
    }, [items, tripId, searchQuery, selectedMainCategory, sortBy, groupBy, selectedCountry, selectedRegion, selectedCity]);

    // Incremental rendering: increase limit on scroll
    const displayedItems = useMemo(() => {
        return filteredItems.slice(0, displayLimit);
    }, [filteredItems, displayLimit]);

    useEffect(() => {
        setDisplayLimit(25);
    }, [searchQuery, activeTab, selectedMainCategory, selectedCountry, selectedRegion, selectedCity, sortBy, groupBy, tripId]);

    useEffect(() => {
        if (displayLimit >= filteredItems.length) return;

        const handleScroll = () => {
            const scrollBottom = window.innerHeight + window.scrollY;
            if (scrollBottom >= document.documentElement.offsetHeight - 500) {
                setDisplayLimit(prev => Math.min(prev + 25, filteredItems.length));
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [displayLimit, filteredItems.length]);

    const groupedItems = useMemo(() => {
        if (groupBy === 'none') return null;

        const groups: Record<string, { label: string, icon: any, color?: string, items: WishlistItem[] }> = {};

        if (groupBy === 'category') {
            Object.entries(CATEGORY_MAP).forEach(([key, info]) => {
                groups[key] = { label: info.label, icon: TagIcon, color: info.color, items: [] };
            });
            groups['uncategorized'] = { label: '미분류', icon: PackageOpen, items: [] };

            displayedItems.forEach(item => {
                const key = item.mainCategory || 'uncategorized';
                groups[key].items.push(item);
            });
        } else if (groupBy === 'type') {
            groups['place'] = { label: '장소 기록', icon: MapPin, color: '#3b82f6', items: [] };
            groups['photo'] = { label: '사진 기록', icon: Camera, color: '#a855f7', items: [] };
            groups['simple'] = { label: '기본 메모', icon: Info, color: '#64748b', items: [] };

            displayedItems.forEach(item => {
                if (item.place) groups['place'].items.push(item);
                else if (item.imageUrls && item.imageUrls.length > 0) groups['photo'].items.push(item);
                else groups['simple'].items.push(item);
            });
        }

        // Filter out empty groups
        return Object.entries(groups)
            .filter(([_, data]) => data.items.length > 0)
            .reduce((acc, [key, data]) => ({ ...acc, [key]: data }), {});
    }, [displayedItems, groupBy]);

    const handleAddItem = () => {
        setEditingItem(undefined);
        setIsEditorOpen(true);
    };

    const handleEditItem = (item: WishlistItem) => {
        setEditingItem(item);
        setIsEditorOpen(true);
    };

    const handleSelect = (id: string, selected: boolean) => {
        if (selected) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(i => i !== id));
        }
    };

    const handleBulkDelete = () => {
        if (confirm(`${selectedIds.length}개의 항목을 삭제하시겠습니까?`)) {
            deleteItems(selectedIds);
            setSelectedIds([]);
        }
    };

    const handleBulkCategoryChange = (category: MainCategory) => {
        updateItems(selectedIds, { mainCategory: category });
        setSelectedIds([]);
        alert(`${selectedIds.length}개의 항목의 카테고리가 변경되었습니다.`);
    };

    return (
        <DashboardPageLayout>
            <DashboardPageHeader 
                title={<>나만의 <span className="text-primary italic">위시리스트</span></>}
                description="언젠가 떠날 여행지를 미리 저장해두세요."
            />
            <DashboardFilterBar
                title={<>My <span className="text-primary italic">Wishlist</span></>}
                breadcrumb="Home / Wishlist"
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchPlaceholder="Search your wishlist..."
                leftContent={
                    <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-[12px] backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "p-1 rounded-[10px] transition-all flex items-center justify-center",
                                viewMode === 'grid' ? "bg-white dark:bg-slate-700 shadow-sm text-primary" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            )}
                        >
                            <LayoutGrid size={12} strokeWidth={2.5} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "p-1 rounded-[10px] transition-all flex items-center justify-center",
                                viewMode === 'list' ? "bg-white dark:bg-slate-700 shadow-sm text-primary" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            )}
                        >
                            <ListIcon size={12} strokeWidth={2.5} />
                        </button>
                        <button
                            onClick={() => setViewMode('map')}
                            className={cn(
                                "p-1 rounded-[10px] transition-all flex items-center justify-center",
                                viewMode === 'map' ? "bg-white dark:bg-slate-700 shadow-sm text-primary" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            )}
                        >
                            <MapIcon size={12} strokeWidth={2.5} />
                        </button>
                    </div>
                }
                tabs={[
                    { id: 'all', label: 'All', icon: 'auto_awesome' },
                    { id: 'places', label: 'Places', icon: 'map', count: items.filter(i => !!i.place).length },
                    { id: 'photos', label: 'Photos', icon: 'photo_camera', count: items.filter(i => i.imageUrls && i.imageUrls.length > 0).length },
                    { id: 'memos', label: 'Memos', icon: 'notes', count: items.filter(i => !i.place && (!i.imageUrls || i.imageUrls.length === 0)).length },
                ]}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                actionButton={
                    isSelectionMode ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    if (selectedIds.length === filteredItems.length) {
                                        setSelectedIds([]);
                                    } else {
                                        setSelectedIds(filteredItems.map(i => i.id));
                                    }
                                }}
                                className="h-7 px-3 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 rounded-full text-[9px] font-black hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                            >
                                <span className="material-symbols-rounded font-black text-xs">
                                    {selectedIds.length === filteredItems.length ? 'deselect' : 'select_all'}
                                </span>
                                <span>{selectedIds.length === filteredItems.length ? 'Deselect' : 'Select All'}</span>
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={selectedIds.length === 0}
                                className="h-7 px-3 bg-red-500 text-white rounded-full text-[9px] font-black shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:scale-100"
                            >
                                <span className="material-symbols-rounded font-black text-xs">delete</span>
                                <span>Delete ({selectedIds.length})</span>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleAddItem}
                            className="h-7 px-3 bg-primary text-white rounded-full text-[9px] font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <span className="material-symbols-rounded font-black text-xs">bookmark_add</span>
                            <span className="hidden sm:inline">Add Spot</span>
                        </button>
                    )
                }
                extraActions={
                    <div className="flex items-center gap-1.5">
                        <button 
                            onClick={() => {
                                if (isSelectionMode) {
                                    setSelectedIds([]);
                                }
                                setIsSelectionMode(!isSelectionMode);
                            }}
                            className={cn(
                                "h-7 px-3 rounded-full font-black text-[9px] uppercase tracking-wider transition-all flex items-center gap-2 border",
                                isSelectionMode 
                                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]" 
                                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:text-primary active:scale-[0.98]"
                            )}
                        >
                            <CheckSquare size={12} strokeWidth={2.5} />
                            <span className="hidden sm:inline">{isSelectionMode ? 'Done' : 'Select'}</span>
                        </button>
 
                        <button 
                            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                            className={cn(
                                "h-7 px-3 rounded-full font-black text-[9px] uppercase tracking-wider transition-all flex items-center gap-2 border",
                                isFiltersExpanded 
                                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]" 
                                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:text-primary active:scale-[0.98]"
                            )}
                        >
                            <Filter size={12} strokeWidth={2.5} />
                            <span className="hidden sm:inline">Filter</span>
                        </button>
                    </div>
                }
                isExpanded={isFiltersExpanded}
            >
                <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-[24px] border border-slate-200/50 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Place Selectors */}
                        <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Location Filter</label>
                            <div className="flex flex-col gap-1.5">
                                <select
                                    value={selectedRegion}
                                    disabled={selectedCountry === 'all' && placeOptions.countries.length === 0}
                                    onChange={(e) => {
                                        setSelectedRegion(e.target.value);
                                        setSelectedCity('all');
                                    }}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300 outline-none border border-slate-200 dark:border-slate-700 shadow-sm disabled:opacity-30 cursor-pointer"
                                >
                                    <option value="all">Region (All)</option>
                                    {placeOptions.countries.length > 0 && Object.values(placeOptions.regions).flatMap(set => Array.from(set)).sort().map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                                <select
                                    value={selectedCity}
                                    disabled={selectedRegion === 'all'}
                                    onChange={(e) => setSelectedCity(e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300 outline-none border border-slate-200 dark:border-slate-700 shadow-sm disabled:opacity-30 cursor-pointer"
                                >
                                    <option value="all">City (All)</option>
                                    {selectedRegion !== 'all' && placeOptions.cities[selectedRegion] && Array.from(placeOptions.cities[selectedRegion]).map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* View Settings */}
                        <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Group & Sort</label>
                            <div className="flex flex-col gap-1.5">
                                <div className="flex p-0.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <CompactToggleBtn active={groupBy === 'none'} onClick={() => setGroupBy('none')} label="None" />
                                    <CompactToggleBtn active={groupBy === 'type'} onClick={() => setGroupBy('type')} label="Type" icon={Layers} />
                                    <CompactToggleBtn active={groupBy === 'category'} onClick={() => setGroupBy('category')} label="Category" icon={TagIcon} />
                                </div>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300 outline-none border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer"
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="price-low">Price: Low to High</option>
                                    <option value="price-high">Price: High to Low</option>
                                </select>
                            </div>
                        </div>

                        {/* Quick Categories */}
                        <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Quick Categories</label>
                            <div className="flex flex-wrap gap-1">
                                <button
                                    onClick={() => setSelectedMainCategory('all')}
                                    className={cn(
                                        "px-2.5 py-1.5 rounded-lg text-[9px] font-black transition-all",
                                        selectedMainCategory === 'all' ? "bg-primary text-white" : "bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 shadow-sm"
                                    )}
                                >
                                    All
                                </button>
                                {(Object.entries(CATEGORY_MAP) as [MainCategory, any][]).map(([key, info]) => (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedMainCategory(key)}
                                        className={cn(
                                            "px-2.5 py-1.5 rounded-lg text-[9px] font-black transition-all flex items-center gap-1.5 border shadow-sm",
                                            selectedMainCategory === key 
                                                ? "bg-primary text-white border-primary" 
                                                : "bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-600"
                                        )}
                                    >
                                        <span className="w-1 h-1 rounded-full" style={{ backgroundColor: info.color }} />
                                        {info.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardFilterBar>

            <div className="py-10">
                <AnimatePresence mode="wait">
                    {filteredItems.length > 0 ? (
                        viewMode === 'map' ? (
                            <motion.div 
                                key="map"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className="h-[70vh] rounded-[40px] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 relative"
                            >
                                <MapComponent
                                    center={
                                        filteredItems.find(item => item.place)?.place 
                                            ? { lat: filteredItems.find(item => item.place)!.place!.lat!, lng: filteredItems.find(item => item.place)!.place!.lng! }
                                            : { lat: 37.5665, lng: 126.9780 }
                                    }
                                    zoom={12}
                                    markers={filteredItems
                                        .filter(item => item.place && item.place.lat !== undefined && item.place.lng !== undefined)
                                        .map(item => ({
                                            lat: item.place!.lat!,
                                            lng: item.place!.lng!,
                                            title: item.title,
                                            id: item.id,
                                            category: item.mainCategory,
                                            subCategory: item.subCategory,
                                            address: item.place!.address,
                                            city: item.place!.city,
                                            prefecture: item.place!.prefecture,
                                            country: item.place!.country,
                                            description: item.description,
                                            isWishlist: true
                                        }))
                                    }
                                    highlightedId={highlightedId}
                                    onMarkerClick={(id) => {
                                        const item = items.find(i => i.id === id);
                                        if (item) {
                                            setHighlightedId(id);
                                        }
                                    }}
                                />
                                {highlightedId && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="absolute bottom-6 left-6 right-6 lg:left-auto lg:right-6 lg:w-96"
                                    >
                                        {filteredItems.find(i => i.id === highlightedId) && (
                                            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
                                                <WishlistCard
                                                    item={filteredItems.find(i => i.id === highlightedId)!}
                                                    onEdit={() => handleEditItem(filteredItems.find(i => i.id === highlightedId)!)}
                                                    viewMode="list"
                                                />
                                                <button 
                                                    onClick={() => setHighlightedId(undefined)}
                                                    className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                >
                                                    Close Preview
                                                </button>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </motion.div>
                        ) : groupBy === 'none' ? (
                            <motion.div 
                                key="grid-none"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className={viewMode === 'grid' ? gridClasses : "space-y-3 max-w-4xl mx-auto"}
                            >
                                {displayedItems.map((item) => (
                                    <WishlistCard
                                        key={item.id}
                                        item={item}
                                        onEdit={() => handleEditItem(item)}
                                        viewMode={viewMode as any}
                                        isSelected={selectedIds.includes(item.id)}
                                        onSelect={handleSelect}
                                        isSelectionMode={isSelectionMode}
                                    />
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="grid-grouped"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="space-y-16"
                            >
                                {Object.entries(groupedItems!).map(([key, data]: [string, any]) => (
                                    <section key={key} className="space-y-6">
                                        <div className="flex items-center gap-4 px-4">
                                            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-[14px] shadow-sm border border-slate-200 dark:border-slate-800">
                                                <data.icon className="w-4 h-4 text-primary" />
                                            </div>
                                            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                                                {data.label}
                                                <span className="text-[10px] font-black text-slate-400 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg ml-1">
                                                    {data.items.length}
                                                </span>
                                            </h2>
                                            <div className="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-slate-800 to-transparent ml-2" />
                                        </div>
                                        <div className={viewMode === 'grid' ? gridClasses : "space-y-3 max-w-4xl mx-auto"}>
                                            {data.items.map((item: WishlistItem) => (
                                                <WishlistCard
                                                    key={item.id}
                                                    item={item}
                                                    onEdit={() => handleEditItem(item)}
                                                    viewMode={viewMode as any}
                                                    isSelected={selectedIds.includes(item.id)}
                                                    onSelect={handleSelect}
                                                    isSelectionMode={isSelectionMode}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                ))}
                            </motion.div>
                        )
                    ) : (
                        <motion.div 
                            key="empty"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="py-40 flex flex-col items-center text-center max-w-lg mx-auto"
                        >
                            <div className="w-32 h-32 bg-slate-50 dark:bg-slate-900 rounded-[48px] flex items-center justify-center mb-8">
                                <PackageOpen className="w-16 h-16 text-primary/20" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 italic">
                                {searchQuery ? 'No results found' : 'Your wishlist is empty'}
                            </h3>
                            <p className="text-sm text-slate-400 font-bold mb-8">
                                {searchQuery ? 
                                    'Try searching with different keywords.' : 
                                    'Save places you want to visit and organize your travel ideas here.'}
                            </p>
                            <button
                                onClick={handleAddItem}
                                className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs hover:scale-105 transition-all shadow-xl shadow-slate-900/10 dark:shadow-none"
                            >
                                Add Your First Spot
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bulk Action Bar */}
            <AnimatePresence>
                {selectedIds.length > 0 && (
                    <motion.div
                        key="bulk-action-bar"
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-2xl"
                    >
                        <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] shadow-2xl p-4 flex items-center justify-between gap-4 border border-white/10 dark:border-slate-200">
                            <div className="flex items-center gap-4 px-2">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center font-black text-white">
                                    {selectedIds.length}
                                </div>
                                <div className="hidden sm:block">
                                    <p className="text-xs font-black uppercase tracking-widest opacity-50">Selected Items</p>
                                    <p className="text-sm font-bold">항목이 선택되었습니다</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="group relative">
                                    <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 dark:bg-slate-100 rounded-xl text-xs font-bold hover:bg-slate-700 dark:hover:bg-slate-200 transition-all">
                                        <TagIcon className="w-3.5 h-3.5" />
                                        카테고리 이동
                                    </button>
                                    <div className="absolute bottom-full right-0 mb-2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                                        <div className="bg-slate-800 dark:bg-white border border-white/10 dark:border-slate-200 rounded-2xl shadow-2xl p-2 min-w-[150px] space-y-1">
                                            {(Object.entries(CATEGORY_MAP) as [MainCategory, any][]).map(([key, info]) => (
                                                <button
                                                    key={key}
                                                    onClick={() => handleBulkCategoryChange(key)}
                                                    className="w-full text-left px-3 py-2 rounded-lg text-[11px] font-bold hover:bg-slate-700 dark:hover:bg-slate-100 flex items-center gap-2"
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: info.color }} />
                                                    {info.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleBulkDelete}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    삭제
                                </button>
                                
                                <button
                                    onClick={() => setSelectedIds([])}
                                    className="p-2.5 text-slate-400 hover:text-white dark:hover:text-slate-900 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Editor Drawer */}
            <AnimatePresence>
                {isEditorOpen && (
                    <WishlistEditor
                        item={editingItem}
                        tripId={tripId || undefined}
                        onClose={() => setIsEditorOpen(false)}
                    />
                )}
            </AnimatePresence>
        </DashboardPageLayout>
    );
}

function CompactToggleBtn({ active, onClick, label, icon: Icon }: { active: boolean, onClick: () => void, label: string, icon?: any }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black transition-all ${active
                ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
            {Icon && <Icon size={12} strokeWidth={2.5} />}
            {label}
        </button>
    );
}
