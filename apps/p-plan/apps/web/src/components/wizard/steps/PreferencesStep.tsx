import React from 'react';
import { motion } from 'framer-motion';
import { useWizardStore, cn } from '@pplaner/shared';

const THEMES = [
    { id: '휴양', label: '휴양/힐링', desc: '여유로운 호캉스와 스파', icon: 'spa' },
    { id: '관광', label: '도시 관광', desc: '랜드마크와 맛집 투어', icon: 'location_city' },
    { id: '자연', label: '대자연/풍경', desc: '광활한 자연과 함께하는 쉼', icon: 'landscape' },
    { id: '액티비티', label: '액티비티', desc: '스릴 넘치는 모험과 스포츠', icon: 'hiking' },
    { id: '미식', label: '미식 탐험', desc: '로컬 맛집과 파인 다이닝', icon: 'restaurant' },
    { id: '쇼핑', label: '쇼핑 여행', desc: '트렌디한 샵과 백화점', icon: 'shopping_bag' },
];

const COMPANION_PRESETS = [
    {
        id: 'solo',
        label: '혼자서',
        sub: '나만의 자유 여행',
        icon: 'person',
        config: [{ type: '나', count: 1 }, { type: '파트너', count: 0 }, { type: '가족', count: 0 }, { type: '친구', count: 0 }]
    },
    {
        id: 'couple',
        label: '파트너/커플',
        sub: '연인 또는 부부 2인',
        icon: 'favorite',
        config: [{ type: '나', count: 1 }, { type: '파트너', count: 1 }, { type: '가족', count: 0 }, { type: '친구', count: 0 }]
    },
    {
        id: 'friends',
        label: '친구들과',
        sub: '우정 가득한 여행',
        icon: 'groups',
        config: [{ type: '나', count: 1 }, { type: '파트너', count: 0 }, { type: '가족', count: 0 }, { type: '친구', count: 2 }]
    },
    {
        id: 'family',
        label: '가족과 함께',
        sub: '온 가족이 다 함께',
        icon: 'family_restroom',
        config: [{ type: '나', count: 1 }, { type: '파트너', count: 0 }, { type: '가족', count: 2 }, { type: '친구', count: 0 }]
    },
];

