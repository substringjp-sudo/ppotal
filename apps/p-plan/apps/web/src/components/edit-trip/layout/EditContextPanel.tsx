'use client';
import { useTripStore } from '@pplaner/shared';
import { useUIStore } from '@pplaner/shared';
import MapWidget from '@/components/dashboard/MapWidget';
import TripWarnings from '@/components/dashboard/TripWarnings';

/**
 * 편집기 우측 296px 맥락 패널 — 지도 · 경고 · 위시리스트.
 *
 * 편집 캔버스(가운데)가 바뀌어도 이 패널은 그대로 있는다. 위시리스트는 여기서
 * 전체를 편집하지 않는다 — 요약만 보여주고, 실제 담기/빼기는 기존 FAB이 여는
 * WishlistTimelineDrawer가 이 패널 위에 오버레이로 뜨며 처리한다(패널을 밀어내지
 * 않는다).
 */
export default function EditContextPanel() {
    const currentTrip = useTripStore((state) => state.currentTrip);
    const setIsWishlistOpen = useUIStore((state) => state.setIsWishlistOpen);
    const bucketCount = currentTrip?.bucketList?.length || 0;

    return (
        <aside className="hidden xl:flex xl:w-[296px] xl:flex-shrink-0 flex-col gap-3 h-full overflow-y-auto no-scrollbar custom-scrollbar">
            <div className="h-[220px] rounded-[20px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,.05)] shrink-0">
                <MapWidget />
            </div>

            <div className="shrink-0 rounded-[20px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,.05)]">
                <TripWarnings />
            </div>

            <button
                onClick={() => setIsWishlistOpen(true)}
                className="shrink-0 text-left rounded-[20px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-[0_1px_2px_rgba(15,23,42,.05)] hover:border-primary/40 transition-colors"
            >
                <div className="flex items-center gap-2.5 mb-1">
                    <span className="w-[3px] h-4 rounded-full bg-primary shrink-0" />
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">위시리스트</span>
                    <span className="ml-auto text-xs text-slate-400">끌어서 추가</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    {bucketCount > 0 ? `이 여행에 담아둔 곳 ${bucketCount}곳` : '가고 싶은 곳을 담아보세요'}
                </p>
            </button>
        </aside>
    );
}
