import { constructMetadata, Analytics, AuthProvider, useAuth } from "@ppotal/ui";
import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import { ExportMapButton } from "@/components/map/ExportMapButton";
import { Footer } from "@/components/common/Footer";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = constructMetadata({
  title: "Regionevel - Regional Travel Tracker",
  description: "A global travel tracker for visualizing and managing your travel history at Country, Prefecture, and City levels.",
  url: "https://rgnevel.pplaner.com",
  keywords: [
    "travel tracker", "regional level", "map", "footprint", "South Korea", 
    "world map", "world travel", "visit record", "travel log", "visit history", 
    "regional experience", "prefecture", "state", "province", "municipality", "Keikenchi",
    "여행 기록", "지도", "지역별 레벨", "경현치", "지역", "도도부현", "주", "도",
    "시군구", "시정촌", "읍면동", "방문기록", "세계지도", "세계여행", "방문",
    "방문내역", "히스토리",
    "経県値", "都道府県", "地域", "旅行記録", "訪問記録", "世界地図", "世界旅行", 
    "市町村", "訪問", "ヒストリー"
  ]
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Analytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased min-h-screen flex flex-col">
        <AuthProvider>
          <Nav />
          <main className="flex-1">
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "SoftwareApplication",
                  "name": "Regionevel",
                  "description": "A global travel tracker for visualizing and managing travel history at Country, Prefecture, and City levels.",
                  "applicationCategory": "TravelApplication",
                  "operatingSystem": "Web",
                  "url": "https://rgnevel.pplaner.com",
                  "author": {
                    "@type": "Organization",
                    "name": "Regionevel Team"
                  }
                }),
              }}
            />
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}

function Nav() {
  const { user, profile, loading, logout, refreshProfile } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = React.useState(false);
  const { AuthModal, OnboardingModal } = require("@ppotal/ui");
  const { updateOnboardingStatus } = require("@ppotal/firebase");
  const { MapIcon, Sparkles, Trophy } = require("lucide-react");

  React.useEffect(() => {
    if (!loading && user && profile && !profile.onboarding.regionevel) {
      setIsOnboardingOpen(true);
    }
  }, [loading, user, profile]);

  const handleOnboardingComplete = async () => {
    if (user) {
      await updateOnboardingStatus(user.uid, 'regionevel', true);
      await refreshProfile();
    }
    setIsOnboardingOpen(false);
  };

  const onboardingSteps = [
    {
      title: "Welcome to Regionevel",
      description: "Track your travel history across countries, prefectures, and cities worldwide.",
      icon: <MapIcon />,
      color: "#3b82f6"
    },
    {
      title: "Regional Experience Score",
      description: "Calculate your 'Keikenchi' (experience score) based on where you've lived, visited, or passed through.",
      icon: <Trophy />,
      color: "#f59e0b"
    },
    {
      title: "Interactive Maps",
      description: "Visualize your footsteps on beautiful, interactive maps and export them to share with friends.",
      icon: <Sparkles />,
      color: "#8b5cf6"
    }
  ];

  return (
    <nav className="flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-[2000]">
      <Link href="/" className="font-bold text-blue-700 text-lg tracking-tight">
        Regionevel
      </Link>
      <Link
        href="/map"
        className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
      >
        Map
      </Link>
      <Link
        href="/list"
        className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
      >
        List
      </Link>
      <div className="ml-auto flex items-center gap-3">
        <ExportMapButton />
        {loading ? (
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        ) : user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">{profile?.displayName || user.email?.split('@')[0]}</span>
            <button 
              onClick={() => logout()}
              className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsAuthModalOpen(true)}
            className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-md hover:shadow-lg"
          >
            Sign In
          </button>
        )}
      </div>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <OnboardingModal 
        isOpen={isOnboardingOpen} 
        onClose={() => setIsOnboardingOpen(false)}
        appName="Regionevel"
        steps={onboardingSteps}
        onComplete={handleOnboardingComplete}
      />
    </nav>
  );
}
