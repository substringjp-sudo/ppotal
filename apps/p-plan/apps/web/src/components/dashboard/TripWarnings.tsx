'use client';
import { useTripStore } from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export default function TripWarnings() {
    const currentTrip = useTripStore((state) => state.currentTrip);
    const [isExpanded, setIsExpanded] = useState(false);

    if (!currentTrip || !currentTrip.warnings || currentTrip.warnings.length === 0) return null;

    const warnings = currentTrip.warnings;
    const criticalCount = warnings.filter(w => w.severity === 'critical').length;
    const warningCount = warnings.filter(w => w.severity === 'warning').length;
    const infoCount = warnings.filter(w => w.severity === 'info').length;

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'critical': return 'error';
            case 'warning': return 'warning';
            case 'info': return 'info';
            default: return 'help';
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'text-red-500 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30';
            case 'warning': return 'text-amber-500 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30';
            case 'info': return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30';
            default: return 'text-slate-500 bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-900/30';
        }
    };

    return (
        <div className="w-full">
            <motion.div 
                layout
                className={`overflow-hidden transition-all duration-300 ${
                    isExpanded 
                        ? 'bg-primary/[0.02] dark:bg-primary/[0.04]' 
                        : ''
                }`}
            >
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    aria-expanded={isExpanded}
                    aria-controls="warning-list"
                    className="w-full px-5 py-4 flex items-center justify-between text-left"
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl flex items-center justify-center ${
                            criticalCount > 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 
                            warningCount > 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        }`} aria-hidden="true">
                            <span className="material-symbols-rounded text-xl">
                                {criticalCount > 0 ? 'gpp_maybe' : warningCount > 0 ? 'warning' : 'info'}
                            </span>
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                                한번 더 확인해보세요
                                <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full" aria-label={`총 ${warnings.length}개`}>{warnings.length}</span>
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                {criticalCount > 0 && (
                                    <span className="text-[10px] font-black bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded uppercase tracking-wider">꼭 확인 {criticalCount}</span>
                                )}
                                {warningCount > 0 && (
                                    <span className="text-[10px] font-black bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded uppercase tracking-wider">확인 필요 {warningCount}</span>
                                )}
                                {infoCount > 0 && (
                                    <span className="text-[10px] font-black bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-wider">참고 {infoCount}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <span className={`material-symbols-rounded transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true">
                        expand_more
                    </span>
                </button>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div id="warning-list" className="px-5 pb-5 pt-0 space-y-3">
                                <div className="h-px bg-slate-100 dark:bg-slate-800 mb-4" />
                                {warnings.sort((a, b) => {
                                    const severityMap = { critical: 0, warning: 1, info: 2 };
                                    return severityMap[a.severity as keyof typeof severityMap] - severityMap[b.severity as keyof typeof severityMap];
                                }).map((warning) => (
                                    <div 
                                        key={warning.id}
                                        className={`flex flex-col rounded-xl border transition-all duration-200 hover:scale-[1.01] shadow-sm overflow-hidden ${getSeverityColor(warning.severity)}`}
                                    >
                                        <div className="flex items-start gap-3 p-4">
                                            <div className="mt-1 shrink-0" aria-hidden="true">
                                                <span className="material-symbols-rounded text-xl">
                                                    {getSeverityIcon(warning.severity)}
                                                </span>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold leading-relaxed tracking-tight">
                                                    {warning.message}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                                    {warning.sourceType && (
                                                        <span className="text-[9px] font-black bg-white/40 dark:bg-black/20 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                                                            <span className="material-symbols-rounded text-[10px]" aria-hidden="true">
                                                                {warning.sourceType === 'flight' ? 'flight' : 
                                                                warning.sourceType === 'accommodation' ? 'hotel' : 
                                                                warning.sourceType === 'budget' ? 'payments' : 'event'}
                                                            </span>
                                                            {warning.sourceType === 'flight' ? '항공' : 
                                                            warning.sourceType === 'accommodation' ? '숙소' : 
                                                            warning.sourceType === 'budget' ? '예산' : 
                                                            warning.sourceType === 'event' ? '일정' : warning.sourceType}
                                                        </span>
                                                    )}
                                                    {warning.type && (
                                                        <span className="text-[9px] font-bold opacity-60 italic">
                                                            #{warning.type}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {warning.suggestion && (
                                            <div className="px-4 py-3 bg-white/30 dark:bg-black/10 border-t border-white/20 dark:border-black/5 flex items-start gap-2">
                                                <span className="material-symbols-rounded text-sm mt-0.5 text-primary/60" aria-hidden="true">lightbulb</span>
                                                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 leading-normal">
                                                    <span className="text-[9px] uppercase tracking-widest text-primary/80 mr-1.5 opacity-60">이렇게 해보세요 →</span>
                                                    {warning.suggestion}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                                    <span className="material-symbols-rounded text-slate-400 text-sm" aria-hidden="true">lightbulb</span>
                                    <p className="text-[11px] font-medium text-slate-500">
                                        기록하신 내용을 검토한 항목이에요. 여행 전에 직접 한 번 더 확인해보시길 권장해요.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
