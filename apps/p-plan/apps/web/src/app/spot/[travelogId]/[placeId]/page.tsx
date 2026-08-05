import type { Metadata } from 'next';
import { Suspense } from 'react';
import SpotPageClient from './SpotPageClient';

const TITLE = '스팟 | PPLANER';
const DESC = '여행에서 만난 장소 하나 — 사진과 소감.';

// 정적 export라 스팟별 동적 OG는 불가(빌드 시 placeholder만). 일반 OG로 링크 언펄 대응하고,
// 실제 스팟 내용은 JS 렌더링 크롤러가 색인한다. 스팟별 동적 OG는 함수-서빙 프리렌더(추후).
export const metadata: Metadata = {
    title: TITLE,
    description: DESC,
    openGraph: { title: TITLE, description: DESC, type: 'article', siteName: 'PPLANER' },
    twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
};

export const dynamic = 'force-static';

export function generateStaticParams() {
    return [{ travelogId: 'placeholder', placeId: 'placeholder' }];
}

export default async function Page({ params }: { params: Promise<{ travelogId: string; placeId: string }> }) {
    await params;
    return (
        <Suspense fallback={null}>
            <SpotPageClient />
        </Suspense>
    );
}
