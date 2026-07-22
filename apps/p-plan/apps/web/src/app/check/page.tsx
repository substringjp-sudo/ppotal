import type { Metadata } from 'next';
import CheckPageClient from './CheckPageClient';

export const metadata: Metadata = {
    title: '내 여행 계획 점검 | PPLANER',
    description:
        '로그인 없이 여행 날짜와 일정을 입력하면 일정 충돌·중복·무리한 동선 같은 문제를 즉시 점검해드려요. 마음에 들면 로그인해서 이어서 계획하세요.',
    openGraph: {
        title: '내 여행 계획, 문제 없나 30초 점검 | PPLANER',
        description:
            '로그인 없이 일정을 넣으면 겹치는 시간·중복 일정·무리한 동선을 바로 찾아드려요.',
        type: 'website',
    },
};

export default function Page() {
    return <CheckPageClient />;
}
