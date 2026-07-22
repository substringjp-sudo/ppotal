'use client';

import { GoogleMapsScript } from '@ppotal/ui';
import { useAuth } from '@/hooks/useAuth';

/**
 * Google Maps JS(Places 포함)는 과금 대상이라, 로그인한 사용자에게만 로드한다.
 * 비로그인 방문자(랜딩/‘/check’ 등)에서는 스크립트를 아예 내려받지 않아 비용을 막는다.
 * 지도/장소검색은 모두 로그인 이후 화면에서만 쓰이므로 기능 손실은 없다.
 */
export default function AuthedGoogleMaps() {
    const { user } = useAuth();
    if (!user) return null;
    return <GoogleMapsScript />;
}
