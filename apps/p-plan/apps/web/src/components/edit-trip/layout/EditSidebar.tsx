'use client';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Trip, TripWarning } from '@pplaner/shared';
import { format } from 'date-fns';
import { cn, formatTripDuration } from '@pplaner/shared';
import { SECTIONS, SectionId } from '@pplaner/shared';
import { TRANSITION_SPRING, ANIMATION_EASE } from '@/lib/animations';

interface EditSidebarProps {
  tripId: string;
  currentTrip: Trip;
  warnings: TripWarning[];
  activeSection: SectionId;
  setActiveSection: (id: SectionId) => void;
  isAnalysisOpen: boolean;
  setIsAnalysisOpen: (open: boolean) => void;
  isSaving: boolean;
  onSaveEntireTrip: () => void;
  showSuccess: boolean;
  sectionWarnings: Record<string, { critical: number; warning: number; info: number }>;
}

export default function EditSidebar({
  tripId,
  currentTrip,
  warnings,
  activeSection,
  setActiveSection,
  isAnalysisOpen,
  setIsAnalysisOpen,
  isSaving,
  onSaveEntireTrip,
  showSuccess,
  sectionWarnings
}: EditSidebarProps) {
  return (
    <motion.aside
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={TRANSITION_SPRING}
        className="hidden sm:flex w-[168px] lg:w-[185px] xl:w-[195px] h-full z-40 shrink-0 flex-col"
    >
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-slate-200 dark:border-slate-800 rounded-[32px] shadow-2xl overflow-hidden flex flex-col h-full border-primary/10">
            
            <div className="p-2.5 lg:p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <div className="flex items-center gap-2 mb-1.5">
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Link 
                          href={`/dashboard/${tripId}`}
                          className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-800 hover:bg-primary hover:text-white rounded-lg transition-all shadow-sm border border-slate-200 dark:border-slate-700 shrink-0 group/back"
                      >
                          <span className="material-symbols-rounded text-base text-slate-500 group-hover:text-white transition-colors">arrow_back</span>
                      </Link>
                    </motion.div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xs font-black text-slate-900 dark:text-white truncate tracking-tight leading-tight italic sm:block hidden">
                            {currentTrip.title}
                        </h1>
                        <div className="sm:flex hidden items-center gap-1 mt-0.5">
                            <span className="material-symbols-rounded text-[10px] text-slate-400">calendar_month</span>
                            <div className="flex flex-col">
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter leading-none">
                                    {currentTrip.dates?.startDate 
                                        ? `${format(new Date(currentTrip.dates.startDate), 'MMM dd')} - ${currentTrip.dates?.endDate ? format(new Date(currentTrip.dates.endDate), 'MMM dd') : '??'}`
                                        : formatTripDuration(undefined, undefined, currentTrip.dates?.durationDays)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Warnings section removed */}
            </div>

            <nav className="p-1 px-1.5 overflow-y-auto no-scrollbar flex flex-col gap-0.5 custom-scrollbar">
                {SECTIONS.map((section) => {
                    const holds = sectionWarnings[section.id as SectionId] || { critical:0, warning:0, info:0 };
                    const isActive = activeSection === section.id;
                    
                    return (
                        <motion.button
                            key={section.id}
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                                setActiveSection(section.id as SectionId);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={cn(
                                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all group shrink-0 relative",
                                isActive 
                                    ? "text-white z-10" 
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            )}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeEditSection"
                                    className="absolute inset-0 bg-primary shadow-lg shadow-primary/20 rounded-lg -z-10"
                                    transition={TRANSITION_SPRING}
                                />
                            )}
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "w-5 h-5 rounded-md flex items-center justify-center transition-all",
                                    isActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700"
                                )}>
                                    <span className={cn(
                                        "material-symbols-rounded text-[14px]",
                                        isActive ? "text-white" : "text-slate-400 group-hover:text-primary transition-colors"
                                    )}>
                                        {section.icon}
                                    </span>
                                </div>
                                <span className={cn(
                                        "text-[10.5px] font-bold tracking-tight sm:block hidden",
                                    isActive ? "text-white" : "text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white"
                                )}>
                                    {section.label}
                                </span>
                            </div>
                            
                            {/* Indicators removed */}
                        </motion.button>
                    );
                })}
            </nav>

            <div className="mt-0.5 p-2 px-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20">
                <button
                    onClick={onSaveEntireTrip}
                    disabled={isSaving}
                    className={cn(
                        "w-full py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-lg hover:translate-y-[-1px] active:translate-y-[0px]",
                        isSaving 
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                            : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-slate-200 dark:shadow-none"
                    )}
                >
                    <span className={cn("material-symbols-rounded text-[16px]", isSaving && "animate-spin")}>
                        {isSaving ? 'sync' : 'publish'}
                    </span>
                    {isSaving ? '저장 중...' : '기록 저장하기'}
                </button>
                {showSuccess && (
                    <motion.p
                        initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                        className="text-center text-[8px] font-black text-emerald-500 uppercase mt-2 tracking-widest"
                    >
                        노트에 저장했어요 ✓
                    </motion.p>
                )}
            </div>
        </div>
    </motion.aside>
  );
}
