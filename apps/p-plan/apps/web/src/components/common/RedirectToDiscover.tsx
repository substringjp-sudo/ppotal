'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 옛 발견 경로(/explore, /blog)를 둘러보기의 해당 탭으로 넘긴다.
 * 세 표면을 한 목적지로 합치면서 기존 링크·북마크가 깨지지 않게 한다.
 */
export default function RedirectToDiscover({ tab, label }: { tab: string; label: string }) {
    const router = useRouter();

    useEffect(() => {
        router.replace(`/discover?tab=${tab}`);
    }, [router, tab]);

    return (
        <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-[#030712] px-6 text-center">
            <div>
                <div className="w-8 h-8 mx-auto border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="mt-4 text-sm font-bold text-slate-500">둘러보기의 {label}로 이동 중…</p>
            </div>
        </div>
    );
}
