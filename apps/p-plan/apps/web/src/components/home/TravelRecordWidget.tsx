'use client';
import { motion } from 'framer-motion';
import { Travelog, TravelStats } from '@pplaner/shared';
import { cn } from '@pplaner/shared';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';

interface TravelRecordWidgetProps {
    travelogs: Travelog[];
    stats?: TravelStats;
    itemVariants: any;
}

export default function TravelRecordWidget({ travelogs, stats, itemVariants }: TravelRecordWidgetProps) {
    const publishedCount = travelogs.filter(l => l.status === 'published').length;
    const latestLog = travelogs[0];

    return (
        <motion.div
            variants={itemVariants}
            className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden group"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500">
                        <span className="material-symbols-rounded text-base">auto_stories</span>
                    </div>
                    <div>
                        <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight italic">Travel Journals</h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{travelogs.length} Memories</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 dark:bg-slate-800 rounded-full">
                    <span className="w-1 h-1 bg-emerald-500 rounded-full" />
                    <span className="text-[8px] font-black text-slate-500">{publishedCount} Published</span>
                </div>
            </div>

            {latestLog ? (
                <Link href={`/travelogs/${latestLog.tripId || latestLog.id}/edit`} className="flex-1 flex flex-col gap-3">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 group/img">
                        {latestLog.coverImageUrl ? (
                            <img src={latestLog.coverImageUrl} alt={latestLog.title} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-200">
                                <span className="material-symbols-rounded text-4xl">image</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-2.5 left-2.5 right-2.5">
                            <h4 className="text-xs font-black text-white line-clamp-1">{latestLog.title}</h4>
                            <p className="text-[9px] text-white/70 font-bold mt-0.5">
                                {format(parseISO(latestLog.createdAt), 'MMM dd, yyyy')}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-[9px] font-black uppercase text-slate-400">
                            <span>Overall Mastery</span>
                            <span className="text-primary italic">{Math.round(stats?.breakdown?.averageProgress || 0)}% Mastery</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${stats?.breakdown?.averageProgress || 0}%` }}
                                className="h-full bg-primary"
                            />
                        </div>
                    </div>
                </Link>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                    <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-200 mb-3">
                        <span className="material-symbols-rounded text-2xl">edit_note</span>
                    </div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white mb-1 italic">No records found</h4>
                    <p className="text-[10px] text-slate-400 font-bold max-w-[160px]">
                        Start journaling your recent trips to keep the memories alive.
                    </p>
                </div>
            )}

            <button className="mt-4 w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all">
                View All Journals
            </button>
        </motion.div>
    );
}
