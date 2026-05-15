'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    TravelogEvent, 
    TravelogEventType,
    cn, 
    TRAVELOG_ACTIVITY_CATEGORIES, 
    TRAVELOG_EVENT_CATEGORIES,
    TravelogActivityMajor,
    TravelogEventMajor
} from '@pplaner/shared';
import { EmotionTriangle } from './EmotionTriangle';
import { LocationSelector } from '@/components/edit-trip/shared/LocationSelector';
import MapComponent from '@/components/common/MapComponent';
import { TimeRangeInput } from '@/components/common/FormComponents';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';


interface ScheduleItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (event: TravelogEvent) => void;
    initialData: TravelogEvent;
    dayEvents?: TravelogEvent[];
    isAutoFilled?: boolean;
    startDate?: string;
}

export function ScheduleItemModal({ 
    isOpen, 
    onClose, 
    onSave, 
    initialData, 
    dayEvents = [],
    isAutoFilled = false,
    startDate
}: ScheduleItemModalProps) {
    const [event, setEvent] = useState<TravelogEvent>(initialData);

    useEffect(() => {
        if (isOpen) setEvent(initialData);
    }, [isOpen, initialData]);

    const handleSave = () => {
        if (!event.title.trim()) return;
        
        // Final logic check: if endTime exists -> activity, else -> event
        const type: TravelogEventType = event.endTime ? 'activity' : 'event';
        const finalEvent = {
            ...event,
            type,
            // If it's an event, sync startTime to time
            time: type === 'event' ? event.startTime : undefined
        };
        
        onSave(finalEvent);
    };

    const updateDetails = (updates: any) => {
        setEvent(prev => ({
            ...prev,
            details: { ...(prev.details || {}), ...updates }
        }));
    };

    if (!isOpen) return null;

    const majorCategories = event.type === 'activity' 
        ? Object.keys(TRAVELOG_ACTIVITY_CATEGORIES) 
        : Object.keys(TRAVELOG_EVENT_CATEGORIES);
    
    const subCategories = event.type === 'activity'
        ? (TRAVELOG_ACTIVITY_CATEGORIES[(event as any).mainCategory as TravelogActivityMajor] || [])
        : (TRAVELOG_EVENT_CATEGORIES[(event as any).mainCategory as TravelogEventMajor] || []);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
                />
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 30 }}
                    className="relative w-full max-w-5xl h-[90vh] bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl flex flex-col overflow-hidden border border-slate-200/50 dark:border-slate-800"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20 shrink-0">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                <span className="material-symbols-rounded text-primary text-3xl">edit_note</span>
                                <div className="flex flex-col">
                                    <span className="leading-tight">여행 기록 편집</span>
                                    {event.date && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-lg border border-primary/20 uppercase tracking-wider">
                                                {format(parseISO(event.date), 'M월 d일', { locale: ko })}
                                            </span>
                                            {startDate && (
                                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black rounded-lg border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                                                    Day {differenceInDays(parseISO(event.date), parseISO(startDate)) + 1}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </h3>
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest",
                                    event.endTime ? "bg-primary text-white" : "bg-amber-500 text-white"
                                )}>
                                    {event.endTime ? '활동 (Activity)' : '이벤트 (Event)'}
                                </div>
                                {isAutoFilled && (
                                    <div className="px-2 py-0.5 bg-emerald-500 text-white text-[9px] font-black rounded-lg flex items-center gap-1">
                                        <span className="material-symbols-rounded text-[10px]">auto_fix</span>
                                        자동 연동됨
                                    </div>
                                )}
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                            <span className="material-symbols-rounded text-slate-400">close</span>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30 dark:bg-slate-900/30">
                        {/* Title Section (Single Row) */}
                        <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">일정 제목</label>
                            <input
                                type="text"
                                value={event.title}
                                onChange={(e) => setEvent({ ...event, title: e.target.value })}
                                placeholder="무엇을 하셨나요?"
                                className="w-full text-3xl font-black bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3.5 outline-none placeholder:text-slate-200 dark:placeholder:text-slate-700 focus:ring-2 focus:ring-primary/20 transition-all tracking-tight"
                                autoFocus
                            />
                        </div>

                        {/* Row 1: Category & Time */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">카테고리</label>
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-wrap gap-1.5">
                                        {majorCategories.map(cat => {
                                            const icons: Record<string, string> = {
                                                '식사': 'restaurant',
                                                '숙박': 'hotel',
                                                '관광': 'attractions',
                                                '쇼핑': 'shopping_bag',
                                                '이동': 'directions_car',
                                                '기타': 'more_horiz'
                                            };
                                            return (
                                                <button
                                                    key={cat}
                                                    onClick={() => setEvent({ ...event, mainCategory: cat as any, subCategory: undefined })}
                                                    className={cn(
                                                        "px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border flex items-center gap-1.5",
                                                        (event as any).mainCategory === cat 
                                                            ? "bg-primary border-primary text-white shadow-md shadow-primary/20" 
                                                            : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-primary/30"
                                                    )}
                                                >
                                                    <span className="material-symbols-rounded text-sm">{icons[cat] || 'category'}</span>
                                                    {cat}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    {subCategories.length > 0 && (
                                        <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <div className="flex flex-wrap gap-1.5">
                                                {subCategories.map(cat => (
                                                    <button
                                                        key={cat}
                                                        onClick={() => setEvent({ ...event, subCategory: cat as any })}
                                                        className={cn(
                                                            "px-3 py-1 rounded-lg text-[9px] font-bold transition-all border",
                                                            event.subCategory === cat 
                                                                ? "bg-slate-950 dark:bg-white border-slate-950 dark:border-white text-white dark:text-slate-950 shadow-sm" 
                                                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300"
                                                        )}
                                                    >
                                                        {cat}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                                <TimeRangeInput 
                                    label="시간 설정"
                                    startTime={event.startTime || event.time || '10:00'}
                                    endTime={event.endTime || undefined}
                                    onStartChange={(v) => setEvent({ ...event, startTime: v, time: v })}
                                    onEndChange={(v) => setEvent({ ...event, endTime: v })}
                                    lat={event.location?.lat}
                                    lng={event.location?.lng}
                                    date={event.date}
                                />
                                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                                    <span className={cn(
                                        "w-2 h-2 rounded-full",
                                        event.endTime ? "bg-primary animate-pulse" : "bg-amber-500"
                                    )} />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                        유형: {event.endTime ? '활동 (종료시간 있음)' : '이벤트 (종료시간 없음)'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Location & Map (2-Column Layout) */}
                        <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">장소 검색 및 지도 확인</label>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                                {/* Left Side: Search & Address Info */}
                                <div className="space-y-4">
                                    <LocationSelector 
                                        compact
                                        showWarning={false}
                                        placeholder="장소를 검색하세요 (예: 에펠탑, 나리타 공항...)"
                                        location={event.location}
                                        onLocationSelect={(loc) => setEvent({ ...event, location: loc as any })}
                                    />

                                    {event.location ? (
                                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                                    <span className="material-symbols-rounded text-primary text-[18px]">location_on</span>
                                                </div>
                                                <div className="space-y-1 overflow-hidden">
                                                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">{event.location.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-500 leading-tight">{event.location.address}</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                                                {event.location.country && (
                                                    <div className="px-2 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                                                        <span className="material-symbols-rounded text-[14px] text-slate-400">public</span>
                                                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase">{event.location.country}</span>
                                                    </div>
                                                )}
                                                {event.location.city && (
                                                    <div className="px-2 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                                                        <span className="material-symbols-rounded text-[14px] text-slate-400">apartment</span>
                                                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase">{event.location.city}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-8 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
                                            <span className="material-symbols-rounded text-3xl text-slate-300">map</span>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">검색 결과가 여기에 표시됩니다</p>
                                        </div>
                                    )}
                                </div>

                                {/* Right Side: Map Preview */}
                                <div className="h-[200px] lg:h-full min-h-[220px] rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-900 shadow-inner relative group">
                                    {(event.location?.lat !== undefined && event.location?.lng !== undefined) ? (
                                        <MapComponent 
                                            center={{ lat: event.location.lat, lng: event.location.lng }}
                                            zoom={15}
                                            markers={[{
                                                id: 'current',
                                                lat: event.location.lat,
                                                lng: event.location.lng,
                                                title: event.title,
                                                type: event.type
                                            }]}
                                            highlightedId="current"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                                                <span className="material-symbols-rounded text-2xl text-slate-300 animate-pulse">explore</span>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">지도가 대기 중입니다</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Row 3: Emotion, Photos, Memo/Cost (3 Columns, Equal Height) */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                            {/* Emotion */}
                            <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 flex flex-col">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">당시의 감정</label>
                                <div className="flex-1 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-inner p-4 min-h-[220px]">
                                    <EmotionTriangle 
                                        size={140}
                                        value={event.emotion || { joy: 0.33, sadness: 0.33, anger: 0.33 }}
                                        onChange={(emo) => setEvent({ ...event, emotion: emo })}
                                    />
                                </div>
                            </div>

                            {/* Photos */}
                            <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 flex flex-col">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">기록된 사진 ({event.imageUrls?.length || 0})</label>
                                <div className="flex-1 bg-slate-50 dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 shadow-inner overflow-y-auto max-h-[260px] custom-scrollbar">
                                    {event.imageUrls && event.imageUrls.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-2">
                                            {event.imageUrls.map((url, idx) => (
                                                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group border border-slate-200 dark:border-slate-800 shadow-sm">
                                                    <img src={url} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button 
                                                            onClick={() => {
                                                                const newUrls = (event.imageUrls || []).filter(u => u !== url);
                                                                setEvent({ ...event, imageUrls: newUrls });
                                                            }}
                                                            className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center hover:scale-110 active:scale-90 transition-all"
                                                        >
                                                            <span className="material-symbols-rounded text-[12px]">link_off</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="w-full h-full min-h-[180px] flex flex-col items-center justify-center gap-2 opacity-30">
                                            <span className="material-symbols-rounded text-3xl">photo_library</span>
                                            <p className="text-[8px] font-black uppercase tracking-widest">사진 없음</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Memo & Cost Combined */}
                            <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 flex flex-col">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">메모 및 지출</label>
                                <div className="flex-1 space-y-4 flex flex-col">
                                    <textarea 
                                        value={event.memo || ''}
                                        onChange={(e) => setEvent({ ...event, memo: e.target.value })}
                                        className="flex-1 w-full min-h-[100px] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-3 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none shadow-inner"
                                        placeholder="이 순간의 기억..."
                                    />
                                    
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[9px] font-black text-slate-400 uppercase">지출 (Cost)</label>
                                            <select 
                                                value={event.currency || 'KRW'} 
                                                onChange={(e) => setEvent({ ...event, currency: e.target.value })} 
                                                className="bg-transparent border-none text-[8px] font-black p-0 focus:ring-0"
                                            >
                                                <option value="KRW">KRW</option>
                                                <option value="JPY">JPY</option>
                                                <option value="USD">USD</option>
                                            </select>
                                        </div>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                value={event.cost || ''} 
                                                onChange={(e) => setEvent({ ...event, cost: Number(e.target.value) })} 
                                                className="w-full bg-white dark:bg-slate-800 border-none rounded-lg p-2 text-xs font-black shadow-sm" 
                                                placeholder="0" 
                                            />
                                        </div>

                                        {/* Dynamic details */}
                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                            {(event as any).mainCategory === '식사' && (
                                                <input type="text" value={event.details?.menu || ''} onChange={(e) => updateDetails({ menu: e.target.value })} className="w-full bg-white dark:bg-slate-800 border-none rounded-lg p-2 text-[10px] font-bold" placeholder="메뉴 이름" />
                                            )}
                                            {(event as any).mainCategory === '숙박' && (
                                                <div className="flex gap-2">
                                                    <input type="number" value={event.details?.heads || 1} onChange={(e) => updateDetails({ heads: Number(e.target.value) })} className="flex-1 bg-white dark:bg-slate-800 border-none rounded-lg p-2 text-[10px] font-bold" placeholder="인원" />
                                                    <input type="number" value={event.details?.nights || 1} onChange={(e) => updateDetails({ nights: Number(e.target.value) })} className="flex-1 bg-white dark:bg-slate-800 border-none rounded-lg p-2 text-[10px] font-bold" placeholder="박수" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-4 shrink-0">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            취소하기
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!event.title.trim()}
                            className="flex-[2] py-4 bg-primary disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            기록 저장하기
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
