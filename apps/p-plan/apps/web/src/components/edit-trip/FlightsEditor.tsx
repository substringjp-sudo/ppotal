'use client';

import { useTripStore } from '@pplaner/shared';
import { FlightGrid } from './transport/FlightGrid';
import { AnimatePresence, motion } from 'framer-motion';
import { CustomCheckbox } from '../common/FormComponents';

export default function FlightsEditor() {
    const trip = useTripStore((state) => state.currentTrip);
    const updateTransportSettings = useTripStore((state) => state.updateTransportSettings);

    if (!trip) return null;

    const useFlight = trip.transportSettings?.useFlight ?? true;

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center text-sky-500 shrink-0">
                        <span className="material-symbols-rounded">flight</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">항공권 관리</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">출국, 귀국 및 모든 국제/국내선 비행 일정을 관리합니다.</p>
                    </div>
                </div>
                <CustomCheckbox
                    checked={!useFlight}
                    onChange={(checked) => updateTransportSettings({ useFlight: !checked })}
                    label="비행기 미사용"
                    size="sm"
                />
            </div>

            <AnimatePresence mode="wait">
                {useFlight ? (
                    <motion.div
                        key="flight-active"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                    >
                        <FlightGrid />
                    </motion.div>
                ) : (
                    <motion.div
                        key="flight-inactive"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-20 bg-slate-50 dark:bg-slate-800/50 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400"
                    >
                        <div className="w-20 h-20 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm mb-6">
                            <span className="material-symbols-rounded text-4xl opacity-20">flight_off</span>
                        </div>
                        <p className="text-sm font-bold">항공편 기능이 비활성화되었습니다.</p>
                        <p className="text-[10px] font-medium opacity-60 mt-2">상단의 '비행기 미사용' 체크를 해제하면 다시 활성화됩니다.</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
