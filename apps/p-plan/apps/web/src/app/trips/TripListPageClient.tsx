'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToUserTrips, deleteTrip } from '@pplaner/shared';
import { useTripStore } from '@pplaner/shared';
import { useWizardStore } from '@pplaner/shared';
import { TripSummary } from '@pplaner/shared';

import { motion, AnimatePresence, Variants } from 'framer-motion';
import { format, isAfter, isBefore, parseISO, startOfDay, differenceInDays } from 'date-fns';
import TripCoverImage from '@/components/trips/TripCoverImage';
import { cn } from '@pplaner/shared';
import { LayoutGrid, List as ListIcon, Map as MapIcon, Plus, CheckSquare, Filter, ChevronDown } from 'lucide-react';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import DashboardFilterBar from '@/components/layout/DashboardFilterBar';
import DashboardPageLayout from '@/components/layout/DashboardPageLayout';

/**
 * TripCard - 개별 여행 항목을 보여주는 프리미엄 카드 컴포넌트 (그리드/리스트 지원)
 */
function TripCard({ trip, router, handleDelete, viewMode = 'grid' }: { 
  trip: TripSummary, 
  router: any, 
  handleDelete: (id: string, e: React.MouseEvent) => void,
  viewMode?: 'grid' | 'list'
}) {
  const isOngoing = useMemo(() => {
    const now = startOfDay(new Date());
    if (!trip.dates?.startDate || !trip.dates?.endDate) return false;
    const start = parseISO(trip.dates.startDate);
    const end = parseISO(trip.dates.endDate);
    return (isBefore(start, now) || start.getTime() === now.getTime()) && 
           (isAfter(end, now) || end.getTime() === now.getTime());
  }, [trip.dates]);

  const daysUntil = useMemo(() => {
    if (!trip.dates?.startDate) return null;
    const now = startOfDay(new Date());
    const start = parseISO(trip.dates.startDate);
    const diff = differenceInDays(start, now);
    return diff > 0 ? diff : null;
  }, [trip.dates]);

  const cardVariants: Variants = {
    hidden: { opacity: 0, scale: 0.98, y: 10 },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: { duration: 0.3, ease: 'easeOut' }
    },
    hover: { 
      y: viewMode === 'grid' ? -5 : 0,
      x: viewMode === 'list' ? 4 : 0,
      transition: { duration: 0.2, ease: "easeOut" }
    }
  };

  const formattedDate = trip.dates?.startDate ? (
    `${format(parseISO(trip.dates.startDate), 'MMM dd')} - ${format(parseISO(trip.dates.endDate!), 'MMM dd')}`
  ) : (
    '일정 미정'
  );

  const locations = (trip.locations?.regions || []).length > 0 
    ? trip.locations!.regions! 
    : (trip.locations?.regionNames || []).map(name => ({ name }));

  if (viewMode === 'list') {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        onClick={() => router.push(`/dashboard/${trip.id}`)}
        className="group relative bg-white dark:bg-slate-900 rounded-[32px] p-3 flex items-center gap-4 border border-slate-200 dark:border-slate-800 hover:border-primary/30 shadow-sm hover:shadow-lg transition-all cursor-pointer"
      >
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-[20px] overflow-hidden flex-shrink-0">
          <TripCoverImage 
            trip={trip}
            showTitle={false}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
          />
          <div className="absolute inset-0 bg-black/20" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
             {isOngoing && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />}
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
               {formattedDate}
             </span>
          </div>
          <h2 className="text-sm font-black text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
            {trip.title || '제목 없는 여행'}
          </h2>
          <div className="flex flex-wrap gap-1 mt-1">
            {locations.slice(0, 3).map((loc, idx) => (
              <span key={idx} className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-400 text-[8px] font-bold rounded-md">
                {loc.name}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pr-2">
          <div className="flex items-center gap-2">
             <div className="flex items-center gap-1 text-[8px] font-black text-slate-400">
               <span className="material-symbols-rounded text-[10px] text-indigo-400">flight</span>
               {trip.flightCount || 0}
             </div>
             <div className="flex items-center gap-1 text-[8px] font-black text-slate-400">
               <span className="material-symbols-rounded text-[10px] text-emerald-400">bed</span>
               {trip.accommodationCount || 0}
             </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(trip.id, e);
            }}
            className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center"
          >
            <span className="material-symbols-rounded text-sm">delete</span>
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={cardVariants}
      whileHover="hover"
      onClick={() => router.push(`/dashboard/${trip.id}`)}
      className="group relative bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col"
    >
      <div className="relative aspect-[21/9] overflow-hidden">
        <TripCoverImage 
          trip={trip}
          showTitle={false}
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-80" />
        
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {isOngoing && (
            <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[6.5px] font-black rounded-full shadow-lg flex items-center gap-1 animate-pulse">
              진행 중
            </span>
          )}
          {daysUntil !== null && daysUntil <= 7 && (
            <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[6.5px] font-black rounded-full shadow-lg">
              D-{daysUntil}
            </span>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(trip.id, e);
          }}
          className="absolute top-2 right-2 w-5 h-5 bg-black/20 backdrop-blur-md text-white/40 hover:text-white hover:bg-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center z-10"
        >
          <span className="material-symbols-rounded text-[10px]">delete</span>
        </button>

        <div className="absolute bottom-2 left-2 right-2 text-white">
          <div className="flex items-center gap-1 opacity-70 font-black text-[7px] uppercase tracking-tighter mb-0.5">
            <span className="material-symbols-rounded text-[8px]">calendar_month</span>
            {formattedDate}
          </div>
          <h2 className="text-xs font-black leading-tight line-clamp-1 drop-shadow-md group-hover:text-primary transition-colors">
            {trip.title || '제목 없는 여행'}
          </h2>
        </div>
      </div>

      <div className="p-2 flex flex-col flex-1 justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {locations.slice(0, 3).map((loc, idx) => (
            <span key={idx} className="px-1.2 py-0.4 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[7px] font-bold uppercase rounded-md tracking-tighter truncate max-w-[60px]">
              {loc.name}
            </span>
          ))}
          {locations.length > 3 && (
            <span className="px-1.2 py-0.4 bg-slate-50 dark:bg-slate-800/50 text-slate-300 text-[7px] font-bold rounded-md">
              +{locations.length - 3}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
                <div className="flex items-center gap-1 text-[7.5px] font-black text-slate-400">
                    <span className="material-symbols-rounded text-[9px] text-indigo-400">flight</span>
                    {trip.flightCount || 0}
                </div>
                <div className="flex items-center gap-1 text-[7.5px] font-black text-slate-400">
                    <span className="material-symbols-rounded text-[9px] text-emerald-400">bed</span>
                    {trip.accommodationCount || 0}
                </div>
            </div>
          </div>
          <motion.div 
            whileHover={{ x: 2 }}
            className="flex items-center gap-1 text-primary/40 group-hover:text-primary transition-colors font-black text-[7.5px] uppercase"
          >
            이동
            <span className="material-symbols-rounded text-[9px]">east</span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * TripListPageClient - 사용자의 여행 목록을 보여주는 프리미엄 대시보드
 */
export default function TripListPage() {
  const { user, loading, loginWithGoogle } = useAuth();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [fetching, setFetching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'ongoing' | 'upcoming' | 'past'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('전체');
  const router = useRouter();
  const openWizard = useWizardStore(state => state.open);

  // 비로그인 사용자 리디렉션
  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [user, loading, router]);

  // 여행 데이터 구독
  useEffect(() => {
    if (!user) return;
    
    setFetching(true);
    const unsubscribe = subscribeToUserTrips(user.uid, (updatedTrips) => {
      setTrips(updatedTrips);
      setFetching(false);
    });

    return () => unsubscribe();
  }, [user]);

  // 검색 및 필터링 로직
  const filteredBySearch = useMemo(() => {
    let result = trips.filter(trip => {
        const matchesTitle = trip.title?.toLowerCase().includes(searchQuery.toLowerCase());
        const regions = trip.locations?.regions || [];
        const matchesRegions = regions.some(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesLegacyNames = trip.locations?.regionNames?.some(name => name.toLowerCase().includes(searchQuery.toLowerCase()));
        
        return matchesTitle || matchesRegions || matchesLegacyNames;
    });

    // 지역 필터
    if (selectedRegion !== '전체') {
        result = result.filter(trip => {
            const regions = trip.locations?.regions || [];
            const isDomestic = regions.some(r => r.countryId === '082' || (r.type === 'country' && r.id === '082'));
            return selectedRegion === '국내' ? isDomestic : !isDomestic;
        });
    }

    return result;
  }, [trips, searchQuery, selectedRegion]);

  // 카테고리별 분류 (날짜 기준)
  const categories = useMemo(() => {
    const now = startOfDay(new Date());
    const categorized = {
        ongoing: [] as TripSummary[],
        upcoming: [] as TripSummary[],
        past: [] as TripSummary[]
    };

    filteredBySearch.forEach(trip => {
        if (!trip.dates?.startDate || !trip.dates?.endDate) {
            categorized.upcoming.push(trip);
            return;
        }
        const start = parseISO(trip.dates.startDate);
        const end = parseISO(trip.dates.endDate);

        if ((isBefore(start, now) || start.getTime() === now.getTime()) && (isAfter(end, now) || end.getTime() === now.getTime())) {
            categorized.ongoing.push(trip);
        } else if (isAfter(start, now)) {
            categorized.upcoming.push(trip);
        } else {
            categorized.past.push(trip);
        }
    });

    // 정렬
    categorized.upcoming.sort((a, b) => (a.dates?.startDate || '').localeCompare(b.dates?.startDate || ''));
    categorized.past.sort((a, b) => (b.dates?.startDate || '').localeCompare(a.dates?.startDate || ''));

    return categorized;
  }, [filteredBySearch]);

  // 현재 탭에 따른 표시 목록
  const displayedItems = useMemo(() => {
    if (activeTab === 'all') return filteredBySearch;
    return categories[activeTab as keyof typeof categories] || [];
  }, [activeTab, filteredBySearch, categories]);

  const handleDelete = (tripId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (confirm('이 여행을 완전히 삭제하시겠습니까? 데이터는 복구할 수 없습니다.')) {
      deleteTrip(tripId).catch(err => {
        alert('여행 삭제 중 오류가 발생했습니다.');
        console.error(err);
      });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950">
        <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 p-6 text-center">
        <div className="w-20 h-20 rounded-[32px] bg-primary/10 flex items-center justify-center text-primary mb-8">
          <span className="material-symbols-rounded text-4xl">travel_explore</span>
        </div>
        <h1 className="text-3xl font-black mb-4 tracking-tighter">나만의 여행을 <span className="text-primary italic">시작하세요</span></h1>
        <p className="text-slate-400 font-bold mb-8 max-w-sm">로그인하여 당신의 여행을 블로그처럼 아름답게 남겨보세요.</p>
        <button
          onClick={() => loginWithGoogle()}
          className="px-8 py-4 bg-primary text-white font-black rounded-2xl transition-all shadow-xl shadow-primary/30"
        >
          Google 로그인
        </button>
      </div>
    );
  }

  const gridClasses = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-8 4xl:grid-cols-10 5xl:grid-cols-12 gap-4";

  return (
    <DashboardPageLayout>
        <DashboardPageHeader 
          title={<>여행 <span className="text-primary italic">계획</span></>}
          description="나만의 맞춤형 여행 일정을 설계하고 관리합니다."
        />
        <DashboardFilterBar 
          title={<>My <span className="text-primary italic">Trips</span></>}
          breadcrumb="Home / Trips"
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchPlaceholder="제목 또는 목적지로 검색..."
          tabs={[
            { id: 'all', label: '전체', icon: 'apps' },
            { id: 'ongoing', label: '진행 중', icon: 'near_me', count: categories.ongoing.length },
            { id: 'upcoming', label: '예정', icon: 'schedule', count: categories.upcoming.length },
            { id: 'past', label: '지난 여행', icon: 'history', count: categories.past.length },
          ]}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          actionButton={
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/stats')}
                className="hidden sm:flex h-7 px-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-black text-[9px] uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98] transition-all items-center gap-2 shadow-lg"
              >
                <span className="material-symbols-rounded text-xs font-black text-primary">insights</span>
                <span className="hidden lg:inline">여행 인사이트</span>
              </button>
              
              <button
                onClick={() => openWizard()}
                className="h-7 px-3 bg-primary text-white rounded-full font-black text-[9px] uppercase tracking-wider shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
              >
                <Plus size={12} strokeWidth={2.5} />
                <span>새 여행 계획</span>
              </button>
            </div>
          }
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
              <button 
                onClick={() => setViewMode('map')}
                className={cn(
                  "p-1 rounded-[10px] transition-all flex items-center justify-center",
                  viewMode === 'map' 
                    ? "bg-white dark:bg-slate-700 shadow-sm text-primary" 
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                )}
              >
                <MapIcon size={12} strokeWidth={2.5} />
              </button>
            </div>
          }
          extraActions={
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setIsSelectionMode(!isSelectionMode)}
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
          <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-[32px] border border-slate-200/50 dark:border-slate-800 shadow-sm">
            <div className="flex flex-wrap items-center gap-6">
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">지역</label>
                <div className="flex items-center gap-1">
                  {['전체', '국내', '해외'].map(region => (
                    <button 
                      key={region}
                      onClick={() => setSelectedRegion(region)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[9px] font-black transition-all border shadow-sm",
                        selectedRegion === region 
                          ? "bg-primary text-white border-primary" 
                          : "bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-600"
                      )}
                    >
                      {region}
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
              className="flex flex-col items-center justify-center py-40"
            >
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">데이터를 불러오는 중...</p>
            </motion.div>
          ) : displayedItems.length === 0 ? (
            <motion.div 
              key="empty"
              className="py-32 flex flex-col items-center text-center max-w-lg mx-auto"
            >
              <div className="w-32 h-32 bg-slate-50 dark:bg-slate-900 rounded-[32px] flex items-center justify-center mb-8">
                <span className="material-symbols-rounded text-5xl text-primary/20">explore</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 italic">
                {searchQuery ? '검색 결과가 없습니다' : '여행 갤러리가 비어 있습니다'}
              </h3>
              <p className="text-sm text-slate-400 font-bold mb-8">
                {searchQuery ? 
                  '다른 검색어로 시도해 보세요.' : 
                  '새로운 모험을 준비하시겠습니까? PPLANER와 함께 계획을 시작해 보세요.'}
              </p>
              <button 
                onClick={() => openWizard()}
                className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs hover:scale-105 transition-all"
              >
                첫 여행 계획하기
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="grid"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-16"
            >
               {/* Categories Grouped (More Compact Titles) */}
              {(activeTab === 'all' || activeTab === 'ongoing') && categories.ongoing.length > 0 && (
                <div>
                  <div className="flex items-center gap-4 mb-6 px-4">
                    <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                        진행 중인 여행
                    </h3>
                    <div className="h-px flex-1 bg-rose-100 dark:bg-rose-900/20" />
                  </div>
                  <div className={gridClasses}>
                    {categories.ongoing.map(trip => <TripCard key={trip.id} trip={trip} router={router} handleDelete={handleDelete} />)}
                  </div>
                </div>
              )}

              {(activeTab === 'all' || activeTab === 'upcoming') && categories.upcoming.length > 0 && (
                <div>
                  <div className="flex items-center gap-4 mb-6 px-4">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <span className="material-symbols-rounded text-primary text-lg">calendar_today</span>
                        예정된 여행
                    </h3>
                    <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                  </div>
                  <div className={gridClasses}>
                    {categories.upcoming.map(trip => <TripCard key={trip.id} trip={trip} router={router} handleDelete={handleDelete} />)}
                  </div>
                </div>
              )}

              {(activeTab === 'all' || activeTab === 'past') && categories.past.length > 0 && (
                <div>
                  <div className="flex items-center gap-4 mb-6 px-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="material-symbols-rounded text-lg">history</span>
                        지난 여행
                    </h3>
                    <div className="h-px flex-1 bg-slate-50 dark:bg-slate-900" />
                  </div>
                  <div className={cn(gridClasses, "opacity-70 grayscale-[0.5] hover:opacity-100 hover:grayscale-0 transition-all duration-500")}>
                    {categories.past.map(trip => <TripCard key={trip.id} trip={trip} router={router} handleDelete={handleDelete} />)}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
    </DashboardPageLayout>
  );
}

