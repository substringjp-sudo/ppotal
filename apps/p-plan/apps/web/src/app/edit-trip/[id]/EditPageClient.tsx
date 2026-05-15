'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';


import { useTripStore } from '@pplaner/shared';
import { useUserStore } from '@pplaner/shared';
import { useUIStore } from '@pplaner/shared';
import { TripEvent } from '@pplaner/shared';
import { CATEGORY_MAP, MainCategory, WishlistItem } from '@pplaner/shared';
import { useTrip, useTripSubData, useSaveTrip } from '@/hooks/useTripQuery';
import { 
    saveTrip, 
    DAILY_PLANS_SUB, CHECKLIST_SUB, BUCKET_LIST_SUB, 
    FLIGHTS_SUB, ACCOMMODATION_SUB, DRIVING_SUB, 
    PUBLIC_TRANSPORT_SUB, PREP_TIMELINE_SUB, RESERVATIONS_SUB 
} from '@pplaner/shared';

// Extracted UI Components
import { SECTIONS, SOURCE_TO_SECTION_MAP, SectionId } from '@pplaner/shared';
import EditSidebar from '@/components/edit-trip/layout/EditSidebar';
import EditMainContent from '@/components/edit-trip/layout/EditMainContent';
import EditFloatingActions from '@/components/edit-trip/layout/EditFloatingActions';
import MobileSectionTabBar from '@/components/edit-trip/layout/MobileSectionTabBar';
import Link from 'next/link';
import { Trip } from '@pplaner/shared';

