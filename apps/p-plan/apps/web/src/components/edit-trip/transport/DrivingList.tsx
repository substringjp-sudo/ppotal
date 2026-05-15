import { ReservationItem } from "./ReservationItem";

import { useTripStore } from '@pplaner/shared';
import { cn } from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { DrivingSegment } from '@pplaner/shared';
import { GoogleMapsSearch } from '@/components/common/GoogleMapsSearch';
import { CustomCheckbox, IconDropdown, UndecidedField, RestrictedDatePicker, TimeInput } from '../../common/FormComponents';
import { resolveRegionIdsFromPlace } from '@pplaner/shared';

import { Globe, Map as MapIcon, Flag } from 'lucide-react';



function FormSection({ title, children, icon }: { title: string, children: React.ReactNode, icon?: string }) {
    return (
        <div className="space-y-3 p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/40">
            <div className="flex items-center gap-2 px-1">
                {icon && <span className="material-symbols-rounded text-[16px] text-emerald-500/60">{icon}</span>}
                <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{title}</h4>
            </div>
            <div className="bg-white dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm">
                {children}
            </div>
        </div>
    );
}

export function DrivingList() {
    const trip = useTripStore((state) => state.currentTrip);
    const addDriving = useTripStore((state) => state.addDriving);
    const updateDriving = useTripStore((state) => state.updateDriving);

    if (!trip) return null;

    const allBooked = trip.driving.length > 0 && trip.driving.every(d => d.isBooked);

    const toggleAllBooked = (checked: boolean) => {
        trip.driving.forEach(d => {
            if (d.isBooked !== checked) {
                updateDriving(d.id, { isBooked: checked });
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {trip.driving.map((d) => (
                        <motion.div
                            key={d.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            <DrivingCard driving={d} />
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
                        label="위 모든 드라이브 예약 완료"
                        size="sm"
                    />
                </div>
                <button
                    onClick={addDriving}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black text-slate-800 dark:text-slate-200 hover:border-emerald-500/30 hover:bg-emerald-50/5 transition-all shadow-sm uppercase tracking-widest"
                >
                    <span className="material-symbols-rounded text-lg">add</span>
                    드라이브 추가하기
                </button>
            </div>
        </div>
    );
}

export function DrivingCard({ driving }: { driving: DrivingSegment }) {
    const updateDriving = useTripStore((state) => state.updateDriving);
    const removeDriving = useTripStore((state) => state.removeDriving);
    const addRes = useTripStore((state) => state.addTransportReservation);
    const updateRes = useTripStore((state) => state.updateTransportReservation);
    const removeRes = useTripStore((state) => state.removeTransportReservation);
    
    const [isExpanded, setIsExpanded] = useState(false);




    // Sync return location if return same as pickup is checked
    useEffect(() => {
        if (driving.isReturnSameAsPickup && driving.pickupLocation !== driving.returnLocation) {
            updateDriving(driving.id, { returnLocation: driving.pickupLocation });
        }
    }, [driving.isReturnSameAsPickup, driving.pickupLocation, driving.id, updateDriving, driving.returnLocation]);

    const getDurationText = () => {
        if (!driving.pickupTime || !driving.returnTime) return null;
        const start = new Date(driving.pickupTime);
        const end = new Date(driving.returnTime);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

        const diffMs = end.getTime() - start.getTime();
        if (diffMs <= 0) return null;

        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return `${days > 0 ? `${days}일 ` : ''}${hours}시간`;
    };

    const splitDateTime = (dt?: string) => {
        if (!dt || !dt.includes('T')) return { date: '', time: '' };
        const [date, time] = dt.split('T');
        return { date, time };
    };

    const updateDateTime = (field: 'pickupTime' | 'returnTime', part: 'date' | 'time', value: string) => {
        const current = splitDateTime(driving[field]);
        current[part] = value;
        const newDT = (current.date && current.time) ? `${current.date}T${current.time}` : (current.date || current.time ? `${current.date || ''}T${current.time || ''}` : '');

        const updates: Partial<DrivingSegment> = { [field]: newDT };

        // Mark as manually edited if user changes returnTime's time
        if (field === 'returnTime' && part === 'time') {
            updates.isReturnTimeManuallyEdited = true;
        }

        // Sync logic: if pickupTime's time changes and returnTime hasn't been manually edited, sync it
        if (field === 'pickupTime' && part === 'time' && driving.isRental && !driving.isReturnTimeManuallyEdited) {
            const returnDT = splitDateTime(driving.returnTime);
            const targetReturnDate = returnDT.date || current.date;
            const newReturnDT = targetReturnDate ? `${targetReturnDate}T${value}` : `T${value}`;
            updates.returnTime = newReturnDT;
        }

        updateDriving(driving.id, updates);
    };

    const vehicleConfig = {
        sedan: { icon: 'directions_car', label: '승용차' },
        van: { icon: 'airport_shuttle', label: '승합차' },
        electric: { icon: 'electric_car', label: '전기차' },
        motorcycle: { icon: 'motorcycle', label: '오토바이' },
        bicycle: { icon: 'pedal_bike', label: '자전거' },
        other: { icon: 'more_horiz', label: '기타' }
    }[driving.vehicleType || 'sedan'];

    return (
        <div className={cn(
            "group bg-white dark:bg-slate-900 border rounded-[24px] overflow-hidden transition-all duration-300",
            isExpanded ? "border-emerald-500/20 dark:border-emerald-500/50 shadow-xl ring-1 ring-emerald-500/10" : "border-slate-200 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 shadow-sm"
        )}>
            {/* 요약 뷰 */}
            <div 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-4 md:p-6 cursor-pointer flex items-center justify-between gap-4"
            >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                        isExpanded ? "bg-emerald-500 text-white" : "bg-emerald-500/5 text-emerald-500"
                    )}>
                        <span className="material-symbols-rounded font-black text-2xl">
                            {vehicleConfig.icon}
                        </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">
                                {driving.isRental ? '렌터카' : '직접 운전'}
                                {driving.pickupLocation && ` - ${driving.pickupLocation}`}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            {driving.isRental && (
                                <>
                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                        <span className="truncate max-w-[120px] font-black text-slate-600 dark:text-slate-300">{driving.pickupLocation || '출발'}</span>
                                        <span className="material-symbols-rounded text-[14px]">arrow_forward</span>
                                        <span className="truncate max-w-[120px] font-black text-slate-600 dark:text-slate-300">
                                            {driving.isReturnSameAsPickup ? '대여지 동일' : (driving.returnLocation || '도착')}
                                        </span>
                                    </div>
                                    <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                                </>
                            )}
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className="material-symbols-rounded text-[14px]">calendar_today</span>
                                <span>{splitDateTime(driving.pickupTime).date || '날짜 미정'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 shrink-0 pt-0.5">
                    {driving.isRental && (
                    <div className="flex flex-col items-end justify-center">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                updateDriving(driving.id, { isBooked: !driving.isBooked });
                            }}
                            className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest border-2 shrink-0",
                                driving.isBooked 
                                    ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20" 
                                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-200 dark:hover:border-slate-700"
                            )}
                        >
                            <span className="material-symbols-rounded text-base font-black">
                                {driving.isBooked ? 'verified' : 'radio_button_unchecked'}
                            </span>
                            <span className="whitespace-nowrap">{driving.isBooked ? '예약 완료' : '예약 처리'}</span>
                        </button>
                    </div>
                    )}
                    <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-800 transition-all shadow-sm",
                        isExpanded ? "bg-emerald-500 text-white scale-110" : "bg-white text-slate-300 dark:bg-slate-800"
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
                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-800">
                                        {driving.isRental ? '렌터카 이용' : '운전' }
                                    </span>
                                    {driving.vehicleType && (
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                                            {vehicleConfig.label}
                                        </span>
                                    )}
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); removeDriving(driving.id); }} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                >
                                    <span className="material-symbols-rounded text-[16px]">delete</span>
                                    삭제하기
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* 기본 설정 */}
                                <FormSection title="운송 수단 정보" icon="settings">
                                    <div className="flex flex-wrap items-center gap-6">
                                        <IconDropdown
                                            value={driving.vehicleType}
                                            onChange={(v) => updateDriving(driving.id, { vehicleType: v as DrivingSegment['vehicleType'] })}
                                            options={[
                                                { value: 'sedan', label: '승용차', icon: 'directions_car' },
                                                { value: 'van', label: '승합차', icon: 'airport_shuttle' },
                                                { value: 'electric', label: '전기차', icon: 'electric_car' },
                                                { value: 'motorcycle', label: '오토바이', icon: 'motorcycle' },
                                                { value: 'bicycle', label: '자전거', icon: 'pedal_bike' },
                                                { value: 'other', label: '기타', icon: 'more_horiz' }
                                            ]}
                                            className="w-40 bg-slate-50 dark:bg-slate-900"
                                        />
                                        <CustomCheckbox
                                            checked={!!driving.isRental}
                                            onChange={(checked) => updateDriving(driving.id, { isRental: checked })}
                                            label="렌터카로 이용"
                                        />
                                    </div>
                                </FormSection>

                                {driving.isRental && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-6 overflow-hidden"
                                    >
                                        {/* 장소 및 시간 설정 */}
                                        <FormSection title="일정 및 장소" icon="location_on">
                                            <div className="space-y-6">


                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    {/* 대여 / 출발 */}
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between px-1">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">대여 장소 및 시각</label>
                                                        </div>
                                                        <GoogleMapsSearch
                                                            initialValue={driving.pickupLocation || ''}
                                                            onPlaceSelect={async (place) => {
                                                                const updates: Partial<DrivingSegment> = { pickupLocation: place.formatted_address || place.name || '' };
                                                                if (place.geometry?.location) {
                                                                    updates.pickupLat = place.geometry.location.lat();
                                                                    updates.pickupLng = place.geometry.location.lng();
                                                                }
                                                                
                                                                // [MIGRATED] 좌표 기반 공간 분석으로 행정구역 ID 산출
                                                                const ids = await resolveRegionIdsFromPlace(place);
                                                                updates.pickupCountryId = ids.countryId;
                                                                updates.pickupPrefectureId = ids.prefectureId;
                                                                updates.pickupCityId = ids.cityId;
                                                                
                                                                updateDriving(driving.id, updates);
                                                            }}
                                                            placeholder="장소 검색..."
                                                            inputClassName="h-[48px] bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-800"
                                                        />
                                                        <div className="flex flex-wrap items-center gap-1.5 mt-1 px-1">
                                                            {driving.pickupCountryName && <span className="flex items-center gap-1 px-2 py-0.5 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded text-[7px] font-black border border-sky-100 dark:border-sky-800"><Globe className="w-1.5 h-1.5" />{driving.pickupCountryName}</span>}
                                                            {driving.pickupPrefectureName && <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded text-[7px] font-black border border-indigo-100 dark:border-indigo-800"><Flag className="w-1.5 h-1.5" />{driving.pickupPrefectureName}</span>}
                                                            {driving.pickupCityName && <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded text-[7px] font-black border border-emerald-100 dark:border-emerald-800"><MapIcon className="w-1.5 h-1.5" />{driving.pickupCityName}</span>}
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <RestrictedDatePicker
                                                                value={splitDateTime(driving.pickupTime).date}
                                                                onChange={(v) => updateDateTime('pickupTime', 'date', v)}
                                                                className="h-[48px]"
                                                            />
                                                                <TimeInput 
                                                                    value={splitDateTime(driving.pickupTime).time}
                                                                    lat={driving.pickupLat}
                                                                    lng={driving.pickupLng}
                                                                    date={splitDateTime(driving.pickupTime).date}
                                                                    onChange={(v) => updateDateTime('pickupTime', 'time', v)}
                                                                />
                                                        </div>
                                                    </div>

                                                    {/* 반납 / 도착 */}
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between px-1">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">반납 장소 및 시각</label>
                                                            <CustomCheckbox
                                                                checked={!!driving.isReturnSameAsPickup}
                                                                onChange={(checked) => updateDriving(driving.id, { isReturnSameAsPickup: checked })}
                                                                label="대여 장소와 동일"
                                                                size="sm"
                                                            />
                                                        </div>
                                                        <GoogleMapsSearch
                                                            initialValue={driving.returnLocation || ''}
                                                            onPlaceSelect={async (place) => {
                                                                const updates: Partial<DrivingSegment> = { returnLocation: place.formatted_address || place.name || '' };
                                                                if (place.geometry?.location) {
                                                                    updates.returnLat = place.geometry.location.lat();
                                                                    updates.returnLng = place.geometry.location.lng();
                                                                }
                                                                
                                                                // [MIGRATED] 좌표 기반 공간 분석으로 행정구역 ID 산출
                                                                const ids = await resolveRegionIdsFromPlace(place);
                                                                updates.returnCountryId = ids.countryId;
                                                                updates.returnPrefectureId = ids.prefectureId;
                                                                updates.returnCityId = ids.cityId;
                                                                
                                                                updateDriving(driving.id, updates);
                                                            }}
                                                            disabled={driving.isReturnSameAsPickup}
                                                            placeholder={driving.isReturnSameAsPickup ? "대여 장소와 동일" : "장소 검색..."}
                                                            inputClassName="h-[48px] bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-800 disabled:opacity-50"
                                                        />
                                                        <div className="flex flex-wrap items-center gap-1.5 mt-1 px-1">
                                                            {driving.returnCountryName && <span className="flex items-center gap-1 px-2 py-0.5 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded text-[7px] font-black border border-sky-100 dark:border-sky-800"><Globe className="w-1.5 h-1.5" />{driving.returnCountryName}</span>}
                                                            {driving.returnPrefectureName && <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded text-[7px] font-black border border-indigo-100 dark:border-indigo-800"><Flag className="w-1.5 h-1.5" />{driving.returnPrefectureName}</span>}
                                                            {driving.returnCityName && <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded text-[7px] font-black border border-emerald-100 dark:border-emerald-800"><MapIcon className="w-1.5 h-1.5" />{driving.returnCityName}</span>}
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <RestrictedDatePicker
                                                                value={splitDateTime(driving.returnTime).date}
                                                                onChange={(v) => updateDateTime('returnTime', 'date', v)}
                                                                className="h-[48px]"
                                                            />
                                                                <TimeInput 
                                                                    value={splitDateTime(driving.returnTime).time}
                                                                    lat={driving.returnLat || driving.pickupLat}
                                                                    lng={driving.returnLng || driving.pickupLng}
                                                                    date={splitDateTime(driving.returnTime).date}
                                                                    onChange={(v) => updateDateTime('returnTime', 'time', v)}
                                                                    disabled={driving.isReturnSameAsPickup}
                                                                />
                                                        </div>
                                                    </div>
                                                </div>

                                                {getDurationText() && (
                                                    <div className="py-2.5 px-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl flex items-center justify-between border border-emerald-100 dark:border-emerald-900/20 shadow-sm">
                                                        <div className="flex items-center gap-2">
                                                            <span className="material-symbols-rounded text-emerald-500 text-[18px]">timer</span>
                                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">총 소요 시간</span>
                                                        </div>
                                                        <span className="text-sm font-black text-emerald-600">{getDurationText()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </FormSection>


                                        {/* 상세 예약 관리 */}
                                        <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-800 space-y-6">
                                            <div className="flex items-center justify-between px-2">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-rounded text-slate-400">confirmation_number</span>
                                                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">상세 예약 관리</h4>
                                                    </div>
                                                    <CustomCheckbox
                                                        checked={!!driving.isBooked}
                                                        onChange={(checked) => updateDriving(driving.id, { isBooked: checked })}
                                                        label="예약 완료됨"
                                                        size="sm"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => addRes('driving', driving.id)}
                                                    className="text-[10px] font-black text-white px-4 py-2 bg-slate-900 dark:bg-slate-700 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-sm uppercase tracking-widest"
                                                >
                                                    예약 정보 추가
                                                </button>
                                            </div>
                                            <div className="space-y-4">
                                                {driving.reservations.map(res => (
                                                    <ReservationItem
                                                        key={res.id}
                                                        res={res}
                                                        onUpdate={(updates) => updateRes('driving', driving.id, res.id, updates)}
                                                        onRemove={() => removeRes('driving', driving.id, res.id)}
                                                    />
                                                ))}
                                                {driving.reservations.length === 0 && (
                                                    <UndecidedField 
                                                        message="추가된 예약 일정이 없습니다"
                                                        icon="receipt_long"
                                                        onAction={() => addRes('driving', driving.id)}
                                                        actionLabel="첫 번째 예약 정보 추가"
                                                        className="opacity-60 bg-white dark:bg-slate-800/20 rounded-2xl"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
