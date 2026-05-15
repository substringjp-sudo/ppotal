import type { Metadata } from 'next';
import WishlistPageClient from './WishlistPageClient';

export const metadata: Metadata = {
    title: '위시리스트 | PPLANER',
    description: '가고 싶은 장소와 먹고 싶은 음식을 저장하세요. 나만의 맞춤형 여행 리스트를 만들어보세요.',
};

import { Suspense } from 'react';

export default function Page() {
    return (
        <Suspense fallback={null}>
            <WishlistPageClient />
        </Suspense>
    );
}
