import { useState } from 'react';
import { useTripStore } from '@pplaner/shared';

export default function TransportationCard() {
    const [isExpanded, setIsExpanded] = useState(false);
    const trip = useTripStore((state) => state.currentTrip);
    if (!trip) return (
        <div className="flex flex-col gap-3 p-4 animate-pulse">
            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-1/2" />
            <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        </div>
    );

    const transportItems = [
        ...(trip.flights || []).map(f => ({
            id: f.id,
            type: '항공',
            mode: f.type === 'outbound' ? '가는 편' : f.type === 'inbound' ? '오는 편' : '기타',
            from: f.departureLocation || '미정',
            fromTime: f.departureTime || '미정',
            to: f.arrivalLocation || '미정',
            toTime: f.arrivalTime || '미정',
            status: (f.reservations || []).length > 0 ? '예약 완료' : (f.departureLocation && f.arrivalLocation ? '계획됨' : '미정'),
            cost: f.cost || 0,
            icon: 'flight'
        })),
        ...(trip.publicTransport || []).map(p => ({
            id: p.id,
            type: p.type === 'train' ? '열차' : p.type === 'bus' ? '버스' : '대중교통',
            mode: '대중교통',
            from: p.departureLocation || '미정',
            fromTime: p.departureTime || '미정',
            to: p.arrivalLocation || '미정',
            toTime: p.arrivalTime || '미정',
            status: (p.reservations || []).length > 0 ? '예약 완료' : (p.departureLocation && p.arrivalLocation ? '확정' : '계획'),
            cost: p.cost || 0,
            icon: p.type === 'train' ? 'train' : p.type === 'bus' ? 'directions_bus' : 'directions_transit'
        })),
        ...(trip.driving || []).map(d => ({
            id: d.id,
            type: d.vehicleType === 'sedan' ? '자동차' : d.vehicleType === 'electric' ? '전기차' : '오토바이',
            mode: d.isRental ? '렌터카' : '직접 운전',
            from: d.pickupLocation || '미정',
            fromTime: d.pickupTime || '미정',
            to: d.returnLocation || '미정',
            toTime: d.returnTime || '미정',
            status: (d.reservations || []).length > 0 ? '예약 완료' : '확정',
            cost: d.cost || 0,
            icon: 'directions_car'
        }))
    ];

    const displayItems = isExpanded ? transportItems : transportItems.slice(0, 2);
    const hasMore = transportItems.length > 2;
    const currencySymbol = trip.budget?.currency === 'KRW' ? '₩' : '$';

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 id="transport-title" className="text-sm font-black flex items-center gap-2">
                    <span className="material-symbols-rounded text-primary text-xl" aria-hidden="true">commute</span>
                    교통수단 정보
                </h3>
            </div>
            <div className="p-4 flex-1 space-y-4 overflow-hidden">
                {transportItems.length === 0 ? (
                    <div className="text-center py-8" role="status">
                        <span className="material-symbols-rounded text-4xl text-slate-200 mb-2" aria-hidden="true">directions_bus</span>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">등록된 교통 정보가 없습니다</p>
                    </div>
                ) : (
                    <>
                        <ul className="space-y-3" aria-labelledby="transport-title">
                            {displayItems.map((t) => (
                                <li 
                                    key={t.id} 
                                    className="p-3 rounded-2xl border bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 transition-all hover:border-primary/20"
                                    aria-label={`${t.type} 일정: ${t.from}에서 ${t.to}까지. ${t.status}`}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                            {t.mode} • {t.type}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {(t.cost > 0) ? (
                                                <span className="text-[10px] font-black text-primary" aria-label={`비용: ${t.cost.toLocaleString()}원`}>
                                                    {t.cost.toLocaleString()}원
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-black text-slate-400 italic">미정</span>
                                            )}
                                            <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase tracking-widest ${
                                                t.status === '예약 완료' ? 'bg-green-100 text-green-700' : 
                                                t.status === '확정' ? 'bg-blue-100 text-blue-700' :
                                                t.status === '계획됨' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                                                }`}>
                                                {t.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center text-slate-900 dark:text-slate-100">
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-black truncate tracking-tighter" aria-label={`출발지: ${t.from}`}>{t.from}</div>
                                            <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest" aria-label={`출발 시간: ${t.fromTime}`}>{t.fromTime}</div>
                                        </div>
                                        <div className="px-4 flex flex-col items-center opacity-30">
                                            <span className="material-symbols-rounded text-sm" aria-hidden="true">{t.icon}</span>
                                            <div className="w-8 h-[1px] bg-slate-400 mt-1" aria-hidden="true"></div>
                                        </div>
                                        <div className="text-right min-w-0 flex-1">
                                            <div className="text-sm font-black truncate tracking-tighter" aria-label={`도착지: ${t.to}`}>{t.to}</div>
                                            <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest" aria-label={`도착 시간: ${t.toTime}`}>{t.toTime}</div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        
                        {hasMore && (
                            <button 
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="w-full py-2 text-[10px] font-black text-slate-400 hover:text-primary transition-colors uppercase tracking-widest flex items-center justify-center gap-1 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl mt-2 group border border-transparent hover:border-primary/20"
                            >
                                {isExpanded ? (
                                    <>
                                        <span className="material-symbols-rounded text-sm group-hover:-translate-y-0.5 transition-transform">expand_less</span>
                                        SHOW LESS
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-rounded text-sm group-hover:translate-y-0.5 transition-transform">expand_more</span>
                                        SHOW ALL ({transportItems.length})
                                    </>
                                )}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
