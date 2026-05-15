'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { 
    getTravelog, 
    saveTravelog, 
    Travelog, 
    TravelogEvent, 
    TravelogDailyPlan, 
    TravelogSection,
    TravelogSourceContext,
    calculateTravelogRepresentativeRegion,
    generateId,
    cn,
    calculateDistance,
    reverseGeocodeNames,
    batchReverseGeocodeNames
} from '@pplaner/shared';
import { GoogleMapsSearch } from '@/components/common/GoogleMapsSearch';

import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { useRef } from 'react';

import WritingModeEditor from '@/components/travelogs/editor/WritingModeEditor';
import TimelineModeBuilder from '@/components/travelogs/editor/TimelineModeBuilder';
import { ScheduleItemModal } from '@/components/travelogs/editor/ScheduleItemModal';
import MapComponent from '@/components/common/MapComponent';

/**
 * ShortcutGuide - 사용자가 에디터의 주요 단축키를 확인할 수 있는 플로팅 가이드
 */
function ShortcutGuide() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-xl hover:scale-110 active:scale-95",
                    isOpen ? "bg-primary text-white" : "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl text-slate-400 border border-slate-200 dark:border-slate-800"
                )}
            >
                <span className="material-symbols-rounded">{isOpen ? 'close' : 'keyboard_command_key'}</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.9, x: -20 }}
                        animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9, x: -20 }}
                        className="absolute bottom-16 right-0 w-72 bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-[0_30px_60px_rgba(0,0,0,0.2)] p-6 z-50 origin-bottom-right"
                    >
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-6 flex items-center gap-2">
                            <span className="material-symbols-rounded text-sm">command</span> 작업 단축키
                        </h4>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between group">
                                <span className="text-[11px] font-black text-slate-500">다음 / 이전 날짜</span>
                                <div className="flex gap-1.5">
                                    <kbd className="px-1.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-black min-w-[32px] text-center">Alt</kbd>
                                    <kbd className="px-1.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-black min-w-[24px] text-center">← / →</kbd>
                                </div>
                            </div>
                            <div className="flex items-center justify-between group">
                                <span className="text-[11px] font-black text-slate-500">활동 삽입</span>
                                <div className="flex gap-1.5">
                                    <kbd className="px-1.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-black min-w-[32px] text-center">Alt</kbd>
                                    <kbd className="px-1.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-black min-w-[24px] text-center">A</kbd>
                                </div>
                            </div>
                            <div className="flex items-center justify-between group">
                                <span className="text-[11px] font-black text-slate-500">이벤트 삽입</span>
                                <div className="flex gap-1.5">
                                    <kbd className="px-1.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-black min-w-[32px] text-center">Alt</kbd>
                                    <kbd className="px-1.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-black min-w-[24px] text-center">E</kbd>
                                </div>
                            </div>
                            <div className="flex items-center justify-between group">
                                <span className="text-[11px] font-black text-slate-500">현재 시각</span>
                                <div className="flex gap-1.5">
                                    <kbd className="px-1.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-black min-w-[32px] text-center">Alt</kbd>
                                    <kbd className="px-1.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-black min-w-[24px] text-center">T</kbd>
                                </div>
                            </div>
                            <div className="flex items-center justify-between group">
                                <span className="text-[11px] font-black text-slate-500">프레임 나가기</span>
                                <div className="flex gap-1.5">
                                    <kbd className="px-1.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-black min-w-[32px] text-center">⌘</kbd>
                                    <kbd className="px-1.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-black min-w-[32px] text-center">⏎</kbd>
                                </div>
                            </div>
                            <div className="h-[1px] bg-slate-50 dark:bg-slate-800/50 my-2" />
                            <div className="flex items-center justify-between group">
                                <span className="text-[11px] font-black text-slate-500">테두리 토글</span>
                                <div className="flex gap-1.5">
                                    <kbd className="px-1.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-black min-w-[32px] text-center">Alt</kbd>
                                    <kbd className="px-1.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-black min-w-[24px] text-center">B</kbd>
                                </div>
                            </div>
                            <div className="flex items-center justify-between group">
                                <span className="text-[11px] font-black text-slate-500">채우기 토글</span>
                                <div className="flex gap-1.5">
                                    <kbd className="px-1.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-black min-w-[32px] text-center">Alt</kbd>
                                    <kbd className="px-1.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-black min-w-[24px] text-center">K</kbd>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-4 border-t border-slate-200/60 dark:border-slate-800">
                             <p className="text-[9px] font-bold text-slate-400 italic">"Master your keyboard, master your memory."</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/**
 * TravelogEditorClient - 여행 기록을 편집하는 프리미엄 투트랙 에디터
 * 1. Tracking A: Keyboard-Centric Writing Mode
 * 2. Tracking B: Mouse-Centric Timeline Mode
 */
