import type { Metadata } from 'next';
import { Suspense } from 'react';
import DiscoverClient from './DiscoverClient';

export const metadata: Metadata = {
    title: '둘러보기 · 지금 뜨는 여행 스팟 | PPLANER',
    description: '여행자들이 지금 저장하는 장소들. 로그인 없이 둘러보세요.',
};

export const dynamic = 'force-static';

export default function Page() {
    return (
        <Suspense fallback={null}>
            <DiscoverClient />
        </Suspense>
    );
}
