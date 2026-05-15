'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react';

// DevTools는 개발 환경에서만 로드
const ReactQueryDevtools =
    process.env.NODE_ENV === 'development'
        ? React.lazy(() =>
            import('@tanstack/react-query-devtools').then(mod => ({
                default: mod.ReactQueryDevtools,
            }))
        )
        : () => null;

export default function ReactQueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 1000 * 60 * 5, // 5 minutes
                refetchOnWindowFocus: false,
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {process.env.NODE_ENV === 'development' && (
                <React.Suspense fallback={null}>
                    <ReactQueryDevtools initialIsOpen={false} />
                </React.Suspense>
            )}
        </QueryClientProvider>
    );
}
