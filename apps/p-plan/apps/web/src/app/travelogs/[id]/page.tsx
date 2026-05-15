import type { Metadata } from 'next';
import TravelogPageClient from './TravelogPageClient';

export const metadata: Metadata = {
    title: '여행 기록 상세 | PPLANER',
    description: '소중한 여행의 기억을 다시 감상하세요.',
};

export const dynamic = 'force-static';

export function generateStaticParams() {
    return [{ id: 'placeholder' }];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <TravelogPageClient id={id} />;
}
