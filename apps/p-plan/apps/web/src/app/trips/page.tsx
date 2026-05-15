import type { Metadata } from 'next';
import TripListPageClient from './TripListPageClient';

export const metadata: Metadata = {
    title: '내 여행 목록 | PPLANER',
    description: '계획 중인 모든 여행을 확인하고 관리하세요. 새로운 여정을 시작할 수도 있습니다.',
    openGraph: {
        title: '내 여행 목록 | PPLANER',
        description: '계획 중인 모든 여행을 확인하고 관리하세요. 새로운 여정을 시작할 수도 있습니다.',
        type: 'website',
    },
};

export default function Page() {
    return <TripListPageClient />;
}
