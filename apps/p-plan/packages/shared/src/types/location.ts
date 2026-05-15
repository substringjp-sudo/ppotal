import { GeoPoint, ISODateTimeString } from './common';

/**
 * 전역 위치 기록 포인트 (24/7 추적 데이터)
 */
export interface UserLocationPoint extends GeoPoint {
    timestamp: ISODateTimeString;
    accuracy?: number;
    speed?: number;
    altitude?: number;
    activityType?: 'still' | 'walking' | 'running' | 'cycling' | 'driving' | 'unknown';
}

/**
 * 특정 사용자의 위치 기록 모음
 */
export interface UserLocationHistory {
    userId: string;
    points: UserLocationPoint[];
    lastUpdated: ISODateTimeString;
}

/**
 * 실시간 기록 세션 메타데이터
 * 여행 중 "기록 시작"을 누르면 생성되는 상태
 */
export interface RecordingSession {
    id: string;
    tripId: string;
    startTime: ISODateTimeString;
    endTime?: ISODateTimeString;
    isActive: boolean;
    recordingMode: 'standard' | 'simple';
    
    // 세션 중 발생한 수동 이벤트들 (메모, 사진 등)
    // 실제 데이터는 trip.dailyTimeline에 저장되거나 별도 링크됨
    manualEventIds: string[];
}
