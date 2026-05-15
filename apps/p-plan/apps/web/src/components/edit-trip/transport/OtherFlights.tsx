import { ReservationItem } from "./ReservationItem";

import { useTripStore } from '@pplaner/shared';
import { cn } from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { FlightSegment, DrivingSegment, PublicTransportSegment, TransportReservation } from '@pplaner/shared';
import { AirportSearchInput } from '../AirportSearchInput';
import { AirlineSearchInput } from '../AirlineSearchInput';
import { GoogleMapsSearch } from '@/components/common/GoogleMapsSearch';
import { CustomCheckbox, IconDropdown, UndecidedField, RestrictedDatePicker, TimeInput } from '../../common/FormComponents';
import { AIRLINES } from '@pplaner/shared';
import { isInternationalFlight } from '@pplaner/shared';

export function OtherFlights() {
    const trip = useTripStore((state) => state.currentTrip);
    const addFlight = useTripStore((state) => state.addFlight);
    const updateFlight = useTripStore((state) => state.updateFlight);
    const removeFlight = useTripStore((state) => state.removeFlight);

    if (!trip) return null;
    const others = trip.flights.filter(f => f.type === 'other');

    return (
        <div className="space-y-4">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">기타 비행 일정</h4>
            <div className="space-y-3">
                {others.map((f) => (
                    <OtherFlightItem key={f.id} f={f} />
                ))}
                <button
                    onClick={() => addFlight('other')}
                    className="w-full py-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black text-slate-400 hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-rounded text-lg">add</span>
                    기타 비행 일정 추가
                </button>
            </div>
        </div>
    );
}

