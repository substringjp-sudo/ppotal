'use client';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@pplaner/shared';
import { TripActivity } from '@pplaner/shared';

interface RecentActivityFeedProps {
  activities: TripActivity[];
  itemVariants: any;
}

export default function RecentActivityFeed({ activities, itemVariants }: RecentActivityFeedProps) {
  return (
    <motion.div variants={itemVariants} className="md:col-span-1 p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative group">
        <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black flex items-center gap-2">
                <span className="material-symbols-rounded text-primary text-lg">history</span>
                최근 활동
            </h3>
            <span className="text-[8px] font-black text-slate-400 tracking-widest uppercase">Live</span>
        </div>
        <div className="space-y-4">
            {activities.length > 0 ? (
                activities.slice(0, 3).map((act) => (
                    <div key={act.id} className="flex gap-3 items-center group/item hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 rounded-xl transition-all">
                        <div className="w-8 h-8 shrink-0 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center group-hover/item:bg-primary/20 transition-colors">
                            <span className={cn(
                                "material-symbols-rounded text-sm",
                                act.targetType === 'transport' ? 'text-indigo-500' : 
                                act.targetType === 'accommodation' ? 'text-emerald-500' : 'text-primary'
                            )}>
                                {act.targetType === 'transport' ? 'flight' : act.targetType === 'accommodation' ? 'bed' : 'auto_awesome'}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate leading-snug">{act.message}</p>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">{format(new Date(act.createdAt), 'MMM dd, HH:mm')}</p>
                        </div>
                    </div>
                ))
            ) : (
                <div className="p-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center bg-slate-50/30 dark:bg-slate-900/10">
                  <p className="text-slate-400 dark:text-slate-500 font-bold mb-4 italic text-sm">최근 활동 내역이 없습니다.</p>
                  <p className="text-[11px] text-slate-400 uppercase tracking-widest font-black">여행 계획을 수정하거나 장소를 추가해보세요!</p>
                </div>
            )}
        </div>
        <button className="w-full mt-4 py-2 text-[9px] font-black text-slate-500 hover:text-primary transition-colors border-t border-slate-200/60 dark:border-slate-800 pt-3 uppercase tracking-widest">
            모든 활동 보기
        </button>
    </motion.div>
  );
}
