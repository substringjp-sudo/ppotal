import { constructMetadata } from '@ppotal/ui';
import { Analytics } from '@ppotal/ui';

export const metadata = constructMetadata({
  title: 'PPLANER (피플래너) - AI 여행 설계 및 실시간 동행 플랫폼',
  description: '정밀한 여행 계획 수립, 실시간 동행 가이드, 나만의 글로벌 여행기 및 철도 이용 기록 아카이빙을 지원하는 차세대 통합 여행 포털 PPLANER입니다.',
  url: 'https://www.pplaner.com',
  keywords: [
    '피플래너', 'PPLANER', '여행 계획', '여행 설계', '철도 여행', '일본 철도', 'JapanRailNote', 'Regionevel', 
    '여행 아카이브', '여행 지도', '실시간 동행', 'AI 여행 플래너', '도시별 여행 등급', '지자체 방문 기록'
  ]
});

import { AuthProvider } from '@ppotal/ui';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Inter:wght@300;400;600;800&display=swap" rel="stylesheet" />
        <Analytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "PPLANER",
              "description": "정밀한 여행 계획 수립, 실시간 동행 가이드, 나만의 글로벌 여행기 및 철도 이용 기록 아카이빙을 지원하는 차세대 통합 여행 포털 PPLANER입니다.",
              "applicationCategory": "TravelApplication",
              "operatingSystem": "All",
              "url": "https://www.pplaner.com",
              "creator": {
                "@type": "Organization",
                "name": "PPLANER"
              }
            }),
          }}
        />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
