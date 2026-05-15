'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { CORE_AIRLINES, Airline } from '@pplaner/shared';
import { cn } from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { useAviation } from '../../hooks/useAviation';

interface AirlineSearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    inputClassName?: string;
    label?: string;
    align?: 'left' | 'right';
}

export function AirlineSearchInput({ value, onChange, placeholder, className, inputClassName, label, align = 'left' }: AirlineSearchInputProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [displayResults, setDisplayResults] = useState<Airline[]>([]);
    const { loading, searchAirlines } = useAviation();
    const containerRef = useRef<HTMLDivElement>(null);

    // Helper to get display name from code
    const getDisplayValue = (val: string) => {
        const airline = CORE_AIRLINES.find(a => a.code === val);
        return airline ? `${airline.nameKo} (${airline.code})` : val;
    };

    // Sync local search term with external value
    useEffect(() => {
        setSearchTerm(getDisplayValue(value));
    }, [value]);

    useEffect(() => {
        const updateResults = async () => {
            if (!searchTerm || searchTerm.length < 1) {
                setDisplayResults([]);
                return;
            }

            // If it's a full display name with parentheses, and we're not focused/editing, we might skip
            // but for simplicity, let's just use the core search logic
            const query = searchTerm.includes('(') ? searchTerm.split('(')[0].trim() : searchTerm;
            if (query.length < 1) return;

            const results = await searchAirlines(query);
            setDisplayResults(results);
        };

        const timer = setTimeout(updateResults, 150);
        return () => clearTimeout(timer);
    }, [searchTerm, searchAirlines]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (airline: Airline) => {
        onChange(airline.code);
        setSearchTerm(`${airline.nameKo} (${airline.code})`);
        setIsOpen(false);
    };

    return (
        <div className={cn("space-y-1.5 relative", className)} ref={containerRef}>
            {label && <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{label}</label>}
            <div className="relative">
                <input
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        onChange(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className={cn(
                        "w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-primary/30 rounded-2xl outline-none font-bold text-sm transition-all",
                        inputClassName
                    )}
                />
                <AnimatePresence>
                    {isOpen && (displayResults.length > 0 || loading) && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={cn(
                                "absolute z-50 w-full min-w-[300px] sm:min-w-[400px] mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden",
                                align === 'left' ? 'left-0' : 'right-0'
                            )}
                        >
                            <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                                {loading && displayResults.length === 0 && (
                                    <div className="px-5 py-8 flex flex-col items-center justify-center text-slate-400 gap-3">
                                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">글로벌 항공사 데이터 검색 중...</span>
                                    </div>
                                )}
                                {displayResults.map((airline) => (
                                    <button
                                        key={airline.code}
                                        onClick={() => handleSelect(airline)}
                                        className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left border-b border-slate-200/60 dark:border-slate-800 last:border-0"
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                                                    {airline.nameKo}
                                                </span>
                                                <span className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-900/40 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400">
                                                    {airline.code}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 leading-tight">
                                                {airline.nameEn}
                                            </span>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-1 shrink-0 ml-4">
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest whitespace-nowrap">
                                                {airline.countryKo}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