export default function TravelogEditorClient({ id }: { id: string }) {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    
    const [travelog, setTravelog] = useState<Travelog | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [viewMode, setViewMode] = useState<'split' | 'writing' | 'timeline'>('split');
    const [activeDayIndex, setActiveDayIndex] = useState(0);
    const [repRegion, setRepRegion] = useState<any>(null);
    const [isSimpleMode, setIsSimpleMode] = useState(false);
    const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);

    const onPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        toast.info(`${files.length}개의 사진 분석을 시작합니다...`);
        
        // 1. 메타데이터 분석 (ExifReader는 HEIC 포함 다양한 포맷 지원)
        const ExifReader = (await import('exifreader')).default;
        
        const analyzed = await Promise.all(files.map(async (file) => {
            const loadImage = (await import('blueimp-load-image')).default;
            
            // ExifReader로 메타데이터 먼저 추출
            let timestamp = file.lastModified;
            let lat: number | undefined;
            let lng: number | undefined;

            try {
                const tags = await ExifReader.load(file);
                
                // 촬영 시간 추출
                if (tags['DateTimeOriginal']?.description) {
                    const rawDate = tags['DateTimeOriginal'].description as string;
                    const formattedDate = rawDate.trim().replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3').replace(' ', 'T');
                    const parsedDate = new Date(formattedDate);
                    if (!isNaN(parsedDate.getTime())) {
                        timestamp = parsedDate.getTime();
                    }
                }

                // GPS 좌표 추출 (ExifReader는 기본적으로 변환된 description 제공)
                if (tags['GPSLatitude']?.description && tags['GPSLongitude']?.description) {
                    lat = Number(tags['GPSLatitude'].description);
                    lng = Number(tags['GPSLongitude'].description);
                    
                    // N/S, E/W 확인 (description에 이미 반영되어 있지 않은 경우를 대비)
                    const latRefValue = tags['GPSLatitudeRef']?.value;
                    const lngRefValue = tags['GPSLongitudeRef']?.value;
                    const latRef = Array.isArray(latRefValue) ? latRefValue[0] : latRefValue;
                    const lngRef = Array.isArray(lngRefValue) ? lngRefValue[0] : lngRefValue;

                    if (latRef === 'S' && lat > 0) lat = -lat;
                    if (lngRef === 'W' && lng > 0) lng = -lng;
                }
            } catch (err) {
                console.warn("Exif extraction failed for:", file.name, err);
            }

            // 2. 미리보기 및 업로드용 이미지 리사이징 (폭 720px)
            return new Promise((resolve) => {
                loadImage(
                    file,
                    (img: any) => {
                        if (img.type === 'error') {
                            console.error("Image loading failed:", file.name);
                            resolve({
                                id: Math.random().toString(36).substr(2, 9),
                                file,
                                url: URL.createObjectURL(file),
                                timestamp,
                                lat,
                                lng
                            });
                            return;
                        }

                        // Canvas를 Blob으로 변환하여 리사이징된 파일 생성
                        img.toBlob((blob: Blob | null) => {
                            const resizedFile = blob 
                                ? new File([blob], file.name, { type: 'image/jpeg' }) 
                                : file;

                            resolve({
                                id: Math.random().toString(36).substr(2, 9),
                                file: resizedFile,
                                url: URL.createObjectURL(resizedFile),
                                timestamp,
                                lat,
                                lng
                            });
                        }, 'image/jpeg', 0.9);
                    },
                    { orientation: true, canvas: true, maxWidth: 720 }
                );
            });
        }));

        // 시간순 정렬
        const sorted = (analyzed as any[]).sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            return timeA - timeB;
        });

        setAnalyzedPhotos(prev => {
            const newPhotos = [...prev, ...sorted];
            // 클러스터링 및 날짜 추론 실행
            processPhotos(newPhotos);
            return newPhotos;
        });
        toast.success('사진 분석이 완료되었습니다.');
    };

    const processPhotos = async (photos: any[]) => {
        if (photos.length === 0) return;

        // 1. 날짜 범위 추론
        const times = photos.map(p => new Date(p.timestamp).getTime());
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        
        const inferredStart = format(new Date(minTime), 'yyyy-MM-dd');
        const inferredEnd = format(new Date(maxTime), 'yyyy-MM-dd');

        setTravelog(prev => {
            if (!prev) return prev;
            // 이미 설정된 날짜가 기본값이 아닌 경우 유지, 기본값인 경우 추론된 날짜로 변경
            return {
                ...prev,
                startDate: (prev.startDate && prev.startDate !== format(new Date(), 'yyyy-MM-dd')) ? prev.startDate : inferredStart,
                endDate: (prev.endDate && prev.endDate !== format(addDays(new Date(), 3), 'yyyy-MM-dd')) ? prev.endDate : inferredEnd
            };
        });

        // 2. 클러스터링 (시간 2시간, 거리 1km 기준)
        const clusters: any[][] = [];
        let currentCluster: any[] = [];

        photos.forEach((photo, idx) => {
            if (currentCluster.length === 0) {
                currentCluster.push(photo);
            } else {
                const lastPhoto = currentCluster[currentCluster.length - 1];
                const timeDiff = (new Date(photo.timestamp).getTime() - new Date(lastPhoto.timestamp).getTime()) / (1000 * 60 * 60);
                
                let distDiff = 0;
                if (photo.lat && photo.lng && lastPhoto.lat && lastPhoto.lng) {
                    distDiff = calculateDistance(photo.lat, photo.lng, lastPhoto.lat, lastPhoto.lng);
                }

                // 2시간 이상 차이 나거나 50m 이상 떨어지면 새로운 클러스터
                if (timeDiff > 2 || distDiff > 0.05) {
                    clusters.push(currentCluster);
                    currentCluster = [photo];
                } else {
                    currentCluster.push(photo);
                }
            }
            if (idx === photos.length - 1 && currentCluster.length > 0) {
                clusters.push(currentCluster);
            }
        });

        // 3. 클러스터별 대표 좌표 수집
        const clusterCoords = clusters.map(cluster => {
            const coordsPhotos = cluster.filter(p => p.lat && p.lng);
            const avgLat = coordsPhotos.length > 0 
                ? coordsPhotos.reduce((sum, p) => sum + p.lat, 0) / coordsPhotos.length 
                : undefined;
            const avgLng = coordsPhotos.length > 0 
                ? coordsPhotos.reduce((sum, p) => sum + p.lng, 0) / coordsPhotos.length 
                : undefined;
            return { lat: avgLat, lng: avgLng };
        });

        // 4. 배치 역지오코딩 실행 (한 번의 요청으로 모든 장소 이름 획득)
        const validCoords = clusterCoords.filter(c => c.lat !== undefined && c.lng !== undefined) as { lat: number, lng: number }[];
        const geoResults = await batchReverseGeocodeNames(validCoords);
        
        let geoIdx = 0;
        const activities = await Promise.all(clusters.map(async (cluster, idx) => {
            const first = cluster[0];
            const last = cluster[cluster.length - 1];
            const coord = clusterCoords[idx];

            let placeName = '핵심 장소';
            if (coord.lat !== undefined && coord.lng !== undefined) {
                // 1. 내부 역지오코딩 결과 (기본값)
                const geo = geoResults[geoIdx++];
                placeName = geo.city || geo.prefecture || '특정 장소';

                // 2. Google Geocoder를 통한 정밀 지명 시도 (POI 우선)
                if (typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
                    try {
                        const geocoder = new (window as any).google.maps.Geocoder();
                        const response = await geocoder.geocode({ location: { lat: coord.lat, lng: coord.lng } });
                        if (response.results && response.results.length > 0) {
                            // POI(point_of_interest)나 establishment가 포함된 결과 찾기
                            const poi = response.results.find((r: any) => 
                                r.types.includes('point_of_interest') || 
                                r.types.includes('establishment') || 
                                r.types.includes('landmark') ||
                                r.types.includes('park') ||
                                r.types.includes('tourist_attraction')
                            );
                            
                            if (poi) {
                                // POI 이름 추출 (보통 첫 번째 address_component)
                                placeName = poi.address_components[0].long_name;
                            } else if (response.results[0].formatted_address) {
                                // POI가 없으면 짧은 주소 형태 (첫 두 마디)
                                const parts = response.results[0].formatted_address.split(', ');
                                placeName = parts[0] || placeName;
                            }
                        }
                    } catch (e) {
                        console.warn("Google Geocoding failed for cluster:", idx, e);
                    }
                }
            }

            return {
                id: generateId(),
                title: `${placeName} 방문 및 탐방`,
                startTime: format(new Date(first.timestamp), 'HH:mm'),
                endTime: format(new Date(last.timestamp), 'HH:mm'),
                date: format(new Date(first.timestamp), 'yyyy-MM-dd'),
                photos: cluster,
                lat: coord.lat,
                lng: coord.lng
            };
        }));

        setSuggestedActivities(activities);
    };


    const finalizeWizard = () => {
        if (!travelog) return;

        // 1. 활동들을 일자별로 그룹화
        const dailyGroups: Record<string, any[]> = {};
        suggestedActivities.forEach(act => {
            if (!dailyGroups[act.date]) dailyGroups[act.date] = [];
            dailyGroups[act.date].push(act);
        });

        // 2. 일자별 타임라인 생성
        const finalTimeline: TravelogDailyPlan[] = [];
        const startDate = parseISO(travelog.startDate!);
        const endDate = parseISO(travelog.endDate!);
        const totalDays = differenceInDays(endDate, startDate) + 1;

        for (let i = 1; i <= totalDays; i++) {
            const currentDate = format(addDays(startDate, i - 1), 'yyyy-MM-dd');
            const dayActs = dailyGroups[currentDate] || [];

            finalTimeline.push({
                day: i,
                date: currentDate,
                events: dayActs.map(act => ({
                    id: act.id,
                    type: 'activity',
                    title: act.title,
                    startTime: act.startTime,
                    endTime: act.endTime,
                    location: {
                        name: act.title.split(' 방문')[0],
                        lat: act.lat,
                        lng: act.lng
                    },
                    imageUrls: act.photos.map((p: any) => p.url),
                    mainCategory: 'other'
                }))
            });
        }

        // 3. 본문 자동 삽입 로직 (에디터가 비어있거나 초기 상태일 때만 수행)
        let initialSections = travelog.sections;
        const mainSection = travelog.sections.find(s => s.type === 'text');
        const isEditorEmpty = !mainSection || !mainSection.content || mainSection.content.trim() === '';

        if (isAutoAddToEditor && isEditorEmpty) {
            const docContent: any[] = [];
            
            finalTimeline.forEach(day => {
                // 날짜 구분선 추가
                docContent.push({
                    type: 'daySeparator',
                    attrs: { day: day.day, date: day.date }
                });

                // 활동 추가 (분석된 결과가 있는 경우)
                day.events.forEach(event => {
                    docContent.push({
                        type: 'scheduleItem',
                        attrs: { ...event, isSetup: false },
                        content: [{ type: 'blockBody' }]
                    });
                });

                // 날짜별 기본 입력 공간 제공
                docContent.push({ type: 'blockBody' });
                docContent.push({ type: 'premiumDivider' });
            });

            initialSections = [{
                id: mainSection?.id || generateId(),
                type: 'text',
                content: '',
                contentJson: {
                    type: 'doc',
                    content: docContent
                }
            }];
        }

        setTravelog(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                timeline: finalTimeline,
                sections: initialSections,
                status: 'draft'
            };
        });

        setCurrentStep('editor');
        
        // 에디터 진입 시점에 최초 강제 저장 수행
        // state 업데이트(setTravelog)가 비동기이므로, 다음 틱에서 저장하거나 
        // 직접 새 로그 객체를 넘겨서 저장하도록 유도
        setTimeout(() => {
            handleSave(false);
        }, 100);
    };

    const [currentStep, setCurrentStep] = useState<'info' | 'photos' | 'editor'>('info');
    const [analyzedPhotos, setAnalyzedPhotos] = useState<any[]>([]);
    const [suggestedActivities, setSuggestedActivities] = useState<any[]>([]);
    const [wizardMapCenter, setWizardMapCenter] = useState<{lat: number, lng: number} | null>(null);
    const [wizardMapZoom, setWizardMapZoom] = useState(15);
    const [isAutoAddToEditor, setIsAutoAddToEditor] = useState(true);

    // Layout States
    const [isLeftPaneOpen, setIsLeftPaneOpen] = useState(true);
    const [insertionStatus, setInsertionStatus] = useState<{ canAdd: boolean, dayToInsert: number | null, allDaysInDoc: number[] }>({ canAdd: false, dayToInsert: null, allDaysInDoc: [] });
    
    // Editor Instance Ref
    const editorRef = useRef<any>(null);
    const [usedTimelineIds, setUsedTimelineIds] = useState<string[]>([]);
    const [globalModalConfig, setGlobalModalConfig] = useState<{
        isOpen: boolean;
        event: TravelogEvent | null;
        dayEvents: TravelogEvent[];
        isSidebarEdit?: boolean;
        getPos?: () => number;
    }>({
        isOpen: false,
        event: null,
        dayEvents: []
    });

    // 전역 상세 편집 모달 이벤트 수신
    useEffect(() => {
        const handleEditEvent = (e: any) => {
            const { attrs, getPos, isSidebarEdit } = e.detail;
            
            // 속한 날짜의 모든 이벤트 찾기
            let dayEvents: TravelogEvent[] = [];
            if (travelog) {
                // 1. ID로 찾기
                let day = travelog.timeline.find(d => d.events.some(ev => ev.id === attrs.id || (ev.subEvents && ev.subEvents.some(se => se.id === attrs.id))));
                
                // 2. 대체 검색 (제목/장소/시간이 유사한 항목이 있는 날짜 찾기)
                if (!day && attrs.title) {
                    day = travelog.timeline.find(d => d.events.some(ev => ev.title === attrs.title && ev.time === attrs.time));
                }

                if (day) {
                    dayEvents = day.events;
                }
            }

            setGlobalModalConfig({
                isOpen: true,
                event: attrs as TravelogEvent,
                dayEvents,
                isSidebarEdit: !!isSidebarEdit,
                getPos
            });
        };

        window.addEventListener('pplaner:edit-event', handleEditEvent);
        return () => window.removeEventListener('pplaner:edit-event', handleEditEvent);
    }, [travelog]);

    // 대표 사진(커버 이미지) 설정 이벤트 수신
    useEffect(() => {
        const handleSetCover = (e: any) => {
            const { url } = e.detail;
            if (!url) return;
            
            setTravelog(prev => prev ? { ...prev, coverImageUrl: url } : prev);
            toast.success('대표 사진으로 지정되었습니다.', {
                icon: <span className="material-symbols-rounded text-amber-400">stars</span>
            });
        };

        window.addEventListener('pplaner:set-cover-image' as any, handleSetCover);
        return () => window.removeEventListener('pplaner:set-cover-image' as any, handleSetCover);
    }, []);

    // 단축키 및 사진 큐 제어 로직
    const handleInsertPhoto = useCallback((photo: any) => {
        if (editorRef.current) {
            editorRef.current.insertPhoto(photo.url);
            setAnalyzedPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, isUsed: true } : p));
            toast.success('사진이 삽입되었습니다.');
        }
    }, [analyzedPhotos]);

    const handleSkipPhoto = useCallback((photo: any) => {
        setAnalyzedPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, isSkipped: true } : p));
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (currentStep !== 'editor') return;
            
            const nextPhoto = analyzedPhotos.find(p => !p.isUsed && !p.isSkipped);
            if (!nextPhoto) return;

            // Cmd/Ctrl + Enter: Insert
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleInsertPhoto(nextPhoto);
            }
            // Cmd/Ctrl + Right: Skip
            if (e.key === 'ArrowRight' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSkipPhoto(nextPhoto);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentStep, analyzedPhotos, handleInsertPhoto, handleSkipPhoto]);

    // 전역 단축키 (날짜 이동 및 추가)
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.altKey && e.key === 'ArrowRight') {
                e.preventDefault();
                setActiveDayIndex(prev => Math.min(prev + 1, (travelog?.timeline.length || 1) - 1));
                toast.info('다음 날짜로 이동했습니다.');
            }
            if (e.altKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                setActiveDayIndex(prev => Math.max(prev - 1, 0));
                toast.info('이전 날짜로 이동했습니다.');
            }
            // Alt + D: 날짜 추가
            if (e.altKey && e.key === 'd') {
                e.preventDefault();
                handleAddDay();
            }
            // Alt + T: 시간 추가
            if (e.altKey && e.key === 't') {
                e.preventDefault();
                editorRef.current?.insertTimestamp();
            }
            // Alt + A: 행동 추가
            if (e.altKey && e.key === 'a') {
                e.preventDefault();
                editorRef.current?.insertActivity();
            }
            // Alt + E: 이벤트 추가
            if (e.altKey && e.key === 'e') {
                e.preventDefault();
                editorRef.current?.insertEvent();
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [travelog?.timeline.length]);

    // 1. 데이터 로드 (SourceContext 대응 로직 포함)
    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.replace('/travelogs');
            return;
        }

        const fetchLog = async () => {
            try {
                const data = await getTravelog(id);
                if (data) {
                    if (data.userId !== user.uid) {
                        toast.error('권한이 없습니다.');
                        router.replace('/travelogs');
                        return;
                    }
                    setTravelog(data);
                    setIsSimpleMode(data.recordingMode === 'simple');
                    // 이미 존재하는 트래블로그면 마법사 건너뜀
                    setCurrentStep('editor');
                } else {
                    // 신규 생성 (기본값 설정 및 컨텍스트 대응)
                    const now = new Date().toISOString();
                    
                    // 1. URL 쿼리에서 tripId 확인 (계획 기반 생성 시)
                    const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
                    const tripId = searchParams.get('tripId');

                    let initialTimeline: TravelogDailyPlan[] = [];
                    let initialSourceContext: TravelogSourceContext = 'scratch';
                    let initialTitle = '';
                    let initialTheme = '힐링';
                    let initialMemberCounts = { me: 1, partner: 0, family: 0, friends: 0 };
                    let initialSections: TravelogSection[] = [{ id: generateId(), type: 'text', content: '' }];
                    let initialStartDate = format(new Date(), 'yyyy-MM-dd');
                    let initialEndDate = format(addDays(new Date(), 3), 'yyyy-MM-dd');

                    if (tripId) {
                        try {
                            const { getTripMain, convertTripToTravelog } = await import('@pplaner/shared');
                            const tripData = await getTripMain(tripId);
                            if (tripData) {
                                // 계획 데이터를 트래블로그로 변환
                                const convertedLog = convertTripToTravelog(tripData, user.uid);
                                
                                // ID 및 기본 메타데이터 유지
                                convertedLog.id = id;
                                initialTimeline = convertedLog.timeline;
                                initialSourceContext = 'plan_only';
                                
                                // 기타 정보 병합
                                initialTitle = tripData.title;
                                initialTheme = tripData.theme || '힐링';
                                initialMemberCounts = tripData.memberCounts || { me: 1, partner: 0, family: 0, friends: 0 };
                                initialSections = convertedLog.sections;
                                if (tripData.dates?.startDate) initialStartDate = tripData.dates.startDate;
                                if (tripData.dates?.endDate) initialEndDate = tripData.dates.endDate;

                                toast.info('여행 계획 정보를 성공적으로 가져왔습니다.');
                            }
                        } catch (err) {
                            console.error('Failed to fetch trip data:', err);
                        }
                    }

                    const newLog: Travelog = {
                        id,
                        tripId: tripId || undefined,
                        userId: user.uid,
                        title: initialTitle,
                        summary: '',
                        theme: initialTheme,
                        memberCounts: initialMemberCounts,
                        status: 'draft',
                        isPublic: false,
                        sourceContext: initialSourceContext,
                        timeline: initialTimeline,
                        sections: initialSections,
                        startDate: initialStartDate,
                        endDate: initialEndDate,
                        createdAt: now,
                        updatedAt: now
                    };
                    setTravelog(newLog);
                }
            } catch (err) {
                console.error(err);
                toast.error('데이터를 불러오는데 실패했습니다.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchLog();
    }, [id, user, authLoading, router]);

    // 3. 페이지 이탈 방지 (BeforeUnload) 및 더티 상태 관리
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    // 저장 성공 시 더티 상태 해제
    const handleSave = async (silent = false) => {
        if (!travelog || !user) return;
        
        // 마법사 단계에서는 서버에 저장하지 않음 (최종 완료 시에만 저장)
        if (currentStep !== 'editor' && silent) return;

        if (!silent) setIsSaving(true);
        
        try {
            await saveTravelog(travelog);
            setIsDirty(false); // 저장 성공 시 dirty 해제
            if (!silent) toast.success('저장되었습니다.');
        } catch (err) {
            console.error(err);
            if (!silent) toast.error('저장에 실패했습니다.');
        } finally {
            if (!silent) setIsSaving(false);
        }
    };

    useEffect(() => {
        if (!travelog) return;
        
        // 데이터가 변경되면 dirty 상태로 전환 (로딩 직후 제외)
        if (!isLoading) {
            setIsDirty(true);
        }

        // 에디터 모드에서만 자동 저장 활성화
        if (currentStep !== 'editor') return;

        const timer = setTimeout(() => {
            handleSave(true);
        }, 10000);
        return () => clearTimeout(timer);
    }, [travelog, currentStep]);

    useEffect(() => {
        if (!travelog || currentStep !== 'editor') return;
        
        const targetMode = isSimpleMode ? 'simple' : 'standard';
        if (travelog.recordingMode !== targetMode) {
            setTravelog(prev => prev ? { ...prev, recordingMode: targetMode } : prev);
            // 모드 전환 시 즉시 저장 (사용자 경험을 위해 딜레이 없이)
            handleSave(true);
        }
    }, [isSimpleMode, currentStep]);

    // 대표 지역 실시간 산출 연동
    useEffect(() => {
        if (!travelog) return;
        calculateTravelogRepresentativeRegion(travelog).then(setRepRegion);
    }, [travelog?.timeline]);

    // 에디터 상태 감시 및 삽입 가능 여부 체크
    useEffect(() => {
        const updateStatus = () => {
            if (editorRef.current) {
                const status = editorRef.current.getInsertionStatus();
                setInsertionStatus(status);
            }
        };

        // 섹션 데이터가 바뀌거나 마법사 단계가 바뀌면 상태 업데이트
        updateStatus();

        // 에디터 마운트 직후에는 ref가 늦게 잡힐 수 있으므로 짧은 지연 후 재확인
        const timer = setTimeout(updateStatus, 100);
        return () => clearTimeout(timer);
    }, [travelog?.sections, currentStep]);

    // 4. 통합 업데이트 핸들러 - 지능형 날짜 추가
    const handleAddDay = useCallback(() => {
        if (!travelog || !editorRef.current) return;
        
        // 현재 에디터 컨텍스트에서 제안하는 날짜 확인
        const status = editorRef.current.getInsertionStatus();
        if (!status.canAdd || !status.dayToInsert) {
            toast.error('현재 커서 위치에는 날짜를 추가할 수 없습니다.');
            return;
        }

        const dayNumber = status.dayToInsert;
        
        // 여행 기간 제한 체크 (계획된 기간이 있는 경우)
        if (travelog.startDate && travelog.endDate) {
            const totalDays = Math.ceil((parseISO(travelog.endDate).getTime() - parseISO(travelog.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
            if (dayNumber > totalDays) {
                toast.warning(`기존 계획된 여행 기간(${totalDays}일)을 초과하는 날짜입니다.`);
                // 초과해도 추가는 허용할지, 아니면 차단할지에 따라 로직 분기 가능
                // 여기서는 사용자 요청에 따라 기간 내로 제한하는 방향으로 처리
                return;
            }
        }
        
        if (!travelog.startDate) {
            toast.error('여행 시작일 정보가 없습니다. 시작일을 먼저 설정해주세요.');
            return;
        }

        const startDate = parseISO(travelog.startDate);
        const dateToInsert = addDays(startDate, dayNumber - 1);
        const dateStr = format(dateToInsert, 'yyyy-MM-dd');

        // 1. 타임라인 데이터 업데이트 및 정렬
        const existingDay = travelog.timeline.find(d => d.day === dayNumber);
        let updatedTimeline = [...travelog.timeline];
        
        if (!existingDay) {
            const newDay: TravelogDailyPlan = {
                day: dayNumber,
                date: dateStr,
                events: []
            };
            updatedTimeline.push(newDay);
            updatedTimeline.sort((a, b) => a.day - b.day);
        }

        setTravelog(prev => {
            if (!prev) return prev;
            return { 
                ...prev, 
                timeline: updatedTimeline
            };
        });
        
        // 3. 해당 날짜 인덱스로 포커스 이동 (타임라인 빌더 등 연동용)
        const newIndex = updatedTimeline.findIndex(d => d.day === dayNumber);
        setActiveDayIndex(newIndex);
        
        // 4. 에디터에 구분선 삽입
        editorRef.current.insertDaySeparator(dayNumber, dateStr);
        
        toast.success(`Day ${dayNumber} (${format(dateToInsert, 'MM/dd')})가 추가되었습니다.`);
    }, [travelog]);

    if (isLoading || authLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
             <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">메모리 엔진을 깨우는 중...</p>
            </div>
        </div>
    );

    if (!travelog) return null;

    // --- 마법사 Step 1: 기본 정보 입력 ---
    if (currentStep === 'info') {
        const totalPersons = (travelog.memberCounts?.me || 0) + 
                            (travelog.memberCounts?.partner || 0) + 
                            (travelog.memberCounts?.family || 0) + 
                            (travelog.memberCounts?.friends || 0);

        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 selection:bg-primary/20">
                <motion.div 
                    initial={{ opacity: 0, y: 40, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="w-full max-w-4xl grid md:grid-cols-2 bg-white dark:bg-slate-900 rounded-[56px] shadow-[0_40px_100px_rgba(0,0,0,0.1)] overflow-hidden border border-slate-200 dark:border-slate-800"
                >
                    {/* Hero Visual Side */}
                    <div className="relative bg-primary overflow-hidden hidden md:block">
                        <div className="absolute inset-0 opacity-20">
                            <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent animate-pulse" />
                        </div>
                        <div className="absolute bottom-12 left-12 right-12 z-10 text-white">
                            <h2 className="text-5xl font-black tracking-tighter leading-none mb-6">여행을<br/>기록하세요</h2>
                            <p className="text-sm font-bold opacity-70 leading-relaxed">흩어진 사진과 조각난 기억을 모아<br/>나만의 특별한 여행기를 완성해보세요.</p>
                        </div>
                        {/* Abstract Decorations */}
                        <div className="absolute top-20 right-[-40px] w-64 h-64 rounded-full border-[32px] border-white/10" />
                        <div className="absolute bottom-[-100px] right-20 w-80 h-80 bg-white/5 rounded-[80px] rotate-45" />
                    </div>

                    {/* Form Side */}
                    <div className="p-10 md:p-16 flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-12">
                            <div className="flex items-center gap-2">
                                <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs font-black">01</span>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">기초 정보</h3>
                            </div>
                            <div className="flex gap-1">
                                <div className="w-6 h-1 rounded-full bg-primary" />
                                <div className="w-2 h-1 rounded-full bg-slate-100 dark:bg-slate-800" />
                                <div className="w-2 h-1 rounded-full bg-slate-100 dark:bg-slate-800" />
                            </div>
                        </div>

                        <div className="space-y-10">
                            <div className="group">
                                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4 ml-1">여행 제목</label>
                                <input 
                                    autoFocus
                                    type="text"
                                    placeholder="무엇을 위한 여행이었나요?"
                                    value={travelog.title}
                                    onChange={(e) => setTravelog({ ...travelog, title: e.target.value })}
                                    className="w-full bg-transparent border-none p-0 text-3xl font-black placeholder:text-slate-100 dark:placeholder:text-slate-800 focus:ring-0 transition-all tracking-tight"
                                />
                                <div className="h-[2px] w-full bg-slate-50 dark:bg-slate-800 mt-4 overflow-hidden">
                                     <motion.div 
                                        animate={{ width: travelog.title ? '100%' : '0%' }}
                                        className="h-full bg-primary" 
                                     />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4 ml-1">여행 시작</label>
                                    <input 
                                        type="date"
                                        value={travelog.startDate || ''}
                                        onChange={(e) => setTravelog({...travelog, startDate: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-5 text-xs font-black focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4 ml-1">여행 종료</label>
                                    <input 
                                        type="date"
                                        value={travelog.endDate || ''}
                                        onChange={(e) => setTravelog({...travelog, endDate: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-5 text-xs font-black focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4 ml-1">분위기 및 스타일</label>
                                    <select 
                                        value={travelog.theme}
                                        onChange={(e) => setTravelog({...travelog, theme: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-5 text-xs font-black appearance-none focus:ring-2 focus:ring-primary/20"
                                    >
                                        <option value="힐링">🌿 HEALING</option>
                                        <option value="액티비티">🚀 ACTIVITY</option>
                                        <option value="미식">🍕 GOURMET</option>
                                        <option value="감성">🪄 AESTHETIC</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4 ml-1">함께한 사람</label>
                                    <button 
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-5 flex items-center justify-between text-left group"
                                    >
                                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                                            {totalPersons > 0 ? `${totalPersons}명` : "인원 설정"}
                                        </span>
                                        <span className="material-symbols-rounded text-slate-300 group-hover:text-primary transition-colors">group_add</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-20 flex flex-col gap-4">
                            <button 
                                onClick={finalizeWizard}
                                disabled={!travelog.title}
                                className="group relative w-full py-5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-[28px] font-black shadow-2xl overflow-hidden hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale"
                            >
                                <div className="absolute inset-0 bg-primary translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                <span className="relative flex items-center justify-center gap-2 uppercase tracking-[0.2em] text-xs">
                                    기록 바로 시작하기 <span className="material-symbols-rounded text-sm">edit</span>
                                </span>
                            </button>
                            <button 
                                onClick={() => setCurrentStep('photos')}
                                className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-rounded text-base">photo_library</span>
                                사진 추가하여 분석하기 (선택)
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    // --- 마법사 Step 1: 사진 업로드 및 분석 ---
    if (currentStep === 'photos') {
        const photoMarkers = analyzedPhotos
            .filter(p => p.lat && p.lng)
            .map((p, idx) => ({
                id: p.id,
                lat: p.lat,
                lng: p.lng,
                title: `${idx + 1}. Photo at ${format(new Date(p.timestamp), 'HH:mm')}`,
                type: 'event'
            }));

        const photoPath = analyzedPhotos
            .filter(p => p.lat && p.lng)
            .map(p => ({ lat: p.lat, lng: p.lng }));

        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 selection:bg-primary/20">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-6xl bg-white dark:bg-slate-900 rounded-[56px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col h-[90vh]"
                >
                    <div className="p-10 border-b border-slate-200/60 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xs font-black shrink-0">01</div>
                            <div className="flex-1 max-w-xl">
                                <input 
                                    type="text"
                                    placeholder="여행의 제목을 입력하세요"
                                    value={travelog.title}
                                    onChange={(e) => setTravelog({ ...travelog, title: e.target.value })}
                                    className="w-full bg-transparent border-none p-0 text-2xl font-black placeholder:text-slate-200 dark:placeholder:text-slate-800 focus:ring-0 transition-all tracking-tight"
                                />
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">여행 제목 및 추억</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-2 h-1 rounded-full bg-slate-100 dark:bg-slate-800" />
                            <div className="w-6 h-1 rounded-full bg-primary" />
                            <div className="w-2 h-1 rounded-full bg-slate-100 dark:bg-slate-800" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                        {/* Left: Photos & Activities */}
                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar border-r border-slate-200/60 dark:border-slate-800">
                            {analyzedPhotos.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center border-4 border-dashed border-slate-200/60 dark:border-slate-800 rounded-[40px] group hover:border-primary/20 transition-all py-20">
                                    <div className="w-24 h-24 rounded-[32px] bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-slate-300 group-hover:text-primary">
                                        <span className="material-symbols-rounded text-5xl">cloud_upload</span>
                                    </div>
                                    <h4 className="text-lg font-black text-slate-700 dark:text-slate-200">여행 사진을 여기에 드래그하세요</h4>
                                    <p className="text-sm font-bold text-slate-400 mt-2 mb-8">촬영 시간과 장소 정보를 자동으로 분석합니다</p>
                                    <input 
                                        type="file" 
                                        multiple 
                                        accept="image/*"
                                        onChange={onPhotoUpload}
                                        className="hidden" 
                                        id="photo-upload"
                                    />
                                    <label 
                                        htmlFor="photo-upload"
                                        className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest cursor-pointer hover:shadow-xl hover:shadow-primary/20 transition-all"
                                    >
                                        사진 선택
                                    </label>
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    {/* Suggested Activities Section */}
                                    {suggestedActivities.length > 0 && (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-rounded text-primary">auto_awesome</span>
                                                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">분석된 추천 활동 ({suggestedActivities.length})</h3>
                                            </div>
                                            <div className="grid gap-4">
                                                {suggestedActivities.map((activity, idx) => (
                                                    <motion.div 
                                                        key={activity.id}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[32px] border border-slate-200 dark:border-slate-800 flex flex-col gap-4 group"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex gap-4">
                                                                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm text-primary font-black text-xs">
                                                                    #{idx + 1}
                                                                </div>
                                                                <div>
                                                                    <input 
                                                                        className="bg-transparent border-none p-0 text-sm font-black text-slate-800 dark:text-white focus:ring-0 w-full"
                                                                        value={activity.title}
                                                                        onChange={(e) => {
                                                                            const newActs = [...suggestedActivities];
                                                                            newActs[idx].title = e.target.value;
                                                                            setSuggestedActivities(newActs);
                                                                        }}
                                                                        onFocus={() => {
                                                                            if (activity.lat && activity.lng) {
                                                                                setWizardMapCenter({ lat: activity.lat, lng: activity.lng });
                                                                                setWizardMapZoom(17);
                                                                            }
                                                                        }}
                                                                    />
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-[10px] font-bold text-slate-400">
                                                                            {activity.startTime} — {activity.endTime}
                                                                        </span>
                                                                        <span className="text-[10px] font-bold text-slate-400">•</span>
                                                                        <span className="text-[10px] font-bold text-primary italic lowercase tracking-tight">
                                                                            {activity.photos.length}개의 순간이 포착됨
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex-1">
                                                                <GoogleMapsSearch 
                                                                    placeholder="장소 검색 및 연결"
                                                                    inputClassName="py-2.5 px-4 text-[11px] rounded-xl border-none bg-white/50 dark:bg-slate-700/50"
                                                                    locationBias={activity.lat && activity.lng ? { lat: activity.lat, lng: activity.lng } : undefined}
                                                                    radius={500}
                                                                    onPlaceSelect={(place) => {
                                                                        const newActs = [...suggestedActivities];
                                                                        newActs[idx].title = place.name || newActs[idx].title;
                                                                        if (place.geometry?.location) {
                                                                            newActs[idx].lat = place.geometry.location.lat();
                                                                            newActs[idx].lng = place.geometry.location.lng();
                                                                        }
                                                                        setSuggestedActivities(newActs);
                                                                        toast.success('장소가 업데이트되었습니다.');
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Activity Photo Thumbnails */}
                                                        <div className="flex gap-2 py-12 -my-8 overflow-x-auto scrollbar-hide px-4 -mx-4">
                                                            {activity.photos.map((photo: any) => (
                                                                <motion.div
                                                                    key={photo.id}
                                                                    whileHover={{ 
                                                                        scale: 2.5, 
                                                                        zIndex: 100,
                                                                        rotate: 2,
                                                                        transition: { type: "spring", stiffness: 300, damping: 20 }
                                                                    }}
                                                                    className="w-12 h-12 rounded-xl overflow-hidden shadow-lg border-2 border-white dark:border-slate-700 flex-shrink-0 cursor-zoom-in bg-slate-100 dark:bg-slate-800 transition-shadow hover:shadow-2xl"
                                                                >
                                                                    <img 
                                                                        src={photo.url} 
                                                                        className="w-full h-full object-cover pointer-events-none" 
                                                                        alt="Travel Moment"
                                                                    />
                                                                </motion.div>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Photo Grid */}
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-rounded text-slate-400">photo_library</span>
                                                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">전체 사진 목록</h3>
                                            </div>
                                            <label htmlFor="photo-upload-more" className="text-[10px] font-black text-primary uppercase tracking-widest cursor-pointer hover:underline">
                                                사진 더 추가하기
                                            </label>
                                            <input type="file" multiple accept="image/*" onChange={onPhotoUpload} className="hidden" id="photo-upload-more" />
                                        </div>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                                            <AnimatePresence>
                                                {analyzedPhotos.map((photo, idx) => (
                                                    <motion.div 
                                                        key={photo.id}
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        className="relative aspect-square rounded-[24px] overflow-hidden group shadow-sm"
                                                    >
                                                        <img src={photo.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                                            <p className="text-[8px] font-black text-white uppercase tracking-tighter opacity-70">
                                                                {idx + 1}. {photo.timestamp ? format(new Date(photo.timestamp), 'HH:mm') : 'Unknown'}
                                                            </p>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right: Map Integration */}
                        <div className="w-full md:w-[400px] h-[300px] md:h-auto border-l border-slate-200/60 dark:border-slate-800 relative bg-slate-50 dark:bg-slate-900">
                            {photoMarkers.length > 0 ? (
                                <MapComponent 
                                    center={wizardMapCenter || photoMarkers[0]}
                                    zoom={wizardMapZoom}
                                    markers={photoMarkers}
                                    path={photoPath}
                                    aria-label="Photo flow map"
                                />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                        <span className="material-symbols-rounded text-slate-300">map</span>
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-400 leading-relaxed">사진을 추가하면 지도에<br/>이동 경로가 표시됩니다.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-10 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-6">
                            <p className="text-xs font-bold text-slate-400">
                                <span className="text-primary font-black">{analyzedPhotos.length}</span>개의 사진 분석됨
                            </p>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className="relative">
                                    <input 
                                        type="checkbox" 
                                        checked={isAutoAddToEditor}
                                        onChange={(e) => setIsAutoAddToEditor(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-10 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-primary transition-colors"></div>
                                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-sm"></div>
                                </div>
                                <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-tight group-hover:text-primary transition-colors">본문에 자동 삽입</span>
                            </label>
                        </div>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setCurrentStep('info')}
                                className="px-6 py-5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-[28px] font-black border border-slate-200 dark:border-slate-800 hover:border-primary/30 transition-all text-xs uppercase tracking-widest flex items-center gap-2 group"
                            >
                                <span className="material-symbols-rounded text-sm">arrow_back</span>
                                <span>제목 및 기간 수정</span>
                            </button>
                            <button 
                                onClick={() => {
                                    if (!travelog.title) {
                                        toast.error('여행 제목을 먼저 입력해주세요.');
                                        return;
                                    }
                                    finalizeWizard();
                                }}
                                className="px-10 py-5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-[28px] font-black shadow-xl hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center gap-3 group"
                            >
                                <span className="relative z-10">
                                    {analyzedPhotos.length === 0 ? '빈 노트로 시작' : '사진으로 일정 생성'}
                                </span>
                                <span className="material-symbols-rounded text-xl group-hover:rotate-12 transition-transform">
                                    {analyzedPhotos.length === 0 ? 'edit_note' : 'auto_awesome'}
                                </span>
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    // --- 마법사 Step 3: 메인 에디터 (3분할 레이아웃) ---
    if (currentStep === 'editor') {
        const nextPhoto = analyzedPhotos.find(p => !p.isUsed && !p.isSkipped);

        return (
            <div className="h-screen bg-white dark:bg-slate-950 flex flex-col selection:bg-primary/20">
                {/* Modern Navigation */}
                <nav className="h-16 px-6 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between bg-white/60 dark:bg-slate-950/60 backdrop-blur-3xl z-50">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsLeftPaneOpen(!isLeftPaneOpen)} className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all", isLeftPaneOpen ? "bg-primary text-white" : "hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400")}>
                            <span className="material-symbols-rounded">side_navigation</span>
                        </button>
                        <div className="h-4 w-[1px] bg-slate-100 dark:bg-slate-800 mx-2" />
                        <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[200px]">{travelog.title}</span>
                            {repRegion && (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">
                                        MAIN DESTINATION: {repRegion.city || repRegion.prefecture || repRegion.country}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-1.5 gap-1 border border-slate-200 dark:border-slate-800">
                            <button 
                                onClick={() => setIsSimpleMode(false)}
                                className={cn(
                                    "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                    !isSimpleMode 
                                        ? "bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-xl scale-[1.02]" 
                                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}
                            >
                                <span className="material-symbols-rounded text-base">edit_note</span>
                                전체 에디터
                            </button>
                            <button 
                                onClick={() => setIsSimpleMode(true)}
                                className={cn(
                                    "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                    isSimpleMode 
                                        ? "bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-xl scale-[1.02]" 
                                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}
                            >
                                <span className="material-symbols-rounded text-base">timeline</span>
                                간편 기록
                            </button>
                        </div>
                        <div className="h-4 w-[1px] bg-slate-100 dark:bg-slate-800 mx-2" />
                        <div className={cn("text-[9px] font-black uppercase tracking-widest transition-opacity", isSaving ? "opacity-100 text-primary animate-pulse" : "opacity-30")}>
                            {isSaving ? '변경사항 저장 중...' : '모든 변경사항 저장됨'}
                        </div>
                        <button 
                            onClick={() => handleSave()}
                            className="bg-slate-950 dark:bg-white text-white dark:text-slate-900 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
                        >
                            기록 저장
                        </button>
                    </div>
                </nav>

                {/* 3-Pane Layout */}
                <main className="flex-1 flex overflow-hidden relative">
                    {/* LEFT PANE: Control Panel & Assets */}
                    <AnimatePresence mode="wait">
                        {isLeftPaneOpen && (
                            <motion.aside 
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 320, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                className="border-r border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col z-30 overflow-hidden"
                            >
                                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-8">
                                    {/* 1. 날짜 및 시간 추가 */}
                                    <section className="bg-white dark:bg-slate-900 rounded-[32px] p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-1 flex items-center justify-between">
                                            <span>날짜 및 시간</span>
                                            <span className="text-primary font-black">Day {activeDayIndex + 1}</span>
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap gap-1 mb-2">
                                                {travelog.timeline.map((day, idx) => (
                                                    <button 
                                                        key={idx}
                                                        onClick={() => {
                                                            setActiveDayIndex(idx);
                                                            // 에디터 본문 스크롤
                                                            editorRef.current?.scrollToDay(day.day);
                                                        }}
                                                        className={cn(
                                                            "group relative w-10 h-12 rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 shrink-0",
                                                            activeDayIndex === idx 
                                                                ? "bg-slate-950 dark:bg-white text-white dark:text-slate-900 shadow-lg scale-105 z-10" 
                                                                : "bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:bg-slate-100 border border-transparent"
                                                        )}
                                                    >
                                                        <span className="text-[7px] font-black uppercase opacity-60 leading-none">D{idx + 1}</span>
                                                        <span className="text-[9px] font-black tracking-tighter">
                                                            {(() => {
                                                                try {
                                                                    if (!day.date) return '??.??';
                                                                    const parsed = parseISO(day.date);
                                                                    if (isNaN(parsed.getTime())) return '??.??';
                                                                    return format(parsed, 'MM.dd');
                                                                } catch (e) {
                                                                    return '??.??';
                                                                }
                                                             })()}
                                                        </span>
                                                    </button>
                                                ))}
                                                <button 
                                                    onClick={handleAddDay}
                                                    disabled={!insertionStatus.canAdd}
                                                    className={cn(
                                                        "w-10 h-12 rounded-xl transition-all flex items-center justify-center group",
                                                        insertionStatus.canAdd 
                                                            ? "bg-primary/5 hover:bg-primary/10 border-2 border-dashed border-primary/20 hover:border-primary/40" 
                                                            : "bg-slate-50 dark:bg-slate-800/30 border-2 border-dashed border-slate-200 dark:border-slate-800 opacity-30 cursor-not-allowed"
                                                    )}
                                                    title={!insertionStatus.canAdd ? "이 위치에는 날짜를 추가할 수 없습니다." : `Day ${insertionStatus.dayToInsert} 추가`}
                                                >
                                                    <span className={cn(
                                                        "material-symbols-rounded text-sm transition-transform",
                                                        insertionStatus.canAdd ? "text-primary group-hover:scale-125" : "text-slate-400"
                                                    )}>
                                                        {insertionStatus.canAdd ? 'add' : 'block'}
                                                    </span>
                                                </button>
                                            </div>
                                            {!isSimpleMode && (
                                                <button 
                                                    onClick={() => editorRef.current?.insertTimestamp()}
                                                    className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all group"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <span className="material-symbols-rounded text-lg">schedule</span>
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[11px] font-black text-slate-700 dark:text-slate-200">현재 시각 추가</p>
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase">Alt + T</p>
                                                    </div>
                                                </button>
                                            )}
                                        </div>
                                    </section>

                                    {/* 2. 기록 요소 추가 */}
                                    {!isSimpleMode && (
                                        <section className="bg-white dark:bg-slate-900 rounded-[32px] p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-1">기록 요소 추가</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button 
                                                    onClick={() => editorRef.current?.insertActivity()}
                                                    className="flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-primary/30 hover:bg-primary/5 transition-all group"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 text-slate-400 group-hover:text-primary flex items-center justify-center mb-2 shadow-sm">
                                                        <span className="material-symbols-rounded text-lg">history_toggle_off</span>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">행동 추가</span>
                                                    <span className="text-[8px] font-bold text-slate-400 mt-1">Alt + A</span>
                                                </button>
                                                <button 
                                                    onClick={() => editorRef.current?.insertEvent()}
                                                    className="flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-primary/30 hover:bg-primary/5 transition-all group"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 text-slate-400 group-hover:text-primary flex items-center justify-center mb-2 shadow-sm">
                                                        <span className="material-symbols-rounded text-lg">event</span>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">이벤트 추가</span>
                                                    <span className="text-[8px] font-bold text-slate-400 mt-1">Alt + E</span>
                                                </button>
                                            </div>
                                        </section>
                                    )}

                                    {/* 3. 사진 관리 */}
                                    {!isSimpleMode && (
                                        <section className="bg-white dark:bg-slate-900 rounded-[32px] p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                                            <div className="flex items-center justify-between mb-4 px-1">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">사진 관리</h4>
                                                <label htmlFor="side-photo-upload" className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors text-primary">
                                                    <span className="material-symbols-rounded text-base">add_a_photo</span>
                                                    <input id="side-photo-upload" type="file" multiple accept="image/*" onChange={onPhotoUpload} className="hidden" />
                                                </label>
                                            </div>
                                            
                                            {nextPhoto ? (
                                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 group">
                                                    <div className="aspect-video rounded-xl overflow-hidden mb-3 relative">
                                                        <img src={nextPhoto.url} className="w-full h-full object-cover" />
                                                        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/50 backdrop-blur-md rounded-md text-[7px] font-black text-white uppercase">NEXT</div>
                                                    </div>
                                                    <div className="flex gap-1.5">
                                                        <button 
                                                            onClick={() => handleSkipPhoto(nextPhoto)}
                                                            className="flex-1 py-1.5 bg-white dark:bg-slate-700 rounded-lg text-[9px] font-black text-slate-400 hover:text-slate-600 transition-all"
                                                        >
                                                            PASS
                                                        </button>
                                                        <button 
                                                            onClick={() => handleInsertPhoto(nextPhoto)}
                                                            className="flex-2 py-1.5 bg-primary text-white rounded-lg text-[9px] font-black flex items-center justify-center gap-1 hover:scale-[1.02] transition-all"
                                                        >
                                                            삽입
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="py-6 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                                    <span className="material-symbols-rounded text-slate-300 text-xl mb-2">no_photography</span>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Wait for memories...</p>
                                                </div>
                                            )}
                                        </section>
                                    )}

                                    {/* 4. 문장 요소 추가 */}
                                    {!isSimpleMode && (
                                        <section className="bg-white dark:bg-slate-900 rounded-[32px] p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-1">문장 요소 추가</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button 
                                                    onClick={() => editorRef.current?.insertHeading()}
                                                    className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                                                >
                                                    <span className="material-symbols-rounded text-sm text-blue-500 group-hover:scale-110 transition-transform">title</span>
                                                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">제목</span>
                                                </button>
                                                <button 
                                                    onClick={() => editorRef.current?.insertPreset('Divider')}
                                                    className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all group"
                                                >
                                                    <span className="material-symbols-rounded text-sm text-emerald-500 group-hover:scale-110 transition-transform">horizontal_rule</span>
                                                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">구분선</span>
                                                </button>
                                                <button 
                                                    onClick={() => editorRef.current?.insertCallout()}
                                                    className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all group"
                                                >
                                                    <span className="material-symbols-rounded text-sm text-purple-500 group-hover:scale-110 transition-transform">magic_button</span>
                                                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">이모지</span>
                                                </button>
                                                <button 
                                                    onClick={() => editorRef.current?.insertSpacer()}
                                                    className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all group"
                                                >
                                                    <span className="material-symbols-rounded text-sm text-slate-400 group-hover:scale-110 transition-transform">space_bar</span>
                                                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">공백</span>
                                                </button>
                                            </div>
                                        </section>
                                    )}
                                </div>
                            </motion.aside>
                        )}
                    </AnimatePresence>

                    {/* CENTER PANE: TipTap Editor or Focused Timeline */}
                    <section className={cn(
                        "flex-1 overflow-y-auto custom-scrollbar relative",
                        isSimpleMode ? "bg-slate-50/50 dark:bg-slate-900/50 px-10 py-12" : "px-20 py-24 bg-white dark:bg-slate-950"
                    )}>
                        {!isSimpleMode ? (
                            <>
                                <div className="max-w-3xl mx-auto mb-20">
                                    <input 
                                        type="text"
                                        value={travelog.title}
                                        onChange={(e) => setTravelog(prev => prev ? ({...prev, title: e.target.value}) : null)}
                                        placeholder="제목 없는 여행"
                                        className="w-full bg-transparent text-5xl font-black text-slate-900 dark:text-white placeholder:text-slate-100 dark:placeholder:text-slate-900 border-none focus:ring-0 tracking-tighter mb-8 p-0"
                                    />
                                    <div className="flex flex-wrap items-center gap-4">
                                        <span className="px-4 py-1.5 bg-slate-950 dark:bg-white text-white dark:text-slate-900 rounded-full text-[10px] font-black uppercase tracking-widest shadow-[0_10px_20px_rgba(0,0,0,0.1)]">
                                            {travelog.theme}
                                        </span>
                                        
                                        {travelog.startDate && travelog.endDate && (
                                            <button 
                                                onClick={() => setCurrentStep('info')}
                                                className="flex items-center gap-2.5 text-slate-400 hover:text-primary transition-colors group/dates"
                                            >
                                                <span className="text-[11px] font-black tracking-tight group-hover/dates:underline">
                                                    {format(parseISO(travelog.startDate!), 'yyyy.MM.dd')} — {format(parseISO(travelog.endDate!), 'yyyy.MM.dd')}
                                                </span>
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 group-hover/dates:bg-primary/30" />
                                                <span className="text-[11px] font-black text-primary uppercase">
                                                    {differenceInDays(parseISO(travelog.endDate!), parseISO(travelog.startDate!))}박 {differenceInDays(parseISO(travelog.endDate!), parseISO(travelog.startDate!)) + 1}일
                                                </span>
                                                <span className="material-symbols-rounded text-[14px] opacity-0 group-hover/dates:opacity-100 transition-opacity">edit_calendar</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="max-w-3xl mx-auto pb-40">
                                    <WritingModeEditor 
                                        ref={editorRef}
                                        travelog={travelog} 
                                        onUpdateSections={(s) => setTravelog(prev => prev ? ({...prev, sections: s}) : null)} 
                                        onUpdateTimeline={(t) => setTravelog(prev => prev ? ({...prev, timeline: t}) : null)}
                                        onUpdateUsedIds={setUsedTimelineIds}
                                        onAddDay={handleAddDay}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="max-w-4xl mx-auto h-full flex flex-col">
                                <div className="mb-10">
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">타임라인 순서 정렬</h2>
                                    <p className="text-sm font-bold text-slate-400 italic">"간편하게 이벤트의 순서만 기록하고 지도로 동선을 확인하세요."</p>
                                </div>
                                <div className="flex-1 bg-white dark:bg-slate-950 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-8">
                                    <TimelineModeBuilder 
                                        travelog={travelog} 
                                        onUpdateTimeline={(t) => setTravelog(prev => prev ? ({...prev, timeline: t}) : null)} 
                                        onAddDay={handleAddDay}
                                        onAddEventToEditor={() => {}} 
                                        onUpdateEventInEditor={() => {}}
                                        usedIds={usedTimelineIds}
                                        isMinimized={false}
                                        isSimpleMode={true}
                                        activeDayIndex={activeDayIndex}
                                        highlightedEventId={highlightedEventId}
                                        onEventHover={(id) => setHighlightedEventId(id)}
                                        onEventClick={(id) => {
                                            setHighlightedEventId(id);
                                            const event = travelog.timeline[activeDayIndex].events.find(e => e.id === id);
                                            if (event?.location?.lat && event?.location?.lng && mapInstanceRef.current) {
                                                mapInstanceRef.current.panTo({ lat: event.location.lat, lng: event.location.lng });
                                                mapInstanceRef.current.setZoom(16);
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Floating Shortcut Guide Trigger */}
                        {!isSimpleMode && (
                            <div className="absolute bottom-8 right-8 z-40">
                                <ShortcutGuide />
                            </div>
                        )}
                    </section>

                    {/* RIGHT PANE: Timeline Builder or Map */}
                    <aside className={cn(
                        "border-l border-slate-200/60 dark:border-slate-800 overflow-hidden flex flex-col",
                        isSimpleMode ? "flex-1 min-w-[400px]" : "w-[320px] bg-slate-50/20 dark:bg-slate-900/5 p-5"
                    )}>
                        {!isSimpleMode ? (
                            <TimelineModeBuilder 
                                travelog={travelog} 
                                onUpdateTimeline={(t) => setTravelog(prev => prev ? ({...prev, timeline: t}) : null)} 
                                onAddDay={handleAddDay}
                                onAddEventToEditor={(type, data) => {
                                    if (type === 'activity') editorRef.current?.insertActivity(data);
                                    else editorRef.current?.insertEvent(data);
                                }}
                                onUpdateEventInEditor={(data) => {
                                    editorRef.current?.updateNodeById(data.id, data);
                                }}
                                usedIds={usedTimelineIds}
                                isMinimized={true}
                                isSimpleMode={false}
                                activeDayIndex={activeDayIndex}
                                highlightedEventId={highlightedEventId}
                                onEventHover={(id) => setHighlightedEventId(id)}
                                onEventClick={(id) => {
                                    setHighlightedEventId(id);
                                }}
                            />
                        ) : (
                            <div className="h-full relative group">
                                {(() => {
                                    const day = travelog.timeline[activeDayIndex];
                                    const markers = day.events
                                        .filter(e => e.location?.lat && e.location?.lng)
                                        .map((e, idx) => ({
                                            id: e.id,
                                            lat: e.location!.lat!,
                                            lng: e.location!.lng!,
                                            title: e.title,
                                            type: e.type,
                                            category: e.mainCategory,
                                            label: (idx + 1).toString()
                                        }));

                                    const path = markers.map(m => ({ lat: m.lat, lng: m.lng }));

                                    return markers.length > 0 ? (
                                        <MapComponent 
                                            center={markers[0]}
                                            zoom={13}
                                            markers={markers}
                                            path={path}
                                            highlightedId={highlightedEventId || undefined}
                                            onLoad={(map) => { mapInstanceRef.current = map; }}
                                            onMarkerClick={(id) => {
                                                setHighlightedEventId(id);
                                            }}
                                            onMarkerHover={(id) => setHighlightedEventId(id)}
                                        />
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-slate-50/50 dark:bg-slate-900/50">
                                            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                                <span className="material-symbols-rounded text-slate-300">location_on</span>
                                            </div>
                                            <h4 className="text-sm font-black text-slate-600 dark:text-slate-300 mb-2">위치 정보가 없습니다</h4>
                                            <p className="text-[11px] font-bold text-slate-400 leading-relaxed">이벤트에 위치를 추가하면<br/>지도에 동선이 표시됩니다.</p>
                                        </div>
                                    );
                                })()}
                                
                                {/* Overlay Stats */}
                                <div className="absolute top-6 left-6 right-6 flex items-center justify-between pointer-events-none">
                                    <div className="px-4 py-2 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl pointer-events-auto">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Active Day</p>
                                        <p className="text-lg font-black text-slate-900 dark:text-white leading-none">Day {activeDayIndex + 1}</p>
                                    </div>
                                    
                                    <div className="flex gap-2 pointer-events-auto">
                                        <button 
                                            onClick={() => {
                                                if (!mapInstanceRef.current || !travelog.timeline[activeDayIndex]) return;
                                                const bounds = new google.maps.LatLngBounds();
                                                let hasCoords = false;
                                                travelog.timeline[activeDayIndex].events.forEach(e => {
                                                    if (e.location?.lat && e.location?.lng) {
                                                        bounds.extend({ lat: e.location.lat, lng: e.location.lng });
                                                        hasCoords = true;
                                                    }
                                                });
                                                if (hasCoords) {
                                                    mapInstanceRef.current.fitBounds(bounds);
                                                    // 너무 줌이 당겨지는 것 방지
                                                    const listener = google.maps.event.addListener(mapInstanceRef.current, 'idle', () => {
                                                        if (mapInstanceRef.current!.getZoom()! > 16) mapInstanceRef.current!.setZoom(16);
                                                        google.maps.event.removeListener(listener);
                                                    });
                                                }
                                            }}
                                            className="w-10 h-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:scale-105 active:scale-95 transition-all shadow-lg"
                                            title="현재 날짜 동선 전체 보기"
                                        >
                                            <span className="material-symbols-rounded text-xl">my_location</span>
                                        </button>
                                        <button 
                                            onClick={() => {
                                                // 레이어 토글 기능 (위성 뷰 등)
                                                if (!mapInstanceRef.current) return;
                                                const currentType = mapInstanceRef.current.getMapTypeId();
                                                mapInstanceRef.current.setMapTypeId(currentType === 'roadmap' ? 'hybrid' : 'roadmap');
                                            }}
                                            className="w-10 h-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:scale-105 active:scale-95 transition-all shadow-lg"
                                            title="지도 레이어 변경"
                                        >
                                            <span className="material-symbols-rounded text-xl">layers</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </aside>
                </main>
                {/* 전역 상세 편집 모달 */}
                {globalModalConfig.event && (
                    <ScheduleItemModal 
                        isOpen={globalModalConfig.isOpen}
                        onClose={() => setGlobalModalConfig({ ...globalModalConfig, isOpen: false })}
                        initialData={globalModalConfig.event}
                        dayEvents={globalModalConfig.dayEvents}
                        startDate={travelog?.startDate}
                        onSave={(updatedEvent) => {
                            // 1. 타임라인 데이터 업데이트
                            if (travelog) {
                                const newTimeline = [...travelog.timeline];
                                let found = false;
                                newTimeline.forEach(day => {
                                    day.events = day.events.map(e => {
                                        if (e.id === updatedEvent.id) {
                                            found = true;
                                            return updatedEvent;
                                        }
                                        if (e.subEvents) {
                                            e.subEvents = e.subEvents.map(se => se.id === updatedEvent.id ? updatedEvent : se);
                                        }
                                        return e;
                                    });
                                });

                                if (found) {
                                    setTravelog(prev => prev ? ({ ...prev, timeline: newTimeline }) : null);
                                }
                            }

                            // 2. 에디터 노드 속성 업데이트
                            if (editorRef.current && globalModalConfig.getPos) {
                                const pos = globalModalConfig.getPos();
                                editorRef.current.updateNodeAttributes(pos, updatedEvent);
                            }

                            setGlobalModalConfig({ ...globalModalConfig, isOpen: false });
                            toast.success('기록이 업데이트되었습니다.');
                        }}
                    />
                )}
            </div>
        );
    }

    return null;
}
