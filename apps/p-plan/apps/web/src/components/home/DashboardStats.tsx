'use client';
import { motion } from 'framer-motion';

interface DashboardStatsProps {
  stats: {
    countries: number;
    cities: number;
    totalTrips: number;
  };
  itemVariants: any;
}

export default function DashboardStats({ stats, itemVariants }: DashboardStatsProps) {
  return (
    <motion.div variants={itemVariants} className="md:col-span-2 grid grid-cols-3 gap-4">
        <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-900/20 group hover:scale-[1.02] transition-all cursor-pointer text-center md:text-left">
            <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-indigo-500 shadow-sm group-hover:bg-indigo-500 group-hover:text-white transition-colors mb-4 mx-auto md:mx-0">
                <span className="material-symbols-rounded text-lg font-black">public</span>
            </div>
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">방문 국가</p>
            <p className="text-xl font-black text-slate-800 dark:text-white">{stats.countries} <span className="text-[10px] text-slate-500 font-bold ml-1">Countries</span></p>
        </div>
        <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-3xl border border-emerald-100 dark:border-emerald-900/20 group hover:scale-[1.02] transition-all cursor-pointer text-center md:text-left">
            <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-emerald-500 shadow-sm group-hover:bg-emerald-500 group-hover:text-white transition-colors mb-4 mx-auto md:mx-0">
                <span className="material-symbols-rounded text-lg font-black">apartment</span>
            </div>
            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1">방문 도시</p>
            <p className="text-xl font-black text-slate-800 dark:text-white">{stats.cities} <span className="text-[10px] text-slate-500 font-bold ml-1">Visited</span></p>
        </div>
        <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-900/20 group hover:scale-[1.02] transition-all cursor-pointer text-center md:text-left">
            <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-amber-500 shadow-sm group-hover:bg-amber-500 group-hover:text-white transition-colors mb-4 mx-auto md:mx-0">
                <span className="material-symbols-rounded text-lg font-black">emoji_events</span>
            </div>
            <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest leading-none mb-1">전체 여행 기록</p>
            <p className="text-xl font-black text-slate-800 dark:text-white">{stats.totalTrips} <span className="text-[10px] text-slate-500 font-bold ml-1">Planned</span></p>
        </div>
    </motion.div>
  );
}
