'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PreparationDashboard from '@/components/dashboard/PreparationDashboard';

export default function DashboardDetailPageClient() {
    const params = useParams();
    const router = useRouter();
    
    // Optional Catch-all ([[...tripId]]) 형식이므로 배열일 가능성을 처리합니다.
    const tripIdParam = params.tripId;
    let tripId = Array.isArray(tripIdParam) ? tripIdParam[0] : (tripIdParam as string);

    // Firebase Hosting의 Static Export 리라이트([tripId]=placeholder) 대응
    if (tripId === 'placeholder' && typeof window !== 'undefined') {
        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        // /dashboard/ID 형식인 경우 두 번째 세그먼트가 ID입니다.
        if (pathSegments[0] === 'dashboard' && pathSegments[1]) {
            tripId = pathSegments[1];
        }
    }

    // tripId가 없으면 목록으로 리다이렉트
    useEffect(() => {
        if (!tripId) {
            router.replace('/trips');
        }
    }, [tripId, router]);

    if (!tripId) return null;

    return <PreparationDashboard tripId={tripId} />;
}
