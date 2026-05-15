import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import { FirebaseProvider } from "@/components/auth/FirebaseProvider";
import { AuthButton } from "@/components/auth/AuthButton";
import { ExportMapButton } from "@/components/map/ExportMapButton";
import { Footer } from "@/components/common/Footer";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://rgnevel.pplaner.com"),
  title: "Regionevel - Regional Travel Tracker",
  description: "A global travel tracker for visualizing and managing your travel history at Country, Prefecture, and City levels. Discover your regional footprint and level up your travel game.",
  alternates: {
    canonical: "/",
  },
  keywords: [
    // English
    "travel tracker", "regional level", "map", "footprint", "South Korea", 
    "world map", "world travel", "visit record", "travel log", "visit history", 
    "regional experience", "prefecture", "state", "province", "municipality", "Keikenchi",
    // Korean
    "여행 기록", "지도", "지역별 레벨", "경현치", "지역", "도도부현", "주", "도",
    "시군구", "시정촌", "읍면동", "방문기록", "세계지도", "세계여행", "방문",
    "방문내역", "히스토리",
    // Japanese
    "経県値", "都道府県", "地域", "旅行記録", "訪問記録", "世界地図", "世界旅行", 
    "市町村", "訪問", "ヒストリー"
  ],
  authors: [{ name: "Regionevel Team" }],
  openGraph: {
    title: "Regionevel - Regional Travel Tracker",
    description: "A global travel tracker for visualizing and managing your travel history at Country, Prefecture, and City levels. Discover your regional footprint and level up your travel game.",
    url: "https://rgnevel.pplaner.com",
    type: "website",
    locale: "ko_KR",
    siteName: "Regionevel",
  },
  twitter: {
    card: "summary_large_image",
    title: "Regionevel - Regional Travel Tracker",
    description: "A global travel tracker for visualizing and managing your travel history at Country, Prefecture, and City levels. Discover your regional footprint and level up your travel game.",
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION, // Replace with actual ID from Search Console
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased min-h-screen flex flex-col">
        <FirebaseProvider>
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
              <AuthButton />
            </div>
          </nav>
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
        </FirebaseProvider>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  );
}
