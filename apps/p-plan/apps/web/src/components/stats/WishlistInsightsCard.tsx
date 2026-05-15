'use client';

import { motion } from 'framer-motion';
import { 
  Sparkles, Utensils, Trees, Landmark, ShoppingBag, 
  Mountain, MapPin, Hotel, Plane, CalendarCheck, Users, Compass, Heart 
} from 'lucide-react';

interface WishlistInsightsCardProps {
  insights?: {
    preferredRegions: { id: string, name: string, count: number }[];
    placeTendency: { category: string, count: number }[];
    description: string;
  };
}

const categoryIcons: Record<string, any> = {
  '식사': Utensils,
  '미식': Utensils,
  '관광': Compass,
  '자연': Trees,
  '문화': Landmark,
  '쇼핑': ShoppingBag,
  '휴양': Mountain,
  '이동': Plane,
  '숙소': Hotel,
  '예약': CalendarCheck,
  '사람': Users,
  '기타': MapPin,
};

export default function WishlistInsightsCard({ insights }: WishlistInsightsCardProps) {
  if (!insights) {
    return (
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4">
          <Heart className="w-6 h-6 text-slate-300" />
        </div>
        <p className="text-sm font-bold text-slate-400">데이터가 더 필요합니다.<br/>위시리스트를 채워 분석을 시작해보세요!</p>
      </div>
    );
  }

  const totalTendency = insights.placeTendency.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-8"
    >
      {/* Description */}
      <div className="relative">
        <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed pl-4 border-l-4 border-pink-500/50">
          {insights.description}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Preferred Regions */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top Preferred Regions</h3>
          <div className="space-y-3">
            {insights.preferredRegions.map((region, idx) => (
              <div key={region.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-pink-500/50 w-4">0{idx + 1}</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-pink-500 transition-colors">{region.name}</span>
                </div>
                <div className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 text-[10px] font-black text-slate-500">
                  {region.count} ITEMS
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Place Tendency */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Place Tendency</h3>
          <div className="space-y-4">
            {insights.placeTendency.slice(0, 4).map((tendency) => {
              const Icon = categoryIcons[tendency.category] || MapPin;
              const percentage = (tendency.count / totalTendency) * 100;
              
              return (
                <div key={tendency.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-black">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Icon className="w-3 h-3" />
                      {tendency.category}
                    </div>
                    <span className="text-pink-500">{Math.round(percentage)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-pink-500 to-rose-400"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

