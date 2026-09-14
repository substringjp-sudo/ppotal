'use client';

import React, { useMemo, useState } from 'react';
import { 
    useTripStore, 
    SectionId, 
    resolveTravelPurpose, 
    getSmartSuggestionsForSection,
    evaluateTravelPersona,
    cn 
} from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';

interface SmartSectionGuidanceProps {
    sectionId: SectionId;
}

export default function SmartSectionGuidance({ sectionId }: SmartSectionGuidanceProps) {
    const currentTrip = useTripStore((state) => state.currentTrip);
    const addChecklistItem = useTripStore((state) => state.addChecklistItem);
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

    const purpose = useMemo(() => {
        return resolveTravelPurpose(currentTrip?.theme);
    }, [currentTrip?.theme]);

    const personaReport = useMemo(() => {
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

    const suggestions = useMemo(() => {
        if (!currentTrip || sectionId === 'overview') return [];
        const purposeItems = getSmartSuggestionsForSection(sectionId, currentTrip.theme);
        
        // Persona Actionables for this section
        const personaItems = (personaReport?.essentialActionables || [])
            .filter(a => a.sectionId === sectionId)
            .map(a => ({
                id: a.id,
                title: a.title,
                description: a.description,
                sectionId: a.sectionId,
                cardId: a.cardId,
                isEssential: a.priority === 'essential',
                tagKo: a.tag
            }));

        const combined = [...purposeItems];
        personaItems.forEach(p => {
            if (!combined.some(c => c.id === p.id || c.title === p.title)) {
                combined.push(p);
            }
        });

        return combined;
    }, [sectionId, currentTrip?.theme, currentTrip, personaReport]);

    if (!currentTrip || suggestions.length === 0) return null;

    const handleAdd = (suggestion: typeof suggestions[0]) => {
        addChecklistItem({
            title: suggestion.title,
            cardId: suggestion.cardId || 'custom',
            prepId: suggestion.id,
            priority: suggestion.isEssential ? 'essential' : 'recommended'
        });
        setAddedIds(prev => new Set(prev).add(suggestion.id));
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 relative overflow-hidden"
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-xs border border-primary/20 shrink-0 text-primary">
                        <span className="material-symbols-rounded text-xl">{purpose.icon}</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{purpose.label} 맞춤 AI 가이드</span>
                            </span>
                            <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full">
                                추천 입력
                            </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                            {currentTrip.theme} 컨셉 여행에 맞춰 꼭 필요한 항목들을 준비해 드렸어요. 버튼을 눌러 내 계획에 바로 추가해보세요.
                        </p>
                    </div>
                </div>
            </div>

            {/* Suggested Action Chips */}
            <div className="mt-3.5 flex flex-wrap gap-2 pt-3 border-t border-primary/10">
                {suggestions.map((s) => {
                    const alreadyInChecklist = (currentTrip.checklist || []).some(
                        c => c.prepId === s.id || c.title.trim() === s.title.trim()
                    );
                    const isAdded = addedIds.has(s.id) || alreadyInChecklist;

                    return (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => !isAdded && handleAdd(s)}
                            disabled={isAdded}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all",
                                isAdded
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-default"
                                    : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-primary hover:text-primary hover:shadow-xs active:scale-95"
                            )}
                        >
                            <span className="material-symbols-rounded text-sm">
                                {isAdded ? 'check_circle' : 'add_circle'}
                            </span>
                            <span>{s.title}</span>
                            {s.isEssential && !isAdded && (
                                <span className="px-1.5 py-0.2 bg-rose-500/10 text-rose-500 text-[10px] font-extrabold rounded">
                                    필수
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </motion.div>
    );
}
