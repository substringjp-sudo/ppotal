import React from 'react';
import { motion } from 'framer-motion';
import { 
    Tag as TagIcon, MapPin, PackageOpen, X, ChevronRight, Sparkles 
} from 'lucide-react';
import { BucketListItem, CATEGORY_MAP, MainCategory } from '@pplaner/shared';

interface InterestsCardProps {
    item: BucketListItem;
    onEdit: () => void;
    onDelete: () => void;
    viewMode: 'grid' | 'list';
}

export const InterestsCard: React.FC<InterestsCardProps> = ({ item, onEdit, onDelete, viewMode }) => {
    const mainCatInfo = item.mainCategory ? CATEGORY_MAP[item.mainCategory as MainCategory] : null;

    if (viewMode === 'list') {
        return (
            <motion.div
                layout
                className="group flex items-center gap-4 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-indigo-500/50 transition-all"
            >
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                    {item.imageUrl ? (
                        <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.title} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <PackageOpen className="w-5 h-5 text-slate-300" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        {mainCatInfo && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded uppercase tracking-tighter">
                                {mainCatInfo.label}
                            </span>
                        )}
                        {item.wishlistId && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5" /> 위시리스트 연동
                            </span>
                        )}
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white truncate">{item.title}</h4>
                    {item.place && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 truncate mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {item.place.name}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={onDelete} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                    <button onClick={onEdit} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            layout
            className="group relative flex flex-col bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500"
        >
            <div className="relative aspect-[16/10] bg-slate-100 dark:bg-slate-800">
                {item.imageUrl ? (
                    <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.title} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <PackageOpen className="w-10 h-10 text-slate-300" />
                    </div>
                )}
                
                {mainCatInfo && (
                    <div 
                        className="absolute bottom-3 left-3 px-2 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white shadow-lg backdrop-blur-md border border-white/20"
                        style={{ backgroundColor: `${mainCatInfo.color}CC` }}
                    >
                        {mainCatInfo.label}
                    </div>
                )}

                <button 
                    onClick={onDelete}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-center text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all border border-white/20"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-5 flex flex-col gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                    {item.wishlistId && (
                        <div className="p-1 px-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-lg shadow-sm border border-indigo-100 dark:border-indigo-800/30 shrink-0">
                            <Sparkles className="w-3 h-3" />
                        </div>
                    )}
                    <h4 className="font-black text-slate-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">{item.title}</h4>
                </div>
                
                {item.description && <p className="text-[11px] text-slate-500 line-clamp-2 font-medium leading-relaxed">{item.description}</p>}
                
                <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800 pt-4">
                    {item.place ? (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 truncate max-w-[70%] text-left">
                            <MapPin className="w-3 h-3" /> {item.place.name}
                        </div>
                    ) : (
                        <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No Location</div>
                    )}
                    
                    <button onClick={onEdit} className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group/btn">
                        상세보기 <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};
