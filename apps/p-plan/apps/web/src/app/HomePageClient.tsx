'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToUserTrips } from '@pplaner/shared';
import { TripSummary } from '@pplaner/shared';

import OnboardingWizard from '@/components/auth/OnboardingWizard';
import { getUserProfile, useTripStore, useWizardStore } from '@pplaner/shared';
import { useUserStore } from '@pplaner/shared';
import TripEditorApp from '@/components/edit-trip/TripEditorApp';
import JourneyGallery from '@/components/home/JourneyGallery';
import { subscribeToUserTravelogs, Travelog } from '@pplaner/shared';
import MyPageTabs from '@/components/layout/MyPageTabs';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function HomePage() {
  const { user } = useAuth();
  const { profile, setProfile } = useUserStore();
  const currentTrip = useTripStore((state) => state.currentTrip);
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [travelogs, setTravelogs] = useState<Travelog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

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

    const unsubscribeTrips = subscribeToUserTrips(user.uid, (data) => {
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

  // 비로그인 사용자 첫 진입 시 마법사 자동 오픈
  useEffect(() => {
    if (!user && (!currentTrip || currentTrip.id !== 'guest')) {
      const timer = setTimeout(() => {
        useWizardStore.getState().open('PLAN');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [user, currentTrip]);

  // 로딩
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // 로그인되지 않은 사용자: 작성 중인 게스트 여행이 있으면 편집기, 없으면 환영/마법사 화면
  if (!user) {
    if (currentTrip && currentTrip.id === 'guest') {
      return <TripEditorApp id="guest" />;
    }

    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8 py-12"
        >
          <div className="w-24 h-24 mx-auto rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
            <span className="material-symbols-rounded text-5xl">travel_explore</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              새로운 여행을<br />
              <span className="text-primary">PPLANER</span>와 시작해보세요
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              여행 날짜, 가고 싶은 지역, 테마, 동행 인원수를 선택하면<br />
              나만의 맞춤형 여행 노트가 완성됩니다.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => useWizardStore.getState().open('PLAN')}
              className="w-full py-4 px-6 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl shadow-xl shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-rounded text-xl">auto_awesome</span>
              <span>여행 계획 마법사 시작하기</span>
            </button>

            <div className="flex items-center justify-center gap-4 text-xs font-semibold text-slate-400 pt-2">
              <Link href="/discover" className="hover:text-primary transition-colors">
                다른 여행자 기록 둘러보기 →
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // 로그인된 사용자: 홈 = 내 여행 갤러리
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <MyPageTabs />
      <JourneyGallery trips={trips} travelogs={travelogs} displayName={profile?.displayName || user.displayName} userId={user.uid} />

      {showOnboarding && user && (
        <OnboardingWizard
          user={{ uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL }}
          onComplete={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}
