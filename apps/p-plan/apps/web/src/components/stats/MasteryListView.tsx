'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RegionalMastery, MasteryLevel } from '@pplaner/shared';

interface MasteryListViewProps {
    mastery: RegionalMastery;
}

export default function MasteryListView({ mastery }: MasteryListViewProps) {
    const sortedCountries = Object.values(mastery).sort((a, b) => b.xp - a.xp);

    return (
        <div className="space-y-4 max-w-4xl mx-auto px-4 pb-20">
            {sortedCountries.map((country) => (
                <CountryItem key={country.id} country={country} />
            ))}
            
            {sortedCountries.length === 0 && (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <span className="material-symbols-rounded text-4xl text-slate-300 mb-4 inline-block">map</span>
                    <p className="text-slate-500 font-medium font-pretendard">아직 방문한 국가가 없습니다.</p>
                </div>
            )}
        </div>
    );
}

function CountryItem({ country }: { country: MasteryLevel }) {
    const [isOpen, setIsOpen] = useState(false);
    const sortedPrefs = Object.values(country.prefectures || {}).sort((a: any, b: any) => b.xp - a.xp) as any[];

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full text-left px-6 py-5 flex items-center justify-between group"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <span className="material-symbols-rounded text-emerald-600 dark:text-emerald-400">flag</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            {country.name}
                            {country.isMastered && (
                                <span className="material-symbols-rounded text-emerald-500 text-sm">verified</span>
                            )}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                            <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(country.xp / country.maxXp) * 100}%` }}
                                    className="h-full bg-emerald-500"
                                />
                            </div>
                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">
                                {Math.round((country.xp / country.maxXp) * 100)}% Mastered
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Total XP</div>
                        <div className="text-sm font-black text-slate-700 dark:text-slate-300">{Math.round(country.xp).toLocaleString()}</div>
                    </div>
                    <span className={`material-symbols-rounded text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                        expand_more
                    </span>
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-200 dark:border-slate-800"
                    >
                        <div className="p-6">
                            <StatsGrid stats={country.stats} />
                            
                            {sortedPrefs.length > 0 && (
                                <div className="mt-8 space-y-3">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Detailed Regions</h4>
                                    {sortedPrefs.map((pref) => (
                                        <PrefectureItem key={pref.id} pref={pref} countryId={country.id} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function PrefectureItem({ pref, countryId }: { pref: MasteryLevel, countryId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const sortedCities = Object.values(pref.cities || {}).sort((a: any, b: any) => b.xp - a.xp) as any[];

    return (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full text-left px-5 py-4 flex items-center justify-between group"
            >
                <div className="flex items-center gap-3">
                    <span className="material-symbols-rounded text-slate-400 text-sm">location_on</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{pref.name}</span>
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter ml-2">
                        {Math.round((pref.xp / pref.maxXp) * 100)}%
                    </span>
                </div>
                <span className={`material-symbols-rounded text-slate-300 text-sm transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-5 pb-5"
                    >
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 mb-4">
                            <StatsGrid stats={pref.stats} compact />
                        </div>

                        {sortedCities.length > 0 && (
                            <div className="space-y-2">
                                <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2">Visited Cities</h5>
                                <div className="flex flex-wrap gap-2">
                                    {sortedCities.map((city) => (
                                        <div key={city.id} className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-full border border-emerald-100 dark:border-emerald-800/50 flex items-center gap-2">
                                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{city.name}</span>
                                            <span className="text-[9px] font-black text-emerald-500/50">{Math.round(city.xp)} XP</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function StatsGrid({ stats, compact = false }: { stats?: any, compact?: boolean }) {
    if (!stats) return null;

    const items = [
        { label: 'Days', value: `${stats.days}d`, icon: 'calendar_today' },
        { label: 'Events', value: stats.events, icon: 'explore' },
        { label: 'Budget', value: stats.spentKrw > 0 ? `₩${(stats.spentKrw / 10000).toFixed(1)}M` : '-', icon: 'payments' },
        { label: 'Trips', value: stats.visitCount, icon: 'luggage' },
    ];

    return (
        <div className={`grid ${compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 md:grid-cols-4'} gap-4`}>
            {items.map((item) => (
                <div key={item.label} className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className="material-symbols-rounded text-[14px] text-slate-400">{item.icon}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                    </div>
                    <div className={`${compact ? 'text-sm' : 'text-lg'} font-black text-slate-800 dark:text-slate-100`}>
                        {item.value}
                    </div>
                </div>
            ))}
            
            {!compact && (stats.airports?.length > 0 || stats.accommodations?.length > 0) && (
                <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 py-4 border-t border-slate-200 dark:border-slate-800">
                    <div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <span className="material-symbols-rounded text-[14px]">flight_land</span>
                            Airports
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {stats.airports.map((p: string, i: number) => (
                                <span key={i} className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                                    {p}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <span className="material-symbols-rounded text-[14px]">hotel</span>
                            Accommodations
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {stats.accommodations.map((a: string, i: number) => (
                                <span key={i} className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
                                    {a}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
