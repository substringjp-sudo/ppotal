
import { useTripStore } from '@pplaner/shared';
import { cn } from '@pplaner/shared';
import { motion } from 'framer-motion';
import { FlightGrid } from './transport/FlightGrid';
import { DrivingList } from './transport/DrivingList';
import { PublicTransportList } from './transport/PublicTransportList';
import { ReservationItem } from './transport/ReservationItem';

export default function TransportAndTicketsEditor() {
    const trip = useTripStore((state) => state.currentTrip);

    if (!trip) return null;

    return (
        <div className="space-y-16 pb-20">
            {/* 1. 항공편 섹션 */}
            <section className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center text-sky-500 shrink-0">
                            <span className="material-symbols-rounded">flight</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">항공편</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">출국, 귀국 및 기타 비행 일정을 관리합니다.</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <FlightGrid />
                </div>
            </section>

            {/* 2. 드라이브 섹션 */}
            <section className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500 shrink-0">
                            <span className="material-symbols-rounded">directions_car</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">드라이브 / 렌터카</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">직접 운전하거나 차량을 렌트하는 일정을 관리합니다.</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <DrivingList />
                </div>
            </section>

            {/* 3. 대중교통 섹션 */}
            <section className="space-y-8">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500">
                            <span className="material-symbols-rounded">directions_bus</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">대중교통 (예약 필요)</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">버스, 기차, 페리 등 미리 예약이 필요한 대중교통을 관리합니다.</p>
                        </div>
                    </div>
                </div>
                <PublicTransportList />
            </section>
        </div>
    );
}