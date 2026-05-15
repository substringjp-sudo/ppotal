'use client';
import { useTripStore, cn } from '@pplaner/shared';

import { useState, useEffect, useCallback } from 'react';
import { UndecidedField } from '@/components/common/FormComponents';
import { format, addDays, parseISO } from 'date-fns';
import { generateId } from '@pplaner/shared';

// Modular components and hooks
import { useAccommodationTimeline } from './accommodation/useAccommodationTimeline';
import { AccommodationTimeline } from './accommodation/AccommodationTimeline';
import { AccommodationCard } from './accommodation/AccommodationCard';

export default function AccommodationEditor() {
    const { currentTrip: trip, addAccommodation, updateAccommodation } = useTripStore();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [hoveredAccId, setHoveredAccId] = useState<string | null>(null);




    const timelineHook = useAccommodationTimeline(trip, addAccommodation);

    const getRegionPath = useCallback((acc: any) => {
        if (!acc) return '';
        const parts = [acc.countryName, acc.prefectureName, acc.cityName].filter(Boolean);
        return parts.join(' • ');
    }, []);

    if (!trip || timelineHook.timelineDates.length === 0) return (
        <div className="max-w-4xl mx-auto py-20 px-4">
            <UndecidedField
                icon="calendar_month"
                message="먼저 여행 날짜를 정해주세요"
                actionLabel="기본 정보 설정으로 이동"
                onAction={() => {
                    const datesSection = document.getElementById('dates-section');
                    if (datesSection) datesSection.scrollIntoView({ behavior: 'smooth' });
                }}
                className="scale-110"
            />
        </div>
    );

    const handleMouseUp = async () => {
        const newId = await timelineHook.handleMouseUp();
        if (newId) setEditingId(newId);
    };

    const handleManualAdd = async () => {
        if (!trip?.dates.startDate) return;
        
        const startStr = trip.dates.startDate;
        // Default to 1 night
        const startDate = parseISO(startStr);
        const endDate = addDays(startDate, 1);
        const endStr = format(endDate, 'yyyy-MM-dd');

        const newId = generateId();
        await addAccommodation({
            id: newId,
            startDate: startStr,
            endDate: endStr,
            name: '',
            location: '',
            status: 'tentative',
            type: 'hotel',
            color: 'primary',
            checkInStartTime: '15:00',
            checkInEndTime: '23:59',
            checkOutStartTime: '00:00',
            checkOutEndTime: '10:00',
            isPriceUndecided: true
        });
        setEditingId(newId);
    };

    return (
        <div className="space-y-6">
            <AccommodationTimeline 
                {...timelineHook}
                handleMouseUp={handleMouseUp}
                hoveredAccId={hoveredAccId}
                setHoveredAccId={setHoveredAccId}
                editingId={editingId}
                setEditingId={setEditingId}
                getRegionPath={getRegionPath}
            />

            <div className="max-w-5xl mx-auto px-4 pb-32">
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest leading-none">숙소 목록</h3>
                            <div className="h-4 w-[1px] bg-slate-200 dark:border-slate-800" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">총 {trip.accommodation?.length || 0}개</span>
                        </div>
                        
                        <button
                            onClick={handleManualAdd}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black text-slate-600 dark:text-slate-400 hover:border-primary/50 hover:text-primary transition-all shadow-sm uppercase tracking-widest"
                        >
                            <span className="material-symbols-rounded text-sm">add_circle</span>
                            숙소 직접 추가
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {[...(trip.accommodation || [])].sort((a,b) => (a.startDate || '').localeCompare(b.startDate || '')).map(acc => (
                            <AccommodationCard 
                                key={acc.id}
                                acc={acc}
                                isEditing={editingId === acc.id}
                                setEditingId={setEditingId}
                                updateAccommodation={updateAccommodation}
                                timelineDates={timelineHook.timelineDates}
                            />
                        ))}

                        {(trip.accommodation?.length || 0) === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 gap-8 text-center bg-white dark:bg-slate-900/50 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800">
                                <div className="w-24 h-24 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-300">
                                    <span className="material-symbols-rounded text-5xl">hotel</span>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs mb-2">등록된 숙소가 없습니다</p>
                                        <p className="text-slate-300 font-bold uppercase text-[10px]">타임라인을 드래그하거나 아래 버튼으로 추가해보세요</p>
                                    </div>
                                    <button
                                        onClick={handleManualAdd}
                                        className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
                                    >
                                        <span className="material-symbols-rounded">add_circle</span>
                                        첫 숙소 추가하기
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
