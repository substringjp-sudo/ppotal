import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PPLANER - 스마트한 여행 플래너",
  description: "스마트한 일정 계획과 논리적 검증을 제공하는 여행 플래너 및 다이어리 앱",
};

import FirebaseAnalytics from "@/components/common/FirebaseAnalytics";
import TripSyncProvider from "@/components/providers/TripSyncProvider";
import GlobalOverlays from "@/components/common/GlobalOverlays";
import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
import ExchangeRateProvider from "@/components/providers/ExchangeRateProvider";
import PageTransitionProvider from "@/components/providers/PageTransitionProvider";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import Header from "@/components/layout/Header";
import { Toaster } from 'sonner';
import UserSyncProvider from "@/components/providers/UserSyncProvider";
import IntelligenceSyncProvider from "@/components/providers/IntelligenceSyncProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import Script from "next/script";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="font-pretendard" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places,drawing,geometry&v=beta&loading=async`}
          strategy="afterInteractive"
        />
      </head>
      <body suppressHydrationWarning className="antialiased bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen">
        <FirebaseAnalytics />
        <AuthProvider>
          <ReactQueryProvider>
            <UserSyncProvider>
              <TripSyncProvider>
                <IntelligenceSyncProvider>
                  <ExchangeRateProvider>
                    <GlobalOverlays />
                    <Header />
                    <div id="main-content" className="w-full max-w-[1440px] mx-auto pb-[calc(var(--mobile-nav-height,4rem)+env(safe-area-inset-bottom,0px))] md:pb-0 px-4 md:px-6 flex flex-col min-h-[calc(100vh-64px)]">
                      <PageTransitionProvider>
                        {children}
                      </PageTransitionProvider>
                    </div>
                    <MobileBottomNav />
                    <Toaster position="top-center" richColors />
                  </ExchangeRateProvider>
                </IntelligenceSyncProvider>
              </TripSyncProvider>
            </UserSyncProvider>
          </ReactQueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
