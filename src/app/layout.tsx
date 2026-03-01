import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google"; // Add Inter
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "../lib/auth-context";
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

export const metadata: Metadata = {
  title: "JapanRailNote | Interactive Japan Railway Map & Travel Tracker | 日本鉄道マップ & 乗りつぶし記録 | 일본 철도 지도 & 여행 기록",
  description: "Visualize Japan's railway network (JR, Private, Subway) and track your journeys. / 日本全国の鉄道網を網羅したインタラクティブ地図と乗りつぶし記録。 / 일본 전역의 철도 노선 시각화 및 나만의 여행 경로 기록.",
  keywords: [
    "일본 철도 지도", "JR 패스 노선도", "일본 기차 여행", "신칸센 지도", "도쿄 지하철 노선도",
    "오사카 지하철 노선도", "일본 철도 거리 계산", "철도 여행 기록", "노리테츠", "도리테츠",
    "JR East", "JR West", "JR Central", "JR Kyushu", "JR Hokkaido", "JR Shikoku",
    "Japan Railway Map", "JR Pass Route", "Japan Train Tracker", "Shinkansen Network",
    "Interactive Japan Map", "Japan Rail Pass Planner", "日本鉄道地図", "乗りつぶし", "鉄道旅行",
    "신칸센 노선도", "야마노테선", "도카이도 신칸센", "도쿄역", "신주쿠역", "오사카역", "교토역",
    "山手線", "東海道新幹線", "東京駅", "新宿駅", "大阪駅", "京都駅", "博多駅", "札幌駅",
    "Tokaido Shinkansen", "Yamanote Line", "Tokyo Station", "Shinjuku Station", "Osaka Station",
    "Railway Route Map Japan", "Subway Map Tokyo", "Subway Map Osaka", "Train Route Finder Japan"
  ],
  openGraph: {
    title: "JapanRailNote | Japan Railway Map & Travel Tracker | 日本鉄道マップ & 乗りつぶし記録 | 일본 철도 지도 & 여행 기록",
    description: "Visualize Japan's complex railway network and track your travels. / 日本の鉄道網を視覚化し、あなたの旅路を記録します。 / 일본 철도 노선 시각화 및 여행 기록 서비스.",
    url: "https://jprail.web.app",
    siteName: "JapanRailNote",
    images: [
      {
        url: "/og-image.png", // Ensure this exists or suggest creating it
        width: 1200,
        height: 630,
        alt: "JapanRailNote Interactive Map",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JapanRailNote | Interactive Japan Railway Map | 日本鉄道マップ | 일본 철도 지도",
    description: "Track your Japan railway journeys. / 日本の鉄道旅行を記録しましょう。 / 일본 철도 여행을 기록하세요.",
    images: ["/og-image.png"],
  },
  verification: {
    google: "Oo0SWvr4Xz_o5XCFW1jQJzwupMzZW3qVFB2mlIHA7AE",
  },
  other: {
    "google-adsense-account": "ca-pub-2007288082586284",
  },
};

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
        {/* AdSense Auto Ads */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2007288082586284"
          strategy="lazyOnload"
          crossOrigin="anonymous"
        />
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-VF27R8XBMY"
          strategy="lazyOnload"
        />
        <Script id="google-analytics" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-VF27R8XBMY');
          `}
        </Script>
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
