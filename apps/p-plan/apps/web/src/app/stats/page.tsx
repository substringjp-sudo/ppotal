'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { 
  subscribeToUserTrips, 
  subscribeToUserTravelogs,
  calculateLocationStats, 
  useWishlistStore, 
  useUserStore, 
  useTripStore
} from '@pplaner/shared';
import { useIntelligence } from '@/hooks/useIntelligence';

import { motion, AnimatePresence } from 'framer-motion';
import DashboardPageLayout from '@/components/layout/DashboardPageLayout';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import DashboardFilterBar from '@/components/layout/DashboardFilterBar';
import { LayoutGrid, List as ListIcon, Share2, Download, Sparkles, Compass, Heart, Search } from 'lucide-react';

// Stats Components
import StatsHero from '@/components/stats/StatsHero';
import PersonaRadar from '@/components/stats/PersonaRadar';
import LocationHierarchySection from '@/components/stats/LocationHierarchySection';
import WishlistInsightsCard from '@/components/stats/WishlistInsightsCard';
import PlanningStyleCard from '@/components/stats/PlanningStyleCard';
import BadgeGallery from '@/components/stats/BadgeGallery';
import OnboardingWizard from '@/components/auth/OnboardingWizard';

export default function StatsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  const [mounted, setMounted] = useState(false);
  const trips = useTripStore(state => state.trips);
  const { calculateStats, isAnalyzing, error: intelligenceError } = useIntelligence();

  const wishlistItems = useWishlistStore(state => state.items);
  const profile = useUserStore(state => state.profile);
  const [travelogs, setTravelogs] = useState<any[]>([]);
  const [showPersonaWizard, setShowPersonaWizard] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const computedStats = useMemo(() => {
    return profile?.metadata?.travelStats;
  }, [profile?.metadata?.travelStats]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
    
    // 레이더 차트에서 호출할 전역 함수 등록
    if (typeof window !== 'undefined') {
        (window as any).showPersonaTest = () => setShowPersonaWizard(true);
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    
    const unsubscribeTrips = subscribeToUserTrips(user.uid, () => {});
    const unsubscribeTravelogs = subscribeToUserTravelogs(user.uid, (logs: any[]) => {
      setTravelogs(logs);
    });

    return () => {
      unsubscribeTrips();
      unsubscribeTravelogs();
    };
  }, [user]);

  // 통계 계산은 이제 IntelligenceSyncProvider에서 전역적으로 수행되므로 
  // 여기서는 로컬 필터링 로직을 제거하고 프로필 데이터를 직접 사용합니다.

  const locationStats = useMemo(() => {
    if (!trips || !wishlistItems) return null;
    return calculateLocationStats(trips as any, wishlistItems, travelogs);
  }, [trips, wishlistItems, travelogs]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
    <DashboardPageLayout>
        <DashboardPageHeader 
          title="트래블 인텔리전스"
          description="나의 여행 스타일과 기록을 분석한 스마트 인사이트를 확인하세요."
        />

        <DashboardFilterBar
          title="Intelligence"
          breadcrumb="Dashboard"
          tabs={[
            { id: 'overview', label: 'Overview', icon: 'dashboard' },
            { id: 'regional', label: 'Regional', icon: 'map' },
            { id: 'persona', label: 'Persona', icon: 'psychology' },
            { id: 'wishlist', label: 'Wishlist', icon: 'favorite' },
          ]}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          actionButton={
            <button
              onClick={() => {
                // Export functionality could be triggered here
                const element = document.getElementById('stats-hero-capture');
                if (element) {
                   // This is a placeholder for actual export logic like html2canvas
                   alert('Exporting your Intelligence card...');
                }
              }}
              className="h-7 px-4 bg-primary text-white rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all font-black text-[9px] uppercase tracking-widest flex items-center gap-2 group"
            >
              <Download size={13} strokeWidth={2.5} className="group-hover:translate-y-0.5 transition-transform" />
              <span>Export</span>
            </button>
          }
        />

        <AnimatePresence mode="wait">
          {!computedStats ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-40 flex flex-col items-center justify-center"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-10 h-10 border-4 border-primary/10 border-t-primary rounded-full animate-spin mb-4" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Analyzing your memories...</p>
                </>
              ) : (
                <div className="text-center max-w-sm mx-auto">
                    {intelligenceError ? (
                        <>
                            <p className="text-red-500 mb-6">{intelligenceError}</p>
                            <button 
                                onClick={() => window.location.reload()}
                                className="px-6 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-full text-sm font-bold hover:opacity-90 transition-opacity"
                            >
                                Reload
                            </button>
                        </>
                    ) : (trips.length === 0 && wishlistItems.length === 0) ? (
                        <>
                            <p className="text-slate-500 dark:text-slate-400 mb-6">No trips or wishlist items found.<br/>Save places you want to go and get intelligence analysis!</p>
                            <button 
                                onClick={() => router.push('/trips')}
                                className="px-6 py-2.5 bg-primary text-white rounded-full text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                            >
                                Start First Trip
                            </button>
                        </>
                    ) : (
                        <>
                          <div className="w-10 h-10 border-4 border-primary/10 border-t-primary rounded-full animate-spin mb-4 mx-auto" />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Loading data...</p>
                        </>
                    )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-16"
            >
              {/* Main Achievement Header */}
              <StatsHero stats={computedStats} userName={user.displayName || 'Traveler'} hideTitle />

              <section className="grid grid-cols-1 gap-8">
                <PersonaRadar stats={computedStats} />
              </section>

              {/* Location Hierarchy Stats - Primary Explorer */}
              <div className="space-y-12">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Compass className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">Regional Mastery</h2>
                    <p className="text-xs font-bold text-slate-400">Regional proficiency tree based on actual visit records, plans, and wishlists.</p>
                  </div>
                </div>
                
                {mounted && locationStats && (
                    <LocationHierarchySection locationStats={locationStats} />
                )}
              </div>

              {/* Insights & Planning Style */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-pink-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">Wishlist Insights</h2>
                      <p className="text-xs font-bold text-slate-400">Analysis of your preferences through the places you want to visit.</p>
                    </div>
                  </div>
                  <WishlistInsightsCard insights={computedStats.wishlistInsights} />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">Planning Style</h2>
                      <p className="text-xs font-bold text-slate-400">Analysis of travel planning habits and preferred schedule styles.</p>
                    </div>
                  </div>
                  <PlanningStyleCard style={computedStats.planningStyle} />
                </div>
              </div>

              {/* Badges Grid */}
              <BadgeGallery badges={computedStats?.badges || []} />

              {/* Footer Quote */}
              <div className="pt-20 text-center">
                 <p className="text-sm font-bold text-slate-300 dark:text-slate-700 italic">
                    &ldquo;The world is a book and those who do not travel read only one page.&rdquo;
                 </p>
                 <div className="mt-8 flex justify-center">
                    <button 
                        onClick={() => router.push('/trips')}
                        className="px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-black text-slate-600 dark:text-slate-300 hover:text-primary transition-all flex items-center gap-2 group"
                    >
                        <span className="material-symbols-rounded text-sm group-hover:-translate-x-1 transition-transform">west</span>
                        Back to my trips
                    </button>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
    </DashboardPageLayout>

      {/* Persona Retest Wizard */}
      {showPersonaWizard && user && (
          <OnboardingWizard 
            user={{
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL
            }}
            onComplete={() => setShowPersonaWizard(false)}
          />
      )}
    </>
  );
}
