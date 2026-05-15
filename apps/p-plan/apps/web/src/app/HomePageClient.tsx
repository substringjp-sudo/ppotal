'use client';
import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToUserTrips, getTrip } from '@pplaner/shared';
import { TripSummary, TripDocument } from '@pplaner/shared';


import { motion } from 'framer-motion';
import { format, parseISO, differenceInDays, startOfDay, isAfter, isBefore } from 'date-fns';
import OnboardingWizard from '@/components/auth/OnboardingWizard';
import { getUserProfile } from '@pplaner/shared';
import { UserProfile } from '@pplaner/shared';
import { useUserStore } from '@pplaner/shared';

// 불러온 하위 컴포넌트들
import LandingHero from '@/components/home/LandingHero';
import DashboardHeader from '@/components/home/DashboardHeader';
import TripHighlightCard from '@/components/home/TripHighlightCard';
import { CurrencyWidget, TodoWidget } from '@/components/home/UtilityWidgets';
import { TravelTipWidget, TravelStatsWidget } from '@/components/home/ExtraWidgets';
import TripCollection from '@/components/home/TripCollection';
import TravelRecordWidget from '@/components/home/TravelRecordWidget';
import { subscribeToUserTravelogs, Travelog } from '@pplaner/shared';

export default function HomePage() {
  const { user } = useAuth();
  const { profile, setProfile } = useUserStore();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [travelogs, setTravelogs] = useState<Travelog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [nextMilestone, setNextMilestone] = useState<{ title: string; time: string; icon: string } | null>(null);

  // 실시간 구독 및 온보딩 체크
  useEffect(() => {
    if (!user) {
      setLoading(false);
      setProfile(null);
      setShowOnboarding(false);
      return;
    }

    const fetchProfile = async () => {
      const userProfile = await getUserProfile(user.uid);
      if (userProfile) {
        setProfile(userProfile);
        if (!userProfile.onboardingCompleted) {
          setShowOnboarding(true);
        }
      }
    };
    fetchProfile();

    const unsubscribeTrips = subscribeToUserTrips(user.uid, async (data) => {
      setTrips(data);
      setLoading(false);
    });

    const unsubscribeTravelogs = subscribeToUserTravelogs(user.uid, (data) => {
      setTravelogs(data);
    });

    return () => {
      unsubscribeTrips();
      unsubscribeTravelogs();
    };
  }, [user]);

  // 실시간 계산 로직 최소화 (서버 사이드 메타데이터 활용)
  const { nextTrip, ongoingTrip, recommendations, progress } = useMemo(() => {
    const now = startOfDay(new Date());
    const sorted = [...trips].sort((a, b) => {
      const dateA = a.dates?.startDate ? parseISO(a.dates.startDate).getTime() : Infinity;
      const dateB = b.dates?.startDate ? parseISO(b.dates.startDate).getTime() : Infinity;
      return dateA - dateB;
    });

    const ongoing = sorted.find(t => {
      if (!t.dates?.startDate || !t.dates?.endDate) return false;
      const start = parseISO(t.dates.startDate);
      const end = parseISO(t.dates.endDate);
      return (isBefore(start, now) || start.getTime() === now.getTime()) && (isAfter(end, now) || end.getTime() === now.getTime());
    });

    const next = sorted.find(t => t.dates?.startDate && parseISO(t.dates.startDate) > now);
    
    // 여행 완료 진행도 (간단한 필터링만 유지)
    const completedCount = trips.filter(t => t.dates?.endDate && parseISO(t.dates.endDate) < now).length;
    const prog = trips.length > 0 ? (completedCount / trips.length) * 100 : 0;

    const recs: { title: string; desc: string; icon: string; action: string }[] = [];
    if (next) {
        if (!next.flightCount) recs.push({ title: '항공편 예약', desc: `${next.title} 여행의 항공편을 아직 입력하지 않았어요.`, icon: 'flight', action: '항공편 기록하기' });
        else if (!next.accommodationCount) recs.push({ title: '숙소 기록', desc: '머무를 곳이 아직 정해지지 않았네요. 숙소 정보를 직접 기록해보세요.', icon: 'bed', action: '숙소 기록하기' });
    }
    if (recs.length === 0) {
        recs.push({ title: '새 여행 계획', desc: '다음은 어디로 떠나볼까요? 새 여행을 직접 계획해보세요.', icon: 'luggage', action: '새 여행 만들기' });
    }

    return { nextTrip: next, ongoingTrip: ongoing, progress: prog, recommendations: recs };
  }, [trips]);

  // 마일스톤 등 디테일 정보 반환
  useEffect(() => {
    const fetchMilestoneAndDetail = async () => {
      const target = ongoingTrip || nextTrip;
      if (!target) {
        setNextMilestone(null);
        return;
      }

      try {
        const fullTrip = await getTrip(target.id);
        if (!fullTrip) {
          setNextMilestone(null);
          return;
        }

        const now = new Date();
        const currentTimeString = format(now, 'HH:mm');
        const todayStr = format(now, 'yyyy-MM-dd');
        let nextEvent: any = null;

        const sortedPlans = [...fullTrip.dailyTimeline].sort((a, b) => a.day - b.day);
        
        for (const plan of sortedPlans) {
            const planDate = fullTrip.dates?.startDate 
                ? format(new Date(new Date(fullTrip.dates.startDate).getTime() + (plan.day - 1) * 86400000), 'yyyy-MM-dd')
                : null;
            
            if (planDate && planDate > todayStr) {
                if (plan.events && plan.events.length > 0) {
                    nextEvent = plan.events[0];
                    break;
                }
            } else if (planDate === todayStr) {
                const upcoming = plan.events?.find(e => e.startTime && e.startTime > currentTimeString);
                if (upcoming) {
                    nextEvent = upcoming;
                    break;
                }
            }
        }

        if (nextEvent) {
          setNextMilestone({
            title: nextEvent.title,
            time: nextEvent.startTime || 'All Day',
            icon: nextEvent.type === 'flight' ? 'flight_takeoff' : 
                  nextEvent.type === 'food' ? 'restaurant' : 
                  nextEvent.type === 'hotel' ? 'bed' : 'explore'
          });
        } else {
          setNextMilestone(null);
        }
      } catch (error) {
        console.error("Error fetching milestone details:", error);
        setNextMilestone(null);
      }
    };

    fetchMilestoneAndDetail();
  }, [ongoingTrip, nextTrip]);


  // 로딩
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // 로그인되지 않은 사용자
  if (!user) {
    return <LandingHero />;
  }

  // 로그인된 사용자
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
      <main className="max-w-[1440px] mx-auto pt-3">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">

          <DashboardHeader user={user} progress={progress} itemVariants={itemVariants} />

          {/* 대시보드 위젯 영역 */}
          <div className="dashboard-section">
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-3 items-stretch">
              <div className="lg:col-span-3 flex flex-col">
                  <TripHighlightCard
                    ongoingTrip={ongoingTrip}
                    nextTrip={nextTrip}
                    user={profile}
                    nextMilestone={nextMilestone}
                    itemVariants={itemVariants}
                  />
              </div>

              <div className="lg:col-span-2 flex flex-col gap-3">
                <CurrencyWidget itemVariants={itemVariants} />
                <TravelRecordWidget travelogs={travelogs} stats={profile?.metadata?.travelStats} itemVariants={itemVariants} />
              </div>

              <div className="lg:col-span-2 flex flex-col gap-3">
                <TodoWidget recommendations={recommendations} itemVariants={itemVariants} />
                <TravelTipWidget nextTrip={nextTrip} itemVariants={itemVariants} />
                <TravelStatsWidget stats={profile?.metadata?.travelStats} itemVariants={itemVariants} />
              </div>
            </div>
          </div>

          <TripCollection trips={trips} itemVariants={itemVariants} />

        </motion.div>
        
        {showOnboarding && user && (
            <OnboardingWizard 
                user={{ uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL }} 
                onComplete={() => setShowOnboarding(false)} 
            />
        )}
      </main>
    </div>
  );
}
