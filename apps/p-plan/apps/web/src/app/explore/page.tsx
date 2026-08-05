import type { Metadata } from 'next';
import { Suspense } from 'react';
import ExploreFeedClient from './ExploreFeedClient';

const TITLE = '탐색 · 스팟 피드 | PPLANER';
const DESC = '여행자들이 남긴 장소를 한 장씩 넘겨보고, 마음에 들면 저장하세요.';

export const metadata: Metadata = {
    title: TITLE,
    description: DESC,
    alternates: { canonical: '/explore' },
    openGraph: { title: TITLE, description: DESC, type: 'website', siteName: 'PPLANER' },
    twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
};

export const dynamic = 'force-static';

export default function Page() {
    return (
        <Suspense fallback={null}>
            <ExploreFeedClient />
        </Suspense>
    );
}
