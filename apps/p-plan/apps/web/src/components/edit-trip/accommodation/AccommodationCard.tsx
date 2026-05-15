import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@pplaner/shared';
import { ACCOMMODATION_TYPES } from './AccommodationConstants';
import { AccommodationForm } from './AccommodationForm';

interface AccommodationCardProps {
    acc: any;
    isEditing: boolean;
    setEditingId: (id: string | null) => void;
    updateAccommodation: (id: string, updates: any) => void;
    timelineDates: Date[];
}

export const AccommodationCard: React.FC<AccommodationCardProps> = ({
    acc,
    isEditing,
    setEditingId,
    updateAccommodation,
    timelineDates
}) => {
    return (
        <motion.div 
            id={`acc-list-item-${acc.id}`}
            layout
            className={cn(
                "bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-300",
                isEditing 
                    ? "ring-2 ring-primary/10 border-primary/20 shadow-xl" 
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 shadow-sm"
            )}
        >
            <div 
                className="p-3 xl:p-4 md:p-4 cursor-pointer group"
                onClick={() => setEditingId(isEditing ? null : acc.id)}
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 xl:gap-4 md:gap-4">
                    <div className="flex items-center gap-2 xl:gap-4 md:gap-4">
                        <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0",
                            isEditing ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:bg-slate-100"
                        )}>
                            <span className="material-symbols-rounded text-[24px]">
                                {ACCOMMODATION_TYPES.find(t => t.value === acc.type)?.icon || 'home'}
                            </span>
                        </div>
                        <div className="flex flex-col gap-0 xl:gap-0.5 md:gap-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                                <h4 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">
                                    {acc.name || '미지정 숙소'}
                                </h4>
                            </div>
                            <div className="flex items-center gap-1 xl:gap-2 text-[9px] xl:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <span>{acc.startDate} - {acc.endDate}</span>
                                <div className="w-0.5 h-0.5 rounded-full bg-slate-200" />
                                <span className="truncate">{ACCOMMODATION_TYPES.find(t => t.value === acc.type)?.label || '기타'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-2 xl:gap-6 md:gap-6 min-w-0">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                updateAccommodation(acc.id, { status: acc.status === 'booked' ? 'tentative' : 'booked' });
                            }}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest border-2 shrink-0",
                                acc.status === 'booked' 
                                    ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20" 
                                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-200 dark:hover:border-slate-700"
                            )}
                        >
                            <span className="material-symbols-rounded text-base">
                                {acc.status === 'booked' ? 'check_circle' : 'circle'}
                            </span>
                            <span className="hidden sm:inline">{acc.status === 'booked' ? '예약 완료' : '예약 처리'}</span>
                        </button>


                        <motion.div
                            animate={{ rotate: isEditing ? 180 : 0 }}
                            className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0"
                        >
                            <span className="material-symbols-rounded text-base">expand_more</span>
                        </motion.div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isEditing && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-slate-200/60 dark:border-slate-800"
                    >
                        <div className="p-6 md:p-10">
                            <AccommodationForm 
                                id={acc.id}
                                onClose={() => setEditingId(null)}
                                tripDates={timelineDates}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
