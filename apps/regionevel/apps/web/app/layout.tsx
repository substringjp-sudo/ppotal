import { constructMetadata, Analytics, AuthProvider } from "@ppotal/ui";
import type { Metadata } from "next";
import React from "react";
import { Footer } from "@/components/common/Footer";
import { Nav } from "@/components/common/Nav";
import { FirebaseProvider } from "@/components/auth/FirebaseProvider";
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
          <FirebaseProvider>
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
          </FirebaseProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
