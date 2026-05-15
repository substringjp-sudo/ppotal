import { TripActivity } from '../types/activity';
/**
 * 여행에 친구 초대
 */
export declare const inviteFriendToTrip: (tripId: string, tripTitle: string, inviterUid: string, inviterName: string, inviterPhotoURL: string | undefined, friendUid: string) => Promise<void>;
/**
 * 초대 수락 및 멤버 추가
 */
export declare const acceptTripInvite: (tripId: string, userId: string, userName: string, userPhotoURL?: string) => Promise<void>;
/**
 * 여행 활동 로그 기록
 */
export declare const logTripActivity: (tripId: string, activity: Omit<TripActivity, "id" | "createdAt">) => Promise<void>;
/**
 * 여행 활동 로그 조회
 */
export declare const getTripActivities: (tripId: string, limitCount?: number) => Promise<TripActivity[]>;
/**
 * 사용자가 참여 중인 모든 여행의 최근 활동 로그 통합 조회
 */
export declare const getUserRecentActivities: (trips: {
    id: string;
}[], limitCount?: number) => Promise<TripActivity[]>;
