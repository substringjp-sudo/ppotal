import type { Metadata } from 'next';
import { Suspense } from 'react';
import FootprintClient from './FootprintClient';

export const metadata: Metadata = {
    title: '발자취 | PPLANER',
    description: '사진에서 정리된, 다녀온 곳의 원본 기록. 여행기로 쓰지 않아도 남습니다.',
    robots: { index: false, follow: false },
};

export const dynamic = 'force-static';

export default function Page() {
    return (
        <Suspense fallback={null}>
            <FootprintClient />
        </Suspense>
    );
}
