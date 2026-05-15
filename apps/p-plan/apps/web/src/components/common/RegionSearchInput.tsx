'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@pplaner/shared';
import { SearchResult, searchRegions } from '@pplaner/shared';
import { Search, X, MapPin, Globe, Landmark } from 'lucide-react';


interface RegionSearchInputProps {
    value: string;
    onChange: (value: string, details?: SearchResult) => void;
    placeholder?: string;
    label?: string;
    typeFilter?: 'country' | 'region';
    className?: string;
}

export function RegionSearchInput({ 
    value, 
    onChange, 
    placeholder = '검색어를 입력하세요', 
    label, 
    typeFilter,
    className 
}: RegionSearchInputProps) {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    // 사용자가 직접 타이핑했을 때만 드롭다운을 열기 위한 플래그
    const [isDirty, setIsDirty] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    // No local data loading needed


    // 외부 value가 변경되면 query를 동기화 (드롭다운은 열지 않음)
    useEffect(() => {
        setQuery(value);
        setIsDirty(false);
    }, [value]);

    useEffect(() => {
        // isDirty가 true일 때(사용자가 직접 입력한 경우)만 드롭다운 제어
        if (!isDirty) return;
        
        let active = true;
        if (query.length > 0) {
            setIsSearching(true);
            const debounceTimer = setTimeout(async () => {
                const searchResults = await searchRegions(query);
                if (active) {
                    setResults(searchResults);
                    setIsOpen(true);
                    setIsSearching(false);
                }
            }, 300);
            return () => { 
                active = false; 
                clearTimeout(debounceTimer); 
            };
        } else {
            setResults([]);
            setIsOpen(false);
        }
    }, [query, isDirty]);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (result: SearchResult) => {
        setQuery(result.name);
        onChange(result.name, result);
        setIsOpen(false);
    };

    const clearSelection = () => {
        setQuery('');
        onChange('');
        setResults([]);
    };

    return (
        <div className={cn("space-y-1.5 relative", className)} ref={containerRef}>
            {label && <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{label}</label>}
            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-primary text-slate-400">
                    <Search className="w-4 h-4" />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => { setIsDirty(true); setQuery(e.target.value); }}
                    onFocus={() => query.length > 0 && setIsOpen(true)}
                    placeholder={placeholder}
                    className={cn(
                        "w-full pl-11 pr-11 py-3 text-sm font-bold bg-slate-100 dark:bg-slate-800 rounded-2xl border border-transparent transition-all outline-none",
                        "focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary/20 shadow-sm"
                    )}
                />
                {query && (
                    <button 
                        onClick={clearSelection}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            <AnimatePresence>
                {isOpen && results.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        className="absolute z-[110] top-[calc(100%+8px)] left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden"
                    >
                        <div className="max-h-64 overflow-y-auto p-2 custom-scrollbar">
                            {results.map((result) => (
                                <button
                                    key={`${result.type}-${result.id}`}
                                    onClick={() => handleSelect(result)}
                                    className="w-full flex items-start gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all text-left group"
                                >
                                    <div className={cn(
                                        "w-8 h-8 shrink-0 rounded-lg flex items-center justify-center transition-colors",
                                        result.type === 'country' ? "bg-blue-500/10 text-blue-500" :
                                        result.type === 'prefecture' ? "bg-purple-500/10 text-purple-500" :
                                        "bg-emerald-500/10 text-emerald-500"
                                    )}>
                                        {result.type === 'country' ? <Globe className="w-4 h-4" /> :
                                         result.type === 'prefecture' ? <Landmark className="w-4 h-4" /> :
                                         <MapPin className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold truncate text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                                {result.name}
                                            </span>
                                            <span className={cn(
                                                "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                                                result.type === 'country' ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" :
                                                result.type === 'prefecture' ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" :
                                                "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                                            )}>
                                                {result.type === 'country' ? '국가' : result.type === 'prefecture' ? '주/도' : '도시'}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold truncate mt-0.5">{result.fullName}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
