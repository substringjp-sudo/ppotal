import React from 'react';
import { motion } from 'framer-motion';
import { useWizardStore, cn } from '@pplaner/shared';
import { useState } from 'react';

const THEMES = [
    { id: '휴양', label: '휴양/힐링', desc: '여유로운 호캉스와 스파', icon: 'spa' },
    { id: '관광', label: '도시 관광', desc: '랜드마크와 맛집 투어', icon: 'location_city' },
    { id: '자연', label: '대자연/풍경', desc: '광활한 자연과 함께하는 쉼', icon: 'landscape' },
    { id: '액티비티', label: '액티비티', desc: '스릴 넘치는 모험과 스포츠', icon: 'hiking' },
    { id: '미식', label: '미식 탐험', desc: '로컬 맛집과 파인 다이닝', icon: 'restaurant' },
    { id: '쇼핑', label: '쇼핑 여행', desc: '트렌디한 샵과 백화점', icon: 'shopping_bag' },
];

export default function PreferencesStep() {
    const { 
        theme, setTheme, participants, updateParticipant,
        isParticipantsUndecided, setParticipantsUndecided
    } = useWizardStore();


    const getCount = (type: string) => participants.find(p => p.type === type)?.count || 0;

    return (
        <div className="space-y-10">
            {/* Section 1: Themes */}
            <section className="space-y-6">
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-primary rounded-full" />
                        어떤 컨셉의 여행인가요?
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 mt-1 pl-4 uppercase tracking-[0.2em]">여행 테마 및 분위기</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                    {THEMES.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={cn(
                                "relative group p-6 rounded-[32px] border-2 transition-all duration-300 text-center flex flex-col items-center justify-center gap-2",
                                theme === t.id
                                    ? "border-primary bg-primary/5 dark:bg-primary/20 shadow-xl shadow-primary/10"
                                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-none"
                            )}
                            aria-label={`테마 선택: ${t.label}`}
                            aria-pressed={theme === t.id}
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                                theme === t.id ? "bg-primary text-white scale-110 shadow-lg shadow-primary/30" : "bg-slate-50 dark:bg-slate-800 text-primary/60 group-hover:scale-105"
                            )}>
                                <span className="material-symbols-rounded text-2xl" aria-hidden="true">{t.icon}</span>
                            </div>
                            <div className="text-center mt-2">
                                <p className={cn("text-[11px] font-black mb-0.5", theme === t.id ? "text-primary dark:text-primary-light" : "text-slate-900 dark:text-white")}>{t.label}</p>
                                <p className={cn("text-[8px] font-bold", theme === t.id ? "text-primary/60" : "text-slate-400")}>{t.desc}</p>
                            </div>
                            {theme === t.id && (
                                <motion.div layoutId="active-theme-indicator" className="absolute top-3 right-3 w-1.5 h-1.5 bg-primary rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
            </section>

            <div className="max-w-3xl mx-auto">
                {/* Section 2: Participants */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-rounded text-primary text-sm">groups</span>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">누구와 몇 명이?</h4>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <span className="text-[10px] font-black text-slate-400 group-hover:text-primary transition-colors">인원 미정</span>
                            <input
                                type="checkbox"
                                checked={isParticipantsUndecided}
                                onChange={(e) => setParticipantsUndecided(e.target.checked)}
                                className="w-4 h-4 rounded-md accent-primary transition-all cursor-pointer"
                                aria-label="인원 미정 선택"
                            />
                        </label>
                    </div>

                    <div className={cn("space-y-4 transition-all", isParticipantsUndecided && "opacity-30 grayscale pointer-events-none")}>
                        {[
                            { label: '나', sub: '본인 포함', icon: 'person', max: 1, limitLabel: '1' },
                            { label: '파트너', sub: '연인 또는 배우자', icon: 'favorite', max: 3, limitLabel: '3+' },
                            { label: '가족', sub: '직계 및 일가친척', icon: 'family_restroom', max: 4, limitLabel: '4+' },
                            { label: '친구', sub: '지인 및 동료', icon: 'groups', max: 5, limitLabel: '4+' },
                        ].map(cat => (
                            <div key={cat.label} className="p-5 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 space-y-4 group/item hover:border-primary/20 transition-all shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-primary group-hover/item:text-white group-hover/item:bg-primary transition-colors">
                                            <span className="material-symbols-rounded text-xl">{cat.icon}</span>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-slate-900 dark:text-white">{cat.label}</p>
                                            <p className="text-[8px] font-bold text-slate-400">{cat.sub}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const currentCount = getCount(cat.label);
                                                const min = cat.label === '나' ? 1 : 0;
                                                if (currentCount > min) updateParticipant(cat.label, currentCount - 1);
                                            }}
                                            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            <span className="material-symbols-rounded text-lg">remove</span>
                                        </button>
                                        <div className="min-w-[2rem] text-center">
                                            <span className={cn("font-black text-sm", getCount(cat.label) > 0 ? "text-primary" : "text-slate-300")}>
                                                {getCount(cat.label) >= cat.max && cat.max > 1 ? cat.limitLabel : `${getCount(cat.label)}명`}
                                            </span>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const currentCount = getCount(cat.label);
                                                if (currentCount < cat.max) updateParticipant(cat.label, currentCount + 1);
                                            }}
                                            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            <span className="material-symbols-rounded text-lg">add</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
