import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JapanRailNote | 일본 철도 핵심 지도 & 여행 트래커 | 日本鉄道網・乗りつぶし記録",
  description: "JapanRailNote는 일본 전역의 JR, 사철, 지하철, 노면전차 노선을 인터랙티브 지도로 시각화하고 나만의 여행 경로를 기록하는 서비스입니다. JR 패스 여행자, 철도 마니아를 위한 노선별 거리 계산, 다국어 역명 검색, 최단 경로 탐색 기능을 무료로 이용하세요.",
  keywords: [
    "일본 철도 지도", "JR 패스 노선도", "일본 기차 여행", "신칸센 지도", "도쿄 지하철 노선도",
    "오사카 지하철 노선도", "일본 철도 거리 계산", "철도 여행 기록", "노리테츠", "도리테츠",
    "JR East", "JR West", "JR Central", "JR Kyushu", "JR Hokkaido", "JR Shikoku",
    "Japan Railway Map", "JR Pass Route", "Japan Train Tracker", "Shinkansen Network",
    "Interactive Japan Map", "Japan Rail Pass Planner", "日本鉄道地図", "乗りつぶし", "鉄道旅行"
  ],
  openGraph: {
    title: "JapanRailNote - 일본 모든 철도의 시각화 및 여행 기록",
    description: "일본 전역의 복잡한 철도 노선을 한눈에 파악하고, 당신의 철도 여행을 체계적으로 기록하고 공유하세요.",
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
    title: "JapanRailNote | 일본 철도 여행의 모든 것",
    description: "인터랙티브 지도로 만나는 일본 철도 네트워크. 나만의 철도 여행 기록을 시작하세요.",
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
    <html lang="en">
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2007288082586284"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-VF27R8XBMY"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-VF27R8XBMY');
          `}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
