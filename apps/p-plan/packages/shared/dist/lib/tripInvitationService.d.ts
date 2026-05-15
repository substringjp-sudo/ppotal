import { TripDocument } from '../types/trip';
/**
 * 여행에 대한 고유 초대 토큰을 생성하거나 반환
 */
export declare const getOrCreateInviteToken: (tripId: string) => Promise<string>;
/**
 * 초대 토큰으로 여행 정보를 조회
 */
export declare const getTripByInviteToken: (token: string) => Promise<(TripDocument & {
    id: string;
}) | null>;
/**
 * 초대 링크를 통해 여행에 멤버로 가입
 */
export declare const joinTripByToken: (token: string, userId: string) => Promise<string | null>;
