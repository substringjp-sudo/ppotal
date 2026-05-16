import { constructMetadata, Analytics } from '@ppotal/ui';
import type { Metadata } from 'next';
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@ppotal/ui";
import { I18nProvider } from "../lib/i18n-context";

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

export const metadata: Metadata = constructMetadata({
  title: "JapanRailNote | Interactive Japan Railway Map & Travel Tracker",
  description: "Visualize Japan's railway network (JR, Private, Subway) and track your journeys.",
  url: "https://jprail.pplaner.com",
  keywords: [
    "일본 철도 지도", "JR 패스 노선도", "일본 기차 여행", "신칸센 지도", "도쿄 지하철 노선도",
    "오사카 지하철 노선도", "일본 철도 거리 계산", "철도 여행 기록", "노리테츠", "도리테츠",
    "JR East", "JR West", "JR Central", "JR Kyushu", "JR Hokkaido", "JR Shikoku",
    "Japan Railway Map", "JR Pass Route", "Japan Train Tracker", "Shinkansen Network",
    "Interactive Japan Map", "Japan Rail Pass Planner", "日本鉄道地図", "乗りつぶし", "鉄道旅行"
  ]
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Material Symbols Outlined */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <Analytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <I18nProvider>
            {children}
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
