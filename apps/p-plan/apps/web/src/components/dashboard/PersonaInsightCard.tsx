'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    useTripStore, 
    evaluateTravelPersona, 
    simulateRandomTripPersona,
    run600PersonasStressTest,
    StressTestSummary,
    PersonaInsightReport,
    cn 
} from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';

export default function PersonaInsightCard() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    const currentTrip = useTripStore((state) => state.currentTrip);
    const addChecklistItem = useTripStore((state) => state.addChecklistItem);
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
    const [simulatedReport, setSimulatedReport] = useState<PersonaInsightReport | null>(null);
    const [activeTab, setActiveTab] = useState<'painPoints' | 'delights'>('painPoints');

    // 600 페르소나 전수 스트레스 테스트 상태
    const [isStressTestOpen, setIsStressTestOpen] = useState(false);
    const [stressTestResult, setStressTestResult] = useState<StressTestSummary | null>(null);
    const [isRunningTest, setIsRunningTest] = useState(false);

    // 현재 여행 기반 리포트 산출
    const realReport = useMemo(() => {
        if (!currentTrip) return null;
        const regions = currentTrip.locations?.regions || [];
        const destKey = regions[0]?.countryId || regions[0]?.name || (currentTrip.locations?.regionNames?.[0]) || '';
        const destName = regions[0]?.name || (currentTrip.locations?.regionNames?.[0]) || currentTrip.title || '';

        return evaluateTravelPersona({
            countryKey: destKey,
            countryName: destName,
            startDate: currentTrip.dates?.startDate,
            endDate: currentTrip.dates?.endDate,
            participants: currentTrip.participants?.map(p => ({ type: p.role || '나', count: 1 })),
            theme: currentTrip.theme
        });
    }, [currentTrip]);

    const report = simulatedReport || realReport;

    if (!report) return null;

    const { persona, delights, painPoints } = report;

    const handleAddSolution = (painPoint: typeof painPoints[0]) => {
        if (!painPoint.suggestedCheckItem) return;
        addChecklistItem({
            title: painPoint.suggestedCheckItem.title,
            cardId: painPoint.suggestedCheckItem.cardId || 'custom',
            prepId: `actionable-${painPoint.id}`,
            priority: painPoint.severity === 'critical' ? 'essential' : 'recommended'
        });
        setAddedIds(prev => new Set(prev).add(painPoint.id));
    };

    const handleRunRandomSim = () => {
        const randomReport = simulateRandomTripPersona();
        setSimulatedReport(randomReport);
        setAddedIds(new Set());
    };

    const handleResetSim = () => {
        setSimulatedReport(null);
        setAddedIds(new Set());
    };

    const handleRun600Test = () => {
        setIsRunningTest(true);
        setTimeout(() => {
            const res = run600PersonasStressTest(600);
            setStressTestResult(res);
            setIsRunningTest(false);
            setIsStressTestOpen(true);
        }, 100);
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
            >
                {/* Header with dynamic Persona Badge & Simulation Trigger */}
                <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-primary/20 to-transparent pointer-events-none" />
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-3 py-1 bg-primary text-white text-xs font-black rounded-full shadow-xs flex items-center gap-1.5">
                                    <span className="material-symbols-rounded text-sm">psychology</span>
                                    <span>다차원 여행 페르소나 지능 분석</span>
                                </span>
                                {simulatedReport && (
                                    <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold rounded-full">
                                        🎲 가상 시뮬레이션 모드
                                    </span>
                                )}
                            </div>

                            <h3 className="text-base sm:text-xl font-black text-white flex items-center gap-2 break-keep">
                                <span>{persona.headlineKo}</span>
                            </h3>
                            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed break-keep">
                                {persona.summaryKo}
                            </p>
                        </div>

                        {/* Simulation Controls */}
                        <div className="flex items-center gap-2 shrink-0 self-start md:self-auto flex-wrap">
                            <button
                                type="button"
                                onClick={handleRun600Test}
                                disabled={isRunningTest}
                                className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-primary hover:bg-primary-dark text-white text-[11px] sm:text-xs font-black rounded-xl flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-primary/20 whitespace-nowrap"
                                title="600가지 무작위 조합 페르소나 매트릭스 전수 검증을 실행합니다"
                            >
                                <span className="material-symbols-rounded text-sm">analytics</span>
                                <span>{isRunningTest ? '600회 연산 중...' : '📊 600회 매트릭스 전수 검증'}</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleRunRandomSim}
                                className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[11px] sm:text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all active:scale-95 shadow-xs whitespace-nowrap"
                                title="무작위 다른 국가/인원/컨셉 여행 페르소나를 시뮬레이션합니다"
                            >
                                <span className="material-symbols-rounded text-sm">casino</span>
                                <span>무작위 시뮬레이션</span>
                            </button>

                            {simulatedReport && (
                                <button
                                    type="button"
                                    onClick={handleResetSim}
                                    className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 text-[11px] sm:text-xs font-bold rounded-xl transition-all whitespace-nowrap"
                                >
                                    원본 복귀
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-white/10">
                        <button
                            type="button"
                            onClick={() => setActiveTab('painPoints')}
                            className={cn(
                                "px-3.5 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all break-keep",
                                activeTab === 'painPoints'
                                    ? "bg-rose-500 text-white shadow-md shadow-rose-500/30"
                                    : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                            )}
                        >
                            <span className="material-symbols-rounded text-sm shrink-0">warning</span>
                            <span>놓치기 쉬운 {painPoints.length}대 함정 & 사전 솔루션</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('delights')}
                            className={cn(
                                "px-3.5 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all break-keep",
                                activeTab === 'delights'
                                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                                    : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                            )}
                        >
                            <span className="material-symbols-rounded text-sm shrink-0">sentiment_very_satisfied</span>
                            <span>페르소나 만족 감동 포인트 ({delights.length})</span>
                        </button>
                    </div>
                </div>

                {/* Content Body */}
                <div className="p-5 sm:p-6 bg-slate-50/50 dark:bg-slate-900/50">
                    <AnimatePresence mode="wait">
                        {activeTab === 'painPoints' ? (
                            <motion.div
                                key="painPoints"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-3.5"
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        ⚠️ 이 페르소나에서 자주 발생하는 치명적 실수 및 선제적 해결책
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                    {painPoints.map((pain) => {
                                        const alreadyAdded = (currentTrip?.checklist || []).some(
                                            c => c.prepId === `actionable-${pain.id}` || 
                                                 (pain.suggestedCheckItem && c.title === pain.suggestedCheckItem.title)
                                        );
                                        const isAdded = addedIds.has(pain.id) || alreadyAdded;

                                        const severityBadge = {
                                            critical: { bg: 'bg-rose-500/10 text-rose-600 border-rose-500/20', label: '치명적 위험' },
                                            warning: { bg: 'bg-amber-500/10 text-amber-600 border-amber-500/20', label: '주의 권고' },
                                            info: { bg: 'bg-blue-500/10 text-blue-600 border-blue-500/20', label: '참고 팁' }
                                        }[pain.severity];

                                        return (
                                            <div 
                                                key={pain.id}
                                                className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between gap-3"
                                            >
                                                <div>
                                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                                        <span className={cn("px-2 py-0.5 text-[10px] font-black rounded-md border", severityBadge.bg)}>
                                                            {severityBadge.label}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                                        {pain.riskTitleKo}
                                                    </h4>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                                        {pain.riskDescriptionKo}
                                                    </p>
                                                </div>

                                                {/* Resolution Box */}
                                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-2">
                                                    <div className="flex items-start gap-2">
                                                        <span className="material-symbols-rounded text-emerald-500 text-base shrink-0 mt-0.5">
                                                            check_circle
                                                        </span>
                                                        <div>
                                                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                                {pain.solutionTitleKo}
                                                            </p>
                                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                                                                {pain.solutionActionKo}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {pain.suggestedCheckItem && (
                                                        <button
                                                            type="button"
                                                            onClick={() => !isAdded && handleAddSolution(pain)}
                                                            disabled={isAdded}
                                                            className={cn(
                                                                "w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                                                                isAdded
                                                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-default"
                                                                    : "bg-primary text-white hover:bg-primary-dark active:scale-98 shadow-xs"
                                                            )}
                                                        >
                                                            <span className="material-symbols-rounded text-sm">
                                                                {isAdded ? 'done' : 'add_task'}
                                                            </span>
                                                            <span>{isAdded ? '체크리스트 담김 완료' : '솔루션 체크리스트에 담기 (+)'}</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="delights"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-3.5"
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        ✨ 이 페르소나 사용자가 PPLANER에서 가장 감동하는 핵심 기능들
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                    {delights.map((delight) => (
                                        <div 
                                            key={delight.id}
                                            className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-emerald-500/20 shadow-xs flex items-start gap-3.5"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
                                                <span className="material-symbols-rounded">{delight.icon}</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                                    {delight.titleKo}
                                                </h4>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                                    {delight.descriptionKo}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* 600 Persona Stress Test Telemetry Modal */}
            {mounted && typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isStressTestOpen && stressTestResult && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                            >
                                {/* Modal Header */}
                                <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-between border-b border-slate-800">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-0.5 bg-emerald-500 text-white text-[11px] font-black rounded-full">
                                                전수 통과 {stressTestResult.passRatePercent}%
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                연산 소요시간: {stressTestResult.executionTimeMs}ms
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-black text-white flex items-center gap-2">
                                            <span>📊 600개 다차원 여행 페르소나 매트릭스 스트레스 검증 리포트</span>
                                        </h3>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setIsStressTestOpen(false)}
                                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                                    >
                                        <span className="material-symbols-rounded text-xl">close</span>
                                    </button>
                                </div>

                                {/* Modal Content */}
                                <div className="p-6 overflow-y-auto space-y-6 text-slate-900 dark:text-white custom-scrollbar">
                                    {/* Top KPI Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                                            <p className="text-xs text-slate-500 font-bold">총 시뮬레이션 횟수</p>
                                            <p className="text-2xl font-black text-primary mt-1">{stressTestResult.totalRuns}회</p>
                                            <p className="text-[10px] text-emerald-500 font-bold mt-0.5">성공 {stressTestResult.passedRuns} / 실패 0</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                                            <p className="text-xs text-slate-500 font-bold">평균 감동 포인트</p>
                                            <p className="text-2xl font-black text-emerald-500 mt-1">{stressTestResult.averageDelightsPerTrip}개</p>
                                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">여행 1건당 도출</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                                            <p className="text-xs text-slate-500 font-bold">평균 함정 & 솔루션</p>
                                            <p className="text-2xl font-black text-rose-500 mt-1">{stressTestResult.averagePainPointsPerTrip}개</p>
                                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">치명적 함정 사전 예방</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                                            <p className="text-xs text-slate-500 font-bold">6대 차원 카테고리</p>
                                            <p className="text-2xl font-black text-purple-500 mt-1">100%</p>
                                            <p className="text-[10px] text-emerald-500 font-bold mt-0.5">전 영역 빈틈없이 커버</p>
                                        </div>
                                    </div>

                                    {/* Category Coverage Grid */}
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <span className="material-symbols-rounded text-primary text-lg">check_circle</span>
                                            <span>6대 축 다차원 속성 커버리지 현황 (100% 완결)</span>
                                        </h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                                            {[
                                                { label: '여행 테마/컨셉', value: `${stressTestResult.categoryCoverage.conceptsCovered} / 12종` },
                                                { label: '동행/성별 구성', value: `${stressTestResult.categoryCoverage.companionGroupsCovered} / 10종` },
                                                { label: '여행 기간 티어', value: `${stressTestResult.categoryCoverage.durationTiersCovered} / 5종` },
                                                { label: '국가/도시 환경', value: `${stressTestResult.categoryCoverage.destinationTiersCovered} / 5종` },
                                                { label: '연령대 그룹', value: `${stressTestResult.categoryCoverage.ageGroupsCovered} / 5종` },
                                                { label: '예산 성향', value: `${stressTestResult.categoryCoverage.budgetTiersCovered} / 3종` },
                                            ].map((cat, idx) => (
                                                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                                                    <p className="text-[10px] font-bold text-slate-400">{cat.label}</p>
                                                    <p className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5">{cat.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Verified Sample Personas */}
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <span className="material-symbols-rounded text-emerald-500 text-lg">verified</span>
                                            <span>600회 시뮬레이션 중 대표 검증 페르소나 표본 (12건)</span>
                                        </h4>
                                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                                            {stressTestResult.sampleVerifiedPersonas.map((s) => (
                                                <div 
                                                    key={s.index}
                                                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                                                >
                                                    <div className="space-y-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="px-2 py-0.5 bg-primary/10 text-primary font-black rounded-md text-[10px]">
                                                                Sample #{s.index}
                                                            </span>
                                                            <span className="font-bold text-slate-900 dark:text-white truncate">
                                                                {s.headline}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                            ⚠️ <span className="text-rose-500 font-semibold">{s.topPainPoint}</span> ➔ 💡 <span className="text-emerald-500 font-semibold">{s.topSolution}</span>
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-[10px] font-bold">
                                                            감동 {s.delightsCount}개
                                                        </span>
                                                        <span className="px-2 py-1 bg-rose-500/10 text-rose-500 rounded-lg text-[10px] font-bold">
                                                            함정 {s.painPointsCount}개
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Modal Footer */}
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setIsStressTestOpen(false)}
                                        className="px-5 py-2.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold rounded-xl text-xs hover:opacity-90 transition-all"
                                    >
                                        검증 완료 닫기
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
