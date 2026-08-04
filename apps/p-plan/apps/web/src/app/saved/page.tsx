import type { Metadata } from 'next';
import { Suspense } from 'react';
import SavedSpotsClient from './SavedSpotsClient';

export const metadata: Metadata = {
    title: '가고 싶은 지도 | PPLANER',
    description: '피드에서 저장한 장소들이 지도에 모입니다.',
};

export const dynamic = 'force-static';

export default function Page() {
    return (
        <Suspense fallback={null}>
            <SavedSpotsClient />
        </Suspense>
    );
}
