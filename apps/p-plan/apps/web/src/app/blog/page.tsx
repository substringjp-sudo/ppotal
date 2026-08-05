import type { Metadata } from 'next';
import { Suspense } from 'react';
import BlogFeedClient from './BlogFeedClient';

const TITLE = '여행기 · 블로그 | PPLANER';
const DESC = '여행자들이 남긴 여행기를 통째로 — 인기·추천 여행기를 둘러보세요.';

export const metadata: Metadata = {
    title: TITLE,
    description: DESC,
    alternates: { canonical: '/blog' },
    openGraph: { title: TITLE, description: DESC, type: 'website', siteName: 'PPLANER' },
    twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
};

export const dynamic = 'force-static';

const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '여행기 블로그',
    description: DESC,
    isPartOf: { '@type': 'WebSite', name: 'PPLANER' },
};

export default function Page() {
    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <Suspense fallback={null}>
                <BlogFeedClient />
            </Suspense>
        </>
    );
}
