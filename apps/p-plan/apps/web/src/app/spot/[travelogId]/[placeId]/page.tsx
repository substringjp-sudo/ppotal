import type { Metadata } from 'next';
import { Suspense } from 'react';
import SpotPageClient from './SpotPageClient';

export const metadata: Metadata = {
    title: '스팟 | PPLANER',
    description: '여행에서 만난 장소 하나 — 사진과 소감.',
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