export default function EditTripByIdPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    
    const idParam = params.id;
    let id = Array.isArray(idParam) ? idParam[0] : (idParam as string);
    const isServer = typeof window === 'undefined';

    // Firebase Hosting의 Static Export 리라이트([id]=placeholder) 대응
    if (id === 'placeholder') {
        if (!isServer) {
            const pathSegments = window.location.pathname.split('/').filter(Boolean);
            // /edit-trip/ID 형식인 경우 두 번째 세그먼트가 ID입니다.
            if (pathSegments[0] === 'edit-trip' && pathSegments[1]) {
                id = pathSegments[1];
            }
        } else {
            // 빌드 타임(SSR)에는placeholder 데이터를 가져오지 않도록 id를 비워줌
            id = '';
        }
    }

    
    // id가 없으면 목록으로 리다이렉트
    useEffect(() => {
        if (!id) {
            router.replace('/trips');
        }
    }, [id, router]);

    if (!id) return null;
    
    // UI State
    const [activeSection, setActiveSection] = useState<SectionId>('basics');
    const [showSuccess, setShowSuccess] = useState(false);
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
    const [addingCommentToEvent, setAddingCommentToEvent] = useState<string | null>(null);
    
    // Global Stores
    const currentTrip = useTripStore((state) => state.currentTrip);
    const userProfile = useUserStore((state) => state.profile);
    const { updateTrip, isSaving: isSavingStore, setIsSaving, addEvent, updateEvent, subscribeComments } = useTripStore();
    const { setEditingEvent, activeDayIdx, setIsWishlistOpen } = useUIStore();

    // Data Fetching
    const { data: tripData, isLoading: isTripLoading } = useTrip(id);
    const { mutate: saveTripMutation, isPending: isSavingMutation } = useSaveTrip();
    const isSaving = isSavingStore || isSavingMutation;

    // Sub-collection Loading
    const { data: flightsData } = useTripSubData(id, FLIGHTS_SUB, activeSection === 'transport');
    const { data: drivingData } = useTripSubData(id, DRIVING_SUB, activeSection === 'transport');
    const { data: publicTransportData } = useTripSubData(id, PUBLIC_TRANSPORT_SUB, activeSection === 'transport');
    const { data: accommodationData } = useTripSubData(id, ACCOMMODATION_SUB, activeSection === 'accommodation');
    const { data: dailyPlansData } = useTripSubData(id, DAILY_PLANS_SUB, activeSection === 'timeline');
    const { data: reservationsData } = useTripSubData(id, RESERVATIONS_SUB, activeSection === 'reservations');

    // Sync Query Params
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && SECTIONS.some(s => s.id === tab)) {
            setActiveSection(tab as SectionId);
        }
    }, [searchParams]);

    // Initial trip sync
    useEffect(() => {
        if (tripData && (!currentTrip || currentTrip.id !== id)) {
            updateTrip(tripData);
        }
    }, [tripData, updateTrip, id, currentTrip]);

    // Sub-collections sync
    useEffect(() => {
        const subDataMap = {
            [FLIGHTS_SUB]: flightsData,
            [DRIVING_SUB]: drivingData,
            [PUBLIC_TRANSPORT_SUB]: publicTransportData,
            [ACCOMMODATION_SUB]: accommodationData,
            [DAILY_PLANS_SUB]: dailyPlansData,
            [RESERVATIONS_SUB]: reservationsData,
        };

        const loadedKeys = Object.entries(subDataMap)
            .filter(([, data]) => !!data)
            .map(([key]) => key);

        if (loadedKeys.length === 0) return;

        const updates: Partial<Trip> = {};
        const currentLoaded = currentTrip?._loadedSubCollections || [];
        const newLoaded = [...currentLoaded];
        let hasNewData = false;
        
        for (const [key, data] of Object.entries(subDataMap)) {
            if (data && (!currentLoaded.includes(key))) {
                const fieldName = (key === DAILY_PLANS_SUB ? 'dailyTimeline' : key) as keyof Trip;
                (updates as any)[fieldName] = data;
                newLoaded.push(key);
                hasNewData = true;
            }
        }

        if (hasNewData) {
            updateTrip({
                ...updates,
                _loadedSubCollections: newLoaded
            });
        }
    }, [
        flightsData, drivingData, publicTransportData, 
        accommodationData, dailyPlansData, reservationsData, 
        updateTrip, currentTrip
    ]);

    // Comments subscription
    useEffect(() => {
        if (!id) return;
        const unsubscribe = subscribeComments(id);
        return () => unsubscribe();
    }, [id, subscribeComments]);

    // Auto-save
    useEffect(() => {
        if (!currentTrip || currentTrip.id !== id || !userProfile?.userId) return;
        const timer = setTimeout(() => {
            saveTripMutation({ 
                trip: currentTrip, 
                user: {
                    uid: userProfile.userId,
                    name: userProfile.displayName || 'Unknown User',
                    photoURL: userProfile.photoURL
                } 
            }, {
                onSuccess: () => {
                    setShowSuccess(true);
                    setTimeout(() => setShowSuccess(false), 2000);
                }
            });
        }, 5000); 
        return () => clearTimeout(timer);
    }, [currentTrip, userProfile?.userId, saveTripMutation, id]);

    // Manual Save
    const handleSaveEntireTrip = async () => {
        if (!currentTrip || !userProfile?.userId) return;
        setIsSaving(true);
        try {
            await saveTrip(currentTrip, {
                uid: userProfile.userId,
                name: userProfile.displayName || 'Unknown User',
                photoURL: userProfile.photoURL
            });
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error) {
            console.error("수동 저장 실패:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // Events Handlers
    const handleSaveEvent = (eventData: Partial<TripEvent> | Partial<TripEvent>[]) => {
        if (!currentTrip || typeof activeDayIdx !== 'number') return;
        
        const events = Array.isArray(eventData) ? eventData : [eventData];
        events.forEach(event => {
            if (!event.id) {
                addEvent(activeDayIdx, { title: event.title || '새 일정', startTime: event.startTime || '10:00', ...event });
            } else {
                updateEvent(activeDayIdx, event.id, event);
            }
        });
        setEditingEvent(null);
    };

    const handleAddFromWishlist = (wishlistItem: WishlistItem) => {
        const preparedEvent: Partial<TripEvent> = {
            title: wishlistItem.title,
            type: wishlistItem.mainCategory || 'sightseeing',
            mainCategory: wishlistItem.mainCategory || 'sightseeing',
            subCategory: wishlistItem.subCategory,
            location: wishlistItem.place ? {
                name: wishlistItem.place.name,
                address: wishlistItem.place.address,
                lat: wishlistItem.place.lat,
                lng: wishlistItem.place.lng,
                googlePlaceId: wishlistItem.place.placeId,
                url: wishlistItem.place.googleMapsUrl
            } : undefined,
            imageUrls: wishlistItem.imageUrls,
            memo: wishlistItem.description,
            wishlistId: wishlistItem.id,
            category: wishlistItem.subCategory
                ? CATEGORY_MAP[wishlistItem.mainCategory as MainCategory]?.subCategories.find((s) => s.value === wishlistItem.subCategory)?.label
                : CATEGORY_MAP[wishlistItem.mainCategory as MainCategory]?.label
        };
        setEditingEvent({ dayIdx: activeDayIdx, event: preparedEvent });
        setIsWishlistOpen(false);
    };

    const warnings = currentTrip?.warnings || [];
    const sectionWarnings = warnings.reduce((acc, w) => {
        const section = SOURCE_TO_SECTION_MAP[w.sourceType] || 'basics';
        if (!acc[section]) acc[section] = { critical: 0, warning: 0, info: 0 };
        acc[section][w.severity]++;
        return acc;
    }, {} as Record<string, { critical: number; warning: number; info: number }>);

    if (isTripLoading) return (
        <div className="min-h-screen flex items-center justify-center dark:bg-slate-950 font-pretendard">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-slate-500 font-bold animate-pulse">여행 정보를 불러오는 중...</p>
            </div>
        </div>
    );

    if (!currentTrip) return (
        <div className="min-h-screen flex items-center justify-center dark:bg-slate-950 font-pretendard">
            <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
                <span className="material-symbols-rounded text-6xl text-slate-300 mb-4 font-light">search_off</span>
                <p className="text-slate-500 font-bold mb-6">여행 데이터를 찾을 수 없습니다 (ID: {id})</p>
                <Link href="/" className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-black shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                    <span className="material-symbols-rounded">home</span>
                    홈으로 돌아가기
                </Link>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 font-pretendard">
            <motion.main
                initial="hidden" animate="visible"
                variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
                className="max-w-[2400px] mx-auto px-2 sm:px-3 lg:px-5 xl:px-6 py-2 sm:py-3 lg:py-4"
            >
                {/* 데스크탑: 사이드바 + 콘텐츠 / 모바일: 콘텐츠만 */}
                <div className="flex flex-row gap-3 lg:gap-4 xl:gap-5 items-start relative h-[calc(100dvh-96px)] sm:h-[calc(100vh-64px)] overflow-hidden">
                    <EditSidebar
                        tripId={id}
                        currentTrip={currentTrip}
                        warnings={warnings}
                        activeSection={activeSection}
                        setActiveSection={setActiveSection}
                        isAnalysisOpen={isAnalysisOpen}
                        setIsAnalysisOpen={setIsAnalysisOpen}
                        isSaving={isSaving}
                        onSaveEntireTrip={handleSaveEntireTrip}
                        showSuccess={showSuccess}
                        sectionWarnings={sectionWarnings}
                    />

                    <EditMainContent
                        activeSection={activeSection}
                        setActiveSection={setActiveSection}
                        onAddComment={setAddingCommentToEvent}
                    />
                </div>
            </motion.main>

            {/* 모바일 전용 섹션 탭 바 */}
            <MobileSectionTabBar
                activeSection={activeSection}
                setActiveSection={setActiveSection}
                isSaving={isSaving}
                onSave={handleSaveEntireTrip}
                sectionWarnings={sectionWarnings}
            />

            <EditFloatingActions
                activeSection={activeSection}
                setActiveSection={setActiveSection}
                addingCommentToEvent={addingCommentToEvent}
                setAddingCommentToEvent={setAddingCommentToEvent}
                handleSaveEvent={handleSaveEvent}
                handleAddFromWishlist={handleAddFromWishlist}
            />
        </div>
    );
}
