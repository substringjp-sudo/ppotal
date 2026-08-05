import type { Metadata } from 'next';
import { Suspense } from 'react';
import DiscoverClient from './DiscoverClient';

const TITLE = '둘러보기 · 지금 뜨는 여행 스팟 | PPLANER';
const DESC = '여행자들이 지금 저장하는 장소들. 로그인 없이 한 컷씩 둘러보고 마음에 들면 저장하세요.';

export const metadata: Metadata = {
    title: TITLE,
    description: DESC,
    alternates: { canonical: '/discover' },
    openGraph: { title: TITLE, description: DESC, type: 'website', siteName: 'PPLANER' },
    twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
};

export const dynamic = 'force-static';

// 정적 구조화 데이터 — 페이지의 성격을 크롤러가 이해하도록 (스냅샷 프리렌더 경량 v1).
// 동적 스팟 목록은 JS 렌더링 크롤러가 색인하고, 링크 언펄러는 위 OG를 읽는다.
const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '둘러보기 — 지금 뜨는 여행 스팟',
    description: DESC,
    isPartOf: { '@type': 'WebSite', name: 'PPLANER' },
    about: { '@type': 'Thing', name: '여행 장소 발견' },
};

export default function Page() {
    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <Suspense fallback={null}>
                <DiscoverClient />
            </Suspense>
        </>
    );
}
