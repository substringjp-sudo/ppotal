'use client';
import { useTripStore, useWishlistStore, BucketListItem, CATEGORY_MAP, MainCategory, cn } from '@pplaner/shared';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, Plus, Filter, LayoutGrid, List as ListIcon, 
    ChevronDown, MapPin, Sparkles, ChevronRight, PackageOpen
} from 'lucide-react';
import WishlistEditor from '../wishlist/WishlistEditor';
import { IconDropdown } from '../common/FormComponents';

// Modular components and hooks
import { useInterestsLogic, GroupBy } from './interests/useInterestsLogic';
import { InterestsImportSelector } from './interests/InterestsImportSelector';
import { InterestsCard } from './interests/InterestsCard';

export default function InterestsEditor() {
    const { currentTrip, addBucketListItem, removeBucketListItem, updateBucketListItem } = useTripStore();
    const bucketList = currentTrip?.bucketList || [];

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<BucketListItem | null>(null);

    // Use modular logic hook
    const logic = useInterestsLogic(bucketList);

    const handleImportFromWishlist = (wishlistItem: any) => {
        const newItem: BucketListItem = {
            id: crypto.randomUUID(),
            title: wishlistItem.title,
            description: wishlistItem.description || '',
            mainCategory: wishlistItem.mainCategory,
            subCategory: wishlistItem.subCategory,
            place: wishlistItem.place,
            imageUrl: wishlistItem.imageUrls?.[0] || wishlistItem.imageUrl,
            wishlistId: wishlistItem.id,
            status: 'interested',
            tags: []
        };
        addBucketListItem(newItem);
    };

    if (!currentTrip) return null;

    return (
        <div className="space-y-8 pb-32">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">관심 있는 장소 & 위시리스트</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">여행 중에 방문하고 싶은 장소나 해보고 싶은 활동을 자유롭게 담아보세요</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsImportOpen(true)}
                        className="h-14 px-6 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-indigo-100 dark:border-indigo-800/30"
                    >
                        <Sparkles className="w-4 h-4" /> 내 위시리스트에서 가져오기
                    </button>
                    <button 
                        onClick={() => {
                            setEditingItem(null);
                            setIsAddOpen(true);
                        }}
                        className="h-14 px-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 dark:shadow-white/10 hover:scale-[1.05] active:scale-[0.95] transition-all flex items-center justify-center gap-3"
                    >
                        <Plus className="w-5 h-5" /> 새로운 항목 추가
                    </button>
                </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/20 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="항목이나 장소 검색..." 
                            value={logic.searchQuery}
                            onChange={(e) => logic.setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs font-bold shadow-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            {(['none', 'category', 'type'] as GroupBy[]).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => logic.setGroupBy(mode)}
                                    className={cn(
                                        "px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                        logic.groupBy === mode ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-slate-400"
                                    )}
                                >
                                    {mode === 'none' ? '전체' : mode === 'category' ? '카테고리별' : '유형별'}
                                </button>
                            ))}
                        </div>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button onClick={() => setViewMode('grid')} className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-600" : "text-slate-400")}><LayoutGrid className="w-4 h-4" /></button>
                            <button onClick={() => setViewMode('list')} className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-600" : "text-slate-400")}><ListIcon className="w-4 h-4" /></button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="min-h-[400px]">
                {logic.groupBy !== 'none' && logic.groupedItems ? (
                    <div className="space-y-12">
                        {Object.entries(logic.groupedItems).map(([key, group]) => group.items.length > 0 && (
                            <section key={key} className="space-y-4">
                                <div className="flex items-center gap-3 ml-2">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500">
                                        <group.icon className="w-4 h-4" />
                                    </div>
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{group.label} ({group.items.length})</h3>
                                    <div className="flex-1 h-[1px] bg-slate-100 dark:bg-slate-800" />
                                </div>
                                <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "flex flex-col gap-3"}>
                                    {group.items.map(item => (
                                        <InterestsCard 
                                            key={item.id} 
                                            item={item} 
                                            onEdit={() => { setEditingItem(item); setIsAddOpen(true); }}
                                            onDelete={() => removeBucketListItem(item.id)}
                                            viewMode={viewMode}
                                        />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                ) : (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "flex flex-col gap-3"}>
                        {logic.filteredBucketList.map(item => (
                            <InterestsCard 
                                key={item.id} 
                                item={item} 
                                onEdit={() => { setEditingItem(item); setIsAddOpen(true); }}
                                onDelete={() => removeBucketListItem(item.id)}
                                viewMode={viewMode}
                            />
                        ))}
                        {logic.filteredBucketList.length === 0 && (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-6">
                                <div className="w-24 h-24 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-200">
                                    <PackageOpen className="w-10 h-10" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">일치하는 항목이 없습니다</p>
                                    <p className="text-[10px] font-bold text-slate-300 mt-1 uppercase">검색어나 필터를 변경해보세요</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isAddOpen && (
                    <WishlistEditor 
                        onClose={() => { setIsAddOpen(false); setEditingItem(null); }}
                        item={(editingItem as any) || undefined}
                        onSave={(data) => {
                            if (editingItem) updateBucketListItem(editingItem.id, data);
                            else addBucketListItem({ ...data, id: crypto.randomUUID(), status: 'interested', tags: [] });
                            setIsAddOpen(false);
                            setEditingItem(null);
                        }}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isImportOpen && (
                    <InterestsImportSelector 
                        onClose={() => setIsImportOpen(false)}
                        onImport={handleImportFromWishlist}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
