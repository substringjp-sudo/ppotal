import type { Metadata } from 'next';
import { Suspense } from 'react';
import HomePageClient from './HomePageClient';

export const metadata: Metadata = {
    title: 'PPLANER | 로그인 없이 바로 만드는 여행 계획',
    description:
        '날짜와 일정을 넣으면 겹치는 시간·무리한 동선·놓친 준비물을 바로 찾아드려요. 로그인 없이 지금 바로 계획을 시작하고, 마음에 들면 로그인해서 이어서 관리하세요.',
    openGraph: {
        title: 'PPLANER | 로그인 없이 바로 만드는 여행 계획',
        description: '일정 충돌, 무리한 동선, 놓친 준비물까지 — 로그인 없이 지금 바로 점검해보세요.',
        type: 'website',
    },
};

export default function Page() {
    return (
        <Suspense fallback={null}>
            <HomePageClient />
        </Suspense>
    );
}
