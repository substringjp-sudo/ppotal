'use client';

import { motion } from 'framer-motion';
import { TravelStats } from '@pplaner/shared';

interface StatsHeroProps {
  stats: TravelStats;
  userName?: string;
  onExport?: () => void;
  hideTitle?: boolean;
}

export default function StatsHero({ stats, userName = 'Traveler', onExport, hideTitle = false }: StatsHeroProps) {
  const { level, title, fantasyClass, totalXP, breakdown } = stats;
  const xpInCurrentLevel = totalXP % 500;
  const progress = (xpInCurrentLevel / 500) * 100;

  return (
    <section id="stats-hero-capture" className="relative overflow-hidden pt-10 pb-6 bg-white dark:bg-slate-950 transition-colors">
      <div className="flex flex-col lg:flex-row items-center gap-12 relative z-10">
        {/* Export Button - Top Right */}
        {onExport && (
          <div className="absolute top-0 right-0 z-20">
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 rounded-2xl border border-slate-200 dark:border-white/10 transition-all font-black text-[10px] uppercase tracking-widest"
            >
              <span className="material-symbols-rounded text-sm">share</span>
              Export / Share
            </button>
          </div>
        )}

        {/* Level Emblem */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative shrink-0"
        >
          <div className="w-40 h-40 md:w-56 md:h-56 rounded-[48px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex items-center justify-center relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[48px]" />
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Level</p>
              <h2 className="text-7xl md:text-8xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                {level}
              </h2>
            </div>
            
            {/* Orbital XP Ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 p-2">
              <circle
                cx="50%"
                cy="50%"
                r="48%"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-slate-100 dark:text-slate-800"
              />
              <motion.circle
                initial={{ pathLength: 0 }}
                animate={{ pathLength: progress / 100 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                cx="50%"
                cy="50%"
                r="48%"
                fill="none"
                stroke="#f43f5e"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </div>
          
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-primary text-white text-[10px] font-black italic rounded-full shadow-lg shadow-primary/30 uppercase tracking-widest whitespace-nowrap">
            {title}
          </div>
        </motion.div>

        {/* User Info */}
        <div className="flex-1 text-center lg:text-left space-y-6">
          {!hideTitle && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-2"
            >
              <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter">
                {userName}&apos;s <span className="text-primary italic">Intelligence</span>
              </h1>
              <p className="text-lg font-bold text-slate-400 dark:text-slate-500 italic max-w-xl">
                 &ldquo;{fantasyClass}&rdquo; - 당신의 여정은 이제 막 전설이 되기 시작했습니다.
              </p>
            </motion.div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl">
            {[
              { label: 'Total XP', value: totalXP.toLocaleString(), icon: 'auto_awesome' },
              { label: 'Destinations', value: breakdown.cities, icon: 'location_on' },
              { label: 'Logged Days', value: breakdown.totalDays, icon: 'today' },
              { label: 'Travel Rank', value: level > 10 ? 'Elite' : 'Rookie', icon: 'military_tech' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm group hover:border-primary/30 transition-all flex flex-col items-center lg:items-start"
              >
                <span className="material-symbols-rounded text-slate-300 dark:text-slate-600 group-hover:text-primary transition-colors mb-2 text-lg">{item.icon}</span>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{item.label}</p>
                <p className="text-lg font-black text-slate-900 dark:text-white leading-none tracking-tight">{item.value}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Background Decor */}
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-primary/5 blur-[120px] rounded-full -translate-y-1/2 -z-10" />
      <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full -z-10" />
    </section>
  );
}
