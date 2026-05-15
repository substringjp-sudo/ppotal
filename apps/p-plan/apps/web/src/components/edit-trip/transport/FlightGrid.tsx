import { ReservationItem } from "./ReservationItem";
import { useTripStore } from '@pplaner/shared';
import { cn } from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import { FlightSegment } from '@pplaner/shared';
import { AirportSearchInput } from '../AirportSearchInput';
import { AirlineSearchInput } from '../AirlineSearchInput';
import { CustomCheckbox, UndecidedField, RestrictedDatePicker, TimeInput } from '../../common/FormComponents';
import { TransportTimeEditor } from '../../common/TransportTimeEditor';
import { AIRLINES } from '@pplaner/shared';
import { AIRPORTS } from '@pplaner/shared';



function FormSection({ title, children, icon }: { title: string, children: React.ReactNode, icon?: string }) {
    return (
        <div className="space-y-3 p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/40">
            <div className="flex items-center gap-2 px-1">
                {icon && <span className="material-symbols-rounded text-[16px] text-primary/60">{icon}</span>}
                <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{title}</h4>
            </div>
            <div className="bg-white dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm">
                {children}
            </div>
        </div>
    );
}

function getCityName(code?: string) {
    if (!code) return '';
    const airport = AIRPORTS.find(a => a.code === code);
    return airport?.regionIds.cityName || '';
}

