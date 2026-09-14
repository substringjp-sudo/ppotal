'use client';

import React, { useState, useMemo } from 'react';
import { 
    useTripStore, 
    TRAVELER_STYLES, 
    TravelerStyleId, 
    evaluateTravelChemistry,
    ChemistryCheckItem,
    cn 
} from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';

export default function TravelChemistryAnalyzer() {
    const currentTrip = useTripStore((state) => state.currentTrip);
    const addChecklistItem = useTripStore((state) => state.addChecklistItem);

    const isTripSolo = (currentTrip?.participants?.length || 1) <= 1;

    // 성향 선택 상태
    const [myStyleId, setMyStyleId] = useState<TravelerStyleId>('planner');
    const [companionStyleId, setCompanionStyleId] = useState<TravelerStyleId>('explorer');
    const [isSoloMode, setIsSoloMode] = useState<boolean>(isTripSolo);
    const [addedChecklistIds, setAddedChecklistIds] = useState<Set<string>>(new Set());

    // 여행 메타데이터
    const destinationName = currentTrip?.locations?.regionNames?.[0] || currentTrip?.locations?.regions?.[0]?.name || currentTrip?.title || '여행지';
    const durationDays = currentTrip?.dates?.durationDays || 3;

    // 궁합 계산
    const chemistry = useMemo(() => {
        return evaluateTravelChemistry({
            myStyleId,
            companionStyleId: isSoloMode ? null : companionStyleId,
            isSolo: isSoloMode,
            destinationName,
            durationDays,
            theme: currentTrip?.theme
        });
    }, [myStyleId, companionStyleId, isSoloMode, destinationName, durationDays, currentTrip?.theme]);

    const handleAddToChecklist = (item: ChemistryCheckItem) => {
        addChecklistItem({
            title: item.title,
            cardId: item.cardId || 'custom',
            prepId: `chem-${item.id}`,
            priority: item.priority
        });
        setAddedChecklistIds(prev => new Set(prev).add(item.id));
    };

    if (!currentTrip) return null;

    const styleKeys = Object.keys(TRAVELER_STYLES) as TravelerStyleId[];

    return (
        <section className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden transition-colors">
            {/* Header */}
            <div className="p-5 sm:p-7 bg-slate-950 text-white relative overflow-hidden">
                <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-indigo-900/30 to-transparent pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                    <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-full flex items-center gap-1.5 shadow-sm">
                                <span className="material-symbols-rounded text-sm">groups</span>
                                <span>여행 스타일 & 동행 궁합 분석</span>
                            </span>
                            <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded-full border border-slate-700">
                                {destinationName} · {durationDays}일 여정
                            </span>
                        </div>
                        <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight break-keep">
                            {isSoloMode 
                                ? '1인 나홀로 여행 스타일 & 페이스 최적화' 
                                : '동행자와의 여행 성향 & 상호 시너지 분석'}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed break-keep">
                            {isSoloMode
                                ? '나의 여행 스타일에 맞춰 일정 밀도와 1인 여행 필수 체크포인트를 분석합니다.'
                                : '나와 동행자의 여행 스타일을 선택하면 궁합 지수와 놓치기 쉬운 필수 체크포인트를 산출합니다.'}
                        </p>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex items-center bg-slate-900 p-1 rounded-2xl border border-slate-800 shrink-0 self-start sm:self-center">
                        <button
                            type="button"
                            onClick={() => setIsSoloMode(false)}
                            className={cn(
                                "px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap",
                                !isSoloMode
                                    ? "bg-primary text-white shadow-sm"
                                    : "text-slate-400 hover:text-slate-200"
                            )}
                        >
                            <span className="material-symbols-rounded text-sm">group</span>
                            <span>동행 여행</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsSoloMode(true)}
                            className={cn(
                                "px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap",
                                isSoloMode
                                    ? "bg-primary text-white shadow-sm"
                                    : "text-slate-400 hover:text-slate-200"
                            )}
                        >
                            <span className="material-symbols-rounded text-sm">person</span>
                            <span>나홀로 여행</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Style Selector Section */}
            <div className="p-5 sm:p-7 bg-slate-50/60 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-slate-800 space-y-6">
                {/* 1. My Style */}
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="material-symbols-rounded text-primary text-sm">person</span>
                            <span>나의 여행 스타일</span>
                        </label>
                        <span className="text-xs font-semibold text-primary">
                            {TRAVELER_STYLES[myStyleId].titleKo} ({TRAVELER_STYLES[myStyleId].subtitleKo})
                        </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        {styleKeys.map((key) => {
                            const style = TRAVELER_STYLES[key];
                            const isSelected = myStyleId === key;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setMyStyleId(key)}
                                    className={cn(
                                        "p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex flex-col justify-between group relative overflow-hidden",
                                        isSelected
                                            ? "bg-white dark:bg-slate-900 border-primary shadow-md ring-2 ring-primary/20"
                                            : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-1 mb-2">
                                        <div 
                                            className="w-7 h-7 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                                            style={{ backgroundColor: style.color }}
                                        >
                                            <span className="material-symbols-rounded text-sm">{style.icon}</span>
                                        </div>
                                        {isSelected && (
                                            <span className="material-symbols-rounded text-primary text-base">check_circle</span>
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                            {style.titleKo}
                                        </div>
                                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                            {style.subtitleKo}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 2. Companion Style (if not solo) */}
                {!isSoloMode && (
                    <div className="space-y-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="material-symbols-rounded text-indigo-500 text-sm">favorite</span>
                                <span>동행자의 여행 스타일</span>
                            </label>
                            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                {TRAVELER_STYLES[companionStyleId].titleKo} ({TRAVELER_STYLES[companionStyleId].subtitleKo})
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                            {styleKeys.map((key) => {
                                const style = TRAVELER_STYLES[key];
                                const isSelected = companionStyleId === key;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setCompanionStyleId(key)}
                                        className={cn(
                                            "p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex flex-col justify-between group relative overflow-hidden",
                                            isSelected
                                                ? "bg-white dark:bg-slate-900 border-indigo-500 shadow-md ring-2 ring-indigo-500/20"
                                                : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-1 mb-2">
                                            <div 
                                                className="w-7 h-7 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                                                style={{ backgroundColor: style.color }}
                                            >
                                                <span className="material-symbols-rounded text-sm">{style.icon}</span>
                                            </div>
                                            {isSelected && (
                                                <span className="material-symbols-rounded text-indigo-500 text-base">check_circle</span>
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                {style.titleKo}
                                            </div>
                                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                                {style.subtitleKo}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Analysis Result Card */}
            <div className="p-5 sm:p-7 space-y-6">
                {/* Score & Chemistry Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center bg-slate-50 dark:bg-slate-800/40 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="lg:col-span-5 flex items-center gap-4">
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center bg-white dark:bg-slate-900 shadow-lg border-4 border-primary/20 shrink-0">
                            <span className="text-2xl sm:text-3xl font-black text-primary italic leading-none">{chemistry.score}%</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">궁합 지수</span>
                        </div>
                        <div className="space-y-1.5 min-w-0">
                            <div>
                                <span className="inline-block px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full whitespace-nowrap break-keep">
                                    {chemistry.gradeTitle}
                                </span>
                            </div>
                            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white break-keep leading-snug">
                                {chemistry.gradeSubtitle}
                            </h3>
                        </div>
                    </div>

                    <div className="lg:col-span-7 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700/60 pt-4 lg:pt-0 lg:pl-6">
                        <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed break-keep">
                            {chemistry.synergyHeadline}
                        </p>
                    </div>
                </div>

                {/* Synergies & Pacing Tips (2-Column Grid) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Synergies */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                            <span className="material-symbols-rounded text-base">verified</span>
                            <span>함께할 때 발휘되는 핵심 시너지</span>
                        </div>
                        <div className="space-y-2.5">
                            {chemistry.synergies.map((s, idx) => (
                                <div key={idx} className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                                    <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 break-keep mb-0.5">
                                        {s.title}
                                    </div>
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed break-keep">
                                        {s.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pacing Tips */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                            <span className="material-symbols-rounded text-base">tune</span>
                            <span>피로와 갈등을 줄이는 페이스 조율 팁</span>
                        </div>
                        <div className="space-y-2.5">
                            {chemistry.pacingTips.map((p, idx) => (
                                <div key={idx} className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                    <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200 break-keep mb-0.5">
                                        {p.title}
                                    </div>
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed break-keep">
                                        {p.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recommended Checklist Section */}
                <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-rounded text-primary text-base">checklist</span>
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                    이 여행에서 자주 놓치기 쉬운 필수 체크포인트
                                </h4>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                선택된 여행 성향과 일정에 맞춰 추천된 항목을 내 여행 체크리스트에 즉시 추가할 수 있습니다.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {chemistry.recommendedChecklist.map((item) => {
                            const isAdded = addedChecklistIds.has(item.id);
                            return (
                                <div 
                                    key={item.id}
                                    className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-3"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                {item.category}
                                            </span>
                                            {item.priority === 'essential' && (
                                                <span className="text-[9px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900/40">
                                                    필수
                                                </span>
                                            )}
                                        </div>
                                        <h5 className="text-xs font-bold text-slate-900 dark:text-white break-keep leading-snug">
                                            {item.title}
                                        </h5>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed break-keep">
                                            {item.description}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleAddToChecklist(item)}
                                        disabled={isAdded}
                                        className={cn(
                                            "w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap",
                                            isAdded
                                                ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default"
                                                : "bg-primary hover:bg-primary-dark text-white shadow-sm active:scale-95"
                                        )}
                                    >
                                        <span className="material-symbols-rounded text-sm">
                                            {isAdded ? 'check' : 'add'}
                                        </span>
                                        <span>{isAdded ? '체크리스트에 담김' : '체크리스트에 추가'}</span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
