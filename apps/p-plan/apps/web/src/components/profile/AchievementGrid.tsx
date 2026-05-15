'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@pplaner/shared';
import { AchievementCategory } from '@pplaner/shared';
import { cn } from '@pplaner/shared';

interface AchievementGridProps {
  badges: Badge[];
}

const CATEGORIES: { id: AchievementCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: '전체', icon: 'apps' },
  { id: 'milestones', label: '마일스톤', icon: 'military_tech' },
  { id: 'transport', label: '교통', icon: 'flight' },
  { id: 'accommodation', label: '숙박', icon: 'bed' },
  { id: 'eventTypes', label: '테마', icon: 'category' },
  { id: 'social', label: '소셜', icon: 'groups' },
  { id: 'easterEggs', label: '히든', icon: 'rocket_launch' },
];

export default function AchievementGrid({ badges }: AchievementGridProps) {
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | 'all'>('all');

  const filteredBadges = useMemo(() => {
    if (activeCategory === 'all') {
        // Show hidden only if unlocked
        return badges.filter(b => b.category !== 'easterEggs' || b.isUnlocked);
    }
    return badges.filter(b => b.category === activeCategory);
  }, [badges, activeCategory]);

  return (
    <div className="space-y-8">
      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 border",
              activeCategory === cat.id 
                ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10"
            )}
          >
            <span className="material-symbols-rounded text-sm">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <motion.div 
        layout
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
      >
        <AnimatePresence mode="popLayout">
          {filteredBadges.map((badge) => (
            <AchievementCard key={badge.id} badge={badge} />
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function AchievementCard({ badge }: { badge: Badge }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -5 }}
      className={cn(
        "relative p-6 rounded-[32px] border transition-all overflow-hidden group aspect-square flex flex-col items-center justify-center text-center",
        badge.isUnlocked 
          ? "bg-white/5 border-white/10 hover:border-primary/50 cursor-default" 
          : "bg-black/20 border-white/5 grayscale opacity-60"
      )}
    >
      {/* Background Glow */}
      {badge.isUnlocked && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      )}

      {/* Icon/Emoji */}
      <div className="relative mb-4">
        <div className={cn(
            "w-16 h-16 rounded-3xl flex items-center justify-center text-3xl shadow-xl transition-transform group-hover:scale-110",
            badge.isUnlocked ? "bg-primary/20 text-white" : "bg-white/5 text-white/20"
        )}>
          {badge.icon}
        </div>
        {!badge.isUnlocked && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center border border-white/10">
            <span className="material-symbols-rounded text-[14px] text-white/40">lock</span>
          </div>
        )}
      </div>

      {/* Title & Desc */}
      <div className="space-y-1">
        <h3 className="text-sm font-black tracking-tight line-clamp-1">{badge.title}</h3>
        <p className="text-[10px] font-bold text-white/40 leading-snug line-clamp-2 px-2">
            {badge.isUnlocked ? badge.description : "???"}
        </p>
      </div>

      {/* Progress Bar (if applicable) */}
      {badge.isUnlocked && badge.progress > 0 && (
          <div className="absolute bottom-6 left-6 right-6 h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                className="h-full bg-primary"
              />
          </div>
      )}
    </motion.div>
  );
}
