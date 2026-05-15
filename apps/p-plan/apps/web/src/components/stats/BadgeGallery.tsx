'use client';

import { motion } from 'framer-motion';
import { Badge } from '@pplaner/shared';
import { AchievementCategory } from '@pplaner/shared';

interface BadgeGalleryProps {
  badges: Badge[];
}

export default function BadgeGallery({ badges }: BadgeGalleryProps) {
  const categories: Partial<Record<AchievementCategory, string>> = {
    milestones: 'Mastery Tier',
    planning: 'Crossover Synergy',
    easterEggs: 'Infinite Discovery',
  };

  return (
    <section className="space-y-10">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-widest uppercase">Hall of Achievements</h2>
        <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {(Object.keys(categories) as Array<keyof typeof categories>).map((cat) => (
          <div key={cat} className="space-y-6">
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">{categories[cat]}</h3>
            
            <div className="grid grid-cols-1 gap-4">
              {badges.filter(b => b.category === cat).map((badge, i) => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={badge.isUnlocked ? { x: 5 } : {}}
                  transition={{ delay: i * 0.1 }}
                  className={`relative p-5 bg-white dark:bg-slate-900 rounded-[28px] border ${
                    badge.isUnlocked 
                      ? 'border-slate-200 dark:border-slate-800 shadow-sm' 
                      : 'border-dashed border-slate-200 dark:border-slate-800 opacity-60 grayscale'
                   } transition-all group overflow-hidden`}
                >
                  <div className="flex gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center relative shrink-0">
                        {badge.isUnlocked ? (
                            <span className="material-symbols-rounded text-3xl text-primary">{badge.icon}</span>
                        ) : (
                            <span className="material-symbols-rounded text-2xl text-slate-300 dark:text-slate-600">lock</span>
                        )}
                        {badge.isUnlocked && (
                            <div className="absolute inset-0 bg-primary/10 rounded-2xl animate-pulse -z-10" />
                        )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-900 dark:text-white truncate">{badge.title}</p>
                      <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
                        {badge.isUnlocked ? badge.description : (badge.hint || '기록을 더 쌓아서 해금하세요')}
                      </p>
                      
                      {badge.maxProgress && (
                        <div className="mt-3 space-y-1">
                          <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                            <span>Progress</span>
                            <span>{badge.progress} / {badge.maxProgress}</span>
                          </div>
                          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${((badge.progress || 0) / (badge.maxProgress || 1)) * 100}%` }}
                              className="h-full bg-primary"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
