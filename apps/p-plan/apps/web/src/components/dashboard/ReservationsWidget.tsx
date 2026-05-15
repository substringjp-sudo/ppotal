'use client';
import { useTripStore } from '@pplaner/shared';

export default function ReservationsWidget() {
    const trip = useTripStore((state) => state.currentTrip);
    if (!trip) return (
        <div className="flex flex-col gap-3 p-4 animate-pulse">
            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-1/3" />
            {[1,2].map(i => <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl" />)}
        </div>
    );

    const reservations = trip.reservations || [];
    const currency = trip.budget?.currency === 'KRW' ? '₩' : '$';

    return (
        <div 
            className="h-full flex flex-col"
            aria-labelledby="reservations-title"
        >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 id="reservations-title" className="font-bold flex items-center gap-2 text-sm leading-none">
                    <span className="material-symbols-rounded text-primary text-xl" aria-hidden="true">confirmation_number</span>
                    티켓 및 예약
                </h3>
            </div>
            <div className="p-4 space-y-3 flex-1 overflow-y-auto" role="list">
                {reservations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-24 text-slate-400" role="status">
                        <span className="material-symbols-rounded text-3xl mb-1 opacity-20" aria-hidden="true">receipt_long</span>
                        <p className="text-[10px] font-medium uppercase tracking-wider">예약 내역이 없습니다</p>
                    </div>
                ) : (
                    reservations.map(res => (
                        <div 
                            key={res.id} 
                            className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between group transition-all hover:border-primary/30"
                            role="listitem"
                             aria-label={`${res.title}: ${res.status === 'confirmed' ? '확정' : res.status === 'missing' ? '누락' : '예정'}, ${res.date || '미정'}${res.time ? ` ${res.time}` : ''}${res.location ? `, 장소 ${res.location}` : ''}${res.cost ? `, 비용 ${currency}${res.cost.toLocaleString()}` : ''}`}
                        >
                            <div className="flex flex-col gap-0.5 min-w-0 flex-1 pr-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate" aria-hidden="true">{res.title}</span>
                                    {res.status === 'confirmed' && (
                                        <span className="material-symbols-rounded text-[14px] text-green-500" aria-hidden="true">check_circle</span>
                                    )}
                                    {res.link && (
                                        <a 
                                            href={res.link} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-primary hover:underline flex items-center"
                                            aria-label={`${res.title} 예약 상세 링크로 이동`}
                                        >
                                            <span className="material-symbols-rounded text-[14px]" aria-hidden="true">link</span>
                                        </a>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1" aria-hidden="true">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                        {res.date || '미정'} {res.time && `• ${res.time}`}
                                    </span>
                                    {res.location && (
                                        <span className="text-[10px] text-slate-500 flex items-center gap-0.5 truncate">
                                            <span className="material-symbols-rounded text-[10px]">location_on</span>
                                            {res.location}
                                        </span>
                                    )}
                                </div>
                                 <div className="mt-1" aria-hidden="true">
                                     <span className="text-[10px] font-black text-primary">
                                         {res.cost && res.cost > 0 ? `${res.cost.toLocaleString()}원` : '미정'}
                                     </span>
                                 </div>
                            </div>
                            <div 
                                className={`px-2 py-0.5 text-[9px] font-black rounded uppercase shrink-0 ${res.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                    res.status === 'missing' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'
                                }`}
                                aria-hidden="true"
                            >
                                {res.status === 'confirmed' ? '확정' :
                                    res.status === 'missing' ? '누락' : '예정'}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
