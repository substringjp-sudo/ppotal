'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToUserTravelogs, subscribeToUserTrips, convertTripToTravelog, saveTravelog, deleteTravelog, Travelog, TripSummary } from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@pplaner/shared';
import TravelogCard from '@/components/travelogs/TravelogCard';
import TripSelectModal from '@/components/travelogs/TripSelectModal';
import { LayoutGrid, List as ListIcon, Map as MapIcon, Plus, CheckSquare, Filter, ChevronDown, Edit3 } from 'lucide-react';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import DashboardFilterBar from '@/components/layout/DashboardFilterBar';
import DashboardPageLayout from '@/components/layout/DashboardPageLayout';

/**
 * TravelogListPageClient - 감성적인 여행 기록 대시보드
 */
export default function TravelogListPageClient() {
    const { user, loading, loginWithGoogle } = useAuth();
    const [travelogs, setTravelogs] = useState<Travelog[]>([]);
    const [trips, setTrips] = useState<TripSummary[]>([]);
    const [fetching, setFetching] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState('all');
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
    const [sortBy, setSortBy] = useState('newest');
    const [selectedTheme, setSelectedTheme] = useState('All');
    const [isTripSelectOpen, setIsTripSelectOpen] = useState(false);
    const router = useRouter();

    // 데이터 구독
    useEffect(() => {
        if (!user) return;
        
        const unsubLogs = subscribeToUserTravelogs(user.uid, (logs) => {
            setTravelogs(logs);
            setFetching(false);
        });

        const unsubTrips = subscribeToUserTrips(user.uid, (updatedTrips) => {
            setTrips(updatedTrips);
        });

        return () => {
            unsubLogs();
            unsubTrips();
        };
    }, [user]);

    // 필터링 및 정렬
    const filteredLogs = useMemo(() => {
        let result = travelogs.filter(log => 
            log.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.theme.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // 탭 필터 (All, Published, Drafts)
        if (activeTab === 'published') {
            result = result.filter(log => log.status === 'published');
        } else if (activeTab === 'drafts') {
            result = result.filter(log => log.status === 'draft');
        }

        // 테마 필터
        if (selectedTheme !== 'All') {
            result = result.filter(log => log.theme === selectedTheme);
        }

        // 정렬
        result.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            
            if (sortBy === 'newest') return dateB - dateA;
            if (sortBy === 'oldest') return dateA - dateB;
            if (sortBy === 'alphabetical') return a.title.localeCompare(b.title);
            return 0;
        });

        return result;
    }, [travelogs, searchQuery, activeTab, selectedTheme, sortBy]);

    // 계획에서 기록 생성 프로세스
    const handleCreateFromTrip = async (tripId: string) => {
        if (!user) return;
        
        try {
            setIsTripSelectOpen(false);
            // 전체 여행 데이터 가져오기 (이미 tripService가 병렬 로드 최적화됨)
            const { getTrip } = await import('@pplaner/shared');
            const tripData = await getTrip(tripId);
            
            if (!tripData) {
                alert('여행 정보를 찾을 수 없습니다.');
                return;
            }

            // 여행 데이터를 기록 데이터로 변환
            const newTravelog = convertTripToTravelog(tripData, user.uid);
            
            // Firestore에 저장
            await saveTravelog(newTravelog);
            
            // 에디터로 이동
            router.push(`/travelogs/${newTravelog.id}/edit`);
        } catch (error) {
            console.error("Failed to create travelog from trip:", error);
            alert('기록 생성 중 오류가 발생했습니다.');
        }
    };

    const handleCreateScratch = async () => {
        if (!user) return;
        const newLogId = `log_${Date.now()}`;
        router.push(`/travelogs/${newLogId}/edit`);
    };
    
    // 기록 삭제 처리
    const handleDeleteTravelog = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return;
        if (window.confirm('이 여행 기록을 영구적으로 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.')) {
            try {
                await deleteTravelog(id, user.uid);
            } catch (error) {
                console.error("Failed to delete travelog:", error);
                alert('기록 삭제에 실패했습니다. 권한이 없거나 네트워크 오류가 발생했을 수 있습니다.');
            }
        }
    };

    const gridClasses = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-8 4xl:grid-cols-10 5xl:grid-cols-12 gap-4";

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
            <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
        </div>
    );

    if (!user) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 p-6 text-center">
            <div className="w-20 h-20 rounded-[32px] bg-primary/10 flex items-center justify-center text-primary mb-8">
                <span className="material-symbols-rounded text-4xl">auto_stories</span>
            </div>
            <h1 className="text-3xl font-black mb-4 tracking-tighter">당신의 발자취를 <span className="text-primary italic">기록하세요</span></h1>
            <p className="text-slate-400 font-bold mb-8 max-w-sm">로그인하여 당신의 여행을 블로그처럼 아름답게 남겨보세요.</p>
            <button onClick={() => loginWithGoogle()} className="px-8 py-4 bg-primary text-white font-black rounded-2xl transition-all shadow-xl shadow-primary/30">Google 로그인</button>
        </div>
    );

    return (
        <DashboardPageLayout>
            <DashboardPageHeader 
                title={<>여행 <span className="text-primary italic">기록</span></>}
                description="소중한 여행의 순간들을 기록하고 공유합니다."
            />
            <DashboardFilterBar 
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    searchPlaceholder="여행 기록 검색..."
                    leftContent={
                      <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-[12px] backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
                        <button 
                          onClick={() => setViewMode('grid')}
                          className={cn(
                            "p-1 rounded-[10px] transition-all flex items-center justify-center",
                            viewMode === 'grid' 
                              ? "bg-white dark:bg-slate-700 shadow-sm text-primary" 
                              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          )}
                        >
                          <LayoutGrid size={12} strokeWidth={2.5} />
                        </button>
                        <button 
                          onClick={() => setViewMode('list')}
                          className={cn(
                            "p-1 rounded-[10px] transition-all flex items-center justify-center",
                            viewMode === 'list' 
                              ? "bg-white dark:bg-slate-700 shadow-sm text-primary" 
                              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          )}
                        >
                          <ListIcon size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    }
                    tabs={[
                      { id: 'all', label: '전체', icon: 'auto_stories', count: travelogs.length },
                      { id: 'published', label: '발행됨', icon: 'public', count: travelogs.filter(l => l.status === 'published').length },
                      { id: 'drafts', label: '초안', icon: 'draft', count: travelogs.filter(l => l.status === 'draft').length },
                    ]}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    actionButton={
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsTripSelectOpen(true)}
                                className="h-7 px-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-[9px] font-black shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"
                            >
                                <span className="material-symbols-rounded font-black text-xs">auto_fix</span>
                                <span className="hidden sm:inline">여행 가져오기</span>
                            </button>
                            <button
                                onClick={() => handleCreateScratch()}
                                className="h-7 px-3 bg-primary text-white rounded-full text-[9px] font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"
                            >
                                <span className="material-symbols-rounded font-black text-xs">edit_square</span>
                                <span className="hidden sm:inline">새 기록 작성</span>
                            </button>
                        </div>
                    }
                    extraActions={
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => {
                            if (isSelectionMode) {
                              setIsSelectionMode(false);
                              setSelectedIds([]);
                            } else {
                              setIsSelectionMode(true);
                            }
                          }}
                          className={cn(
                            "h-7 px-2.5 rounded-full font-black text-[9px] uppercase tracking-wider transition-all flex items-center gap-2 border",
                            isSelectionMode 
                              ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:text-primary"
                          )}
                        >
                          <CheckSquare size={12} strokeWidth={2.5} />
                          <span className="hidden sm:inline">{isSelectionMode ? '완료' : '선택'}</span>
                        </button>
 
                        <button 
                          onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                          className={cn(
                            "h-7 px-2.5 rounded-full font-black text-[9px] uppercase tracking-wider transition-all flex items-center gap-2 border",
                            isFiltersExpanded 
                              ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:text-primary"
                          )}
                        >
                          <Filter size={12} strokeWidth={2.5} />
                          <span className="hidden sm:inline">필터</span>
                        </button>
                      </div>
                    }
                    isExpanded={isFiltersExpanded}
                >
                    <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-[24px] border border-slate-200/50 dark:border-slate-800 shadow-sm">
                        <div className="flex flex-wrap items-center gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">정렬 기준</label>
                                <select 
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="h-8 px-3 py-0 bg-white dark:bg-slate-800 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300 outline-none border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer min-w-[140px]"
                                >
                                    <option value="newest">최신순</option>
                                    <option value="oldest">오래된순</option>
                                    <option value="alphabetical">제목순 (A-Z)</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">테마</label>
                                <div className="flex items-center gap-1">
                                    {['전체', '도시', '자연', '음식'].map(theme => (
                                        <button 
                                            key={theme}
                                            onClick={() => setSelectedTheme(theme)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-[9px] font-black transition-all border shadow-sm",
                                                selectedTheme === theme 
                                                    ? "bg-primary text-white border-primary" 
                                                    : "bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-600"
                                            )}
                                        >
                                            {theme}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </DashboardFilterBar>

                <AnimatePresence mode="wait">
                    {fetching ? (
                        <motion.div 
                            key="loading"
                            className="flex flex-col items-center justify-center py-48"
                        >
                            <div className="relative w-16 h-16 mb-6">
                                <div className="absolute inset-0 border-4 border-primary/10 rounded-full" />
                                <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin" />
                                <div className="absolute inset-2 border-4 border-b-primary/40 rounded-full animate-spin-slow" />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">기록 동기화 중...</p>
                        </motion.div>
                    ) : filteredLogs.length === 0 ? (
                        <motion.div 
                            key="empty"
                            className="py-32 flex flex-col items-center text-center max-w-lg mx-auto"
                        >
                            <div className="w-32 h-32 bg-slate-50 dark:bg-slate-900 rounded-[48px] flex items-center justify-center mb-8">
                                <span className="material-symbols-rounded text-5xl text-primary/20">auto_stories</span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 italic">
                                {searchQuery ? '검색 결과 없음' : '아직 기록이 없습니다'}
                            </h3>
                            <p className="text-sm text-slate-400 font-bold mb-8">
                                {searchQuery ? 
                                    '다른 키워드로 검색해 보세요.' : 
                                    '당신의 소중한 발자취가 기록되기를 기다리고 있습니다.'}
                            </p>
                            <button 
                                onClick={() => handleCreateScratch()}
                                className="group relative px-10 py-4 bg-slate-950 dark:bg-white text-white dark:text-slate-900 rounded-[24px] font-black text-sm overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-slate-200 dark:shadow-none"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-primary to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <span className="relative z-10 flex items-center gap-2">
                                <span className="material-symbols-rounded">edit_square</span>
                                첫 기록 시작하기
                            </span>
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key={viewMode}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className={cn(
                                viewMode === 'grid' ? gridClasses : "flex flex-col gap-3 max-w-5xl mx-auto"
                            )}
                        >
                            {filteredLogs.map(log => (
                                <TravelogCard 
                                    key={log.id} 
                                    travelog={log} 
                                    viewMode={viewMode === 'grid' ? 'grid' : 'list'}
                                    onClick={(id) => router.push(`/travelogs/${id}`)}
                                    onDelete={handleDeleteTravelog} 
                                />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                <TripSelectModal 
                    isOpen={isTripSelectOpen}
                    onClose={() => setIsTripSelectOpen(false)}
                    trips={trips}
                    onSelect={handleCreateFromTrip}
                />
        </DashboardPageLayout>
    );
}
