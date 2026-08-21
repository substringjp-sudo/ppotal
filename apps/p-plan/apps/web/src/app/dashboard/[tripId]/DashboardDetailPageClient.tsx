'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * 옛 대시보드 경로 — 편집기의 '한눈에' 섹션으로 넘긴다.
 *
 * 대시보드와 편집기는 위젯 대부분이 같은 데이터를 보여주면서 정작 고치려면 편집기로
 * 넘어가야 했다. 이제 둘이 한 화면이라 이 경로는 남길 이유가 없지만, 지우면 이미
 * 나가 있는 링크와 사용자의 북마크가 깨진다. 그래서 경로는 살려 두고 넘기기만 한다.
 */
export default function DashboardDetailPageClient() {
    const params = useParams();
    const router = useRouter();

    const tripIdParam = params.tripId;
    let tripId = Array.isArray(tripIdParam) ? tripIdParam[0] : (tripIdParam as string);

    // Firebase Hosting의 Static Export 리라이트([tripId]=placeholder) 대응
    if (tripId === 'placeholder' && typeof window !== 'undefined') {
        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        if (pathSegments[0] === 'dashboard' && pathSegments[1]) {
            tripId = pathSegments[1];
        }
    }

    useEffect(() => {
        if (!tripId || tripId === 'placeholder') {
            router.replace('/trips');
            return;
        }
        // ?tab=budget처럼 특정 섹션을 지목한 링크는 그 섹션 그대로 열어 준다.
        // useSearchParams()가 아니라 window에서 직접 읽는다 — 훅을 쓰면 정적 export
        // 프리렌더가 Suspense 경계를 요구하는데, 화면이라곤 스피너뿐인 리다이렉트
        // 컴포넌트를 그것 때문에 감쌀 이유가 없다.
        const tab = new URLSearchParams(window.location.search).get('tab') || 'overview';
        router.replace(`/edit-trip/${tripId}?tab=${tab}`);
    }, [tripId, router]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
    );
}
