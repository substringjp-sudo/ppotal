'use client';
import { useTripStore } from '@pplaner/shared';
import Link from 'next/link';
import { formatTripDuration } from '@pplaner/shared';

export default function TripHeader() {
    const currentTrip = useTripStore((state) => state.currentTrip);

    if (!currentTrip) return null;

    return (
        <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span 
                        className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider rounded"
                        aria-label="여행 상태: 준비 단계"
                    >
                        준비 단계
                    </span>
                    {currentTrip.warnings?.some(w => w.severity === 'critical') && (
                        <span 
                            className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold uppercase tracking-wider rounded animate-pulse"
                            role="status"
                            aria-live="assertive"
                        >
                            <span className="material-symbols-rounded text-[12px]" aria-hidden="true">gpp_maybe</span>
                            검토 필요
                        </span>
                    )}
                </div>
                <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white leading-tight">
                    {currentTrip.titleSuggestion || currentTrip.title}
                </h1>
                <div className="flex items-center gap-4 mt-2 text-slate-600 dark:text-slate-400">
                    {currentTrip.dates?.startDate || (currentTrip.dates?.durationDays && currentTrip.dates.durationDays > 0) ? (
                        <>
                            <div className="flex items-center gap-1.5" aria-label={`여행 기간: ${currentTrip.dates?.startDate ? `${currentTrip.dates.startDate.replace(/-/g, '.')}부터 ${currentTrip.dates.endDate?.replace(/-/g, '.') || ''}까지` : formatTripDuration(undefined, undefined, currentTrip.dates?.durationDays)}`}>
                                <span className="material-symbols-rounded text-sm" aria-hidden="true">calendar_today</span>
                                <span className="text-sm font-medium">
                                    {currentTrip.dates?.startDate 
                                        ? `${currentTrip.dates.startDate.replace(/-/g, '.')} - ${currentTrip.dates.endDate?.replace(/-/g, '.') || '미정'}`
                                        : formatTripDuration(undefined, undefined, currentTrip.dates?.durationDays)}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg" aria-label={`일정 유연성: ±${currentTrip.dates?.flexibilityDays || 0}일`}>
                                <span className="material-symbols-rounded text-sm" aria-hidden="true">info</span>
                                <span className="text-xs font-semibold">일정 유연함 +/- {currentTrip.dates?.flexibilityDays || 0}일</span>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <span className="material-symbols-rounded text-sm" aria-hidden="true">calendar_today</span>
                            <span className="text-sm font-medium">일정 미정</span>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Link
                    href={`/travelogs/${currentTrip.id}/edit?tripId=${currentTrip.id}`}
                    className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 dark:bg-slate-800 dark:text-white dark:border-slate-700 px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2"
                >
                    <span className="material-symbols-rounded text-lg" aria-hidden="true">auto_stories</span>
                    기록하기
                </Link>
                <Link
                    href={`/edit-trip/${currentTrip.id}`}
                    className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                    aria-label="여행 일정 수정 페이지로 이동"
                >
                    <span className="material-symbols-rounded text-lg" aria-hidden="true">edit</span>
                    일정 수정하기
                </Link>
            </div>
        </div>
    );
}
