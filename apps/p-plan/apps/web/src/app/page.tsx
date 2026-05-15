import type { Metadata } from 'next';
import HomePageClient from './HomePageClient';

export const metadata: Metadata = {
    title: 'PPLANER | 스마트한 여행 준비 서비스',
    description: '스마트한 여행 준비의 시작. 일정, 예산, 체크리스트를 한눈에 관리하세요.',
    openGraph: {
        title: 'PPLANER | 스마트한 여행 준비 서비스',
        description: '스마트한 여행 준비의 시작. 일정, 예산, 체크리스트를 한눈에 관리하세요.',
        type: 'website',
    },
};

export default function Page() {
    return <HomePageClient />;
}
