import React from 'react';
import { useWizardStore } from '@pplaner/shared';

export default function ReviewStep() {
    const {
        startDate, endDate, locations, participants, theme,
        isDateUndecided, isLocationUndecided, isParticipantsUndecided, durationDays
    } = useWizardStore();

    const participantsText = isParticipantsUndecided
        ? '인원 미정'
        : participants.filter(p => p.count > 0).map(p => `${p.type}(${p.count})`).join(', ');


    const dateRange = isDateUndecided
        ? `${durationDays}일 여행 (날짜 미정)`
        : `${startDate} - ${endDate}`;

    return (
        <div className="space-y-10">
            <div className="p-10 bg-primary/5 dark:bg-primary/10 rounded-[3rem] border-2 border-primary/10 relative overflow-hidden text-center">
                <div className="relative z-10 max-w-2xl mx-auto">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">나만의 여행 노트 시작하기</p>
                    <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-8 leading-tight">
                        {isLocationUndecided ? '어디든' : (locations[0] || '미지의')} {theme || '낭만'} 여행
                    </h2>
                    <div className="flex items-center justify-center gap-6 text-sm font-bold text-slate-500">
                        <span className="flex items-center gap-2" aria-label={`여행 기간: ${dateRange}`}>
                            <span className="material-symbols-rounded text-base text-primary" aria-hidden="true">calendar_today</span> 
                            {dateRange}
                        </span>
                        <div className="w-1 h-1 bg-slate-300 rounded-full" />
                        <span className="flex items-center gap-2" aria-label={`여행 장소: ${isLocationUndecided ? '장소 미정' : (locations.join(', ') || '지역 미지정')}`}>
                            <span className="material-symbols-rounded text-base text-primary" aria-hidden="true">location_on</span> 
                            {isLocationUndecided ? '장소 미정' : (locations.join(', ') || '지역을 선택해주세요')}
                        </span>
                    </div>
                </div>
                <div className="absolute -top-10 -right-10 p-20 opacity-[0.03] rotate-12">
                    <span className="material-symbols-rounded text-[300px]">book_2</span>
                </div>
                <div className="absolute -bottom-10 -left-10 p-20 opacity-[0.03] -rotate-12">
                    <span className="material-symbols-rounded text-[300px]">travel_explore</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[
                    { label: '인원 구성', value: participantsText || '미지정', icon: 'groups' },
                    { label: '여행 테마', value: theme || '미정', icon: 'palette' }
                ].map(item => (
                    <div 
                        key={item.label} 
                        className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] flex items-center gap-5 border border-slate-200 dark:border-slate-800 shadow-sm"
                        aria-label={`${item.label}: ${item.value}`}
                    >
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary border border-slate-200 dark:border-slate-700">
                            <span className="material-symbols-rounded text-2xl" aria-hidden="true">{item.icon}</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                            <p className="text-base font-black text-slate-900 dark:text-white">{item.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-8 bg-slate-900 dark:bg-white rounded-[2.5rem] flex items-center justify-between group overflow-hidden relative">
                <div className="relative z-10">
                    <h4 className="text-white dark:text-slate-900 text-lg font-black mb-1">이제 직접 하나씩 채워나갈 차례예요</h4>
                    <p className="text-white/60 dark:text-slate-500 text-[11px] font-bold">노트 시작하기를 누르면 나만의 여행 노트가 펼쳐집니다.</p>
                </div>
                <div className="w-16 h-16 rounded-full bg-white/10 dark:bg-slate-900/10 flex items-center justify-center text-white dark:text-slate-900 relative z-10 transition-transform group-hover:scale-110">
                    <span className="material-symbols-rounded text-3xl">edit_note</span>
                </div>
                <div className="absolute right-0 bottom-0 p-12 opacity-10 group-hover:scale-150 transition-transform">
                    <span className="material-symbols-rounded text-[100px] text-white dark:text-slate-900">celebration</span>
                </div>
            </div>
        </div>
    );
}
