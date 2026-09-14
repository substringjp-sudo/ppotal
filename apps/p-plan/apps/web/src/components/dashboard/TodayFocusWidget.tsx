'use client';

import React, { useMemo } from 'react';
import { Trip, TripState, useTripStore } from '@pplaner/shared';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';

interface TodayFocusWidgetProps {
    trip?: Trip;
    className?: string;
    onNavigateTab?: (tab: string) => void;
}

export function TodayFocusWidget({
    trip: propTrip,
    className = '',
    onNavigateTab
}: TodayFocusWidgetProps) {
    const storeTrip = useTripStore((state: TripState) => state.currentTrip);
    const trip = propTrip || storeTrip;

    // 현재 날짜 또는 여행 시작일 계산
    const { todayDateStr, activeDayIndex, daySchedule, isDuringTrip } = useMemo(() => {
        if (!trip || !trip.dates || !trip.dates.startDate) {
            return { todayDateStr: '', activeDayIndex: 1, daySchedule: null, isDuringTrip: false };
        }

        const now = new Date();
        const start = parseISO(trip.dates.startDate);
        const end = trip.dates.endDate ? parseISO(trip.dates.endDate) : start;

        const isDuring = isWithinInterval(now, {
            start: startOfDay(start),
            end: endOfDay(end)
        });

        // 여행 중이면 오늘 날짜, 아니면 1일차 날짜
        const targetDate = isDuring ? format(now, 'yyyy-MM-dd') : trip.dates.startDate;
        
        // dailyTimeline에서 해당 날짜 찾기
        const timeline = trip.dailyTimeline || [];
        const foundIndex = timeline.findIndex(d => d.date === targetDate);
        const activeIdx = foundIndex >= 0 ? foundIndex + 1 : 1;
        const schedule = foundIndex >= 0 ? timeline[foundIndex] : (timeline[0] || null);

        return {
            todayDateStr: targetDate,
            activeDayIndex: activeIdx,
            daySchedule: schedule,
            isDuringTrip: isDuring
        };
    }, [trip]);

    // 오늘의 숙소 찾기
    const todayAccommodation = useMemo(() => {
        if (!trip?.accommodation || !todayDateStr) return null;
        return trip.accommodation.find(acc => {
            if (!acc.startDate || !acc.endDate) return false;
            return todayDateStr >= acc.startDate && todayDateStr < acc.endDate;
        });
    }, [trip?.accommodation, todayDateStr]);

    // 오늘의 핵심 다음 장소 / 이벤트
    const nextSpot = useMemo(() => {
        if (!daySchedule || !daySchedule.events || daySchedule.events.length === 0) return null;
        return daySchedule.events[0];
    }, [daySchedule]);

    // 오늘의 항공/바우처 티켓
    const todayFlightOrTicket = useMemo(() => {
        if (!trip || !todayDateStr) return null;
        const flight = (trip.flights || []).find(f => f.date === todayDateStr || (f.departureTime && f.departureTime.startsWith(todayDateStr)));
        if (flight) return { 
            type: 'flight', 
            title: `${flight.airline || '항공편'} (${flight.departureLocation || '출발지'} → ${flight.arrivalLocation || '도착지'})`, 
            time: flight.departureTime?.split('T')[1]?.slice(0, 5) || flight.departureTime 
        };
        return null;
    }, [trip, todayDateStr]);

    if (!trip) return null;

    return (
        <div className={`w-full rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-900/90 to-cyan-950/40 border border-cyan-500/30 p-5 shadow-lg shadow-cyan-950/20 text-neutral-100 ${className}`}>
            {/* 상단 헤더: 현장 실시간 상태 바 */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-neutral-800/80">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                    </span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                            {isDuringTrip ? '현장 실시간 브리핑' : 'Day 1 여정 프리뷰'}
                        </span>
                        <span className="text-sm font-extrabold text-neutral-100">
                            Day {activeDayIndex}
                        </span>
                        <span className="text-xs font-medium text-neutral-400">
                            ({todayDateStr ? format(parseISO(todayDateStr), 'M월 d일 (E)', { locale: ko }) : ''})
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-semibold flex items-center gap-1">
                        <span className="material-symbols-rounded text-xs">location_on</span>
                        {trip.locations?.regions?.[0]?.name || trip.title || '목적지'}
                    </span>
                </div>
            </div>

            {/* 본문: 오늘의 3대 퀵 포커스 카드 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3.5">
                {/* 1. 다음 목적지 / 장소 */}
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-neutral-950/50 border border-neutral-800/80 hover:border-cyan-500/30 transition">
                    <div className="flex items-center justify-between text-neutral-400">
                        <span className="text-[11px] font-semibold flex items-center gap-1">
                            <span className="material-symbols-rounded text-xs text-amber-400">explore</span>
                            오늘의 핵심 스팟
                        </span>
                        {nextSpot?.startTime && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-neutral-800 text-amber-300 rounded font-bold">
                                {nextSpot.startTime}
                            </span>
                        )}
                    </div>
                    <div className="font-bold text-sm text-neutral-100 truncate">
                        {nextSpot?.title || '등록된 일정이 없습니다'}
                    </div>
                    <p className="text-[11px] text-neutral-400 truncate">
                        {(typeof nextSpot?.location === 'string' ? nextSpot.location : nextSpot?.location?.name) || nextSpot?.memo || '타임라인에서 새로운 장소를 추가하세요'}
                    </p>
                </div>

                {/* 2. 오늘 머무를 숙소 */}
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-neutral-950/50 border border-neutral-800/80 hover:border-cyan-500/30 transition">
                    <div className="flex items-center justify-between text-neutral-400">
                        <span className="text-[11px] font-semibold flex items-center gap-1">
                            <span className="material-symbols-rounded text-xs text-indigo-400">hotel</span>
                            오늘의 숙소
                        </span>
                        <span className="text-[10px] font-semibold text-indigo-300">
                            {todayAccommodation ? '체크인 예정' : '숙소 확인'}
                        </span>
                    </div>
                    <div className="font-bold text-sm text-neutral-100 truncate">
                        {todayAccommodation?.name || '등록된 숙소 없음 (야간 이동 또는 미등록)'}
                    </div>
                    <p className="text-[11px] text-neutral-400 truncate">
                        {todayAccommodation?.location || (todayAccommodation ? '체크인 일정 확인' : '숙소 관리 탭에서 추가하세요')}
                    </p>
                </div>

                {/* 3. 오늘 사용할 티켓 / 교통 */}
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-neutral-950/50 border border-neutral-800/80 hover:border-cyan-500/30 transition">
                    <div className="flex items-center justify-between text-neutral-400">
                        <span className="text-[11px] font-semibold flex items-center gap-1">
                            <span className="material-symbols-rounded text-xs text-emerald-400">confirmation_number</span>
                            오늘의 티켓 & 이동
                        </span>
                        {todayFlightOrTicket?.time && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-neutral-800 text-emerald-300 rounded font-bold">
                                {todayFlightOrTicket.time}
                            </span>
                        )}
                    </div>
                    <div className="font-bold text-sm text-neutral-100 truncate">
                        {todayFlightOrTicket?.title || '오늘 예정된 탑승권 없음'}
                    </div>
                    <p className="text-[11px] text-neutral-400 truncate">
                        {todayFlightOrTicket ? '탑승권 바우처 확인 가능' : '교통/예약 탭에서 확인하세요'}
                    </p>
                </div>
            </div>

            {/* 하단 퀵 액션 바로가기 */}
            <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-neutral-800/60">
                <button
                    type="button"
                    onClick={() => onNavigateTab ? onNavigateTab('schedule') : null}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/40 transition cursor-pointer flex items-center gap-1"
                >
                    <span className="material-symbols-rounded text-sm">schedule</span>
                    타임라인 바로보기
                </button>
                <button
                    type="button"
                    onClick={() => onNavigateTab ? onNavigateTab('accommodation') : null}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition cursor-pointer flex items-center gap-1"
                >
                    <span className="material-symbols-rounded text-sm">hotel</span>
                    숙소 확인
                </button>
            </div>
        </div>
    );
}
