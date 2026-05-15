'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { SECTIONS, SectionId } from '@pplaner/shared';
import TimelineControlBar from '@/components/edit-trip/timeline/TimelineControlBar';
import BasicInfoEditor from '@/components/edit-trip/BasicInfoEditor';
import TimelineEditor from '@/components/edit-trip/TimelineEditor';
import TransportAndTicketsEditor from '@/components/edit-trip/TransportAndTicketsEditor';
import AccommodationEditor from '@/components/edit-trip/AccommodationEditor';

import ReservationsEditor from '@/components/edit-trip/ReservationsEditor';
import { useUIStore } from '@pplaner/shared';

interface EditMainContentProps {
  activeSection: SectionId;
  setActiveSection: (id: SectionId) => void;
  onAddComment: (eventId: string) => void;
}

export default function EditMainContent({ activeSection, setActiveSection, onAddComment }: EditMainContentProps) {
  const { viewMode, setViewMode, showOnlyBooked, setShowOnlyBooked } = useUIStore();

  return (
    <motion.section 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 min-w-0 h-full w-full overflow-hidden"
    >
        <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden h-full flex flex-col relative transition-colors duration-500">
            {/* Decorative section indicator */}
            <div className="p-2.5 sm:p-3 lg:px-6 lg:py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 bg-slate-50/20 dark:bg-slate-800/10 backdrop-blur-sm">
                <div className="flex items-center justify-between sm:justify-start sm:flex-1 gap-2">
                    <h2 className="text-base lg:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2.5 italic tracking-tight">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner shrink-0">
                            <span className="material-symbols-rounded font-bold text-lg">
                                {SECTIONS.find(s => s.id === activeSection)?.icon}
                            </span>
                        </div>
                        <span className="hidden sm:inline">{SECTIONS.find(s => s.id === activeSection)?.label}</span>
                    </h2>
                    <div className="sm:hidden px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                            {String(SECTIONS.findIndex(s => s.id === activeSection) + 1).padStart(2, '0')} / {String(SECTIONS.length).padStart(2, '0')}
                        </p>
                    </div>
                </div>

                {/* Timeline Controls */}
                {activeSection === 'timeline' && (
                    <div className="w-full sm:flex-1 flex justify-start sm:justify-center">
                        <TimelineControlBar
                            viewMode={viewMode}
                            onViewModeChange={setViewMode}
                            showOnlyBooked={showOnlyBooked}
                            onShowOnlyBookedChange={setShowOnlyBooked}
                        />
                    </div>
                )}

                <div className="hidden sm:flex items-center gap-4 flex-1 justify-end">
                    <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                            {String(SECTIONS.findIndex(s => s.id === activeSection) + 1).padStart(2, '0')} / {String(SECTIONS.length).padStart(2, '0')}
                        </p>
                    </div>
                </div>
            </div>

            <div className={`relative flex-1 ${activeSection === 'timeline' ? 'overflow-hidden' : 'overflow-y-auto'} no-scrollbar custom-scrollbar`}>
                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                        key={activeSection}
                        initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                        transition={{ 
                            duration: 0.4, 
                            ease: [0.22, 1, 0.36, 1],
                            opacity: { duration: 0.15 }
                        }}
                        className={`p-0 ${activeSection === 'timeline' ? 'h-full flex flex-col' : 'px-3 sm:px-5 py-2 lg:px-8 lg:py-4'} flex-1`}
                    >
                        <div className={`mx-auto ${activeSection === 'timeline' ? 'w-full h-full' : 'max-w-[1200px] space-y-6'}`}>

                            {activeSection === 'basics' && (
                                <BasicInfoEditor />
                            )}
                            {activeSection === 'timeline' && (
                                <TimelineEditor 
                                    onNavigateToSection={(s) => setActiveSection(s as SectionId)} 
                                    onAddComment={onAddComment}
                                />
                            )}
                            {activeSection === 'transport' && <TransportAndTicketsEditor />}
                            {activeSection === 'accommodation' && <AccommodationEditor />}
                            {activeSection === 'reservations' && (
                                <ReservationsEditor 
                                    onNavigateToSection={(s) => setActiveSection(s as SectionId)} 
                                    />
                            )}
                        </div>

                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    </motion.section>
  );
}
