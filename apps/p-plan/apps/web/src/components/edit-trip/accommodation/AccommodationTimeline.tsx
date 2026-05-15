import React from 'react';
import { format, isSameDay, isWithinInterval, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@pplaner/shared';
import { ACCOMMODATION_TYPES } from './AccommodationConstants';

interface AccommodationTimelineProps {
    timelineDates: Date[];
    isTripDay: (date: Date) => boolean;
    packedAccommodations: any[];
    maxRows: number;
    selectionStart: Date | null;
    selectionEnd: Date | null;
    isDragging: boolean;
    hoverDate: Date | null;
    handleMouseDown: (date: Date) => void;
    handleMouseEnter: (date: Date) => void;
    handleMouseUp: () => void;
    hoveredAccId: string | null;
    setHoveredAccId: (id: string | null) => void;
    editingId: string | null;
    setEditingId: (id: string | null) => void;
    getRegionPath: (acc: any) => string;
}

export const AccommodationTimeline: React.FC<AccommodationTimelineProps> = ({
    timelineDates,
    isTripDay,
    packedAccommodations,
    maxRows,
    selectionStart,
    selectionEnd,
    isDragging,
    hoverDate,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    hoveredAccId,
    setHoveredAccId,
    editingId,
    setEditingId,
    getRegionPath
}) => {
    const getIsSelected = (date: Date) => {
        if (!selectionStart || !selectionEnd) return false;
        const s = selectionStart.getTime() < selectionEnd.getTime() ? selectionStart : selectionEnd;
        const e = selectionStart.getTime() < selectionEnd.getTime() ? selectionEnd : selectionStart;
        return isWithinInterval(date, { start: s, end: e });
    };

    return (
        <section className="space-y-4" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            <div className="flex items-center justify-between px-2">
                <div>
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none mb-2">숙박 타임라인</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase">날짜를 드래그하여 숙소를 빠르게 예약해보세요</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary/20 border border-primary/30"></div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">예정</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary border border-primary/30"></div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">예약됨</span>
                    </div>
                </div>
            </div>

            <div className="relative bg-white dark:bg-slate-900 rounded-3xl md:rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-xl p-3 md:p-5 overflow-x-auto no-scrollbar select-none">
                <div className="min-w-max relative">
                    {/* 1. Date Headers & Vertical Grid Lines */}
                    <div className="flex gap-0 relative z-0 border-b border-slate-200 dark:border-slate-800">
                        {timelineDates.map((date: Date) => {
                            const dateStr = format(date, 'yyyy-MM-dd');
                            const isSel = getIsSelected(date);
                            const isActualTripDay = isTripDay(date);

                            return (
                                <div
                                    key={dateStr}
                                    className={cn(
                                        "flex flex-col items-center group/day relative transition-all duration-300 border-r border-slate-200 dark:border-slate-800",
                                        !isActualTripDay && "bg-slate-50/30 dark:bg-slate-800/10 grayscale-[0.5] opacity-60"
                                    )}
                                    style={{ width: '70px' }}
                                >
                                    <div className="py-4 text-center pointer-events-none w-full border-b border-slate-200/60 dark:border-slate-800/30">
                                        <p className={cn(
                                            "text-[8px] font-black uppercase tracking-widest mb-0.5 transition-colors",
                                            isActualTripDay ? "text-slate-400 group-hover/day:text-primary" : "text-slate-300"
                                        )}>
                                            {format(date, 'EEE', { locale: ko })}
                                        </p>
                                        <p className={cn(
                                            "text-base font-black leading-none tracking-tighter transition-all",
                                            isSameDay(date, new Date()) ? "text-primary scale-110" : 
                                            isActualTripDay ? "text-slate-900 dark:text-white" : "text-slate-400"
                                        )}>
                                            {format(date, 'd')}
                                        </p>
                                    </div>

                                    <div
                                        className={cn(
                                            "w-full transition-colors duration-200 cursor-cell",
                                            isSel ? "bg-primary/10" : "bg-transparent hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                                        )}
                                        style={{ height: `${Math.max(240, maxRows * 70 + 80)}px` }}
                                        onMouseDown={() => handleMouseDown(date)}
                                        onMouseEnter={() => handleMouseEnter(date)}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* 2. Accommodation Bars Layer */}
                    <div className="absolute top-[86px] left-0 right-0 bottom-0 pointer-events-none z-10">
                        {packedAccommodations.map((acc) => {
                            const startDate = parseISO(acc.startDate);
                            const endDate = parseISO(acc.endDate);

                            const startIdx = timelineDates.findIndex(d => isSameDay(d, startDate));
                            const endIdx = timelineDates.findIndex(d => isSameDay(d, endDate));

                            if (startIdx === -1 || endIdx === -1) return null;

                            const HORIZONTAL_GAP = 4;
                            const left = startIdx * 70 + 35 + HORIZONTAL_GAP;
                            const width = (endIdx - startIdx) * 70 - (HORIZONTAL_GAP * 2);
                            const isHovered = hoveredAccId === acc.id;
                            const isEditing = editingId === acc.id;

                            const typeInfo = ACCOMMODATION_TYPES.find(t => t.value === acc.type);

                            return (
                                <div
                                    key={acc.id}
                                    className={cn(
                                        "absolute pointer-events-auto transition-all duration-500",
                                        (isHovered && !isEditing) ? "z-30" : "z-10"
                                    )}
                                    style={{
                                        left: `${left}px`,
                                        width: `${width}px`,
                                        top: `${acc.rowIndex * 70 + 15}px`,
                                    }}
                                >
                                    <motion.div
                                        layoutId={`acc-bar-${acc.id}`}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setHoveredAccId(null);
                                            setEditingId(acc.id);
                                            
                                            setTimeout(() => {
                                                const targetEl = document.getElementById(`acc-list-item-${acc.id}`);
                                                if (targetEl) {
                                                    const headerOffset = 100;
                                                    const elementPosition = targetEl.getBoundingClientRect().top;
                                                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                                                    window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                                                }
                                            }, 100);
                                        }}
                                        onMouseEnter={() => setHoveredAccId(acc.id)}
                                        onMouseLeave={() => setHoveredAccId(null)}
                                        className={cn(
                                            "w-full rounded-xl transition-all duration-300 cursor-pointer shadow-sm relative overflow-visible flex flex-col justify-center px-3 h-[34px]",
                                            acc.status === 'booked'
                                                ? "bg-primary text-white shadow-primary/20"
                                                : "bg-white dark:bg-slate-800 border-2 border-primary/20 text-primary hover:border-primary/40",
                                            (isHovered || isEditing) && "shadow-xl brightness-110 ring-2 ring-primary/50"
                                        )}
                                    >
                                        <AnimatePresence>
                                            {isHovered && !isEditing && (
                                                <>
                                                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute -left-2 bottom-full mb-1.5 z-[40]">
                                                        <div className="bg-primary text-white text-[7px] font-black px-1.5 py-0.5 rounded-sm shadow-md whitespace-nowrap uppercase">IN {acc.checkInTime || '15:00'}</div>
                                                    </motion.div>
                                                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute -right-2 bottom-full mb-1.5 z-[40]">
                                                        <div className="bg-primary text-white text-[7px] font-black px-1.5 py-0.5 rounded-sm shadow-md whitespace-nowrap uppercase">OUT {acc.checkOutTime || '11:00'}</div>
                                                    </motion.div>

                                                    <motion.div
                                                        initial={{ opacity: 0, y: acc.rowIndex === 0 ? -10 : 10, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: acc.rowIndex === 0 ? -10 : 10, scale: 0.95 }}
                                                        className={cn("absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none", acc.rowIndex === 0 ? "top-full mt-4" : "bottom-full mb-4")}
                                                    >
                                                        <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md border border-slate-700/50 shadow-2xl rounded-2xl p-3 min-w-[200px]">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                                                                    <span className="material-symbols-rounded text-[18px]">{typeInfo?.icon || 'home'}</span>
                                                                </div>
                                                                <div className="flex-1 min-w-0 text-left">
                                                                    <div className="text-[11px] font-black text-white truncate uppercase tracking-tight">{acc.name || '미지정 숙소'}</div>
                                                                    <div className="text-[9px] font-bold text-slate-400 truncate uppercase">{typeInfo?.label || '기타'}</div>
                                                                </div>
                                                            </div>
                                                                 <div className="space-y-1.5 pt-2 border-t border-slate-700/50 text-left">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="material-symbols-rounded text-[12px] text-slate-500">place</span>
                                                                        <span className="text-[9px] font-bold text-slate-300 truncate tracking-tighter uppercase">{getRegionPath(acc) || acc.location || '지역 정보 없음'}</span>
                                                                    </div>
                                                                    {!(acc.isPriceUndecided || !acc.price) && (
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="material-symbols-rounded text-[12px] text-slate-500">payments</span>
                                                                                <span className="text-[10px] font-black text-primary">{`${acc.price.toLocaleString()}원`}</span>
                                                                            </div>
                                                                            {acc.status === 'booked' && <span className="text-[7px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded uppercase tracking-widest leading-none">BOOKED</span>}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            <div className={cn("w-3 h-3 bg-slate-900 dark:bg-slate-800 border-slate-700/50 rotate-45 absolute left-1/2 -translate-x-1/2", acc.rowIndex === 0 ? "-top-1.5 border-l border-t" : "-bottom-1.5 border-r border-b")} />
                                                        </div>
                                                    </motion.div>
                                                </>
                                            )}
                                        </AnimatePresence>

                                        <div className="flex items-center gap-1.5 overflow-hidden w-full h-8 shrink-0">
                                            <span className="material-symbols-rounded text-[16px] opacity-60">{typeInfo?.icon || 'home'}</span>
                                            <span className={cn("font-bold truncate flex-1 uppercase tracking-tight transition-all", isHovered ? "text-xs" : "text-[10px]")}>
                                                {acc.name || '미지정 숙소'}
                                            </span>
                                            {acc.status === 'booked' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />}
                                        </div>
                                    </motion.div>
                                </div>
                            );
                        })}

                        {/* Ghost/Hover Previews */}
                        {isDragging && selectionStart && selectionEnd && (() => {
                            const s_sel = selectionStart.getTime() < selectionEnd.getTime() ? selectionStart : selectionEnd;
                            const e_sel = selectionStart.getTime() < selectionEnd.getTime() ? selectionEnd : selectionStart;
                            const sIdx = timelineDates.findIndex(d => isSameDay(d, s_sel));
                            const eIdx = timelineDates.findIndex(d => isSameDay(d, e_sel));
                            if (sIdx === -1 || eIdx === -1) return null;
                            return (
                                <div className="absolute opacity-40 pointer-events-none" style={{ left: `${sIdx * 70 + 35}px`, width: `${(eIdx - sIdx) * 70}px`, top: `${maxRows * 70 + 15}px`, height: '32px' }}>
                                    <div className="w-full h-full bg-primary/30 border-2 border-dashed border-primary/50 rounded-full" />
                                </div>
                            );
                        })()}
                        {!isDragging && !hoveredAccId && hoverDate && (() => {
                            const idx = timelineDates.findIndex(d => isSameDay(d, hoverDate));
                            if (idx === -1) return null;
                            return (
                                <div className="absolute opacity-20 pointer-events-none" style={{ left: `${idx * 70 + 35}px`, width: '35px', top: `${maxRows * 70 + 15}px`, height: '32px' }}>
                                    <div className="w-full h-full bg-primary/30 border-2 border-dashed border-primary/50 rounded-l-full" />
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>
        </section>
    );
};
