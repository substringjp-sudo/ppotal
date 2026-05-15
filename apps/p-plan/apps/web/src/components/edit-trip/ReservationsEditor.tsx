'use client';

import { useTripStore } from '@pplaner/shared';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@pplaner/shared';
import { IconDropdown, TimeInput, RestrictedDatePicker } from '../common/FormComponents';
import { GoogleMapsSearch } from '../common/GoogleMapsSearch';
import { resolveRegionIdsFromPlace } from '@pplaner/shared';

import { Globe, Flag, Map as MapIcon, DollarSign } from 'lucide-react';
import { useUserStore } from '@pplaner/shared';
import { COUNTRY_CURRENCY_MAP, CURRENCY_SYMBOLS, inferCurrencyFromRegions } from '@pplaner/shared';
import { useMemo } from 'react';

const STATUS_OPTIONS = [
    { value: 'planned', label: '예정', icon: 'schedule' },
    { value: 'confirmed', label: '확정', icon: 'check_circle' },
    { value: 'missing', label: '누락', icon: 'warning' }
];

export default function ReservationsEditor({ 
    onNavigateToSection 
}: { 
    onNavigateToSection?: (section: string) => void 
}) {
    const trip = useTripStore((state) => state.currentTrip);
    const addReservation = useTripStore((state) => state.addReservation);
    const updateReservation = useTripStore((state) => state.updateReservation);
    const removeReservation = useTripStore((state) => state.removeReservation);

    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);




    const [newRes, setNewRes] = useState<{
        title: string;
        date: string;
        time: string;
        status: 'confirmed' | 'missing' | 'planned';
        location: string;
        lat?: number;
        lng?: number;
        countryId?: string;
        prefectureId?: string;
        cityId?: string;
        countryName?: string;
        prefectureName?: string;
        cityName?: string;
    }>({
        title: '',
        date: '',
        time: '',
        status: 'planned',
        location: '',
    });

    const { profile } = useUserStore();



    if (!trip) return null;

    const handleAdd = () => {
        if (!newRes.title) return;
        addReservation(newRes);
        setNewRes({
            title: '',
            date: '',
            time: '',
            status: 'planned',
            location: '',
        });
        setIsAdding(false);
    };

    // Aggregate all "reservation-like" items for a summary
    const flightCount = trip.flights.length;
    const accommodationCount = trip.accommodation.length;
    const transportCount = trip.driving.length + trip.publicTransport.length;
    const generalResCount = trip.reservations.length;

    return (
        <div className="space-y-6">
            {/* Header / Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard 
                    icon="flight" 
                    label="항공권" 
                    count={flightCount} 
                    color="text-sky-500" 
                    bgColor="bg-sky-50 dark:bg-sky-900/20" 
                    onClick={() => onNavigateToSection?.('transport')}
                />
                <SummaryCard 
                    icon="bed" 
                    label="숙소" 
                    count={accommodationCount} 
                    color="text-indigo-500" 
                    bgColor="bg-indigo-50 dark:bg-indigo-900/20" 
                    onClick={() => onNavigateToSection?.('accommodation')}
                />
                <SummaryCard 
                    icon="directions_bus" 
                    label="교통편" 
                    count={transportCount} 
                    color="text-emerald-500" 
                    bgColor="bg-emerald-50 dark:bg-emerald-900/20" 
                    onClick={() => onNavigateToSection?.('transport')}
                />
                <SummaryCard 
                    icon="confirmation_number" 
                    label="기타 예약" 
                    count={generalResCount} 
                    color="text-amber-500" 
                    bgColor="bg-amber-50 dark:bg-amber-900/20" 
                />
            </div>

            {/* General Reservations Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">일반 예약 내역 ({generalResCount})</h3>
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="text-[11px] font-black text-primary hover:text-primary/80 uppercase tracking-widest flex items-center gap-1 transition-colors"
                    >
                        <span className="material-symbols-rounded text-sm">add_circle</span>
                        새 예약 추가
                    </button>
                </div>

                <AnimatePresence mode="popLayout">
                    {isAdding && (
                        <motion.div
                            key="add-reservation-form"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="p-4 md:p-6 bg-white dark:bg-slate-900 rounded-[28px] border-2 border-primary shadow-2xl shadow-primary/10 mb-6"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">예약 항목 명칭</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={newRes.title}
                                        onChange={(e) => setNewRes({ ...newRes, title: e.target.value })}
                                        placeholder="예: 루브르 박물관 입장권"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-black outline-none focus:ring-2 ring-primary/20 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">장소 (선택)</label>
                                    <GoogleMapsSearch
                                        placeholder="장소 이름 또는 주소 검색"
                                        onPlaceSelect={async (place) => {
                                            // [MIGRATED] 좌표 기반 공간 분석으로 행정구역 ID 산출
                                            const ids = await resolveRegionIdsFromPlace(place);
                                            
                                            const updates: {
                                                location: string;
                                                countryId?: string;
                                                prefectureId?: string;
                                                cityId?: string;
                                                countryName?: string;
                                                prefectureName?: string;
                                                cityName?: string;
                                                lat?: number;
                                                lng?: number;
                                                title?: string;
                                            } = { 
                                                location: place.formatted_address || place.name || '',
                                                ...ids
                                            };
                                            if (place.geometry?.location) {
                                                updates.lat = place.geometry.location.lat();
                                                updates.lng = place.geometry.location.lng();
                                            }
                                            if (!newRes.title && place.name) {
                                                updates.title = place.name;
                                            }
                                            setNewRes({ ...newRes, ...updates });
                                        }}
                                        inputClassName="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 h-12 text-sm font-black outline-none focus:ring-2 ring-primary/20 transition-all"
                                    />
                                </div>

                                {/* Detected Region Labels for New Reservation */}
                                {(newRes.countryId || newRes.prefectureId || newRes.cityId) && (
                                    <div className="col-span-1 md:col-span-2 flex flex-wrap items-center gap-2 -mt-2 mb-2 ml-2">
                                        {newRes.countryName && (
                                            <span className="flex items-center gap-1 px-3 py-1.5 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded-xl text-[10px] font-black border border-sky-100 dark:border-sky-800">
                                                <Globe className="w-3 h-3" />
                                                {newRes.countryName}
                                            </span>
                                        )}
                                        {newRes.prefectureName && (
                                            <span className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black border border-indigo-100 dark:border-indigo-800">
                                                <Flag className="w-3 h-3" />
                                                {newRes.prefectureName}
                                            </span>
                                        )}
                                        {newRes.cityName && (
                                            <span className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black border border-emerald-100 dark:border-emerald-800">
                                                <MapIcon className="w-3 h-3" />
                                                {newRes.cityName}
                                            </span>
                                        )}
                                    </div>

                                )}

                                <RestrictedDatePicker
                                    label="예약일"
                                    value={newRes.date}
                                    onChange={(v) => setNewRes({ ...newRes, date: v })}
                                    className="w-full"
                                />
                                <TimeInput 
                                    label="시간 (선택)"
                                    value={newRes.time}
                                    onChange={(v) => setNewRes({ ...newRes, time: v })}
                                />
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">상태</label>
                                    <IconDropdown
                                        value={newRes.status}
                                        onChange={(val) => setNewRes({ ...newRes, status: val as any })}
                                        options={STATUS_OPTIONS}
                                        className="w-full"
                                    />
                                </div>

                            </div>
                            <div className="flex justify-end gap-3">
                                <button 
                                    onClick={() => setIsAdding(false)}
                                    className="px-8 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                                >
                                    취소
                                </button>
                                <button 
                                    onClick={handleAdd}
                                    className="px-10 py-3 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all"
                                >
                                    추가 완료
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {trip.reservations.length > 0 ? (
                        <div key="reservations-list" className="grid grid-cols-1 gap-4">
                            {trip.reservations.map((res) => {
                                const isEditing = editingId === res.id;
                                return (
                                    <motion.div
                                        key={res.id}
                                        layout
                                        className={cn(
                                            "group bg-white dark:bg-slate-900 border rounded-[28px] transition-all duration-300",
                                            isEditing 
                                                ? "border-primary/30 shadow-xl shadow-primary/5 ring-1 ring-primary/10" 
                                                : "border-slate-200 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 shadow-sm"
                                        )}
                                    >
                                        {/* Card Header (Summary View) */}
                                        <div 
                                            onClick={() => setEditingId(isEditing ? null : res.id)}
                                            className="p-4 md:p-5 cursor-pointer flex items-center gap-4"
                                        >
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all",
                                                isEditing ? "bg-primary text-white" :
                                                res.status === 'confirmed' ? "bg-green-50 dark:bg-green-500/10 text-green-500" :
                                                res.status === 'missing' ? "bg-red-50 dark:bg-red-500/10 text-red-500" : 
                                                "bg-slate-50 dark:bg-slate-800 text-slate-400"
                                            )}>
                                                <span className="material-symbols-rounded text-2xl">
                                                    {res.status === 'confirmed' ? 'check_circle' : 
                                                     res.status === 'missing' ? 'warning' : 'confirmation_number'}
                                                </span>
                                            </div>

                                            <div className="flex-1 min-w-0 text-left">
                                                <div className="flex items-center gap-3 mb-1.5">
                                                    <h4 className="font-black text-base text-slate-800 dark:text-white truncate">
                                                        {res.title}
                                                    </h4>
                                                    <span className={cn(
                                                        "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                                                        res.status === 'confirmed' ? "text-green-500 bg-green-50/50 border-green-100" :
                                                        res.status === 'missing' ? "text-red-500 bg-red-50/50 border-red-100" :
                                                        "text-slate-400 bg-slate-50/50 border-slate-200"
                                                    )}>
                                                        {STATUS_OPTIONS.find(o => o.value === res.status)?.label}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[10px] font-bold text-slate-400">
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="material-symbols-rounded text-sm">calendar_month</span>
                                                        {res.date || '날짜 미정'}
                                                    </span>
                                                    {res.time && (
                                                        <span className="flex items-center gap-1.5">
                                                            <span className="material-symbols-rounded text-sm">schedule</span>
                                                            {res.time}
                                                        </span>
                                                    )}
                                                    {res.location && (
                                                        <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                                                            <span className="material-symbols-rounded text-sm">location_on</span>
                                                            {res.location}
                                                        </span>
                                                    )}
                                                    {/* Inline region labels in summary view */}
                                                    {(res.countryName || res.prefectureName || res.cityName) && (
                                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[8px] font-black text-slate-500">
                                                            {[res.countryName, res.prefectureName, res.cityName].filter(Boolean).join(' • ')}
                                                        </span>
                                                    )}


                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeReservation(res.id);
                                                    }}
                                                    className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <span className="material-symbols-rounded text-xl">delete</span>
                                                </button>
                                                <motion.div
                                                    animate={{ rotate: isEditing ? 180 : 0 }}
                                                    className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400"
                                                >
                                                    <span className="material-symbols-rounded text-lg">expand_more</span>
                                                </motion.div>
                                            </div>
                                        </div>

                                        {/* Expanded Form View */}
                                        <AnimatePresence>
                                            {isEditing && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ 
                                                        height: 'auto', 
                                                        opacity: 1,
                                                        transitionEnd: { overflow: 'visible' }
                                                    }}
                                                    exit={{ 
                                                        height: 0, 
                                                        opacity: 0,
                                                        overflow: 'hidden'
                                                    }}
                                                    className="overflow-hidden border-t border-slate-200/60 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20"
                                                >
                                                    <div className="p-4 md:p-6 space-y-4 text-left">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">예약 항목 명칭</label>
                                                                <input
                                                                    type="text"
                                                                    value={res.title}
                                                                    onChange={(e) => updateReservation(res.id, { title: e.target.value })}
                                                                    placeholder="명칭 입력"
                                                                    className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-black outline-none focus:border-primary/20 transition-all"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">장소 검색</label>
                                                                <GoogleMapsSearch
                                                                    placeholder={res.location || "장소 검색"}
                                                                    onPlaceSelect={async (place) => {
                                                                        // [MIGRATED] 좌표 기반 공간 분석으로 행정구역 ID 산출
                                                                        const ids = await resolveRegionIdsFromPlace(place);
                                                                        
                                                                        const updates: {
                                                                            location: string;
                                                                            title: string;
                                                                            countryId?: string;
                                                                            prefectureId?: string;
                                                                            cityId?: string;
                                                                            lat?: number;
                                                                            lng?: number;
                                                                        } = { 
                                                                            location: place.formatted_address || place.name || '',
                                                                            title: res.title || place.name || '',
                                                                            ...ids
                                                                        };
                                                                        if (place.geometry?.location) {
                                                                            updates.lat = place.geometry.location.lat();
                                                                            updates.lng = place.geometry.location.lng();
                                                                        }
                                                                        updateReservation(res.id, updates);
                                                                    }}
                                                                    inputClassName="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 h-[52px] text-sm font-black outline-none focus:border-primary/20 transition-all"
                                                                />
                                                            </div>

                                                            {/* Detected Region Labels for Editing Reservation */}
                                                            {(res.countryId || res.prefectureId || res.cityId) && (
                                                                <div className="col-span-1 md:col-span-2 flex flex-wrap items-center gap-2 -mt-4 mb-2 ml-1">
                                                                    {res.countryName && (
                                                                        <span className="flex items-center gap-1 px-3 py-1.5 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded-xl text-[10px] font-black border border-sky-100 dark:border-sky-800">
                                                                            <Globe className="w-3 h-3" />
                                                                            {res.countryName}
                                                                        </span>
                                                                    )}
                                                                    {res.prefectureName && (
                                                                        <span className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black border border-indigo-100 dark:border-indigo-800">
                                                                            <Flag className="w-3 h-3" />
                                                                            {res.prefectureName}
                                                                        </span>
                                                                    )}
                                                                    {res.cityName && (
                                                                        <span className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black border border-emerald-100 dark:border-emerald-800">
                                                                            <MapIcon className="w-3 h-3" />
                                                                            {res.cityName}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                            )}

                                                            <RestrictedDatePicker
                                                                label="예약일"
                                                                value={res.date}
                                                                onChange={(v) => updateReservation(res.id, { date: v })}
                                                                className="w-full"
                                                            />
                                                            <TimeInput 
                                                                label="시간"
                                                                value={res.time}
                                                                onChange={(v) => updateReservation(res.id, { time: v })}
                                                            />
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">상태</label>
                                                                <IconDropdown
                                                                    value={res.status}
                                                                    onChange={(val) => updateReservation(res.id, { status: val as any })}
                                                                    options={STATUS_OPTIONS}
                                                                    className="w-full"
                                                                />
                                                            </div>

                                                        </div>
                                                        <div className="flex justify-end pt-4">
                                                            <button 
                                                                onClick={() => setEditingId(null)}
                                                                className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-lg"
                                                            >
                                                                편집 완료
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        <div key="empty-reservations" className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[28px] text-center">
                            <span className="material-symbols-rounded text-4xl text-slate-200 mb-2">confirmation_number</span>
                            <p className="text-[11px] font-bold text-slate-400 italic">추가된 일반 예약 내역이 없습니다.</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Smart Links Section */}
            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-[28px] p-6 mt-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <span className="material-symbols-rounded">auto_awesome</span>
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">예약 통합 브리핑</h4>
                        <p className="text-[10px] font-bold text-slate-400">교통 및 숙소 섹션에서 관리되는 예약 현황입니다.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <StatusLink 
                        label="항공권 예약" 
                        status={trip.flights.every(f => f.reservations.length > 0) ? 'complete' : 'pending'} 
                        progress={`${trip.flights.filter(f => f.reservations.length > 0).length}/${flightCount}`}
                    />
                    <StatusLink 
                        label="숙소 예약" 
                        status={trip.accommodation.every(a => a.status === 'booked') ? 'complete' : 'pending'} 
                        progress={`${trip.accommodation.filter(a => a.status === 'booked').length}/${accommodationCount}`}
                    />
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ icon, label, count, color, bgColor, onClick }: { 
    icon: string, 
    label: string, 
    count: number, 
    color: string, 
    bgColor: string,
    onClick?: () => void
}) {
    return (
        <button 
            onClick={onClick}
            disabled={!onClick}
            className={cn(
                "p-4 md:p-5 rounded-[24px] border border-transparent transition-all flex flex-col items-start w-full text-left outline-none",
                bgColor,
                onClick ? "hover:scale-105 hover:shadow-xl hover:shadow-primary/5 cursor-pointer" : "cursor-default"
            )}
        >
            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-3", color)}>
                <span className="material-symbols-rounded">{icon}</span>
            </div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">{count}개</div>
        </button>
    );
}

function StatusLink({ label, status, progress }: { label: string, status: 'complete' | 'pending', progress: string }) {
    return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={cn(
                    "w-2 h-2 rounded-full",
                    status === 'complete' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                )} />
                <span className="text-xs font-black text-slate-700 dark:text-slate-200">{label}</span>
            </div>
            <span className="text-[10px] font-black text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg">
                {progress}
            </span>
        </div>
    );
}
