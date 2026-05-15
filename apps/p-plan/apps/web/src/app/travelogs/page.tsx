import type { Metadata } from 'next';
import TravelogListPageClient from './TravelogListPageClient';

export const metadata: Metadata = {
    title: '내 여행 기록 | PPLANER',
    description: '빛나는 순간들을 기록하고 공유하세요. 나만의 트래블로그를 만들어보세요.',
    openGraph: {
        title: '내 여행 기록 | PPLANER',
        description: '빛나는 순간들을 기록하고 공유하세요. 나만의 트래블로그를 만들어보세요.',
        type: 'website',
    },
};

export default function Page() {
    return <TravelogListPageClient />;
}
