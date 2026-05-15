'use client';

import { motion } from 'framer-motion';
import { Zap, Coffee, Clock, Sparkles, Activity, CheckCircle2 } from 'lucide-react';

interface PlanningStyleCardProps {
  style?: {
    density: 'intense' | 'balanced' | 'relaxed';
    categoryPreference: { category: string, weight: number }[];
    preparationLeadTime: number;
    styleDescription: string;
    characteristics: string[];
  };
}

const densityConfig = {
  intense: {
    label: 'Intense Plan',
    icon: Zap,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    description: '분 단위로 쪼개진 완벽한 일정을 선호합니다.'
  },
  balanced: {
    label: 'Balanced Plan',
    icon: Activity,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    description: '적절한 휴식과 관광의 균형을 유지합니다.'
  },
  relaxed: {
    label: 'Relaxed Plan',
    icon: Coffee,
    color: 'text-sky-500',
    bg: 'bg-sky-500/10',
    description: '발길 닿는 대로 움직이는 여유를 즐깁니다.'
  }
};

export default function PlanningStyleCard({ style }: PlanningStyleCardProps) {
  if (!style) {
    return (
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4">
          <Sparkles className="w-6 h-6 text-slate-300" />
        </div>
        <p className="text-sm font-bold text-slate-400">데이터가 더 필요합니다.<br/>새로운 여행 계획을 세워보세요!</p>
      </div>
    );
  }

  const config = densityConfig[style.density];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-8 h-full"
    >
      {/* Density Card */}
      <div className="flex items-center gap-6 p-6 rounded-2xl bg-slate-50/50 dark:bg-slate-800/50">
        <div className={`w-14 h-14 rounded-2xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
          <config.icon className={`w-7 h-7 ${config.color}`} />
        </div>
        <div className="space-y-1">
          <h3 className={`text-lg font-black ${config.color}`}>{config.label}</h3>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{config.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Characteristics */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Core Characteristics</h3>
          <div className="flex flex-wrap gap-2">
            {style.characteristics.map((char) => (
              <div key={char} className="px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[11px] font-black flex items-center gap-1.5 border border-indigo-100 dark:border-indigo-500/20">
                <CheckCircle2 className="w-3 h-3" />
                {char}
              </div>
            ))}
            <div className="px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-500 text-[11px] font-black flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
              <Clock className="w-3 h-3" />
              {Math.round(style.preparationLeadTime)}일 전 준비
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan Preferences</h3>
          <div className="space-y-3">
             {style.categoryPreference.slice(0, 3).map((pref) => (
               <div key={pref.category} className="flex items-center gap-3">
                 <div className="text-[11px] font-black text-slate-600 dark:text-slate-300 w-12">{pref.category}</div>
                 <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${pref.weight}%` }}
                      className="h-full bg-indigo-500"
                    />
                 </div>
                 <div className="text-[10px] font-black text-slate-400">{Math.round(pref.weight)}%</div>
               </div>
             ))}
          </div>
        </div>
      </div>

      <p className="text-xs font-bold text-slate-400 italic text-center pt-4 border-t border-slate-200/60 dark:border-slate-800">
        &ldquo;{style.styleDescription}&rdquo;
      </p>
    </motion.div>
  );
}
