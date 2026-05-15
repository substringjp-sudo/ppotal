
import { useTripStore } from '@pplaner/shared';
import { cn } from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { FlightSegment, DrivingSegment, PublicTransportSegment, TransportReservation } from '@pplaner/shared';
import { AirportSearchInput } from '../AirportSearchInput';
import { AirlineSearchInput } from '../AirlineSearchInput';
import { GoogleMapsSearch } from '@/components/common/GoogleMapsSearch';
import { CustomCheckbox, IconDropdown, UndecidedField, RestrictedDatePicker, TimeInput } from '../../common/FormComponents';
import { AIRLINES } from '@pplaner/shared';

export function ReservationItem({ res, onUpdate, onRemove }: { res: TransportReservation, onUpdate: (u: Partial<TransportReservation>) => void, onRemove: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 relative group/res shadow-sm hover:shadow-md transition-all duration-300"
        >
             {/* 좌측 강조 라인 */}
            <div className="absolute left-0 top-6 bottom-6 w-1 bg-indigo-500 rounded-r-full opacity-0 group-hover/res:opacity-100 transition-opacity" />

            <div className="flex flex-col gap-6">
                {/* 상단: 일자 및 기본 정보 */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    <div className="md:col-span-4 lg:col-span-3">
                        <RestrictedDatePicker
                            value={res.date}
                            onChange={(v) => onUpdate({ date: v })}
                            label="예약 날짜"
                            className="w-full"
                        />
                    </div>
                    
                    <div className="md:col-span-8 lg:col-span-6 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">제목 / 항목</label>
                        <div className="relative">
                            <input 
                                value={res.title} 
                                onChange={(e) => onUpdate({ title: e.target.value })} 
                                placeholder="예: 승차권 예매, 셔틀 예약" 
                                className="w-full bg-slate-50 dark:bg-slate-800 px-5 py-3 rounded-2xl text-sm font-black outline-none border border-transparent focus:border-indigo-500/30 focus:ring-2 focus:ring-indigo-500/10 transition-all" 
                            />
                            <span className="material-symbols-rounded absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 text-[18px]">confirmation_number</span>
                        </div>
                    </div>

                    <div className="md:col-span-12 lg:col-span-3">
                        <TimeInput 
                            label="시간 (선택 사항)"
                            value={res.time || ''}
                            onChange={(v) => onUpdate({ time: v })}
                        />
                    </div>
                </div>

                {/* 하단: 링크 및 메모 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200/60 dark:border-slate-800">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">참고 링크</label>
                        <div className="relative">
                            <input 
                                value={res.link || ''} 
                                onChange={(e) => onUpdate({ link: e.target.value })} 
                                placeholder="https://..." 
                                className="w-full bg-slate-50/50 dark:bg-slate-800/30 px-5 py-3 rounded-2xl text-xs font-bold outline-none border border-transparent focus:border-sky-500/30 transition-all text-sky-600 dark:text-sky-400" 
                            />
                            <span className="material-symbols-rounded absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 text-[16px]">link</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">메모</label>
                        <div className="relative">
                            <textarea
                                value={res.memo || ''}
                                onChange={(e) => onUpdate({ memo: e.target.value })}
                                placeholder="추가 메모 사항..."
                                className="w-full bg-slate-50/50 dark:bg-slate-800/30 px-5 py-3 rounded-2xl text-xs font-bold outline-none border border-transparent focus:border-indigo-500/30 transition-all resize-none min-h-[44px]"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <button
                onClick={onRemove}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all opacity-0 group-hover/res:opacity-100"
                title="삭제"
            >
                <span className="material-symbols-rounded text-lg font-black">close</span>
            </button>
        </motion.div>
    );
}

