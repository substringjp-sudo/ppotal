'use client';

import { useState } from 'react';
import { TripEvent, EventLocation, reverseGeocodeIds, resolveRegionIdsFromPlace } from '@pplaner/shared';
import { MainCategory, SubCategory, CATEGORY_MAP } from '@pplaner/shared';
import { motion } from 'framer-motion';
import { GoogleMapsSearch } from '@/components/common/GoogleMapsSearch';
import { TimeInput, TimeRangeInput } from '../common/FormComponents';
import { Calendar } from 'lucide-react';

interface SimpleEventEditorProps {
    event?: Partial<TripEvent>;
    dayIdx?: number;
    date?: string;
    onSave: (event: Partial<TripEvent>) => void;
    onClose: () => void;
}

const formatDateWithDay = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    return `${year}년 ${month}월 ${day}일 (${dayOfWeek})`;
};


export default function SimpleEventEditor({ event, dayIdx, date, onSave, onClose }: SimpleEventEditorProps) {
    const [title, setTitle] = useState(event?.title || '');
    const [startTime, setStartTime] = useState(event?.startTime || '10:00');
    const [endTime, setEndTime] = useState(event?.endTime || '');
    const [location, setLocation] = useState<EventLocation | undefined>(event?.location);
    const [mainCategory, setMainCategory] = useState<MainCategory>(event?.mainCategory || 'sightseeing');
    const [subCategory, setSubCategory] = useState<SubCategory | undefined>(event?.subCategory);
    const [memo, setMemo] = useState(event?.memo || '');
    const [isGeoLoading, setIsGeoLoading] = useState(false);



    const handleSave = () => {
        if (!title.trim()) return;

        onSave({
            ...event,
            title,
            startTime,
            endTime: endTime || undefined,
            location,
            mainCategory,
            subCategory,
            type: mainCategory, // Legacy support
            memo,
        });
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
                <div>
                    <div className="flex flex-col gap-1">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-rounded text-primary">edit_calendar</span>
                            일정 편집
                        </h3>
                        {(date || dayIdx !== undefined) && (
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-primary" />
                                <span className="text-sm font-black text-primary uppercase tracking-tight">
                                    {dayIdx !== undefined ? `Day ${dayIdx + 1}` : ''}
                                    {dayIdx !== undefined && date ? ' • ' : ''}
                                    {formatDateWithDay(date)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <span className="material-symbols-rounded text-slate-400">close</span>
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* Title Section */}
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">일정 제목</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="어디로 떠나시나요?"
                        className="w-full text-3xl md:text-4xl font-black bg-transparent border-none outline-none placeholder:text-slate-200 dark:placeholder:text-slate-800 focus:ring-0 p-0 tracking-tight"
                        autoFocus
                    />
                </div>

                {/* Category Grid */}
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">카테고리</label>
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-2 md:gap-3">
                            {(Object.entries(CATEGORY_MAP) as [MainCategory, any][]).map(([key, config]) => (
                                <button
                                    key={key}
                                    onClick={() => {
                                        setMainCategory(key);
                                        setSubCategory(config.subCategories[0]?.value);
                                    }}
                                    className={`flex flex-col items-center gap-1.5 p-2 md:p-3 rounded-2xl transition-all border-2 ${
                                        mainCategory === key
                                            ? 'bg-primary/5 border-primary shadow-sm scale-[1.02]'
                                            : 'bg-white dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                                    }`}
                                >
                                    <div className={`w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center transition-all ${
                                        mainCategory === key ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'
                                    }`}>
                                        <span className="material-symbols-rounded text-xl md:text-2xl">{config.icon}</span>
                                    </div>
                                    <span className={`text-[9px] md:text-[10px] font-black whitespace-nowrap ${
                                        mainCategory === key ? 'text-primary' : 'text-slate-400'
                                    }`}>
                                        {config.label}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Subcategory Selector */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                            <div className="flex flex-wrap gap-2">
                                {CATEGORY_MAP[mainCategory].subCategories.map((sub: any) => (
                                    <button
                                        key={sub.value}
                                        onClick={() => setSubCategory(sub.value)}
                                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                                            subCategory === sub.value
                                                ? 'bg-primary text-white border-primary shadow-md'
                                                : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                        }`}
                                    >
                                        {sub.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Time & Location Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Time */}
                    <div className="space-y-4">
                        <TimeRangeInput 
                            label="시간 설정"
                            startTime={startTime}
                            endTime={endTime || undefined}
                            onStartChange={setStartTime}
                            onEndChange={(v) => setEndTime(v || '')}
                            lat={location?.lat}
                            lng={location?.lng}
                            date={date}
                        />
                    </div>

                    {/* Location */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">장소 검색</label>
                        <GoogleMapsSearch
                            initialValue={location?.name}
                            onPlaceSelect={async (place) => {
                                const lat = place.geometry?.location?.lat();
                                const lng = place.geometry?.location?.lng();
                                
                                // Set basic info first
                                setLocation({
                                    name: place.name || '',
                                    address: place.formatted_address,
                                    lat,
                                    lng,
                                    googlePlaceId: place.place_id,
                                    url: place.url
                                });
                                
                                if (!title) setTitle(place.name || '');

                                // Call intelligent region resolution (Coordinates -> Server Function -> Fallback to Address Components)
                                try {
                                    setIsGeoLoading(true);
                                    const ids = await resolveRegionIdsFromPlace(place);
                                    console.log('[SimpleEventEditor] Region Resolution Result:', ids);
                                    
                                    setLocation(prev => {
                                        if (!prev) return undefined;
                                        return {
                                            ...prev,
                                            country: ids.countryName,
                                            prefecture: ids.prefectureName,
                                            city: ids.cityName,
                                            countryName: ids.countryName,
                                            prefectureName: ids.prefectureName,
                                            cityName: ids.cityName,
                                            countryId: ids.countryId,
                                            prefectureId: ids.prefectureId,
                                            cityId: ids.cityId
                                        };
                                    });
                                } catch (e) {
                                    console.error('Failed to resolve region:', e);
                                } finally {
                                    setIsGeoLoading(false);
                                }
                            }}
                        />
                        {isGeoLoading && (
                            <div className="flex gap-2 mt-2 px-1 animate-pulse">
                                <div className="w-16 h-6 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                                <div className="w-20 h-6 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                                <div className="w-12 h-6 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                            </div>
                        )}
                        {!isGeoLoading && location && (location.country || location.countryName || location.prefecture || location.prefectureName || location.city || location.cityName) && (
                            <div className="flex flex-wrap gap-2 mt-2 px-1">
                                {(location.country || location.countryName) && (
                                    <span className="text-[10px] font-black bg-primary/5 text-primary px-2.5 py-1 rounded-lg uppercase tracking-tight border border-primary/10 flex items-center gap-1">
                                        <span className="material-symbols-rounded text-[12px]">flag</span>
                                        {location.country || location.countryName}
                                    </span>
                                )}
                                {(location.prefecture || location.prefectureName) && (
                                    <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 px-2.5 py-1 rounded-lg uppercase tracking-tight border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-1">
                                        <span className="material-symbols-rounded text-[12px]">map</span>
                                        {location.prefecture || location.prefectureName}
                                    </span>
                                )}
                                {(location.city || location.cityName) && (
                                    <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 px-2.5 py-1 rounded-lg uppercase tracking-tight border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-1">
                                        <span className="material-symbols-rounded text-[12px]">location_city</span>
                                        {location.city || location.cityName}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Memo */}
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">메모 및 링크</label>
                    <textarea
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        placeholder="이 일정에 대한 추가 정보를 기록하세요..."
                        className="w-full h-32 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-primary/20 rounded-2xl p-4 text-sm font-medium outline-none transition-all resize-none"
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-4">
                <button
                    onClick={onClose}
                    className="flex-1 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                    취소하기
                </button>
                <button
                    onClick={handleSave}
                    disabled={!title.trim()}
                    className="flex-[2] py-4 bg-primary disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                    일정 저장하기
                </button>
            </div>
        </div>
    );
}
