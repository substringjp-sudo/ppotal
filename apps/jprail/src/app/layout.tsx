import { constructMetadata, Analytics } from '@ppotal/ui';
import type { Metadata } from 'next';
import { Geist, Geist_Mono, Inter, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@ppotal/ui";
import { I18nProvider } from "../lib/i18n-context";
import Script from "next/script";

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
  title: "JapanRailNote | 일본 철도 지도 & 노선도 여행 기록 | Japan Railway Map & Tracker",
  description: "일본 전역의 신칸센, JR, 사철, 지하철 노선을 탐색하고 탑승 기록을 아카이브할 수 있는 웹 기반 에디팅 서비스입니다. (Interactive Japan Railway Map & Travel Tracker)",
  url: "https://jprail.pplaner.com",
  keywords: [
    // Brand & Basics
    "JapanRailNote", "PPLANER", "Japan Railway Map", "JR Pass Route", "Japan Train Tracker",
    // Korean Persona Keywords
    "일본 철도 지도", "JR 패스 노선도", "일본 기차 여행", "신칸센 지도", "도쿄 지하철 노선도",
    "오사카 지하철 노선도", "일본 철도 거리 계산", "철도 여행 기록", "일철덕", "철덕",
    "일본 철도 완주 기록", "일본 철도 승차 기록", "일본 철도 지도 시각화", "철도 완주 기록 사이트",
    "일본 기차 완주 거리 계산", "일본 철도 정차역 지도", "전국 JR 패스 노선 지도", "JR 서일본 패스 노선도",
    "청춘 18 티켓 노선도", "일본 소도시 기차 여행 경로", "일본 지하철 노선 통합 검색", "신칸센 노선도 최적 경로",
    "철도 완승", "에키스탬프", "패스 뽕", "에키벤", "비경역", "성지순례", "철싸대", "철스퍼거",
    // Japanese Persona Keywords
    "完乗マップ デジタル", "鉄道 完乗 記録 ツール", "乗り鉄 路線図 塗りつぶし", "日本鉄道 完乗率 계산",
    "JR 私鉄 地下鉄 完乗", "路線図 白地図 鉄道", "駅スタンプラリー 路線図", "鉄印帳 路線 マップ",
    "日本鉄道地図", "完乗", "鉄道旅行", "乗り鉄", "駅跨ぎ", "盲腸線", "大回り乗車", "駅弁",
    "秘境駅", "女子鉄", "ママ鉄", "子鉄", "鉄子", "キセル乗車", "地雷鉄",
    // English Persona Keywords
    "Japan rail pass calculator map", "JR Pass interactive route planner", "Map of private railways Japan",
    "Track Japan train journeys", "Shinkansen interactive network map", "Japan rail travel progress tracker",
    "Japan railway vector map", "Interactive Japan transit network", "High resolution Japan rail map",
    "JR East", "JR West", "JR Central", "JR Kyushu", "JR Hokkaido", "JR Shikoku",
    "railfan", "trainspotter", "rail buff", "foamer", "gricer", "anorak", "rail bashing",
    "shinkansen bashing", "timetable nerd", "rail completion", "train bashing"
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
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-K586RNZD1F"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              
              // Google Consent Mode v2 Default Settings
              gtag('consent', 'default', {
                'ad_storage': 'granted',
                'ad_user_data': 'granted',
                'ad_personalization': 'granted',
                'analytics_storage': 'granted'
              });

              gtag('js', new Date());
              gtag('config', 'G-K586RNZD1F');
            `
          }}
        />
        {/* Redirect old web.app domain to custom domain immediately */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (window.location.hostname === 'jprail.web.app' || window.location.hostname === 'jprail.firebaseapp.com') {
                window.location.replace('https://jprail.pplaner.com' + window.location.pathname + window.location.search);
              }
            `
          }}
        />
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
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2007288082586284"
          crossOrigin="anonymous"
        />
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
