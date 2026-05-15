'use client';
import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Next.js App Router 에러 페이지
 * `app/error.tsx`에 위치하면 자동으로 에러 바운더리로 동작합니다.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error('Page Error:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-8">
            <div className="max-w-md w-full text-center">
                {/* 에러 아이콘 */}
                <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-rounded text-red-500 text-4xl">cloud_off</span>
                </div>

                <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-3">
                    서비스 오류가 발생했습니다
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                    {error.message || '예기치 않은 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'}
                </p>
                {error.digest && (
                    <p className="text-xs text-slate-400 mb-8 font-mono">
                        오류 코드: {error.digest}
                    </p>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="w-full sm:w-auto px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-rounded text-sm">refresh</span>
                        다시 시도
                    </button>
                    <Link
                        href="/"
                        className="w-full sm:w-auto px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-rounded text-sm">home</span>
                        홈으로 이동
                    </Link>
                </div>
            </div>
        </div>
    );
}
