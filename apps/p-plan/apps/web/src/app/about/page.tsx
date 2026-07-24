import type { Metadata } from 'next';
import AboutHero from '@/components/about/AboutHero';

export const metadata: Metadata = {
    title: 'PPLANER 소개 | 로그인 없이 바로 확인하는 여행 계획',
    description:
        '일정 충돌·숙소 공백·놓친 준비물·비자 요건까지, PPLANER가 무엇을 어떻게 확인해주는지 소개합니다.',
    openGraph: {
        title: 'PPLANER 소개 | 로그인 없이 바로 확인하는 여행 계획',
        description: '일정 충돌·숙소 공백·놓친 준비물·비자 요건까지, PPLANER가 무엇을 확인해주는지 소개합니다.',
        type: 'website',
    },
};

export default function Page() {
    return <AboutHero />;
}