export function OtherFlightItem({ f }: { f: FlightSegment }) {
    const trip = useTripStore((state) => state.currentTrip);
    const updateFlight = useTripStore((state) => state.updateFlight);
    const removeFlight = useTripStore((state) => state.removeFlight);
    const addRes = useTripStore((state) => state.addTransportReservation);
    const updateRes = useTripStore((state) => state.updateTransportReservation);
    const removeRes = useTripStore((state) => state.removeTransportReservation);

    // Automate isInternational status
    useEffect(() => {
        if (f) {
            const calculated = isInternationalFlight(f.departureLocation || '', f.arrivalLocation || '');
            if (calculated !== f.isInternational) {
                updateFlight(f.id, { isInternational: calculated });
            }
        }
    }, [f?.departureLocation, f?.arrivalLocation, f?.id, f?.isInternational, updateFlight]);
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden group hover:border-primary/20 transition-all">
            <div className="p-5 flex items-center gap-6">
                <div className="flex-1 space-y-4 min-w-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AirportSearchInput
                            value={f.departureLocation || ''}
                            onChange={(v) => {
                                const isInter = isInternationalFlight(v, f.arrivalLocation || '');
                                updateFlight(f.id, { departureLocation: v, isInternational: isInter });
                            }}
                            intent="departure"
                            recommendationRegions={f.type === 'outbound' ? [{ id: '093', type: 'country', name: '대한민국' }] : (f.type === 'inbound' ? trip?.locations?.regions : trip?.locations?.regions)}
                            currentLocation={trip?.locations?.center}
                            placeholder="출발"
                            inputClassName="px-3 py-2 rounded-lg"
                            className="w-full"
                            align="left"
                        />
                        <AirportSearchInput
                            value={f.arrivalLocation || ''}
                            onChange={(v) => {
                                const isInter = isInternationalFlight(f.departureLocation || '', v);
                                updateFlight(f.id, { arrivalLocation: v, isInternational: isInter });
                            }}
                            intent="arrival"
                            recommendationRegions={f.type === 'outbound' ? trip?.locations?.regions : (f.type === 'inbound' ? [{ id: '093', type: 'country', name: '대한민국' }] : trip?.locations?.regions)}
                            currentLocation={trip?.locations?.center}
                            placeholder="도착"
                            inputClassName="px-3 py-2 rounded-lg"
                            className="w-full"
                            align="right"
                        />
                    </div>
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-12 sm:col-span-12 md:col-span-4 flex flex-col gap-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">날짜</label>
                            <RestrictedDatePicker
                                value={f.date}
                                onChange={(v) => updateFlight(f.id, { date: v })}
                                className="h-10"
                            />
                        </div>
                        <div className="col-span-12 sm:col-span-6 md:col-span-4">
                            <div className="grid grid-cols-2 gap-2">
                                <TimeInput 
                                    label="출발"
                                    value={f.departureTime || ''}
                                    onChange={(v) => updateFlight(f.id, { departureTime: v })}
                                />
                                <TimeInput 
                                    label="도착"
                                    value={f.arrivalTime || ''}
                                    onChange={(v) => updateFlight(f.id, { arrivalTime: v })}
                                />
                            </div>
                        </div>
                        <div className="col-span-12 sm:col-span-12 md:col-span-4 flex flex-col gap-1">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">비용 (KRW)</label>
                                <CustomCheckbox
                                    checked={f.isCostUndecided || false}
                                    onChange={(checked) => updateFlight(f.id, { isCostUndecided: checked })}
                                    label="미정"
                                    size="sm"
                                />
                            </div>
                            <input
                                type="number"
                                value={f.cost || ''}
                                onChange={(e) => updateFlight(f.id, { cost: e.target.value === '' ? undefined : Number(e.target.value) })}
                                disabled={f.isCostUndecided}
                                placeholder={f.isCostUndecided ? "미정" : "0"}
                                className={cn(
                                    "w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold outline-none transition-all",
                                    f.isCostUndecided && "opacity-50 grayscale"
                                )}
                            />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
                        <span className={cn(
                            "text-[10px] font-black uppercase tracking-tight",
                            f.isInternational ? "text-indigo-600" : "text-slate-400"
                        )}>
                            {f.isInternational ? '국제선' : '국내선'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                isExpanded ? "bg-primary text-white" : "bg-slate-50 text-slate-400 dark:bg-slate-800 hover:bg-slate-100"
                            )}
                        >
                            <span className="material-symbols-rounded text-sm">{isExpanded ? 'expand_less' : 'more_horiz'}</span>
                        </button>
                        <button onClick={() => removeFlight(f.id)} className="material-symbols-rounded text-slate-300 hover:text-red-500 transition-colors">delete</button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-200/60 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 p-5 space-y-6"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <AirlineSearchInput
                                label="항공사"
                                value={f.airline || ''}
                                onChange={(v) => {
                                    const updates: any = { airline: v };
                                    if (v && f.flightNumber && /^\d+$/.test(f.flightNumber)) {
                                        const airline = AIRLINES.find(a => a.nameKo === v || a.nameEn === v);
                                        if (airline) {
                                            updates.flightNumber = airline.code + f.flightNumber;
                                        }
                                    }
                                    updateFlight(f.id, updates);
                                }}
                                placeholder="대한항공"
                                align="left"
                            />
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">편명</label>
                                <input
                                    value={f.flightNumber || ''}
                                    onChange={(e) => {
                                        let val = e.target.value.toUpperCase();
                                        if (/^\d+$/.test(val) && f.airline) {
                                            const airline = AIRLINES.find(a => a.nameKo === f.airline || a.nameEn === f.airline);
                                            if (airline) {
                                                val = airline.code + val;
                                            }
                                        }
                                        updateFlight(f.id, { flightNumber: val });
                                    }}
                                    placeholder="KE703"
                                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 rounded-xl outline-none font-bold text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">상세 예약 관리</h5>
                                    <CustomCheckbox
                                        checked={!!f.isBooked}
                                        onChange={(checked) => updateFlight(f.id, { isBooked: checked })}
                                        label="예약 완료됨"
                                        size="sm"
                                    />
                                </div>
                                <button
                                    onClick={() => addRes('flight', f.id)}
                                    className="text-[9px] font-black text-sky-600 px-3 py-1.5 bg-sky-50 dark:bg-sky-900/20 rounded-lg border border-sky-100 dark:border-sky-800 transition-colors hover:bg-sky-100 dark:hover:bg-sky-800"
                                >
                                    예약 정보 추가
                                </button>
                            </div>
                            <div className="space-y-3">
                                {(f.reservations || []).map(res => (
                                    <ReservationItem
                                        key={res.id}
                                        res={res}
                                        onUpdate={(updates) => updateRes('flight', f.id, res.id, updates)}
                                        onRemove={() => removeRes('flight', f.id, res.id)}
                                    />
                                ))}
                                {(!f.reservations || f.reservations.length === 0) && (
                                    <UndecidedField 
                                        message="추가된 예약 일정이 없습니다."
                                        icon="receipt_long"
                                        onAction={() => addRes('flight', f.id)}
                                        actionLabel="예약 정보 추가하기"
                                    />
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

