import type { Metadata } from 'next';
import RedirectToDiscover from '@/components/common/RedirectToDiscover';

const TITLE = '여행기 · 블로그 | PPLANER';
const DESC = '여행자들이 남긴 여행기를 통째로 — 인기·추천 여행기를 둘러보세요.';

export const metadata: Metadata = {
    title: TITLE,
    description: DESC,
    alternates: { canonical: '/discover' },
    openGraph: { title: TITLE, description: DESC, type: 'website', siteName: 'PPLANER' },
    twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
};

export const dynamic = 'force-static';

// 여행기 피드는 이제 둘러보기의 한 탭이다. 옛 주소는 그 탭으로 보낸다.
export default function Page() {
    return <RedirectToDiscover tab="travelogs" label="여행기" />;
}
