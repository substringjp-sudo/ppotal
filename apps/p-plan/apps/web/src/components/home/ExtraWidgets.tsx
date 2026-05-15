'use client';
import { motion } from 'framer-motion';

import { TripDocument, TripSummary } from '@pplaner/shared';

const TIPS = [
    { title: '짐 싸기 팁', content: '여권 사본을 이메일이나 클라우드에 보관해두면 분실 시 큰 도움이 됩니다.', icon: 'luggage', tags: ['common'] },
    { title: '로밍 안내', content: '현지 유심이나 eSIM을 미리 준비하면 공항에서 줄 서는 시간을 아낄 수 있어요.', icon: 'sim_card', tags: ['common'] },
    { title: '예산 관리', content: '현지 통화 환전은 시내 은행보다 환전 앱을 통한 예약 환전이 더 저렴합니다.', icon: 'payments', tags: ['common'] },
    { title: '안전 여행', content: '방문 국가의 긴급 연락처와 대사관 위치를 구글 맵에 미리 저장해두세요.', icon: 'verified_user', tags: ['common'] },
    { title: '일본 여행 팁', content: '일본은 동전 사용이 많으니 동전 지갑을 챙기시면 훨씬 편해요.', icon: 'currency_yen', tags: ['JP'] },
    { title: '일본 교통', content: '교통카드는 아이폰 지갑 앱(Suica/Pasmo)에 등록해서 쓰면 정말 편합니다.', icon: 'train', tags: ['JP'] },
    { title: '중국 결제', content: '중국은 현금보다 알리페이나 위챗페이가 필수입니다. 미리 카드를 등록하세요.', icon: 'qr_code_2', tags: ['CN'] }
];

export function TravelTipWidget({ itemVariants, nextTrip }: { itemVariants: any, nextTrip?: TripSummary | TripDocument | null }) {
    // Determine the most relevant tip
    const countryCode = nextTrip?.locations?.regions?.find(r => r.type === 'country')?.countryId;
    const contextualTips = countryCode ? TIPS.filter(t => t.tags.includes(countryCode) || t.tags.includes('common')) : TIPS;
    const randomTip = contextualTips[Math.floor(Math.random() * contextualTips.length)];

    return (
        <motion.div variants={itemVariants} className="p-3.5 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 relative overflow-hidden group flex flex-col justify-between h-full flex-1 min-h-[140px]">
             <div className="absolute -top-2 -right-2 p-3 text-indigo-400/10 dark:text-indigo-600/10 transition-transform group-hover:scale-110 duration-500">
                <span className="material-symbols-rounded text-6xl">{randomTip.icon}</span>
            </div>
            <div className="relative z-10">
                <h3 className="text-[9px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-widest mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-rounded text-sm">lightbulb</span>
                    {countryCode === 'JP' ? '일본 여행 꿀팁' : countryCode === 'CN' ? '중국 여행 꿀팁' : '오늘의 여행 팁'}
                </h3>
                <h4 className="text-xs font-black text-slate-900 dark:text-white mb-1.5">{randomTip.title}</h4>
                <p className="text-[10px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed pr-8">
                    {randomTip.content}
                </p>
            </div>
            <div className="mt-3 flex justify-end">
                <span className="text-[8px] font-black uppercase text-indigo-300 dark:text-indigo-700 tracking-tighter">Pro Tip • Intelligence</span>
            </div>
        </motion.div>
    );
}

export function TravelStatsWidget({ itemVariants, stats }: { itemVariants: any, stats?: any }) {
    const level = stats?.level || 1;
    const title = stats?.title || '초보 여행자';
    const totalKm = stats?.breakdown?.totalKm || 0;
    const countries = stats?.breakdown?.countriesCount || 0;
    const cities = stats?.breakdown?.citiesCount || 0;

    return (
        <motion.div variants={itemVariants} className="p-3.5 bg-amber-50/50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/50 relative overflow-hidden group flex flex-col justify-between h-full flex-1">
            <div className="absolute -top-2 -right-2 p-3 text-amber-200/40 dark:text-amber-800/20 transition-transform group-hover:rotate-12 duration-500">
                <span className="material-symbols-rounded text-5xl">travel_explore</span>
            </div>
            <div className="relative z-10">
                <h3 className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-widest mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-rounded text-sm">leaderboard</span>
                    나의 여행 마스터리
                </h3>
                <p className="text-xs font-black text-slate-900 dark:text-white mb-1.5 italic">
                    <span className="text-amber-600 dark:text-amber-400 mr-1">{title}</span>
                    LV.{level}
                </p>
                <div className="flex items-end gap-1 mb-3">
                    <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{countries}</span>
                    <span className="text-[8px] font-black text-slate-500 mb-1 uppercase">Countries</span>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 relative z-10">
                <div className="bg-white/50 dark:bg-white/5 p-2 rounded-xl backdrop-blur-sm border border-white/50 dark:border-white/10">
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Cities</p>
                    <p className="text-[11px] font-black text-slate-800 dark:text-slate-200">{cities}</p>
                </div>
                <div className="bg-white/50 dark:bg-white/5 p-2 rounded-xl backdrop-blur-sm border border-white/50 dark:border-white/10">
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Mileage</p>
                    <p className="text-[11px] font-black text-slate-800 dark:text-slate-200">
                        {Math.round(totalKm).toLocaleString()}km
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
