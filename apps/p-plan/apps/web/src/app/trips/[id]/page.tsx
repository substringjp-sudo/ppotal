import type { Metadata } from 'next';
import { Suspense } from 'react';
import TripHubClient from './TripHubClient';

export const metadata: Metadata = {
    title: '여행 · PPLANER',
    description: '이 여행의 계획·점검·여행기·공유를 한곳에서.',
};

export function generateStaticParams() {
    return [{ id: 'placeholder' }];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    await params;
    return (
        <Suspense fallback={null}>
            <TripHubClient />
        </Suspense>
    );
}