function FlightSegmentRow({ segment, icon = 'flight_takeoff', isRoundTrip = false }: { segment: FlightSegment, icon?: string, isRoundTrip?: boolean }) {
    const depCity = getCityName(segment.departureLocation);
    const arrCity = getCityName(segment.arrivalLocation);

    return (
        <div className="flex-1 flex items-center justify-between min-w-0">
            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                {/* Departure */}
                <div className="flex flex-col min-w-[60px] md:min-w-[75px]">
                    <span className="text-sm md:text-base font-black text-slate-800 dark:text-slate-100 leading-tight">
                        {segment.departureTime || '--:--'}
                    </span>
                    <div className="flex flex-col items-start leading-tight">
                        <span className="text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-tight">{segment.departureLocation || '???'}</span>
                        {depCity && <span className="text-[9px] font-bold text-slate-400 truncate">({depCity})</span>}
                    </div>
                </div>

                {/* Path / Duration */}
                <div className="flex flex-col items-center flex-1 px-2 relative">
                    <div className="w-full h-[1px] bg-slate-200 dark:bg-slate-700/50 relative flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center justify-center -top-[14px]">
                            {segment.flightDurationMinutes && (
                                <span className="text-[9px] font-black text-primary bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-primary/10 shadow-sm whitespace-nowrap italic">
                                     {Math.floor(segment.flightDurationMinutes / 60)}시간 {segment.flightDurationMinutes % 60}분
                                </span>
                            )}
                        </div>
                        <span className={cn(
                            "material-symbols-rounded text-[16px] bg-white dark:bg-slate-900 px-1.5 text-slate-300 z-10",
                            icon === 'flight_land' ? 'rotate-180' : ''
                        )}>
                            {icon}
                        </span>
                    </div>
                </div>

                {/* Arrival */}
                <div className="flex flex-col min-w-[60px] md:min-w-[75px] text-right">
                    <span className="text-sm md:text-base font-black text-slate-800 dark:text-slate-100 leading-tight flex items-center justify-end gap-1">
                        {segment.arrivalTime || '--:--'}
                        {(() => {
                            const depA = AIRPORTS.find(a => a.code === segment.departureLocation);
                            const arrA = AIRPORTS.find(a => a.code === segment.arrivalLocation);
                            if (!segment.departureTime || !segment.arrivalTime || !depA || !arrA) return null;
                            const [dH, dM] = segment.departureTime.split(':').map(Number);
                            const duration = segment.flightDurationMinutes || 0;
                            const totalOriginMins = dH * 60 + dM + duration;
                            const dayOffset = Math.floor(totalOriginMins / 1440);
                            if (dayOffset <= 0) return null;
                            return (
                                <span className="text-[9px] font-black text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-1 rounded ml-0.5">
                                     +{dayOffset}일
                                </span>
                            );
                        })()}
                    </span>
                    <div className="flex flex-col items-end justify-end leading-tight">
                        <span className="text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-tight">{segment.arrivalLocation || '???'}</span>
                        {arrCity && <span className="text-[9px] font-bold text-slate-400 truncate">({arrCity})</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}


function AirportInfo({ code }: { code?: string }) {
    if (!code) return null;
    const info = AIRPORTS.find(a => a.code === code);
    if (!info) return null;
    
    const nameIncludesCity = info.regionIds.cityName && info.nameKo.includes(info.regionIds.cityName);
    
    return (
        <div className="flex flex-col gap-1 mt-1.5 px-2">
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[10px] font-bold text-slate-400">
                <div className="flex items-center gap-1 shrink-0 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">
                    <span className="material-symbols-rounded text-[12px] text-slate-400">public</span>
                    <span className="whitespace-nowrap">{info.regionIds.countryName}</span>
                    <span className="text-[9px] opacity-70 font-medium ml-0.5">({info.timezone >= 0 ? `+${info.timezone}` : info.timezone})</span>
                </div>
                
                {info.regionIds.cityName && (!nameIncludesCity) && (
                    <div className="flex items-center gap-1 min-w-0 overflow-hidden bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">
                        <span className="material-symbols-rounded text-[12px] text-slate-400 shrink-0">location_city</span>
                        <span className="truncate">{info.regionIds.cityName}</span>
                    </div>
                )}
                
                {info.regionIds.prefectureName && (
                    <div className="flex items-center gap-1 overflow-hidden bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">
                        <span className="truncate opacity-80">{info.regionIds.prefectureName}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export function FlightGrid() {
    const trip = useTripStore((state) => state.currentTrip);
    const addFlight = useTripStore((state) => state.addFlight);
    const updateFlight = useTripStore((state) => state.updateFlight);
    
    if (!trip) return null;

    const allBooked = (trip.flights || []).length > 0 && (trip.flights || []).every(f => f.isBooked);

    const toggleAllBooked = (checked: boolean) => {
        (trip.flights || []).forEach(f => {
            if (f.isBooked !== checked) {
                updateFlight(f.id, { isBooked: checked });
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {(trip.flights || [])
                        .filter(f => {
                            // 왕복인 경우, 출국편이거나 연결된 항목 중 우선순위가 높은 하나만 표시
                            if (f.isRoundTrip && f.linkedFlightId) {
                                const linked = (trip.flights || []).find(lf => lf.id === f.linkedFlightId);
                                if (linked) {
                                    // 우선순위: outbound (0) > other (1) > inbound (2)
                                    const typePriority: Record<string, number> = { outbound: 0, other: 1, inbound: 2 };
                                    const myPriority = typePriority[f.type] ?? 1;
                                    const linkedPriority = typePriority[linked.type] ?? 1;

                                    if (myPriority > linkedPriority) return false;
                                    if (myPriority === linkedPriority && f.id > linked.id) return false;
                                }
                            }
                            return true;
                        })
                        .sort((a, b) => {
                            if (a.type === 'outbound') return -1;
                            if (b.type === 'outbound') return 1;
                            if (a.type === 'inbound') return 1;
                            if (b.type === 'inbound') return -1;
                            return 0;
                        }).map((flight) => (
                            <motion.div
                                key={flight.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                            >
                                <FlightCard flight={flight} />
                            </motion.div>
                        ))}
                </AnimatePresence>
            </div>

            {/* 리스트 푸터: 추가 및 전체 상태 관리 */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-[28px] border border-slate-200 dark:border-slate-800">
                <div className="flex-1 flex items-center gap-4 px-2">
                    <CustomCheckbox
                        checked={allBooked}
                        onChange={toggleAllBooked}
                        label="위 모든 항공편 예약 완료"
                        size="sm"
                    />
                </div>
                <button
                    onClick={() => addFlight('other')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black text-slate-800 dark:text-slate-200 hover:border-primary/30 hover:bg-primary/5 transition-all shadow-sm uppercase tracking-widest"
                >
                    <span className="material-symbols-rounded text-lg">add</span>
                    항공편 추가하기
                </button>
            </div>
        </div>
    );
}

export function FlightCard({ flight }: { flight: FlightSegment }) {
    const trip = useTripStore((state) => state.currentTrip);
    const updateFlight = useTripStore((state) => state.updateFlight);
    const removeFlight = useTripStore((state) => state.removeFlight);
    
    const linkedFlight = useMemo(() => 
        flight.linkedFlightId ? (trip?.flights || []).find(f => f.id === flight.linkedFlightId) : undefined
    , [flight.linkedFlightId, trip?.flights]);

    const addRes = useTripStore((state) => state.addTransportReservation);
    const updateRes = useTripStore((state) => state.updateTransportReservation);
    const removeRes = useTripStore((state) => state.removeTransportReservation);

    const [isExpanded, setIsExpanded] = useState(false);

    // Timezone & Arrival Time Sync Logic
    const calculateArrivalTime = (target: FlightSegment, depTime: string, durationMin: number) => {
        const depA = AIRPORTS.find(a => a.code === target.departureLocation);
        const arrA = AIRPORTS.find(a => a.code === target.arrivalLocation);
        if (!depTime || !depA || !arrA) return;
        const [h, m] = depTime.split(':').map(Number);
        const date = new Date(2000, 0, 1, h, m);
        
        // Duration + Timezone Difference
        const tzOffsetMin = (arrA.timezone - depA.timezone) * 60;
        date.setMinutes(date.getMinutes() + durationMin + tzOffsetMin);
        
        const resH = String(date.getHours()).padStart(2, '0');
        const resM = String(date.getMinutes()).padStart(2, '0');
        updateFlight(target.id, { arrivalTime: `${resH}:${resM}` });
    };

    const syncDurationFromTimes = (target: FlightSegment, depT: string | undefined, arrT: string | undefined) => {
        const depA = AIRPORTS.find(a => a.code === target.departureLocation);
        const arrA = AIRPORTS.find(a => a.code === target.arrivalLocation);
        if (!depT || !arrT || !depA || !arrA) return;
        
        const [dH, dM] = depT.split(':').map(Number);
        const [aH, aM] = arrT.split(':').map(Number);
        let diff = (aH * 60 + aM) - (dH * 60 + dM);
        
        const tzOffsetMin = (arrA.timezone - depA.timezone) * 60;
        diff -= tzOffsetMin;
        
        if (diff < 0) diff += 24 * 60;
        
        updateFlight(target.id, { flightDurationMinutes: diff });
    };

    const handleDurationChange = (target: FlightSegment, newMin: number) => {
        updateFlight(target.id, { flightDurationMinutes: newMin });
        if (target.departureTime) {
            calculateArrivalTime(target, target.departureTime, newMin);
        }
    };


    const renderFlightSections = (target: FlightSegment, isInbound: boolean) => {
        const targetAirline = AIRLINES.find(a => a.code === target.airline || a.nameKo === target.airline || a.nameEn === target.airline);
        return (
            <div className="space-y-6">
                {flight.isRoundTrip && linkedFlight && (
                    <div className={cn(
                        "flex items-center gap-2 mb-4 p-3 rounded-xl border shadow-sm",
                        isInbound 
                            ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50" 
                            : "bg-primary/5 border-primary/10"
                    )}>
                        <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            isInbound ? "bg-emerald-500 text-white" : "bg-primary text-white"
                        )}>
                            <span className="material-symbols-rounded text-[18px]">
                                {isInbound ? "flight_land" : "flight_takeoff"}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className={cn("text-[10px] font-black uppercase tracking-widest leading-tight", isInbound ? "text-emerald-600 dark:text-emerald-400" : "text-primary")}>
                                {isInbound ? "귀국편" : "출국편"}
                            </span>
                            <span className={cn("text-[13px] font-black", isInbound ? "text-emerald-700 dark:text-emerald-300" : "text-slate-800 dark:text-slate-200")}>
                                {isInbound ? "귀국편 세부 정보" : "출국편 세부 정보"}
                            </span>
                        </div>
                    </div>
                )}
                
                {/* 일정 및 시간 설정 */}
                <FormSection title="일정 및 시간" icon="calendar_today">
                    <div className="grid grid-cols-12 gap-5">
                        <div className="col-span-12 space-y-1.5 font-bold">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">탑승 날짜</label>
                            <RestrictedDatePicker
                                value={target.date}
                                onChange={(v) => updateFlight(target.id, { date: v })}
                                className="w-full h-[48px]"
                            />
                        </div>

                        <div className="col-span-12">
                            {(() => {
                                const depA = AIRPORTS.find(a => a.code === target.departureLocation);
                                const arrA = AIRPORTS.find(a => a.code === target.arrivalLocation);
                                
                                // Distance & Expected Duration Calculation
                                let expectedMins = 0;
                                let rangeStart = 0;
                                let rangeEnd = 0;

                                if (depA && arrA) {
                                    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
                                        const R = 6371;
                                        const dLat = (lat2 - lat1) * Math.PI / 180;
                                        const dLon = (lon2 - lon1) * Math.PI / 180;
                                        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                                                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                                                Math.sin(dLon / 2) * Math.sin(dLon / 2);
                                        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                                        return R * c;
                                    };
                                    const dist = getDistance(depA.lat, depA.lng, arrA.lat, arrA.lng);
                                    expectedMins = Math.round((dist / 700) * 60 + 60);
                                    expectedMins = Math.max(60, expectedMins);
                                    
                                    rangeStart = Math.max(60, expectedMins - 30);
                                    rangeEnd = expectedMins + 45;

                                    // Auto-set if duration is 0
                                    if (!target.flightDurationMinutes && expectedMins > 0) {
                                        setTimeout(() => handleDurationChange(target, expectedMins), 0);
                                    }
                                }

                                return (
                                    <TransportTimeEditor 
                                        departureTime={target.departureTime || ''}
                                        arrivalTime={target.arrivalTime || ''}
                                        durationMins={target.flightDurationMinutes || 0}
                                        date={target.date}
                                        lat={depA?.lat}
                                        lng={depA?.lng}
                                        expectedRangeStart={rangeStart || undefined}
                                        expectedRangeEnd={rangeEnd || undefined}
                                        onDepartureChange={(newTime) => {
                                            updateFlight(target.id, { departureTime: newTime });
                                            if (target.arrivalTime) {
                                                syncDurationFromTimes(target, newTime, target.arrivalTime);
                                            }
                                        }}
                                        onArrivalChange={(newTime) => {
                                            updateFlight(target.id, { arrivalTime: newTime });
                                            if (target.departureTime) {
                                                syncDurationFromTimes(target, target.departureTime, newTime);
                                            }
                                        }}
                                        onDurationChange={(newMin) => handleDurationChange(target, newMin)}
                                        maxDurationMins={1440}
                                        isNextDayArrival={(() => {
                                            if (!target.departureTime || !depA || !arrA) return false;
                                            const [dH, dM] = target.departureTime.split(':').map(Number);
                                            const duration = target.flightDurationMinutes || 0;
                                            const totalOriginMins = dH * 60 + dM + duration;
                                            return Math.floor(totalOriginMins / 1440) > 0;
                                        })()}
                                    />
                                );
                            })()}
                        </div>
                    </div>
                </FormSection>

                {/* 항공 정보 */}
                <FormSection title="항공 정보" icon="flight">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AirlineSearchInput
                            label="항공사"
                            value={target.airline || ''}
                            onChange={(v) => {
                                const updates: Partial<FlightSegment> = { airline: v };
                                const airlineInfo = AIRLINES.find(a => a.code === v || a.nameKo === v || a.nameEn === v);
                                if (airlineInfo && target.flightNumber && /^\d+$/.test(target.flightNumber)) {
                                    updates.flightNumber = airlineInfo.code + target.flightNumber;
                                }
                                updateFlight(target.id, updates);
                            }}
                            placeholder="항공사명"
                            className="w-full"
                            align="left"
                        />
                        <div className="space-y-1.5 w-full">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">편명</label>
                            <div className="flex items-center bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 h-[48px] border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-inner">
                                {targetAirline?.code && (
                                    <span className="text-xs font-black text-primary mr-2 opacity-50">
                                        {targetAirline.code}
                                    </span>
                                )}
                                <input
                                    value={target.flightNumber?.replace(/^[A-Z]{2,3}/, '') || ''}
                                    onChange={(e) => {
                                        const numbersOnly = e.target.value.replace(/[^0-9]/g, '');
                                        const finalVal = targetAirline ? targetAirline.code + numbersOnly : numbersOnly;
                                        updateFlight(target.id, { flightNumber: finalVal });
                                    }}
                                    placeholder="703 (숫자만)"
                                    className="w-full bg-transparent outline-none font-bold text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </FormSection>

                {/* 경유 정보 */}
                <FormSection title="경유 정보" icon="alt_route">
                    <div className="space-y-3">
                        {(target.layovers || []).map((layover, index) => (
                            <div key={layover.id} className="flex gap-2 items-end bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 relative group/layover">
                                <div className="flex-1 space-y-1">
                                    <AirportSearchInput
                                        label={`경유지 ${index + 1}`}
                                        value={layover.airportCode || ''}
                                        onChange={(v) => {
                                            const newLayovers = [...(target.layovers || [])];
                                            newLayovers[index] = { ...newLayovers[index], airportCode: v };
                                            updateFlight(target.id, { layovers: newLayovers });
                                        }}
                                        departureCode={index === 0 ? target.departureLocation : target.layovers?.[index - 1]?.airportCode}
                                        recommendationRegions={trip?.locations.regions}
                                        placeholder="경유 공항"
                                        className="w-full"
                                    />
                                    <AirportInfo code={layover.airportCode} />
                                </div>
                                <div className="w-24 space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">대기 시간</label>
                                    <div className="flex items-center px-2 h-[42px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                                        <input
                                            type="number"
                                            value={layover.durationMinutes || ''}
                                            onChange={(e) => {
                                                const newLayovers = [...(target.layovers || [])];
                                                newLayovers[index] = { ...newLayovers[index], durationMinutes: parseInt(e.target.value) || 0 };
                                                updateFlight(target.id, { layovers: newLayovers });
                                            }}
                                            className="w-full bg-transparent outline-none text-xs font-bold text-right pr-1"
                                            placeholder="0"
                                        />
                                        <span className="text-[9px] font-black text-slate-400 shrink-0 uppercase">분</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => {
                                        const newLayovers = (target.layovers || []).filter((_, i) => i !== index);
                                        updateFlight(target.id, { layovers: newLayovers });
                                    }}
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                >
                                    <span className="material-symbols-rounded text-lg">close</span>
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => {
                                const newLayovers = [...(target.layovers || []), { id: Math.random().toString(36).substr(2, 9), airportCode: '' }];
                                updateFlight(target.id, { layovers: newLayovers });
                            }}
                            className="w-full py-2.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-[10px] font-black text-slate-500 transition-colors uppercase tracking-[0.2em]"
                        >
                            + 경유지 추가
                        </button>
                    </div>
                </FormSection>
            </div>
        );
    };

    return (
        <div className={cn(
            "group bg-white dark:bg-slate-900 border rounded-[20px] overflow-hidden transition-all duration-300",
            isExpanded ? "border-primary/30 dark:border-primary/60 shadow-xl ring-1 ring-primary/10" : "border-slate-200 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 shadow-sm"
        )}>
            {/* 요약 뷰 (다중행 고밀도 정보형) */}
            <div 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-4 cursor-pointer flex items-start gap-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/10"
            >
                {/* 2. Content Area */}
                <div className="flex-1 min-w-0 space-y-3">
                    {/* Top Row: General Info & Badges */}
                    <div className="flex items-center flex-wrap gap-2">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                            {flight.type === 'outbound' ? '출국' : flight.type === 'inbound' ? '귀국' : '일반'}
                        </span>
                        {flight.isRoundTrip && (
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-800/50">
                                왕복여정
                            </span>
                        )}
                        {(flight.isInternational || (flight.departureLocation && flight.arrivalLocation && 
                            AIRPORTS.find(a => a.code === flight.departureLocation)?.regionIds.countryId !== AIRPORTS.find(a => a.code === flight.arrivalLocation)?.regionIds.countryId)) && (
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-md border border-indigo-100/50 dark:border-indigo-800/50">
                                국제선
                            </span>
                        )}
                        <div className="h-3 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-black text-slate-800 dark:text-slate-100">
                                {flight.airline || '항공사 선택'}
                            </span>
                            {flight.flightNumber && (
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded">
                                    {flight.flightNumber}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Flight Segments (Smart Layout) */}
                    <div className="bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-[24px] border border-slate-200/50 dark:border-slate-800/30">
                        <div className={cn(
                            "flex flex-col gap-4 relative",
                            flight.isRoundTrip && linkedFlight ? "md:flex-row md:items-center md:gap-8" : "space-y-2"
                        )}>
                            {/* Outbound/One-way Segment */}
                            <div className="flex-1">
                                <FlightSegmentRow segment={flight} isRoundTrip={flight.isRoundTrip} />
                            </div>

                            {/* Divider for Round-trip */}
                            {flight.isRoundTrip && linkedFlight && (
                                <>
                                    <div className="hidden md:block w-[1px] h-10 bg-slate-200 dark:bg-slate-700/50" />
                                    <div className="md:hidden h-[1px] w-full bg-slate-200 dark:bg-slate-700/50" />
                                    <div className="flex-1">
                                        <FlightSegmentRow segment={linkedFlight} icon="flight_land" isRoundTrip={true} />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Right: Cost, Booking Status & Expand (Cluster) */}
                <div className="flex items-center gap-6 shrink-0 self-stretch pt-0.5">
                    <div className="flex flex-col items-end justify-center">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                updateFlight(flight.id, { isBooked: !flight.isBooked });
                            }}
                            className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest border-2 shrink-0",
                                flight.isBooked 
                                    ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20" 
                                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-200 dark:hover:border-slate-700"
                            )}
                        >
                            <span className="material-symbols-rounded text-base font-black">
                                {flight.isBooked ? 'verified' : 'radio_button_unchecked'}
                            </span>
                            <span className="whitespace-nowrap">{flight.isBooked ? '예약 완료' : '예약 처리'}</span>
                        </button>
                    </div>

                    <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-800 transition-all shadow-sm shrink-0",
                        isExpanded ? "bg-primary text-white scale-110" : "bg-white text-slate-300 dark:bg-slate-800"
                    )}>
                        <span className="material-symbols-rounded text-[20px] font-black">
                            {isExpanded ? 'close' : 'expand_more'}
                        </span>
                    </div>
                </div>
            </div>


            {/* 확장 편집 뷰 */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                        animate={{ 
                            height: 'auto', 
                            opacity: 1,
                            transitionEnd: { overflow: isExpanded ? 'visible' : 'hidden' }
                        }}
                        exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="border-t border-slate-200/60 dark:border-slate-800"
                    >
                        <div className="p-6 md:p-8 space-y-8 bg-slate-50/30 dark:bg-slate-900/30">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2.5 py-1.5 rounded-full border border-primary/10">
                                        {flight.isRoundTrip ? '왕복 항공편' : (flight.type === 'outbound' ? '출국 비행기' : flight.type === 'inbound' ? '귀국 비행기' : '기타 비행기')}
                                    </span>
                                    {flight.isRoundTrip && (
                                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-800">
                                            연결됨
                                        </span>
                                    )}
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); removeFlight(flight.id); }} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                >
                                    <span className="material-symbols-rounded text-[16px]">delete</span>
                                    삭제하기
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* 장소 설정 */}
                                <FormSection title="출발 및 도착지" icon="location_on">
                                    <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                                        <CustomCheckbox
                                            checked={flight.isRoundTrip || false}
                                            onChange={(checked) => {
                                                updateFlight(flight.id, { isRoundTrip: checked });
                                            }}
                                            label="왕복 여정으로 설정 (출귀국 정보 분리 입력)"
                                            size="sm"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                                        <div className="space-y-1">
                                            <AirportSearchInput
                                                label="출발 공항"
                                                value={flight.departureLocation || ''}
                                                onChange={(v) => {
                                                    updateFlight(flight.id, { departureLocation: v });
                                                }}
                                                intent="departure"
                                                // If it's inbound, we are departing from the trip location
                                                currentLocation={flight.type === 'inbound' ? trip?.locations.center : undefined}
                                                recommendationRegions={flight.type === 'inbound' ? trip?.locations.regions : [{ id: '093', type: 'country', name: '대한민국' }]}
                                                placeholder="공항 코드 또는 이름"
                                                className="w-full"
                                                align="left"
                                            />
                                            <AirportInfo code={flight.departureLocation} />
                                        </div>
                                        
                                        {/* Swap Button for Departure/Arrival */}
                                        <div className="absolute left-1/2 top-[32px] -translate-x-1/2 z-10 hidden md:block">
                                            <button 
                                                onClick={() => {
                                                    const temp = flight.departureLocation;
                                                    updateFlight(flight.id, { 
                                                        departureLocation: flight.arrivalLocation,
                                                        arrivalLocation: temp
                                                    });
                                                }}
                                                className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-400 hover:text-primary transition-colors"
                                            >
                                                <span className="material-symbols-rounded text-[18px]">swap_horiz</span>
                                            </button>
                                        </div>

                                        <div className="space-y-1">
                                            <AirportSearchInput
                                                label="도착 공항"
                                                value={flight.arrivalLocation || ''}
                                                onChange={(v) => {
                                                    updateFlight(flight.id, { arrivalLocation: v });
                                                }}
                                                intent="arrival"
                                                departureCode={flight.departureLocation}
                                                // If it's outbound, we are arriving at the trip location
                                                currentLocation={flight.type === 'outbound' ? trip?.locations.center : undefined}
                                                recommendationRegions={flight.type === 'inbound' ? [{ id: '093', type: 'country', name: '대한민국' }] : trip?.locations.regions}
                                                placeholder="공항 코드 또는 이름"
                                                className="w-full"
                                                align="right"
                                            />
                                            <AirportInfo code={flight.arrivalLocation} />
                                        </div>
                                    </div>
                                </FormSection>

                                <div className={cn(
                                    "grid gap-8",
                                    flight.isRoundTrip && linkedFlight ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
                                )}>
                                    <div className={cn(
                                        "transition-all",
                                        flight.isRoundTrip && "p-1 rounded-[24px]"
                                    )}>
                                        {renderFlightSections(flight, false)}
                                    </div>
                                    {flight.isRoundTrip && linkedFlight && (
                                        <div className="p-1 rounded-[24px] border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 md:pl-8 pt-8 md:pt-0">
                                            {renderFlightSections(linkedFlight, true)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 상세 예약 관리 및 예약 완료 여부 */}
                            <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-800 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-rounded text-slate-400">confirmation_number</span>
                                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">상세 예약 관리</h4>
                                        </div>
                                        <CustomCheckbox
                                            checked={!!flight.isBooked}
                                            onChange={(checked) => {
                                                updateFlight(flight.id, { isBooked: checked });
                                            }}
                                            label="모든 항공편(왕복 포함) 예약 완료됨"
                                            size="sm"
                                        />
                                    </div>
                                    <button
                                        onClick={() => addRes('flight', flight.id)}
                                        className="text-[10px] font-black text-white px-4 py-2 bg-slate-900 dark:bg-slate-700 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-sm uppercase tracking-widest"
                                    >
                                        예약 정보 추가
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    {(flight.reservations || []).map(res => (
                                        <ReservationItem
                                            key={res.id}
                                            res={res}
                                            onUpdate={(updates) => updateRes('flight', flight.id, res.id, updates)}
                                            onRemove={() => removeRes('flight', flight.id, res.id)}
                                        />
                                    ))}
                                    {linkedFlight && (linkedFlight.reservations || []).map(res => (
                                        <ReservationItem
                                            key={res.id}
                                            res={res}
                                            onUpdate={(updates) => updateRes('flight', linkedFlight.id, res.id, updates)}
                                            onRemove={() => removeRes('flight', linkedFlight.id, res.id)}
                                        />
                                    ))}
                                    {(!flight.reservations || flight.reservations.length === 0) && (!linkedFlight?.reservations || linkedFlight.reservations.length === 0) && (
                                        <UndecidedField 
                                            message="추가된 예약 일정이 없습니다"
                                            icon="receipt_long"
                                            onAction={() => addRes('flight', flight.id)}
                                            actionLabel="첫 번째 예약 정보 추가"
                                            className="opacity-60 bg-white dark:bg-slate-800/20 rounded-2xl"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
