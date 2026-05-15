'use client';
import { generateId } from '@pplaner/shared';

import { useState, useMemo } from 'react';
import { useTripStore } from '@pplaner/shared';
import TripMap from '@/components/common/TripMap';
import { useRegionSearch, RegionMetadata } from '@/hooks/useRegionSearch';
import { AIRPORTS, getRecommendedAirports } from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { Participant } from '@pplaner/shared';
import { cn } from '@pplaner/shared';
import DateRangeEditor from './DateRangeEditor';
import { format, addDays, differenceInDays, isSameMonth, isSameYear, parseISO, eachDayOfInterval, isSaturday, isSunday } from 'date-fns';
import { ko } from 'date-fns/locale';

const THEMES = [
    { id: 'relax', name: '휴식과 탐험', icon: 'spa' },
    { id: 'adventure', name: '모험', icon: 'explore' },
    { id: 'foodie', name: '맛집 투어', icon: 'restaurant' },
    { id: 'culture', name: '문화와 역사', icon: 'museum' },
    { id: 'nature', name: '자연 감상', icon: 'forest' },
    { id: 'city', name: '도시 관광', icon: 'apartment' },
    { id: 'luxury', name: '럭셔리 호캉스', icon: 'diamond' }
];

const ROLES: { id: Participant['role']; name: string; icon: string }[] = [
    { id: 'me', name: '나', icon: 'person' },
    { id: 'partner', name: '파트너', icon: 'favorite' },
    { id: 'family', name: '가족', icon: 'family_restroom' },
    { id: 'group member', name: '친구', icon: 'group' }
];