export default function PreferencesStep() {
    const { 
        theme, setTheme, participants, updateParticipant,
        isParticipantsUndecided, setParticipantsUndecided
    } = useWizardStore();

    const getCount = (type: string) => participants.find(p => p.type === type)?.count || 0;

    const totalCount = isParticipantsUndecided
        ? 0
        : participants.reduce((acc, p) => acc + p.count, 0);

    const applyPreset = (preset: typeof COMPANION_PRESETS[0]) => {
        if (isParticipantsUndecided) setParticipantsUndecided(false);
        preset.config.forEach(item => {
            updateParticipant(item.type, item.count);
        });
    };

    const isPresetActive = (preset: typeof COMPANION_PRESETS[0]) => {
        if (isParticipantsUndecided) return false;
        return preset.config.every(item => getCount(item.type) === item.count);
    };

    return (
        <div className="space-y-10">
            {/* Section 1: Themes */}
            <section className="space-y-6">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-primary rounded-full" />
                        어떤 컨셉의 여행인가요?
                    </h3>
                    <p className="text-xs font-semibold text-slate-400 mt-1 pl-4 uppercase tracking-[0.2em]">여행 테마 및 분위기</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                    {THEMES.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={cn(
                                "relative group p-4 sm:p-5 rounded-2xl border-2 transition-all duration-300 text-center flex flex-col items-center justify-center gap-2",
                                theme === t.id
                                    ? "border-primary bg-primary/5 dark:bg-primary/20 shadow-xl shadow-primary/10 scale-[1.02]"
                                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-primary/40 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-none"
                            )}
                            aria-label={`테마 선택: ${t.label}`}
                            aria-pressed={theme === t.id}
                        >
                            <div className={cn(
                                "w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-500",
                                theme === t.id ? "bg-primary text-white scale-110 shadow-lg shadow-primary/30" : "bg-slate-50 dark:bg-slate-800 text-primary/70 group-hover:scale-105"
                            )}>
                                <span className="material-symbols-rounded text-2xl" aria-hidden="true">{t.icon}</span>
                            </div>
                            <div className="text-center mt-1">
                                <p className={cn("text-xs font-bold mb-0.5", theme === t.id ? "text-primary dark:text-primary-light" : "text-slate-900 dark:text-white")}>{t.label}</p>
                                <p className={cn("text-[11px] font-medium leading-tight", theme === t.id ? "text-primary/70" : "text-slate-400")}>{t.desc}</p>
                            </div>
                            {theme === t.id && (
                                <motion.div layoutId="active-theme-indicator" className="absolute top-3 right-3 w-2 h-2 bg-primary rounded-full shadow-sm" />
                            )}
                        </button>
                    ))}
                </div>
            </section>

            <div className="max-w-3xl mx-auto space-y-6">
                {/* Section 2: Participants */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-primary rounded-full" />
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    누구와 함께 떠나시나요?
                                    {!isParticipantsUndecided && totalCount > 0 && (
                                        <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                            총 {totalCount}명
                                        </span>
                                    )}
                                </h3>
                                <p className="text-xs font-semibold text-slate-400 mt-0.5 uppercase tracking-[0.2em]">동행 유형 및 인원수</p>
                            </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <span className="text-xs font-semibold text-slate-400 group-hover:text-primary transition-colors">인원 미정</span>
                            <input
                                type="checkbox"
                                checked={isParticipantsUndecided}
                                onChange={(e) => setParticipantsUndecided(e.target.checked)}
                                className="w-4 h-4 rounded-md accent-primary transition-all cursor-pointer"
                                aria-label="인원 미정 선택"
                            />
                        </label>
                    </div>

                    {/* Quick Companion Presets */}
                    <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3 transition-all", isParticipantsUndecided && "opacity-30 grayscale pointer-events-none")}>
                        {COMPANION_PRESETS.map((preset) => {
                            const active = isPresetActive(preset);
                            return (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => applyPreset(preset)}
                                    className={cn(
                                        "p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center gap-1.5",
                                        active
                                            ? "border-primary bg-primary/10 text-primary shadow-md shadow-primary/10 scale-[1.02]"
                                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    )}
                                >
                                    <span className={cn("material-symbols-rounded text-2xl", active ? "text-primary" : "text-slate-400")}>
                                        {preset.icon}
                                    </span>
                                    <span className="text-xs font-bold">{preset.label}</span>
                                    <span className={cn("text-[10px] font-medium", active ? "text-primary/70" : "text-slate-400")}>{preset.sub}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Detailed Count Adjusters */}
                    <div className={cn("space-y-3 transition-all", isParticipantsUndecided && "opacity-30 grayscale pointer-events-none")}>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest pl-1">세부 인원수 조정</p>
                        {[
                            { label: '나', sub: '본인 (필수)', icon: 'person', max: 1, limitLabel: '1' },
                            { label: '파트너', sub: '연인 또는 배우자', icon: 'favorite', max: 5, limitLabel: '5' },
                            { label: '가족', sub: '부모, 자녀, 일가친척', icon: 'family_restroom', max: 10, limitLabel: '10+' },
                            { label: '친구', sub: '친구, 지인 및 동료', icon: 'groups', max: 10, limitLabel: '10+' },
                        ].map(cat => (
                            <div key={cat.label} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 group/item hover:border-primary/30 transition-all shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                            getCount(cat.label) > 0
                                                ? "bg-primary text-white"
                                                : "bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover/item:text-primary"
                                        )}>
                                            <span className="material-symbols-rounded text-xl">{cat.icon}</span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-900 dark:text-white">{cat.label}</p>
                                            <p className="text-[11px] font-medium text-slate-400">{cat.sub}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const currentCount = getCount(cat.label);
                                                const min = cat.label === '나' ? 1 : 0;
                                                if (currentCount > min) updateParticipant(cat.label, currentCount - 1);
                                            }}
                                            disabled={cat.label === '나' && getCount(cat.label) <= 1}
                                            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <span className="material-symbols-rounded text-lg">remove</span>
                                        </button>
                                        <div className="min-w-[2.5rem] text-center">
                                            <span className={cn("font-bold text-sm", getCount(cat.label) > 0 ? "text-primary" : "text-slate-300")}>
                                                {getCount(cat.label)}명
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const currentCount = getCount(cat.label);
                                                if (currentCount < cat.max) updateParticipant(cat.label, currentCount + 1);
                                            }}
                                            disabled={getCount(cat.label) >= cat.max}
                                            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
