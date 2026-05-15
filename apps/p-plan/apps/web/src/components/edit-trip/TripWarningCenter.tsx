'use client';
import { useTripStore } from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useMemo } from 'react';
import { TripWarning, WarningSeverity, SOURCE_TO_SECTION_MAP, SectionId } from '@pplaner/shared';
import { cn } from '@pplaner/shared';

interface TripWarningCenterProps {
    activeSection: SectionId;
    onNavigateToSection: (sectionId: SectionId) => void;
}

const SEVERITY_CONFIG = {
    critical: {
        icon: AlertCircle,
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-700 dark:text-red-400',
        iconColor: 'text-red-500',
        label: '꼭 확인하세요'
    },
    warning: {
        icon: AlertTriangle,
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-800',
        text: 'text-amber-700 dark:text-amber-400',
        iconColor: 'text-amber-500',
        label: '확인해보세요'
    },
    info: {
        icon: Info,
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'text-blue-700 dark:text-blue-400',
        iconColor: 'text-blue-500',
        label: '참고하세요'
    }
};

export default function TripWarningCenter({ activeSection, onNavigateToSection }: TripWarningCenterProps) {
    const warnings = useTripStore(state => state.currentTrip?.warnings || []);
    const [isExpanded, setIsExpanded] = useState(false);

    const groupedWarnings = useMemo(() => {
        const groups: Record<WarningSeverity, TripWarning[]> = {
            critical: [],
            warning: [],
            info: []
        };
        warnings.forEach(w => groups[w.severity].push(w));
        return groups;
    }, [warnings]);

    if (warnings.length === 0) return null;

    const criticalCount = groupedWarnings.critical.length;
    const warningCount = groupedWarnings.warning.length;
    const infoCount = groupedWarnings.info.length;

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
        >
            <div className={cn(
                "rounded-2xl border shadow-lg overflow-hidden transition-all duration-300",
                isExpanded ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800" : "bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-slate-200 dark:border-slate-800"
            )}>
                {/* Summary Header */}
                <div 
                    className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-1">
                            {criticalCount > 0 && <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white ring-2 ring-white dark:ring-slate-950 shadow-lg"><AlertCircle size={16} /></div>}
                            {warningCount > 0 && <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white ring-2 ring-white dark:ring-slate-950 shadow-lg"><AlertTriangle size={16} /></div>}
                            {infoCount > 0 && <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white ring-2 ring-white dark:ring-slate-950 shadow-lg"><Info size={16} /></div>}
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white leading-none">혹시 이 부분 확인해보셨나요?</h3>
                            <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest leading-none">
                                {criticalCount > 0 && `꼭 확인 ${criticalCount} • `}
                                {warningCount > 0 && `확인 필요 ${warningCount} • `}
                                {infoCount > 0 && `참고 ${infoCount} `}
                                항목
                            </p>
                        </div>
                    </div>

                    <button className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                </div>

                {/* Detail List */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-slate-200 dark:border-slate-800 overflow-hidden"
                        >
                            <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                                {warnings.map((warning) => {
                                    const config = SEVERITY_CONFIG[warning.severity];
                                    const Icon = config.icon;
                                    const sectionId = SOURCE_TO_SECTION_MAP[warning.sourceType];

                                    return (
                                        <div 
                                            key={warning.id}
                                            className={cn(
                                                "flex items-start gap-3 p-3 rounded-xl border transition-all hover:scale-[1.01]",
                                                config.bg, config.border
                                            )}
                                        >
                                            <Icon className={cn("mt-0.5 flex-shrink-0", config.iconColor)} size={18} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className={cn("text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded", config.bg, "brightness-90")}>
                                                        {config.label}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {warning.sourceType}
                                                    </span>
                                                </div>
                                                <p className={cn("text-xs font-bold leading-relaxed", config.text)}>
                                                    {warning.message}
                                                </p>
                                            </div>
                                            {sectionId && sectionId !== activeSection && (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onNavigateToSection(sectionId);
                                                    }}
                                                    className="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-1 shadow-sm"
                                                >
                                                    이동하기
                                                    <span className="material-symbols-rounded text-xs">arrow_forward</span>
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
