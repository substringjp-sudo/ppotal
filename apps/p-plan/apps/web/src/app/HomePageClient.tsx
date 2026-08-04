'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToUserTrips } from '@pplaner/shared';
import { TripSummary } from '@pplaner/shared';

import OnboardingWizard from '@/components/auth/OnboardingWizard';
import { getUserProfile } from '@pplaner/shared';
import { useUserStore } from '@pplaner/shared';
import TripEditorApp from '@/components/edit-trip/TripEditorApp';
import JourneyGallery from '@/components/home/JourneyGallery';
import { subscribeToUserTravelogs, Travelog } from '@pplaner/shared';

export default function HomePage() {
  const { user } = useAuth();
  const { profile, setProfile } = useUserStore();
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

  // 로딩
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // 로그인되지 않은 사용자: 로그인 없이 바로 여행 계획을 만들어볼 수 있는 게스트 모드
  if (!user) {
    return <TripEditorApp id="guest" />;
  }

  // 로그인된 사용자: 홈 = 내 여행 갤러리
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
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
