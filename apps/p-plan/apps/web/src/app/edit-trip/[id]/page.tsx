import type { Metadata } from 'next';
import EditPageClient from './EditPageClient';

export const metadata: Metadata = {
    title: '여행 편집 | PPLANER',
    description: '여행의 상세 정보를 수정하고 관리하세요. 항공, 숙박, 일정 등을 자유롭게 변경할 수 있습니다.',
};

export function generateStaticParams() {
    return [{ id: 'placeholder' }];
}

import { Suspense } from 'react';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    await params;
    return (
        <Suspense fallback={null}>
            <EditPageClient />
        </Suspense>
    );
}
