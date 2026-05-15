import { ReservationItem } from "./ReservationItem";

import { useTripStore, cn, resolveRegionIdsFromPlace } from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import { PublicTransportSegment } from '@pplaner/shared';
import { GoogleMapsSearch } from '@/components/common/GoogleMapsSearch';
import { CustomCheckbox, IconDropdown, UndecidedField, RestrictedDatePicker, TimeInput } from '../../common/FormComponents';
import { TransportTimeEditor } from '../../common/TransportTimeEditor';
import { TimeRangeSlider } from '../../common/TimeRangeSlider';
import { Globe, Map as MapIcon, Flag } from 'lucide-react';
import { AIRLINES } from '@pplaner/shared';



export function PublicTransportList() {
    const trip = useTripStore((state) => state.currentTrip);
    const addPT = useTripStore((state) => state.addPublicTransport);
    const updatePT = useTripStore((state) => state.updatePublicTransport);

    if (!trip) return null;

    const allBooked = trip.publicTransport.length > 0 && trip.publicTransport.every(pt => pt.isBooked);

    const toggleAllBooked = (checked: boolean) => {
        trip.publicTransport.forEach(pt => {
            if (pt.isBooked !== checked) {
                updatePT(pt.id, { isBooked: checked });
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {trip.publicTransport.map((pt) => (
                        <motion.div
                            key={pt.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            <PublicTransportCard pt={pt} />
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
                        label="위 모든 대중교통 예약 완료"
                        size="sm"
                    />
                </div>
                <button
                    onClick={addPT}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black text-slate-800 dark:text-slate-200 hover:border-indigo-500/30 hover:bg-indigo-50/10 transition-all shadow-sm uppercase tracking-widest"
                >
                    <span className="material-symbols-rounded text-lg">add</span>
                    대중교통 추가하기
                </button>
            </div>
        </div>
    );
}

export function PublicTransportCard({ pt }: { pt: PublicTransportSegment }) {
    const updatePT = useTripStore((state) => state.updatePublicTransport);
    const removePT = useTripStore((state) => state.removePublicTransport);
    const addRes = useTripStore((state) => state.addTransportReservation);
    const updateRes = useTripStore((state) => state.updateTransportReservation);
    const removeRes = useTripStore((state) => state.removeTransportReservation);

    const [isExpanded, setIsExpanded] = useState(false);




    const isTaxi = pt.type === 'taxi';

    const getTransportConfig = (type: string) => {
        switch (type) {
            case 'bus': return { icon: 'directions_bus', label: '버스', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-100 dark:border-emerald-800/30' };
            case 'train': return { icon: 'directions_railway', label: '기차', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-100 dark:border-blue-800/30' };
            case 'ferry': return { icon: 'directions_boat', label: '페리', color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-100 dark:border-cyan-800/30' };
            case 'shuttle': return { icon: 'airport_shuttle', label: '셔틀', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-100 dark:border-indigo-800/30' };
            case 'taxi': return { icon: 'local_taxi', label: '택시', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-100 dark:border-amber-800/30' };
            case 'ropeway': return { icon: 'airline_seat_recline_extra', label: '로프웨이', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-100 dark:border-rose-800/30' };
            case 'trolleybus': return { icon: 'tram', label: '트롤리버스', color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-800/50', border: 'border-slate-200 dark:border-slate-700' };
            case 'pass': return { icon: 'card_membership', label: '교통 패스', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-100 dark:border-purple-800/30' };
            default: return { icon: 'more_horiz', label: '기타 대중교통', color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-800/50', border: 'border-slate-200 dark:border-slate-700' };
        }
    };

    const config = getTransportConfig(pt.type);

    const calculateArrivalTime = (target: PublicTransportSegment, depTime: string, durationMin: number) => {
        if (!depTime) return;
        const [h, m] = depTime.split(':').map(Number);
        const date = new Date(2000, 0, 1, h, m);
        date.setMinutes(date.getMinutes() + durationMin);
        
        const resH = String(date.getHours()).padStart(2, '0');
        const resM = String(date.getMinutes()).padStart(2, '0');
        
        const isNextDay = (h * 60 + m + durationMin) >= 1440;
        updatePT(target.id, { 
            arrivalTime: `${resH}:${resM}`,
            isNextDayArrival: isNextDay
        });
    };

    const syncDurationFromTimes = (target: PublicTransportSegment, depT: string | undefined, arrT: string | undefined) => {
        if (!depT || !arrT) return;
        
        const [dH, dM] = depT.split(':').map(Number);
        const [aH, aM] = arrT.split(':').map(Number);
        let diff = (aH * 60 + aM) - (dH * 60 + dM);
        
        if (target.isNextDayArrival) diff += 1440;
        if (diff < 0) diff += 1440; // Fallback
        
        updatePT(target.id, { duration: diff });
    };

    const handleDurationChange = (target: PublicTransportSegment, newMin: number) => {
        updatePT(target.id, { duration: newMin });
        if (target.departureTime) {
            calculateArrivalTime(target, target.departureTime, newMin);
        }
    };

    return (
        <div className={cn(
            "group bg-white dark:bg-slate-900 border rounded-[24px] overflow-hidden transition-all duration-300",
            isExpanded ? "border-indigo-200 dark:border-indigo-900/50 shadow-xl ring-1 ring-indigo-500/10" : "border-slate-200 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 shadow-sm"
        )}>
            {/* 요약 뷰 (클릭 시 확장) */}
            <div 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-4 md:p-6 cursor-pointer flex items-center justify-between gap-4"
            >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", config.bg)}>
                        <span className={cn("material-symbols-rounded font-black text-2xl", config.color)}>
                            {config.icon}
                        </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">
                                {pt.name || config.label}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <div className="flex items-center gap-1.5 overflow-hidden">
                                {pt.departureLocation ? (
                                    <>
                                        <span className="truncate max-w-[80px] font-black text-slate-600 dark:text-slate-300">{pt.departureLocation}</span>
                                        <span className="material-symbols-rounded text-[14px]">arrow_forward</span>
                                        <span className="truncate max-w-[80px] font-black text-slate-600 dark:text-slate-300">{pt.arrivalLocation || '미정'}</span>
                                    </>
                                ) : (
                                    <span>경로 미입력</span>
                                )}
                            </div>
                            <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className="material-symbols-rounded text-[14px]">schedule</span>
                                <span>{pt.departureTime || '시간미정'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Right: Booking Status & Expand (Cluster) */}
                <div className="flex items-center gap-6 shrink-0 self-stretch pt-0.5">
                    <div className="flex flex-col items-end justify-center">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                updatePT(pt.id, { isBooked: !pt.isBooked });
                            }}
                            className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest border-2 shrink-0",
                                pt.isBooked 
                                    ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20" 
                                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-200 dark:hover:border-slate-700"
                            )}
                        >
                            <span className="material-symbols-rounded text-base font-black">
                                {pt.isBooked ? 'verified' : 'radio_button_unchecked'}
                            </span>
                            <span className="whitespace-nowrap">{pt.isBooked ? '예약 완료' : '예약 처리'}</span>
                        </button>
                    </div>

                    <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-800 transition-all shadow-sm shrink-0",
                        isExpanded ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rotate-180" : "text-slate-300 group-hover:text-slate-400"
                    )}>
                        <span className="material-symbols-rounded text-[20px] font-black">expand_more</span>
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
                            {/* 삭제 버튼 추가 */}
                            <div className="flex justify-end">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); removePT(pt.id); }} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                >
                                    <span className="material-symbols-rounded text-[16px]">delete</span>
                                    삭제하기
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* 교통수단 선택 및 경로 정보 */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
                                    {/* Left Column: Transport Info & Locations */}
                                    <div className="space-y-6">
                                        <div className="bg-white dark:bg-slate-800/50 p-8 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm space-y-6 h-full flex flex-col">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">이동 수단 및 경로</h3>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">이동 수단</label>
                                                    <IconDropdown
                                                        value={pt.type || 'train'}
                                                        options={[
                                                            { value: 'train', label: '기차', icon: 'directions_railway' },
                                                            { value: 'bus', label: '버스', icon: 'directions_bus' },
                                                            { value: 'subway', label: '지하철', icon: 'subway' },
                                                            { value: 'shinkansen', label: '신칸센', icon: 'train' },
                                                            { value: 'ferry', label: '페리', icon: 'directions_boat' },
                                                            { value: 'ropeway', label: '로프웨이', icon: 'airline_seat_recline_extra' },
                                                            { value: 'shuttle', label: '셔틀', icon: 'airport_shuttle' },
                                                            { value: 'taxi', label: '택시', icon: 'local_taxi' },
                                                            { value: 'pass', label: '패스', icon: 'card_membership' },
                                                            { value: 'other', label: '기타', icon: 'more_horiz' }
                                                        ]}
                                                        onChange={(val) => updatePT(pt.id, { type: val as any })}
                                                        className="h-[48px]"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">노선 / 편명</label>
                                                    <div className="relative">
                                                        <input
                                                            value={pt.name || ''}
                                                            onChange={(e) => updatePT(pt.id, { name: e.target.value })}
                                                            placeholder="예: 2호선, 6001번"
                                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-black outline-none h-[48px] border border-slate-100 dark:border-slate-800 focus:border-primary/30 transition-all shadow-inner"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                                                {!isTaxi ? (
                                                    <div className="space-y-3 relative">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">출발 장소</label>
                                                            <GoogleMapsSearch 
                                                                defaultValue={pt.departureLocation || ''}
                                                                onPlaceSelect={async (place) => {
                                                                    const ids = await resolveRegionIdsFromPlace(place);
                                                                    updatePT(pt.id, { 
                                                                        departureLocation: place.formatted_address || place.name || '',
                                                                        departureLat: place.geometry?.location?.lat(),
                                                                        departureLng: place.geometry?.location?.lng(),
                                                                        departureCountryId: ids.countryId,
                                                                        departurePrefectureId: ids.prefectureId,
                                                                        departureCityId: ids.cityId
                                                                    });
                                                                }}
                                                                placeholder="출발지를 입력하세요"
                                                                className="w-full"
                                                            />
                                                        </div>

                                                        {/* Swap Button: Centered between inputs */}
                                                        <div className="flex justify-center -my-2 relative z-10">
                                                            <button 
                                                                onClick={() => {
                                                                    const tempLoc = pt.departureLocation;
                                                                    const tempLat = pt.departureLat;
                                                                    const tempLng = pt.departureLng;
                                                                    const tempCId = pt.departureCountryId;
                                                                    const tempPId = pt.departurePrefectureId;
                                                                    const tempCityId = pt.departureCityId;

                                                                    updatePT(pt.id, { 
                                                                        departureLocation: pt.arrivalLocation,
                                                                        departureLat: pt.arrivalLat,
                                                                        departureLng: pt.arrivalLng,
                                                                        departureCountryId: pt.arrivalCountryId,
                                                                        departurePrefectureId: pt.arrivalPrefectureId,
                                                                        departureCityId: pt.arrivalCityId,
                                                                        arrivalLocation: tempLoc,
                                                                        arrivalLat: tempLat,
                                                                        arrivalLng: tempLng,
                                                                        arrivalCountryId: tempCId,
                                                                        arrivalPrefectureId: tempPId,
                                                                        arrivalCityId: tempCityId
                                                                    });
                                                                }}
                                                                className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary/50 transition-all active:scale-90"
                                                                title="출발/도착지 반전"
                                                            >
                                                                <span className="material-symbols-rounded text-[18px]">swap_vert</span>
                                                            </button>
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">도착 장소</label>
                                                            <GoogleMapsSearch 
                                                                defaultValue={pt.arrivalLocation || ''}
                                                                onPlaceSelect={async (place) => {
                                                                    const ids = await resolveRegionIdsFromPlace(place);
                                                                    updatePT(pt.id, { 
                                                                        arrivalLocation: place.formatted_address || place.name || '',
                                                                        arrivalLat: place.geometry?.location?.lat(),
                                                                        arrivalLng: place.geometry?.location?.lng(),
                                                                        arrivalCountryId: ids.countryId,
                                                                        arrivalPrefectureId: ids.prefectureId,
                                                                        arrivalCityId: ids.cityId
                                                                    });
                                                                }}
                                                                placeholder="도착지를 입력하세요"
                                                                className="w-full"
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">이동 정보 (택시/메모)</label>
                                                        <input
                                                            value={pt.departureLocation || ''}
                                                            onChange={(e) => updatePT(pt.id, { departureLocation: e.target.value })}
                                                            placeholder="예: 호텔 -> 공항 택시 이동 정보"
                                                            className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-black outline-none h-[48px] border border-slate-100 dark:border-slate-800 focus:border-primary/30 transition-all shadow-inner"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Right Column: Date & Time */}
                                    <div className="space-y-6">
                                        <div className="bg-white dark:bg-slate-800/50 p-8 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm space-y-6 h-full flex flex-col">
                                            <div className="flex items-center justify-between px-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">일정 및 시간</h3>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <CustomCheckbox
                                                        checked={!!pt.isDateUndecided}
                                                        onChange={(checked) => updatePT(pt.id, { isDateUndecided: checked })}
                                                        label="날짜 미정"
                                                        size="sm"
                                                    />
                                                    <CustomCheckbox
                                                        checked={!!pt.isTimeUndecided}
                                                        onChange={(checked) => updatePT(pt.id, { isTimeUndecided: checked })}
                                                        label="시간 미정"
                                                        size="sm"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">날짜</label>
                                                    <RestrictedDatePicker
                                                        value={pt.date}
                                                        disabled={pt.isDateUndecided}
                                                        onChange={(v) => updatePT(pt.id, { date: v })}
                                                        className="h-[48px]"
                                                    />
                                                </div>

                                                {!pt.isTimeUndecided ? (
                                                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800/50">
                                                        {(() => {
                                                            let rangeStart: number | undefined;
                                                            let rangeEnd: number | undefined;

                                                            if (pt.departureLat && pt.departureLng && pt.arrivalLat && pt.arrivalLng) {
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
                                                                const dist = getDistance(pt.departureLat, pt.departureLng, pt.arrivalLat, pt.arrivalLng);
                                                                
                                                                let speed = 60;
                                                                if (pt.type === 'train') speed = 120;
                                                                if (pt.type === 'ferry') speed = 30;
                                                                if (pt.type === 'taxi') speed = 70;

                                                                const expectedMins = Math.round((dist / speed) * 60 + (pt.type === 'train' ? 20 : 10));
                                                                rangeStart = Math.max(5, expectedMins - Math.min(20, expectedMins * 0.2));
                                                                rangeEnd = expectedMins + Math.min(30, expectedMins * 0.3);

                                                                if (!pt.duration && expectedMins > 0) {
                                                                    setTimeout(() => handleDurationChange(pt, expectedMins), 0);
                                                                }
                                                            }

                                                            return (
                                                                <TransportTimeEditor 
                                                                    departureTime={pt.departureTime || ''}
                                                                    arrivalTime={pt.arrivalTime || ''}
                                                                    durationMins={pt.duration || 0}
                                                                    date={pt.date}
                                                                    lat={pt.departureLat}
                                                                    lng={pt.departureLng}
                                                                    expectedRangeStart={rangeStart}
                                                                    expectedRangeEnd={rangeEnd}
                                                                    onDepartureChange={(newTime) => {
                                                                        updatePT(pt.id, { departureTime: newTime });
                                                                        if (pt.duration) {
                                                                            calculateArrivalTime(pt, newTime, pt.duration);
                                                                        }
                                                                    }}
                                                                    onDurationChange={(newMin) => handleDurationChange(pt, newMin)}
                                                                    maxDurationMins={1440}
                                                                    isNextDayArrival={!!pt.isNextDayArrival}
                                                                />
                                                            );
                                                        })()}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                                                        <div className="flex items-center justify-between px-1">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                                <span className="material-symbols-rounded text-sm">schedule</span>
                                                                예상 소요 시간
                                                            </label>
                                                            <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-full border border-indigo-100 dark:border-indigo-800/50">
                                                                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                                                                    {pt.duration ? `${Math.floor(pt.duration / 60)}시간 ${pt.duration % 60}분` : '시간 미정'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="relative h-6 flex items-center">
                                                            <input
                                                                type="range"
                                                                min="0"
                                                                max={1440}
                                                                step="5"
                                                                value={pt.duration || 0}
                                                                onChange={(e) => updatePT(pt.id, { duration: Number(e.target.value) })}
                                                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 상세 예약 섹션 */}



                            {/* 상세 예약 섹션 */}
                            <div className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-rounded text-slate-400">confirmation_number</span>
                                            <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">상세 예약 정보</h5>
                                        </div>
                                        <CustomCheckbox
                                            checked={!!pt.isBooked}
                                            onChange={(checked) => updatePT(pt.id, { isBooked: checked })}
                                            label="예약 완료됨"
                                            size="sm"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => addRes('public', pt.id)} 
                                        className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-xl hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 transition-all border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-1.5 uppercase tracking-widest"
                                    >
                                        <span className="material-symbols-rounded text-[16px]">add</span>
                                        예약 추가
                                    </button>
                                </div>
                                
                                <div className="space-y-4">
                                    {pt.reservations.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-4">
                                            {pt.reservations.map(res => (
                                                <ReservationItem
                                                    key={res.id}
                                                    res={res}
                                                    onUpdate={(updates) => updateRes('public', pt.id, res.id, updates)}
                                                    onRemove={() => removeRes('public', pt.id, res.id)}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <UndecidedField 
                                            message="추가된 예약 일정이 없습니다"
                                            icon="receipt_long"
                                            onAction={() => addRes('public', pt.id)}
                                            actionLabel="첫 번째 예약 정보 추가"
                                            className="opacity-60 bg-white dark:bg-slate-800/20"
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

