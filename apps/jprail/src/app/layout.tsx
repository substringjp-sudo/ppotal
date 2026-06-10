import { constructMetadata, Analytics } from '@ppotal/ui';
import type { Metadata } from 'next';
import { Geist, Geist_Mono, Inter, Outfit } from "next/font/google";
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

const outfit = Outfit({
  variable: "--font-outfit",
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
        {/* Preconnect to Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Preload stylesheet for early download */}
        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
        {/* Inject stylesheet dynamically to bypass React Server Component event handler restriction */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var link = document.createElement('link');
                link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';
                link.rel = 'stylesheet';
                link.media = 'print';
                link.onload = function() { this.media = 'all'; };
                document.head.appendChild(link);
              })();
            `
          }}
        />
        <Analytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${outfit.variable} antialiased`}
        suppressHydrationWarning
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "JapanRailNote",
              "description": "일본 전역의 신칸센, JR, 사철, 지하철 노선을 탐색하고 탑승 기록을 아카이브할 수 있는 웹 기반 에디팅 서비스입니다.",
              "applicationCategory": "TravelApplication",
              "operatingSystem": "All",
              "url": "https://jprail.pplaner.com",
              "creator": {
                "@type": "Organization",
                "name": "PPLANER"
              }
            }),
          }}
        />
        <AuthProvider>
          <I18nProvider>
            {children}
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
