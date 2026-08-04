import type { Metadata } from 'next';
import { Suspense } from 'react';
import ExploreFeedClient from './ExploreFeedClient';

export const metadata: Metadata = {
    title: '탐색 · 스팟 피드 | PPLANER',
    description: '여행자들이 남긴 장소를 한 장씩 넘겨보고, 마음에 들면 저장하세요.',
};

export const dynamic = 'force-static';

export default function Page() {
    return (
        <Suspense fallback={null}>
            <ExploreFeedClient />
        </Suspense>
    );
}
