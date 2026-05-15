'use client';

import { WishlistItem, CATEGORY_MAP } from '@pplaner/shared';
import {
    MapPin, ExternalLink, MoreVertical, Edit2, Trash2, Tag,
    Utensils, ShoppingBag, Compass, Users, Camera, Info,
    Hotel, CalendarCheck, Plane, X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, memo } from 'react';
import { useWishlistStore } from '@pplaner/shared';

const CATEGORY_ICONS: Record<string, any> = {
    meal: Utensils,
    shopping: ShoppingBag,
    sightseeing: Compass,
    people: Users,
    transport: Plane,
    accommodation: Hotel,
    reservation: CalendarCheck,
};

interface WishlistCardProps {
    item: WishlistItem;
    onEdit: () => void;
    viewMode?: 'grid' | 'list';
    isSelected?: boolean;
    onSelect?: (id: string, selected: boolean) => void;
    isSelectionMode?: boolean;
}

interface MenuProps {
    showMenu: boolean;
    setShowMenu: (show: boolean) => void;
    onEdit: () => void;
    onDelete: () => void;
}

const Menu = ({ showMenu, setShowMenu, onEdit, onDelete }: MenuProps) => (
    <div className="relative">
        <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400"
            aria-label="메뉴 열기"
            aria-expanded={showMenu}
            aria-haspopup="true"
        >
            <MoreVertical className="w-4 h-4" />
        </button>
        {showMenu && (
            <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1 z-50 overflow-hidden">
                    <button
                        onClick={() => { onEdit(); setShowMenu(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300"
                    >
                        <Edit2 className="w-3 h-3" /> 수정하기
                    </button>
                    <button
                        onClick={() => { onDelete(); setShowMenu(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                    >
                        <Trash2 className="w-3 h-3" /> 삭제하기
                    </button>
                </div>
            </>
        )}
    </div>
);

function WishlistCardComponent({ 
    item, 
    onEdit, 
    viewMode = 'grid',
    isSelected = false,
    onSelect,
    isSelectionMode = false
}: WishlistCardProps) {
    const { deleteItem } = useWishlistStore();
    const [showMenu, setShowMenu] = useState(false);

    const handleClick = (e: React.MouseEvent) => {
        if (isSelectionMode) {
            onSelect?.(item.id, !isSelected);
        } else {
            onEdit();
        }
    };

    const mainCatInfo = item.mainCategory ? CATEGORY_MAP[item.mainCategory] : null;
    const subCatInfo = mainCatInfo?.subCategories.find(s => s.value === item.subCategory);

    const hasPlace = !!item.place;
    const hasPhoto = item.imageUrls && item.imageUrls.length > 0;
    const isSimple = !hasPlace && !hasPhoto;

    const renderDescriptionWithLinks = (text: string) => {
        if (!text) return null;
        const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
        const parts = text.split(urlRegex);
        return parts.map((part, i) => {
            if (part.match(urlRegex)) {
                const url = part.startsWith('http') ? part : `https://${part}`;
                return (
                    <a 
                        key={i} 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-500 dark:text-blue-400 hover:underline break-all"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    const itemType = hasPlace ? 'place' : hasPhoto ? 'photo' : 'simple';

    const typeConfig = {
        place: {
            icon: MapPin,
            label: '장소 기록',
            borderColor: 'border-blue-200 dark:border-blue-900/30',
            bgColor: 'bg-blue-50/50 dark:bg-blue-950/10',
            accentColor: 'text-blue-600 dark:text-blue-400'
        },
        photo: {
            icon: Camera,
            label: '사진 기록',
            borderColor: 'border-purple-200 dark:border-purple-900/30',
            bgColor: 'bg-purple-50/50 dark:bg-purple-950/10',
            accentColor: 'text-purple-600 dark:text-purple-400'
        },
        simple: {
            icon: Info,
            label: '기본 메모',
            borderColor: 'border-slate-200 dark:border-slate-800',
            bgColor: 'bg-white dark:bg-slate-900',
            accentColor: 'text-slate-500'
        }
    };

    const config = typeConfig[itemType];

    if (viewMode === 'list') {
        return (
            <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleClick}
                className={`group flex items-center gap-3 p-2 bg-white dark:bg-slate-900 border ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg' : 'border-slate-200 dark:border-slate-800'} rounded-xl hover:border-indigo-500/30 transition-all cursor-pointer`}
            >
                {/* Selection Checkbox */}
                {(isSelectionMode || isSelected) && (
                    <div 
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-slate-700'}`}
                    >
                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                )}

                {/* Thumbnail */}
                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-800">
                    {hasPhoto ? (
                        <img src={item.imageUrls![0]} className="w-full h-full object-cover" alt={item.title} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            {(() => {
                                const Icon = (item.mainCategory && CATEGORY_ICONS[item.mainCategory]) || config.icon;
                                return <Icon className={`w-5 h-5 ${config.accentColor} opacity-40`} />;
                            })()}
                        </div>
                    )}
                </div>

                {/* Info: Ultra-Compact 2-line layout */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate leading-tight">{item.title}</h4>
                        {mainCatInfo && (
                            <span className="text-[8px] font-black px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded shrink-0">
                                {mainCatInfo.label}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold truncate">
                        {item.place?.name && (
                            <span className="text-indigo-500 dark:text-indigo-400 shrink-0">{item.place.name}</span>
                        )}
                        {item.place?.name && (item.place?.country || item.place?.prefecture || item.place?.city) && (
                            <span className="text-slate-300 dark:text-slate-700 shrink-0">·</span>
                        )}
                        <span className="text-slate-400 truncate">
                            {[item.place?.country, item.place?.prefecture, item.place?.city].filter(Boolean).join(' ')}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pr-2">
                    <Menu 
                        showMenu={showMenu} 
                        setShowMenu={setShowMenu} 
                        onEdit={onEdit} 
                        onDelete={() => deleteItem(item.id)} 
                    />
                </div>
            </motion.div>
        );
    }

    // GRID VIEW (Default)
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleClick}
            className={`group relative flex flex-col h-full bg-white dark:bg-slate-900 rounded-3xl border-2 ${isSelected ? 'border-indigo-500 ring-4 ring-indigo-500/10 shadow-2xl' : config.borderColor} overflow-hidden hover:shadow-2xl transition-all duration-500 cursor-pointer`}
        >
            {/* Selection Checkbox (Overlay) */}
            {(isSelectionMode || isSelected) && (
                <div 
                    className={`absolute top-3 left-3 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shadow-md backdrop-blur-md ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-white/50 bg-black/10'}`}
                >
                    {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
            )}

            {/* Header / Type Badge */}
            <div className={`pl-10 pr-3 py-1.5 border-b ${config.borderColor} ${config.bgColor} flex items-center justify-between relative`}>
                <div className="flex items-center gap-1.5">
                    <config.icon className={`w-3 h-3 ${config.accentColor}`} />
                    <span className={`text-[9px] font-black tracking-widest uppercase ${config.accentColor}`}>
                        {config.label}
                    </span>
                </div>
                <Menu 
                    showMenu={showMenu} 
                    setShowMenu={setShowMenu} 
                    onEdit={onEdit} 
                    onDelete={() => deleteItem(item.id)} 
                />
            </div>

            {/* Media Section */}
            {(hasPhoto || hasPlace) && (
                <div className="relative aspect-[16/9] bg-slate-100 dark:bg-slate-800 overflow-hidden border-b border-slate-200 dark:border-slate-800">
                    {hasPhoto ? (
                        <img
                            src={item.imageUrls![0]}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 relative overflow-hidden">
                            <div 
                                className="absolute inset-0 opacity-10 blur-2xl transition-all group-hover:opacity-20 flex items-center justify-center"
                                style={{ backgroundColor: mainCatInfo?.color || '#cbd5e1' }}
                            >
                                {(() => {
                                    const Icon = CATEGORY_ICONS[item.mainCategory!] || config.icon;
                                    return <Icon className="w-32 h-32" />;
                                })()}
                            </div>
                            <div className="relative flex flex-col items-center">
                                {(() => {
                                    const Icon = CATEGORY_ICONS[item.mainCategory!] || config.icon;
                                    return <Icon className="w-10 h-10 mb-2 opacity-50 group-hover:scale-110 group-hover:opacity-80 transition-all duration-500" style={{ color: mainCatInfo?.color }} />;
                                })()}
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate w-full px-2">{item.place?.name}</span>
                            </div>
                        </div>
                    )}

                    {/* Category Overlay (Text Only) */}
                    {mainCatInfo && (
                        <div
                            className="absolute bottom-2.5 left-2.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-white shadow-lg backdrop-blur-md border border-white/20"
                            style={{ backgroundColor: `${mainCatInfo.color}CC` }}
                        >
                            {mainCatInfo.label}
                        </div>
                    )}
                </div>
            )}

            {/* Content */}
            <div className="p-3 flex-1 flex flex-col min-h-0">
                <div className="flex-1 space-y-2">
                    <div className="space-y-1">
                        {!hasPhoto && !hasPlace && mainCatInfo && (
                            <div className="flex items-center gap-1.5 mb-1">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: mainCatInfo.color }} />
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{mainCatInfo.label}</span>
                            </div>
                        )}
                        <h3 className="text-sm font-black text-slate-900 dark:text-white line-clamp-2 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {item.title}
                        </h3>
                        {item.place && (item.place.country || item.place.prefecture || item.place.city) && (
                            <div className="flex flex-wrap gap-1 mt-1">
                                {item.place.country && (
                                    <span className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 text-[8px] font-bold text-slate-500 rounded">
                                        {item.place.country}
                                    </span>
                                )}
                                <span className="text-[8px] font-bold text-slate-400 truncate max-w-full">
                                    {[item.place.prefecture, item.place.city].filter(Boolean).join(' ')}
                                </span>
                            </div>
                        )}
                    </div>

                    {item.description && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-3 font-medium leading-normal whitespace-pre-wrap">
                            {renderDescriptionWithLinks(item.description)}
                        </p>
                    )}
                </div>

                {/* Footer Info (Simplified) */}
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        {item.place && !hasPhoto && (
                            <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-slate-200" /> {subCatInfo?.label || '기록'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default memo(WishlistCardComponent);
