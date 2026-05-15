import { useTripStore, getAccommodationGaps } from '@pplaner/shared';

export default function AccommodationTimeline() {
    const trip = useTripStore((state) => state.currentTrip);
    if (!trip) return (
        <div className="flex flex-col gap-3 p-4 animate-pulse">
            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-1/3" />
            <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-full" />
        </div>
    );

    const gaps = getAccommodationGaps(trip);

    return (
        <div className="flex flex-col h-full">
            <div 
                className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center"
                aria-label="숙소 일정 예례"
            >
                <h3 id="accommodation-title" className="font-bold flex items-center gap-2 text-sm leading-none">
                    <span className="material-symbols-rounded text-primary text-xl" aria-hidden="true">hotel</span>
                    숙소 일정
                </h3>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5" aria-label="주요 숙소 표시 색상">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary/80" role="img" aria-label="파란색"></div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">주요 숙소</span>
                    </div>
                    <div className="flex items-center gap-1.5" aria-label="비어있는 일정 표시 색상">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400" role="img" aria-label="빨간색"></div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">비어있음</span>
                    </div>
                </div>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-center">
                <div className="relative w-full h-12 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex">
                    {(trip.accommodation || []).length === 0 ? (
                        <div 
                            className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase tracking-widest"
                            role="status"
                        >
                            등록된 숙소가 없습니다
                        </div>
                    ) : (
                        (trip.accommodation || []).map((acc, index) => {
                            if (!trip.dates?.startDate || !trip.dates?.endDate) return null;
                            
                            const start = new Date(acc.startDate).getTime();
                            const end = new Date(acc.endDate).getTime();
                            const tripStart = new Date(trip.dates.startDate).getTime();
                            const tripEnd = new Date(trip.dates.endDate).getTime();
                            const totalDuration = tripEnd - tripStart;

                            if (totalDuration <= 0) return null;

                            const width = ((end - start) / totalDuration) * 100;
                            const left = ((start - tripStart) / totalDuration) * 100;

                            const label = `${acc.name} (${acc.startDate} ~ ${acc.endDate})${acc.isPriceUndecided || !acc.price ? ' - 미정' : ` - ${acc.price.toLocaleString()}원`}`;

                            return (
                                <div
                                    key={acc.id}
                                    className={`absolute h-full ${acc.color === 'primary' ? 'bg-primary' : 'bg-blue-500'} border-r-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] text-white font-bold px-2 truncate transition-all`}
                                    style={{ width: `${width}%`, left: `${left}%` }}
                                    title={label}
                                    role="progressbar"
                                    aria-valuenow={Math.round(width)}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-label={label}
                                >
                                    {acc.name}
                                </div>
                            );
                        })
                    )}
                    
                    {/* Gap detection in timeline bar */}
                    {gaps.map((gap, i) => {
                        if (!trip.dates?.startDate || !trip.dates?.endDate) return null;
                        const ts = new Date(trip.dates.startDate).getTime();
                        const te = new Date(trip.dates.endDate).getTime();
                        const gs = new Date(gap.start).getTime();
                        const ge = new Date(gap.end).getTime();
                        const duration = te - ts;
                        if (duration <= 0) return null;
                        
                        const left = ((gs - ts) / duration) * 100;
                        const width = ((ge - gs) / duration) * 100;
                        
                        return (
                            <div
                                key={`gap-${i}`}
                                className="absolute h-full bg-red-400/20 flex items-center justify-center border-r border-white dark:border-slate-900 overflow-hidden"
                                style={{ left: `${left}%`, width: `${width}%` }}
                                title={`비어있음: ${gap.days}박 (${gap.start} ~ ${gap.end})`}
                                role="status"
                                aria-label={`비어있는 일정: ${gap.days}박 (${gap.start}부터 ${gap.end}까지)`}
                            >
                                <span className="material-symbols-rounded text-red-500/50 text-[10px]" aria-hidden="true">warning</span>
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-between mt-3 px-1">
                    <span className="text-[10px] text-slate-400 font-bold">{trip.dates?.isUndecided ? '미정' : trip.dates?.startDate?.replace(/-/g, '.') || '미정'}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{trip.dates?.isUndecided ? '' : trip.dates?.endDate?.replace(/-/g, '.') || ''}</span>
                </div>
                
                {/* Summary Alert Box */}
                {gaps.length > 0 && (
                    <div 
                        className="mt-6 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20 flex items-center justify-between"
                        role="alert"
                    >
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-rounded text-red-500 text-base font-bold" aria-hidden="true">priority_high</span>
                            <span className="text-[11px] text-slate-700 dark:text-slate-300 font-bold">
                                아직 예약이 비어있는 <strong className="text-red-600">{gaps.reduce((sum, g) => sum + g.days, 0)}박</strong> 일정이 있습니다.
                            </span>
                        </div>
                        <button 
                            className="text-[10px] font-black text-primary hover:underline uppercase tracking-tight"
                            aria-label="숙소 추가하기 페이지로 이동"
                        >
                            숙소 추가하기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
