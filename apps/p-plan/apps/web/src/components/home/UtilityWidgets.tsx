'use client';
import { motion } from 'framer-motion';
import { useExchangeRateStore } from '@pplaner/shared';

interface UtilityWidgetsProps {
  recommendations: { title: string; desc: string; action: string; icon: string }[];
  itemVariants: any;
}

export function CurrencyWidget({ itemVariants }: { itemVariants: any }) {
    const { rates, lastUpdated, fetchRates } = useExchangeRateStore();
    
    const commonRates = [
        { code: 'USD', name: '미국 달러', flag: '🇺🇸', symbol: '$' },
        { code: 'JPY', name: '일본 엔', flag: '🇯🇵', symbol: '¥' },
        { code: 'EUR', name: '유로', flag: '🇪🇺', symbol: '€' }
    ];

    const formatTime = (dateStr: string | null) => {
        if (!dateStr) return '업데이트 대기 중';
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} 기준`;
    };

    return (
        <motion.div variants={itemVariants} className="widget-card relative overflow-hidden group flex flex-col justify-between h-full min-h-[140px] p-5">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <span className="material-symbols-rounded text-4xl">payments</span>
            </div>
            
            <div className="relative">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">실시간 주요 환율</h4>
                    </div>
                    <button 
                        onClick={() => fetchRates()}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors group/btn"
                    >
                        <span className="material-symbols-rounded text-sm text-slate-400 group-hover/btn:rotate-180 transition-transform duration-500">refresh</span>
                    </button>
                </div>

                <div className="space-y-3">
                    {commonRates.map(curr => {
                        const rate = rates[curr.code] || 0;
                        return (
                            <div key={curr.code} className="flex items-center justify-between group/row">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-base filter saturate-[0.8] group-hover/row:saturate-100 transition-all">{curr.flag}</span>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-900 dark:text-white leading-none mb-0.5">{curr.code}</span>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{curr.name}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-slate-900 dark:text-white flex items-center justify-end gap-1">
                                        <span className="text-[10px] text-slate-400 font-bold">{curr.symbol}</span>
                                        {rate.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                    </p>
                                    <p className="text-[8px] font-bold text-slate-400">KRW 기준</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-center">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-rounded text-[10px]">schedule</span>
                    {formatTime(lastUpdated)}
                </p>
            </div>
        </motion.div>
    );
}

export function TodoWidget({ recommendations, itemVariants }: { recommendations: any[], itemVariants: any }) {
    const displayItem = recommendations?.[0] || { title: '새 여행 계획', desc: '다음은 어디로 떠나볼까요?', action: '새 여행 만들기' };

    return (
        <motion.div variants={itemVariants} className="p-3.5 bg-primary/5 rounded-2xl border border-primary/10 relative overflow-hidden group flex flex-col justify-between h-full flex-1">
            <div>
                <h3 className="text-[9px] font-black mb-2 flex items-center gap-1.5 text-primary uppercase tracking-widest">
                    <span className="material-symbols-rounded text-sm">auto_fix_high</span>
                    추천 항목
                </h3>
                <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-3 leading-relaxed italic">
                    "{displayItem.desc}"
                </p>
            </div>
            <button className="w-full py-2 bg-primary text-white text-[10px] font-black rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-1.5">
                {displayItem.action}
                <span className="material-symbols-rounded text-[12px] font-black">chevron_right</span>
            </button>
        </motion.div>
    );
}

export default function UtilityWidgets({ recommendations, itemVariants }: UtilityWidgetsProps) {
  return (
    <div className="w-full h-full flex flex-col gap-3">
        <CurrencyWidget itemVariants={itemVariants} />
        <TodoWidget recommendations={recommendations} itemVariants={itemVariants} />
    </div>
  );
}
