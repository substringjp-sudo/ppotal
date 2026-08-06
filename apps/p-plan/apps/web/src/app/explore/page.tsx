import type { Metadata } from 'next';
import RedirectToDiscover from '@/components/common/RedirectToDiscover';

const TITLE = '탐색 · 스팟 피드 | PPLANER';
const DESC = '여행자들이 남긴 장소를 한 장씩 넘겨보고, 마음에 들면 저장하세요.';

export const metadata: Metadata = {
    title: TITLE,
    description: DESC,
    alternates: { canonical: '/discover' },
    openGraph: { title: TITLE, description: DESC, type: 'website', siteName: 'PPLANER' },
    twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
};

export const dynamic = 'force-static';

// 스팟 피드는 이제 둘러보기의 한 탭이다. 옛 주소는 그 탭으로 보낸다.
export default function Page() {
    return <RedirectToDiscover tab="spots" label="스팟 피드" />;
}
