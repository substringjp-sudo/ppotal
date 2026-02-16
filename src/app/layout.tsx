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
  title: "JapanRailNote | 일본 철도 지도 & 여행 기록 | 日本鉄道地図・旅行記録",
  description: "Explore Japan's railway network and track your trips. 일본 전역의 철도 노선을 지도로 확인하고 나만의 여행을 기록하세요. 日本全国の鉄道網を地図で確認し、あなたの旅行を記録しましょう。",
  keywords: ["Japan Railway Map", "JR Pass", "Travel Tracker", "일본 철도 지도", "JR 노선도", "철도 여행 기록", "日本鉄道地図", "鉄道旅行", "乗りつぶし"],
  openGraph: {
    title: "JapanRailNote",
    description: "Interactive Japan Railroad Map & Progress Tracker",
    url: "https://jprail.web.app",
    siteName: "JapanRailNote",
    locale: "ko_KR",
    type: "website",
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
