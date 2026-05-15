'use client';

import { useState, useEffect } from 'react';
import { useTripStore } from '@pplaner/shared';
import { useUIStore } from '@pplaner/shared';
import { TripEvent } from '@pplaner/shared';
import { MainCategory, CATEGORY_MAP, WishlistItem } from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

// Components
import WishlistTimelineDrawer from './WishlistTimelineDrawer';
import TimelineDayList from './timeline/TimelineDayList';
import TimelineMapView from './timeline/TimelineMapView';
import TimelineGanttView from './timeline/TimelineGanttView';
import TimelineControlBar from './timeline/TimelineControlBar';

// Hooks
import { useTimelineData } from '@/hooks/useTimelineData';

interface TimelineEditorProps {
    onNavigateToSection?: (section: string) => void;
    onAddComment?: (eventId: string) => void;
}

export default function TimelineEditor({ onNavigateToSection, onAddComment }: TimelineEditorProps) {
    // Stores
    const { initializeDailyTimeline, removeEvent, insertEvent, addEvent, addEvents } = useTripStore();
    const { 
        setEditingEvent,
        viewMode,
        showOnlyBooked,
        setActiveDayIdx,
        activeDayIdx,
        isMapPlanningMode,
        setIsMapPlanningMode,
        mapInsertAfterIndex,
        setMapInsertAfterIndex
    } = useUIStore();

    // Local state for UI only within this component
    const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);

    // Data Hook (reactive to showOnlyBooked from UIStore)
    const { trip, timelineWithReservations, mapData } = useTimelineData(showOnlyBooked, highlightedEventId);

    // Initial timeline setup
    // Initial timeline setup - carefully controlled to avoid infinite loop
    useEffect(() => {
        const hasDates = trip?.dates?.startDate && trip?.dates?.endDate;
        const hasDuration = trip?.dates?.durationDays && trip?.dates?.durationDays > 0;
        const needsTimeline = !trip?.dailyTimeline || trip.dailyTimeline.length === 0;

        if ((hasDates || hasDuration) && needsTimeline) {
            console.log('Initializing empty timeline for trip');
            initializeDailyTimeline();
        }
        // Only run when dates or duration change or timeline is cleared
    }, [trip?.dates?.startDate, trip?.dates?.endDate, trip?.dates?.durationDays, trip?.dailyTimeline?.length, initializeDailyTimeline]);

    // Handlers
    const handleAddEvent = (dayIdx: number, event?: Partial<TripEvent> | Partial<TripEvent>[]) => {
        if (event) {
            // Confirming a pending event(s) - add directly to store
            if (Array.isArray(event)) {
                addEvents(dayIdx, event);
            } else {
                addEvent(dayIdx, event);
            }
        } else {
            // New manual event - open modal
            setEditingEvent({ dayIdx, event: {} });
        }
    };

    const handleEditEvent = (dayIdx: number, event: Partial<TripEvent>) => {
        setEditingEvent({ dayIdx, event });
    };

    const handleRemoveEvent = (dayIdx: number, id: string) => {
        if (window.confirm('일정을 삭제하시겠습니까?')) {
            removeEvent(dayIdx, id);
        }
    };

    const handleMapPlanEventAdd = (item: WishlistItem) => {
        if (mapInsertAfterIndex === null) return;
        
        const mapSegments = mapData.mapSegments || [];
        const segment = mapSegments.find(s => s.insertAfterIndex === mapInsertAfterIndex);
        if (!segment) return;
        
        const event: Partial<TripEvent> = {
            title: item.title,
            type: (item.mainCategory || 'sightseeing') as any,
            location: {
                name: item.place?.name || '',
                address: item.place?.address || '',
                lat: item.place?.lat,
                lng: item.place?.lng
            },
            memo: item.description,
            wishlistId: item.id
        };
        
        insertEvent(segment.dayIdx, event, mapInsertAfterIndex);
        setMapInsertAfterIndex(null); // Close drawer
    };

    if (!trip) return null;

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Main Content Area */}
            <div className="flex-1 flex relative">
                <AnimatePresence mode="wait">
                    {viewMode === 'timeline' ? (
                        <motion.div 
                            key="timeline"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex-1 flex h-full"
                        >
                            <TimelineDayList 
                                dailyTimeline={timelineWithReservations}
                                onAddEvent={handleAddEvent}
                                onEditEvent={handleEditEvent}
                                onRemoveEvent={handleRemoveEvent}
                                onAddComment={onAddComment}
                                onNavigateToSection={onNavigateToSection}
                                highlightedEventId={highlightedEventId}
                                onDayIdxChange={setActiveDayIdx}
                            />
                        </motion.div>
                    ) : viewMode === 'gantt' ? (
                        <motion.div 
                            key="gantt"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="flex-1 flex h-full"
                        >
                            <TimelineGanttView 
                                dailyTimeline={timelineWithReservations}
                                onEditEvent={handleEditEvent}
                            />
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="map"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex-1 overflow-hidden h-full relative"
                        >
                            {/* Map Planning Toggle & Banner */}
                            <div className="absolute top-4 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                                <div className="flex justify-between items-start pointer-events-auto">
                                    <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/50 p-1 flex">
                                        <button 
                                            onClick={() => setIsMapPlanningMode(false)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${!isMapPlanningMode ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                                        >
                                            조회 모드
                                        </button>
                                        <button 
                                            onClick={() => setIsMapPlanningMode(true)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${isMapPlanningMode ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                                        >
                                            <Sparkles className="w-3.5 h-3.5" />
                                            지도 기반 설계
                                        </button>
                                    </div>
                                </div>
                                
                                <AnimatePresence>
                                    {isMapPlanningMode && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="bg-primary/90 text-white text-xs font-bold py-3 px-4 rounded-2xl shadow-lg backdrop-blur-md self-center pointer-events-auto"
                                        >
                                            장소 사이의 선을 클릭하여 새로운 일정을 추가하세요
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <TimelineMapView 
                                mapMarkers={mapData.markers}
                                flightPaths={mapData.flightPaths}
                                tripPath={mapData.path}
                                mapSegments={mapData.mapSegments || []}
                                initialCenter={mapData.initialCenter}
                                isMapPlanningMode={isMapPlanningMode}
                                mapInsertAfterIndex={mapInsertAfterIndex}
                                onPolylineClick={(idx) => setMapInsertAfterIndex(idx)}
                                regions={trip.locations?.regions}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Wishlist Drawer for Map Planning Insertion */}
                <AnimatePresence>
                    {isMapPlanningMode && mapInsertAfterIndex !== null && (
                        <WishlistTimelineDrawer
                            onSelectItem={handleMapPlanEventAdd}
                            onClose={() => setMapInsertAfterIndex(null)}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
