import type { Metadata } from 'next';
import TravelogEditorClient from './TravelogEditorClient';

export const metadata: Metadata = {
    title: '여행 기록하기 | PPLANER',
    description: '소중한 순간들을 기록하고 나만의 이야기를 완성하세요.',
};

export const dynamic = 'force-static';

export function generateStaticParams() {
    return [{ id: 'placeholder' }]; // At least one for static export
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <TravelogEditorClient id={id} />;
}
