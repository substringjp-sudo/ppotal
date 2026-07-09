import { constructMetadata, Analytics, AuthProvider } from "@ppotal/ui";
import type { Metadata } from "next";
import React from "react";
import { Geist, Geist_Mono, Inter, Outfit } from "next/font/google";
import Script from "next/script";
import { Footer } from "@/components/common/Footer";
import { Nav } from "@/components/common/Nav";
import { FirebaseProvider } from "@/components/auth/FirebaseProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = constructMetadata({
  title: "Regionevel | 나의 여행 경현치 지도 & 국내 세계 여행 기록 | Regional Travel Tracker",
  description: "한국 시군구 경현치 테스트, 일본 経県値(경현치) 지도 만들기, 전 세계 국가 및 도시 단위 방문 기록을 시각화하고 관리할 수 있는 글로벌 여행 트래커 Regionevel입니다. (Regional Travel Tracker & Keikenchi Map)",
  url: "https://rgnevel.pplaner.com",
  keywords: [
    // Brand & Basic
    "Regionevel", "rgnevel", "pplaner", "travel tracker", "regional level", "travel log",
    // Korean Persona Keywords (경현치 & 여행기록)
    "경현치", "경현치 테스트", "경현치 계산기", "일본 경현치 지도", "한국 경현치 지도",
    "국내 여행 레벨", "여행 지도 색칠", "전국 시군구 방문 기록", "도시별 여행 기록 지도",
    "여행 기록", "지도", "지역별 레벨", "방문기록", "세계지도", "세계여행", "방문내역", "히스토리",
    // Japanese Persona Keywords (経県値 & 訪問記録)
    "経県値", "経県値 日本地図", "経県値 アプリ", "経都府県値", "市区町村 塗りつぶし",
    "全国市区町村 訪問記録", "都道府県", "地域", "旅行記録", "訪問記録", "世界地図", "世界旅行", "市町村",
    // English Persona Keywords (Global Tracker)
    "digital scratch travel map", "US states visited map builder", "prefecture level travel tracker",
    "interactive country visit logger", "world travel map", "visit history tracker", "Keikenchi"
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
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-ZBF513NJZX"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              
              // Google Consent Mode v2 Default Settings
              gtag('consent', 'default', {
                'ad_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied',
                'analytics_storage': 'denied',
                'wait_for_update': 500
              });

              gtag('js', new Date());
              gtag('config', 'G-ZBF513NJZX');
            `
          }}
        />
        {/* Preconnect to Google Fonts & CDN sources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <Analytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2007288082586284"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${outfit.variable} bg-slate-50 text-gray-900 antialiased min-h-screen flex flex-col bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]`}>
        <AuthProvider>
          <FirebaseProvider>
            <div className="flex-1 flex flex-col max-w-[1920px] mx-auto w-full bg-white shadow-2xl shadow-slate-900/10 min-h-screen">
              <Nav />
              <main className="flex-1 flex flex-col">
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
            </div>
          </FirebaseProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
