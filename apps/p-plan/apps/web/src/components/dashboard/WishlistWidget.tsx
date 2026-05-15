'use client';

import { useWishlistStore } from '@pplaner/shared';
import { useTripStore } from '@pplaner/shared'; // Added
import { CATEGORY_MAP } from '@pplaner/shared';
import { Plus, ChevronRight, ShoppingBag, Utensils, Palmtree, Users, Tag, Bed, Ticket, Car } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion'; // Added AnimatePresence
import { useMemo, useState } from 'react'; // Added useState
import WishlistEditor from '@/components/wishlist/WishlistEditor'; // Added

const CATEGORY_ICONS: Record<string, any> = {
    meal: Utensils,
    shopping: ShoppingBag,
    sightseeing: Palmtree,
    people: Users,
    transport: Car,
    accommodation: Bed,
    reservation: Ticket,
};

export default function WishlistWidget() {
    const trip = useTripStore((state) => state.currentTrip);
    const { items } = useWishlistStore();
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    const tripItems = useMemo(() => {
        if (!trip) return [];
        // Filter items that belong to this trip
        return (items || []).filter(item => item.tripId === trip.id);
    }, [items, trip]);

    const recentItems = tripItems.slice(0, 4); // Show only top 4 recent items for this trip

    return (
        <div className="flex flex-col h-full" aria-labelledby="wishlist-widget-title">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-rounded text-indigo-500 font-variation-bold text-xl" aria-hidden="true">favorite</span>
                    <h3 id="wishlist-widget-title" className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest italic">위시리스트</h3>
                </div>
                <Link
                    href={trip ? `/wishlist?tripId=${trip.id}` : "/wishlist"}
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-1"
                    aria-label="위시리스트 전체 보기"
                >
                    전체 보기 <ChevronRight className="w-3 h-3" aria-hidden="true" />
                </Link>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
                {recentItems.length > 0 ? (
                    <div className="space-y-3" role="list">
                        {recentItems.map((item) => {
                            const Icon = item.mainCategory ? CATEGORY_ICONS[item.mainCategory] : Tag;
                            const color = item.mainCategory ? CATEGORY_MAP[item.mainCategory].color : '#94a3b8';

                            return (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 group hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all hover:shadow-sm"
                                    role="listitem"
                                    aria-label={`${item.title}, 카테고리: ${item.mainCategory ? CATEGORY_MAP[item.mainCategory].label : '없음'}${item.price ? `, 가격: ${item.price.toLocaleString()}원` : ''}`}
                                >
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-white dark:bg-slate-900"
                                        style={{ color: color }}
                                        aria-hidden="true"
                                    >
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{item.title}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {item.mainCategory && (
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                    {CATEGORY_MAP[item.mainCategory].label}
                                                </span>
                                            )}
                                            {item.price && (
                                                <span className="text-[10px] font-black text-indigo-500 italic">
                                                    ₩{item.price.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-6" role="status">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300" aria-hidden="true">
                            <Plus className="w-6 h-6" />
                        </div>
                        <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest leading-relaxed">
                            하고 싶은 것들을 <br />
                            리스트에 담아보세요
                        </p>
                    </div>
                )}
            </div>

            <div className="p-4 bg-slate-50/30 dark:bg-slate-800/20 border-t border-slate-200 dark:border-slate-800">
                <button
                    onClick={() => setIsEditorOpen(true)}
                    className="w-full py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                    <Plus className="w-3 h-3" aria-hidden="true" /> 아이템 추가하기
                </button>
            </div>

            <AnimatePresence>
                {isEditorOpen && (
                    <WishlistEditor
                        tripId={trip?.id}
                        onClose={() => setIsEditorOpen(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
