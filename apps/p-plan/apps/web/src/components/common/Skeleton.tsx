/**
 * Skeleton UI 컴포넌트 세트
 * 
 * 비동기 로딩 시 콘텐츠 자리를 채워주는 플레이스홀더입니다.
 * 실제 레이아웃과 비슷한 형태로 설계하여 레이아웃 시프트를 방지합니다.
 */

/** 기본 Skeleton 요소 (단일 사각형) */
export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
    return (
        <div
            style={style}
            className={`bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse ${className}`}
        />
    );
}

/** 위젯 카드 전체를 덮는 Skeleton */
export function WidgetSkeleton({ rows = 3, showHeader = true }: { rows?: number; showHeader?: boolean }) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 h-full">
            {showHeader && (
                <div className="flex items-center justify-between mb-5">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
            )}
            <div className="space-y-3">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-3.5 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** TripHeader 전용 Skeleton */
export function TripHeaderSkeleton() {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                    <Skeleton className="h-7 w-64" />
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="flex gap-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-6 w-16 rounded-full" />
                        ))}
                    </div>
                </div>
                <Skeleton className="h-24 w-36 rounded-xl flex-shrink-0" />
            </div>
        </div>
    );
}

/** StatsSection 전용 Skeleton (통계 카드 4개) */
export function StatsSectionSkeleton() {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-5 w-24" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-3 w-12" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/** 지도 위젯 Skeleton */
export function MapWidgetSkeleton() {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 pb-0">
                <Skeleton className="h-5 w-24 mb-3" />
            </div>
            <Skeleton className="h-64 w-full rounded-none" />
        </div>
    );
}

/** 여행 목록 페이지 카드 Skeleton */
export function TripCardSkeleton() {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <Skeleton className="h-40 w-full rounded-none" />
            <div className="p-4 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-2 pt-1">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                </div>
            </div>
        </div>
    );
}

/** 리스트 아이템 Skeleton (체크리스트, 예약 등) */
export function ListItemSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                    <Skeleton className="h-5 w-5 rounded flex-shrink-0" />
                    <Skeleton className="h-4 flex-1" style={{ width: `${60 + (i % 3) * 15}%` }} />
                </div>
            ))}
        </div>
    );
}