export default function BasicInfoEditor() {
    const trip = useTripStore((state) => state.currentTrip);
    const updateTrip = useTripStore((state) => state.updateTrip);

    const [newLocation, setNewLocation] = useState('');
    const { search, isLoaded } = useRegionSearch();
    const [suggestions, setSuggestions] = useState<RegionMetadata[]>([]);
    const [isThemeExpanded, setIsThemeExpanded] = useState(false);
    const [isParticipantsExpanded, setIsParticipantsExpanded] = useState(false);
    const [isLocationExpanded, setIsLocationExpanded] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isComposing, setIsComposing] = useState(false);



    if (!trip) return null;

    const handleLocationInputChange = async (val: string) => {
        setNewLocation(val);
        if (val.trim().length >= 1) {
            const results = await search(val);
            setSuggestions(results);
            setSelectedIndex(-1);
        } else {
            setSuggestions([]);
            setSelectedIndex(-1);
        }
    };


    const handleUpdate = (field: string, value: any) => {
        updateTrip({ [field]: value });
    };

    const handleDateUpdate = (updates: any) => {
        const oldStartDateStr = trip.dates?.startDate;
        const oldEndDateStr = trip.dates?.endDate;
        const newStartDateStr = updates.startDate || oldStartDateStr;
        const newEndDateStr = updates.endDate || oldEndDateStr;

        if (newStartDateStr && newEndDateStr && oldStartDateStr && oldEndDateStr) {
            const oldStart = parseISO(oldStartDateStr);
            const oldEnd = parseISO(oldEndDateStr);
            const newStart = parseISO(newStartDateStr);
            const newEnd = parseISO(newEndDateStr);

            const oldDuration = differenceInDays(oldEnd, oldStart) + 1;
            const newDuration = differenceInDays(newEnd, newStart) + 1;
            const shiftDays = differenceInDays(newStart, oldStart);

            // Determine if we should perform a "Smart Shift"
            // Duration Same + Start Date Changed = Clear Shift
            const isDurationSame = oldDuration === newDuration;
            const isShift = shiftDays !== 0;
            const useShiftMode = isShift && isDurationSame;

            // 1. Re-calculate the full timeline based on new dates
            const newTimeline: any[] = [];
            try {
                const interval = eachDayOfInterval({ start: newStart, end: newEnd });
                interval.forEach((date, idx) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    
                    let matchingDay = null;
                    if (useShiftMode) {
                        // In Shift Mode, keep data by relative day position (index)
                        matchingDay = (trip.dailyTimeline || [])[idx];
                    } else {
                        // In normal Sync Mode, keep data by exact date
                        matchingDay = (trip.dailyTimeline || []).find(d => d.date === dateStr);
                    }
                    
                    if (matchingDay) {
                        newTimeline.push({
                            ...matchingDay,
                            day: idx + 1,
                            date: dateStr,
                            // CRITICAL: Update all event dates to match the new day date
                            events: (matchingDay.events || []).map((e: any) => ({
                                ...e,
                                date: dateStr
                            }))
                        });
                    } else {
                        newTimeline.push({
                            day: idx + 1,
                            date: dateStr,
                            events: []
                        });
                    }
                });
            } catch (e) {
                console.error('Failed to sync timeline dates:', e);
            }

            // 2. Helper to shift dates for other resources
            const shiftDateStr = (dateStr?: string) => {
                if (!dateStr || !isShift) return dateStr;
                try {
                    const d = addDays(parseISO(dateStr), shiftDays);
                    return format(d, 'yyyy-MM-dd');
                } catch (e) { return dateStr; }
            };

            // 3. Update all sub-collections
            // If it's a duration change without a shift, we keep original dates
            // If it's a shift, we move everything
            const applyShift = useShiftMode;

            const updatedAccommodation = (trip.accommodation || []).map(acc => {
                if (!applyShift) return acc;
                const s = shiftDateStr(acc.startDate) || acc.startDate;
                const e = shiftDateStr(acc.endDate) || acc.endDate;
                return { ...acc, startDate: s, endDate: e };
            }).filter(acc => {
                if (!acc.startDate || !acc.endDate) return true;
                const aStart = parseISO(acc.startDate);
                const aEnd = parseISO(acc.endDate);
                return aStart <= newEnd && aEnd >= newStart;
            });

            const updateResourceList = (list: any[]) => {
                return (list || []).map(item => {
                    if (!applyShift) return item;
                    return {
                        ...item,
                        date: shiftDateStr(item.date),
                        paymentDate: shiftDateStr(item.paymentDate),
                        reservations: (item.reservations || []).map((r: any) => ({
                            ...r,
                            date: shiftDateStr(r.date)
                        }))
                    };
                }).filter(item => {
                    if (!item.date) return true;
                    const d = parseISO(item.date);
                    // Buffer for flights (2 days)
                    const bStart = addDays(newStart, -2);
                    const bEnd = addDays(newEnd, 2);
                    return d >= bStart && d <= bEnd;
                });
            };

            const updatedFlights = updateResourceList(trip.flights || []);
            const updatedPublicTransport = updateResourceList(trip.publicTransport || []);
            const updatedDriving = updateResourceList(trip.driving || []);

            const updatedReservations = (trip.reservations || []).map(r => {
                if (!applyShift) return r;
                return {
                    ...r,
                    date: shiftDateStr(r.date),
                    paymentDate: shiftDateStr(r.paymentDate)
                };
            }).filter(r => {
                if (!r.date) return true;
                const d = parseISO(r.date);
                return d >= newStart && d <= newEnd;
            });

            updateTrip({
                dates: {
                    ...trip.dates,
                    ...updates
                },
                dailyTimeline: newTimeline,
                accommodation: updatedAccommodation,
                flights: updatedFlights,
                publicTransport: updatedPublicTransport,
                driving: updatedDriving,
                reservations: updatedReservations
            });
        } else {
            updateTrip({
                dates: {
                    ...trip.dates,
                    ...updates
                }
            });
        }
    };

    const addLocation = (region: RegionMetadata) => {
        // ID 기반 중복 체크
        const regionIdStr = String(region.id);
        if (trip.locations?.regions?.some(r => String(r.id) === regionIdStr)) {
            setNewLocation('');
            setSuggestions([]);
            setSelectedIndex(-1);
            return;
        }

        const newRegion: any = {
            id: regionIdStr,
            type: region.type,
            name: region.name,
            countryId: region.country ? String(region.country) : undefined,
            prefectureId: region.prefecture ? String(region.prefecture) : undefined,
        };

        // 계층 정보 상세 보정
        if (region.type === 'country') {
            newRegion.countryId = regionIdStr;
        } else if (region.type === 'prefecture') {
            newRegion.prefectureId = regionIdStr;
        } else if (region.type === 'city') {
            newRegion.cityId = regionIdStr;
        }

        const newRegions = [...(trip.locations?.regions || []), newRegion];

        updateTrip({
            locations: {
                ...trip.locations,
                // UI 하이라이트 및 레거시 호환성을 위해 이름 정보도 유지하지만, 로직은 ID 우선
                regionNames: Array.from(new Set([...(trip.locations?.regionNames || []), region.name])),
                regions: newRegions
            }
        });

        setNewLocation('');
        setSuggestions([]);
        setSelectedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter') {
            if (isComposing) return;
            e.preventDefault();
            if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                addLocation(suggestions[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            setSuggestions([]);
            setSelectedIndex(-1);
        }
    };

    const removeLocation = (regionId: string) => {
        const targetRegion = trip.locations?.regions?.find(r => String(r.id) === String(regionId));
        if (!targetRegion) return;

        updateTrip({
            locations: {
                ...trip.locations,
                regionNames: (trip.locations?.regionNames || []).filter(rn => rn !== targetRegion.name),
                regions: (trip.locations?.regions || []).filter(r => String(r.id) !== String(regionId))
            }
        });
    };

    const updateParticipantRoleCount = (role: Participant['role'], delta: number) => {
        const currentParticipants = [...(trip.participants || [])];
        const roleParticipants = currentParticipants.filter(p => p.role === role);

        if (delta > 0) {
            // Apply limits
            if (role === 'me' && roleParticipants.length >= 1) return;
            // For others, we allow adding but we will handle the display
            
            const newParticipant: Participant = {
                id: generateId(),
                name: `${role === 'me' ? '본인' : role === 'partner' ? '파트너' : role === 'family' ? '가족' : '친구'} ${roleParticipants.length + 1}`,
                role,
                status: 'accepted'
            };
            updateTrip({ participants: [...currentParticipants, newParticipant] });
        } else if (delta < 0 && roleParticipants.length > 0) {
            if (role === 'me' && roleParticipants.length <= 1) return;

            const lastIndex = currentParticipants.map(p => p.role).lastIndexOf(role);
            if (lastIndex !== -1) {
                currentParticipants.splice(lastIndex, 1);
                updateTrip({ participants: currentParticipants });
            }
        }
    };

    const currentThemeInfo = THEMES.find(t => t.name === trip.theme) || THEMES[0];

    // --- Detailed Schedule Logic ---
    const KOREAN_HOLIDAYS = useMemo(() => [
        // 2024
        '2024-01-01', '2024-02-09', '2024-02-10', '2024-02-11', '2024-02-12', 
        '2024-03-01', '2024-04-10', '2024-05-05', '2024-05-06', '2024-05-15',
        '2024-06-06', '2024-08-15', '2024-09-16', '2024-09-17', '2024-09-18',
        '2024-10-03', '2024-10-09', '2024-12-25',
        // 2025
        '2025-01-01', '2025-01-28', '2025-01-29', '2025-01-30', '2025-03-01', 
        '2025-03-03', '2025-05-05', '2025-05-06', '2025-06-06', '2025-08-15',
        '2025-10-03', '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08', '2025-10-09',
        '2025-12-25',
        // 2026
        '2026-01-01', '2026-02-16', '2026-02-17', '2026-02-18', '2026-03-01',
        '2026-05-05', '2026-05-24', '2026-06-06', '2026-08-15', '2026-09-24',
        '2026-09-25', '2026-09-26', '2026-10-03', '2026-10-09', '2026-12-25'
    ], []);

    const scheduleSummary = useMemo(() => {
        if (!trip.dates?.startDate || !trip.dates?.endDate) return null;

        const start = parseISO(trip.dates.startDate);
        const end = parseISO(trip.dates.endDate);
        const nights = differenceInDays(end, start);
        const days = nights + 1;

        // Holiday & Weekend calculation
        let holidayCount = 0;
        try {
            const interval = eachDayOfInterval({ start, end });
            holidayCount = interval.filter(date => {
                const dateStr = format(date, 'yyyy-MM-dd');
                return KOREAN_HOLIDAYS.includes(dateStr);
            }).length;
        } catch (e) { /* ignore invalid interval */ }

        // Start Time from timeline
        let startTime = null;
        if (trip.dailyTimeline) {
            for (const day of trip.dailyTimeline) {
                const firstEvent = day.events?.find(e => e.startTime);
                if (firstEvent) {
                    startTime = firstEvent.startTime;
                    break;
                }
            }
        }

        // Date String Formatting
        let dateRangeStr = '';
        const startYear = format(start, 'yyyy년');
        const startMonth = format(start, 'M월');
        const startDay = format(start, 'd일');
        const startWoe = format(start, 'EEEE', { locale: ko });

        const endYear = format(end, 'yyyy년');
        const endMonth = format(end, 'M월');
        const endDay = format(end, 'd일');
        const endWoe = format(end, 'EEEE', { locale: ko });

        const startFormatted = format(start, 'yyyy.MM.dd');
        const endFormatted = format(end, 'yyyy.MM.dd');
        const endMonthDay = format(end, 'MM.dd');
        const endDayOnly = format(end, 'dd');

        if (isSameYear(start, end)) {
            if (isSameMonth(start, end)) {
                dateRangeStr = `${startFormatted}(${startWoe[0]}) ~ ${endDayOnly}(${endWoe[0]})`;
            } else {
                dateRangeStr = `${startFormatted}(${startWoe[0]}) ~ ${endMonthDay}(${endWoe[0]})`;
            }
        } else {
            dateRangeStr = `${startFormatted}(${startWoe[0]}) ~ ${endFormatted}(${endWoe[0]})`;
        }

        return {
            nights,
            days,
            holidayCount,
            startTime,
            dateRangeStr
        };
    }, [trip.dates, trip.dailyTimeline, KOREAN_HOLIDAYS]);

    const markers = useMemo(() => {
        if (!trip) return [];
        const m: Array<{ lat: number; lng: number; title: string; type: string; id: string; category?: string }> = [];

        // 1. Flights (Airports)
        trip.flights?.forEach((f, idx) => {
            const depAir = AIRPORTS.find(a => a.code === f.departureLocation);
            const depLat = f.departureLat || depAir?.lat;
            const depLng = f.departureLng || depAir?.lng;
            
            if (depLat && depLng) {
                m.push({ 
                    lat: depLat, 
                    lng: depLng, 
                    title: depAir ? `${depAir.nameKo} (${depAir.code})` : f.departureLocation || '출발 공항', 
                    type: 'airport',
                    category: 'transport',
                    id: `air-dep-${idx}-${f.departureLocation || idx}`
                });
            }
 
            const arrAir = AIRPORTS.find(a => a.code === f.arrivalLocation);
            const arrLat = f.arrivalLat || arrAir?.lat;
            const arrLng = f.arrivalLng || arrAir?.lng;
 
            if (arrLat && arrLng) {
                m.push({ 
                    lat: arrLat, 
                    lng: arrLng, 
                    title: arrAir ? `${arrAir.nameKo} (${arrAir.code})` : f.arrivalLocation || '도착 공항', 
                    type: 'airport',
                    category: 'transport',
                    id: `air-arr-${idx}-${f.arrivalLocation || idx}`
                });
            }
        });

        // Recommended Airports based on selected regions
        const regionsForSearch = trip.locations?.regions || [];
        const recommended = getRecommendedAirports(regionsForSearch);
        recommended.forEach(air => {
            if (air.lat && air.lng) {
                // Only add if not already in markers
                if (!m.some(existing => existing.type === 'airport' && (Math.abs(existing.lat - air.lat!) < 0.001 && Math.abs(existing.lng - air.lng!) < 0.001))) {
                    m.push({
                        lat: air.lat!,
                        lng: air.lng!,
                        title: `${air.nameKo} (${air.code})`,
                        type: 'airport',
                        id: `air-rec-${air.code}`
                    });
                }
            }
        });

        // 2. Accommodation
        trip.accommodation?.forEach(acc => {
            if (acc.lat && acc.lng) {
                m.push({ 
                    lat: acc.lat, 
                    lng: acc.lng, 
                    title: acc.name, 
                    type: 'accommodation',
                    id: acc.id 
                });
            }
        });

        // 3. Itinerary Events
        trip.dailyTimeline?.forEach(day => {
            day.events?.forEach(event => {
                if (event.location?.lat && event.location?.lng) {
                    m.push({ 
                        lat: event.location.lat, 
                        lng: event.location.lng, 
                        title: event.title, 
                        type: 'event',
                        id: event.id
                    });
                }
            });
        });

        // 4. Transport (Driving & Public)
        trip.driving?.forEach(d => {
            if (d.pickupLat && d.pickupLng) m.push({ lat: d.pickupLat, lng: d.pickupLng, title: `렌터카 픽업: ${d.pickupLocation}`, type: 'departure', id: `rental-p-${d.id}` });
            if (d.returnLat && d.returnLng) m.push({ lat: d.returnLat, lng: d.returnLng, title: `렌터카 반납: ${d.returnLocation}`, type: 'arrival', id: `rental-r-${d.id}` });
        });
        trip.publicTransport?.forEach(p => {
            if (p.departureLat && p.departureLng) m.push({ lat: p.departureLat, lng: p.departureLng, title: `출발: ${p.departureLocation}`, type: 'departure', id: `public-dep-${p.id}` });
            if (p.arrivalLat && p.arrivalLng) m.push({ lat: p.arrivalLat, lng: p.arrivalLng, title: `도착: ${p.arrivalLocation}`, type: 'arrival', id: `public-arr-${p.id}` });
        });

        // Remove duplicates based on location AND type (to keep airports distinct if they overlap with something else)
        return m.filter((item, index, self) =>
            index === self.findIndex((t) => (
                Math.abs(t.lat - item.lat) < 0.0001 && Math.abs(t.lng - item.lng) < 0.0001 && t.type === item.type
            ))
        );
    }, [trip]);

    const flightPaths = useMemo(() => {
        if (!trip) return [];
        return (trip.flights || []).map(f => {
            const depAir = AIRPORTS.find(a => a.code === f.departureLocation);
            const arrAir = AIRPORTS.find(a => a.code === f.arrivalLocation);
            
            const fromLat = f.departureLat || depAir?.lat;
            const fromLng = f.departureLng || depAir?.lng;
            const toLat = f.arrivalLat || arrAir?.lat;
            const toLng = f.arrivalLng || arrAir?.lng;

            if (fromLat && fromLng && toLat && toLng) {
                return {
                    from: { lat: fromLat, lng: fromLng },
                    to: { lat: toLat, lng: toLng }
                };
            }
            return null;
        }).filter(Boolean) as Array<{ from: { lat: number; lng: number }; to: { lat: number; lng: number } }>;
    }, [trip]);

    const existingData = useMemo(() => {
        const dataMap: Record<string, string[]> = {};
        
        // 1. Events from timeline
        trip.dailyTimeline?.forEach(day => {
            if (day.events && day.events.length > 0) {
                if (!dataMap[day.date]) dataMap[day.date] = [];
                dataMap[day.date].push('event');
            }
        });

        // 2. Accommodations (check every day in range)
        trip.accommodation?.forEach(acc => {
            if (acc.startDate && acc.endDate) {
                try {
                    const days = eachDayOfInterval({ 
                        start: parseISO(acc.startDate), 
                        end: parseISO(acc.endDate) 
                    });
                    days.forEach(day => {
                        const d = format(day, 'yyyy-MM-dd');
                        if (!dataMap[d]) dataMap[d] = [];
                        if (!dataMap[d].includes('accommodation')) dataMap[d].push('accommodation');
                    });
                } catch (e) { /* ignore invalid interval */ }
            }
        });

        // 3. Flights, Transport, Driving, Reservations
        trip.flights?.forEach(f => {
            if (f.date) {
                if (!dataMap[f.date]) dataMap[f.date] = [];
                if (!dataMap[f.date].includes('flight')) dataMap[f.date].push('flight');
            }
        });
        trip.publicTransport?.forEach(pt => {
            if (pt.date) {
                if (!dataMap[pt.date]) dataMap[pt.date] = [];
                if (!dataMap[pt.date].includes('transport')) dataMap[pt.date].push('transport');
            }
        });
        trip.driving?.forEach(d => {
            if (d.date) {
                if (!dataMap[d.date]) dataMap[d.date] = [];
                if (!dataMap[d.date].includes('transport')) dataMap[d.date].push('transport');
            }
        });
        trip.reservations?.forEach(r => {
            if (r.date) {
                if (!dataMap[r.date]) dataMap[r.date] = [];
                if (!dataMap[r.date].includes('reservation')) dataMap[r.date].push('reservation');
            }
        });

        return dataMap;
    }, [trip]);

    return (
        <div className="flex flex-col gap-6">
             {/* Detail Progress Booster Removed */}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                <div className="xl:col-span-5 space-y-3">
                    {/* 1. Identity Section (Always Active) */}
                    <div className="p-3 md:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                        <div className="grid grid-cols-1 gap-4 items-start">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">여행 제목</label>
                                    {trip.isOverseas ? (
                                        <span className="text-[9px] font-black px-1.5 py-0.5 bg-indigo-500 text-white rounded-md uppercase tracking-tighter">해외 여행</span>
                                    ) : (
                                        <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-500 text-white rounded-md uppercase tracking-tighter">국내 여행</span>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    defaultValue={trip.title}
                                    onBlur={(e) => handleUpdate('title', e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-bold text-xs text-slate-900 dark:text-white transition-all h-[42px] md:h-[46px]"
                                    placeholder="여행의 이름을 지어주세요"
                                />
                            </div>

                            <DateRangeEditor
                                startDate={trip.dates?.startDate || ''}
                                endDate={trip.dates?.endDate || ''}
                                flexibility={trip.dates?.flexibilityDays || 0}
                                onUpdate={handleDateUpdate}
                                existingData={existingData}
                            />

                            {/* Detailed Schedule Summary Card */}
                            {scheduleSummary && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-2 p-4 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] scale-150 rotate-12">
                                        <span className="material-symbols-rounded text-8xl">calendar_month</span>
                                    </div>
                                    
                                    <div className="relative z-10 flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="px-2 py-0.5 bg-primary text-white text-[10px] font-black rounded-lg italic">
                                                    {scheduleSummary.nights}박 {scheduleSummary.days}일
                                                </div>
                                                <span className="text-[11px] font-black text-slate-800 dark:text-white italic">여행 일정 요약</span>
                                            </div>
                                            {scheduleSummary.holidayCount > 0 && (
                                                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-md">
                                                    <span className="material-symbols-rounded text-[10px] text-red-500">weekend</span>
                                                    <span className="text-[9px] font-black text-red-500">공휴일 {scheduleSummary.holidayCount}일 포함</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex items-start gap-2">
                                                <span className="material-symbols-rounded text-sm text-primary/60 shrink-0 mt-0.5">date_range</span>
                                                <div className="text-[12px] font-bold text-slate-600 dark:text-slate-300">
                                                    {scheduleSummary.dateRangeStr}
                                                </div>
                                            </div>
                                            
                                            {scheduleSummary.startTime && (
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-rounded text-sm text-primary/60 shrink-0">schedule</span>
                                                    <div className="text-[11px] font-bold text-slate-500">
                                                        여행의 시작: <span className="text-primary font-black uppercase tracking-tighter">{scheduleSummary.startTime}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-2 border-t border-primary/10 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                <span className="text-[9px] font-black text-slate-400 shrink-0">진행 예정</span>
                                                <div className="flex gap-0.5">
                                                    {Array.from({ length: Math.min(scheduleSummary.days, 10) }).map((_, i) => (
                                                        <div key={i} className="w-1.5 h-1 bg-primary/20 rounded-full" />
                                                    ))}
                                                    {scheduleSummary.days > 10 && <span className="text-[8px] font-black text-slate-300 ml-0.5">...</span>}
                                                </div>
                                            </div>
                                            <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">P-Plan 최적화</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* 2. 자세히 기록하기 카드 (점진적 확장) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Theme Card */}
                        <div className={cn(
                            "group transition-all duration-300",
                            !isThemeExpanded && (trip.theme ? "opacity-100" : "opacity-60 hover:opacity-100"),
                            isThemeExpanded && "sm:col-span-2"
                        )}>
                            <button
                                onClick={() => {
                                    setIsThemeExpanded(!isThemeExpanded);
                                    if (!isThemeExpanded) setIsParticipantsExpanded(false);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left",
                                    isThemeExpanded 
                                        ? "bg-slate-100 dark:bg-slate-800 border-primary/30" 
                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-md"
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center text-primary shrink-0 transition-transform group-hover:scale-105",
                                    trip.theme ? "bg-primary/10" : "bg-slate-100 dark:bg-slate-800"
                                )}>
                                    <span className="material-symbols-rounded text-lg">{currentThemeInfo.icon}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">여행 테마</p>
                                    <h4 className="font-bold text-[11px] text-slate-900 dark:text-white truncate">
                                        {trip.theme || "여행 스타일 선택"}
                                    </h4>
                                </div>
                                <span className={cn(
                                    "material-symbols-rounded transition-transform text-slate-300 text-base",
                                    isThemeExpanded && "rotate-180"
                                )}>expand_more</span>
                            </button>

                            <AnimatePresence>
                                {isThemeExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-b-xl border-x border-b border-slate-200 dark:border-slate-800 grid grid-cols-3 sm:grid-cols-4 gap-2">
                                            {THEMES.map((theme) => (
                                                <button
                                                    key={theme.id}
                                                    onClick={() => {
                                                        handleUpdate('theme', theme.name);
                                                        setIsThemeExpanded(false);
                                                    }}
                                                    className={cn(
                                                        "flex flex-col items-center gap-1.5 p-2 rounded-lg border text-center transition-all",
                                                        trip.theme === theme.name
                                                            ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105"
                                                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-primary/40 text-slate-500"
                                                    )}
                                                >
                                                    <span className="material-symbols-rounded text-base">{theme.icon}</span>
                                                    <span className="text-[8px] font-black whitespace-nowrap">{theme.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Participants Card */}
                        <div className={cn(
                            "group transition-all duration-300",
                            !isParticipantsExpanded && (trip.participants?.length > 0 ? "opacity-100" : "opacity-60 hover:opacity-100"),
                            isParticipantsExpanded && "sm:col-span-2"
                        )}>
                            <button
                                onClick={() => {
                                    setIsParticipantsExpanded(!isParticipantsExpanded);
                                    if (!isParticipantsExpanded) setIsThemeExpanded(false);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left",
                                    isParticipantsExpanded 
                                        ? "bg-slate-100 dark:bg-slate-800 border-primary/30" 
                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-md"
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center text-blue-500 shrink-0 transition-transform group-hover:scale-105",
                                    trip.participants?.length > 0 ? "bg-blue-500/10" : "bg-slate-100 dark:bg-slate-800"
                                )}>
                                    <span className="material-symbols-rounded text-lg">group</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">동행자</p>
                                    <h4 className="font-bold text-[11px] text-slate-900 dark:text-white truncate">
                                        {trip.participants?.length > 0 ? `${trip.participants.length}명` : "누구와 함께 하나요?"}
                                    </h4>
                                </div>
                                <span className={cn(
                                    "material-symbols-rounded transition-transform text-slate-300 text-base",
                                    isParticipantsExpanded && "rotate-180"
                                )}>expand_more</span>
                            </button>

                            <AnimatePresence>
                                {isParticipantsExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-b-xl border-x border-b border-slate-200 dark:border-slate-800 space-y-1.5">
                                            {ROLES.map((role) => {
                                                const count = (trip.participants || []).filter(p => p.role === role.id).length;
                                                let displayCount = count.toString();
                                                
                                                if (role.id === 'partner' && count > 2) displayCount = '3+';
                                                else if (role.id === 'family' && count > 3) displayCount = '4+';
                                                else if (role.id === 'group member' && count > 4) displayCount = '4+';

                                                return (
                                                    <div key={role.id} className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                                                <span className="material-symbols-rounded text-base">{role.icon}</span>
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{role.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); updateParticipantRoleCount(role.id, -1); }}
                                                                className="compact-touch w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all font-black text-[10px]"
                                                            >
                                                                -
                                                            </button>
                                                            <span className="text-[10px] font-black text-slate-900 dark:text-white min-w-[24px] text-center">{displayCount}</span>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); updateParticipantRoleCount(role.id, 1); }}
                                                                className="compact-touch w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:bg-primary/10 hover:text-primary transition-all font-black text-[10px]"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Location Card */}
                        <div className={cn(
                            "group transition-all duration-300 sm:col-span-2",
                            !isLocationExpanded && ((trip.locations?.regions?.length ?? 0) > 0 ? "opacity-100" : "opacity-60 hover:opacity-100")
                        )}>
                            <button
                                onClick={() => setIsLocationExpanded(!isLocationExpanded)}
                                className={cn(
                                    "w-full flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left",
                                    isLocationExpanded 
                                        ? "bg-slate-100 dark:bg-slate-800 border-primary/30" 
                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-md"
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center text-emerald-500 shrink-0 transition-transform group-hover:scale-105 relative",
                                    (trip.locations?.regions?.length ?? 0) > 0 || (trip.locations?.regionNames?.length ?? 0) > 0 ? "bg-emerald-500/10" : "bg-slate-100 dark:bg-slate-800"
                                )}>
                                    <span className="material-symbols-rounded text-lg">location_on</span>
                                    {((trip.locations?.regions?.length ?? 0) > 0 || (trip.locations?.regionNames?.length ?? 0) > 0) && (
                                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-white dark:border-slate-900 shadow-sm">
                                            {Math.max(trip.locations?.regions?.length ?? 0, trip.locations?.regionNames?.length ?? 0)}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">여행지</p>
                                    <div className="flex flex-wrap gap-1 items-center">
                                        {(trip.locations?.regions?.length ?? 0) > 0 ? (
                                            trip.locations!.regions!.map(r => (
                                                <span key={r.id} className="inline-flex px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold rounded-md border border-emerald-100 dark:border-emerald-800/50">
                                                    {r.name}
                                                </span>
                                            ))
                                        ) : (trip.locations?.regionNames?.length ?? 0) > 0 ? (
                                            trip.locations!.regionNames!.map(name => (
                                                <span key={name} className="inline-flex px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold rounded-md border border-emerald-100 dark:border-emerald-800/50">
                                                    {name}
                                                </span>
                                            ))
                                        ) : (
                                            <h4 className="font-bold text-[11px] text-slate-400">어디로 여행을 떠나시나요?</h4>
                                        )}
                                    </div>
                                </div>
                                <span className={cn(
                                    "material-symbols-rounded transition-transform text-slate-300 text-base",
                                    isLocationExpanded && "rotate-180"
                                )}>expand_more</span>
                            </button>

                            <AnimatePresence>
                                {isLocationExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-visible"
                                    >
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-b-xl border-x border-b border-slate-200 dark:border-slate-800 space-y-3">
                                            <div className="relative">
                                                <span className="material-symbols-rounded absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                                                <input
                                                    type="text"
                                                    value={newLocation}
                                                    onChange={(e) => handleLocationInputChange(e.target.value)}
                                                    onKeyDown={handleKeyDown}
                                                    onCompositionStart={() => setIsComposing(true)}
                                                    onCompositionEnd={() => setIsComposing(false)}
                                                    placeholder="지역 추가..."
                                                    className="w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold outline-none focus:border-primary transition-all"
                                                />
                                                <AnimatePresence>
                                                    {suggestions.length > 0 && (
                                                        <motion.div 
                                                            initial={{ opacity:0, y: -5 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y: -5 }}
                                                            className="absolute z-[100] left-0 right-0 bottom-full mb-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl overflow-hidden max-h-40 overflow-y-auto"
                                                        >
                                                            {suggestions.map((s, i) => (
                                                                <button
                                                                    key={`${s.type}-${s.id}`}
                                                                    onClick={() => addLocation(s)}
                                                                    onMouseEnter={() => setSelectedIndex(i)}
                                                                    className={cn(
                                                                        "w-full text-left px-2.5 py-2 border-b border-slate-200/60 dark:border-slate-700 last:border-0 transition-all flex items-center gap-2",
                                                                        selectedIndex === i ? "bg-primary/10" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                                                                    )}
                                                                >
                                                                    <span className="material-symbols-rounded text-sm text-slate-400">location_on</span>
                                                                    <div className="min-w-0">
                                                                        <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate">{s.name}</p>
                                                                        <p className="text-[8px] font-bold text-slate-400 uppercase">{(s as any).parentName || s.type}</p>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            {/* 선택된 여행지 목록 - 위치 이동 (검색창 하단) */}
                                            <div className="space-y-2 pt-1.5 border-t border-slate-200 dark:border-slate-800">
                                                <div className="flex items-center justify-between px-0.5">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">선택된 여행지</p>
                                                    <span className="text-[8px] font-bold text-primary opacity-60 italic">Location Storage</span>
                                                </div>
                                                
                                                {((trip.locations?.regions?.length ?? 0) > 0 || (trip.locations?.regionNames?.length ?? 0) > 0) ? (
                                                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 min-h-[40px] items-center">
                                                        {(trip.locations?.regions?.length ?? 0) > 0 ? (
                                                            trip.locations!.regions!.map((region) => (
                                                                <span 
                                                                    key={`${region.type}-${region.id}`} 
                                                                    className={cn(
                                                                        "px-2 py-0.5 text-[10px] font-bold rounded-lg flex items-center gap-1 border transition-all shrink-0 shadow-sm animate-in fade-in zoom-in duration-300",
                                                                        region.type === 'country' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30' :
                                                                        region.type === 'prefecture' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30' :
                                                                        'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30'
                                                                    )}
                                                                >
                                                                    {region.name}
                                                                    <button onClick={(e) => { e.stopPropagation(); removeLocation(String(region.id)); }} className="material-symbols-rounded text-[14px] opacity-40 hover:opacity-100 font-black hover:text-red-500 transition-colors">close</button>
                                                                </span>
                                                            ))
                                                        ) : (
                                                            trip.locations!.regionNames!.map((name) => (
                                                                <span 
                                                                    key={name} 
                                                                    className="px-2 py-0.5 text-[10px] font-bold rounded-lg flex items-center gap-1 border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm shrink-0"
                                                                >
                                                                    {name}
                                                                    <button onClick={(e) => { e.stopPropagation(); removeLocation(name); }} className="material-symbols-rounded text-[14px] opacity-40 hover:opacity-100 font-black hover:text-red-500 transition-colors">close</button>
                                                                </span>
                                                            ))
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="py-6 flex flex-col items-center justify-center gap-2 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                                        <span className="material-symbols-rounded text-2xl text-slate-300">location_off</span>
                                                        <p className="text-[10px] font-bold text-slate-400">아직 추가된 여행지가 없습니다.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Map Section - Integrated & Refined */}
                <div className="xl:col-span-7 flex flex-col gap-3 h-full">
                    <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="material-symbols-rounded text-sm">map</span>
                            인터랙티브 여행 지도
                        </label>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-primary" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">일정</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">마커</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 min-h-[400px] xl:min-h-[500px] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm relative bg-slate-100 dark:bg-slate-800 group/map">
                        <div className="absolute inset-0 bg-slate-200/50 dark:bg-slate-800/50 animate-pulse pointer-events-none group-focus-within/map:opacity-0 transition-opacity" />
                        <TripMap
                            trip={trip}
                            viewMode="basic"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
