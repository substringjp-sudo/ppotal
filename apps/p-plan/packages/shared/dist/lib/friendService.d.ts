import { Friendship } from '../types/social';
/**
 * 친구 요청 보내기
 */
export declare const sendFriendRequest: (initiatorUid: string, receiverUid: string) => Promise<void>;
/**
 * 친구 요청 수락
 */
export declare const acceptFriendRequest: (friendshipId: string) => Promise<void>;
/**
 * 친구 요청 거절 또는 친구 삭제
 */
export declare const deleteFriendship: (friendshipId: string) => Promise<void>;
/**
 * 특정 사용자와의 친구 관계 조회
 */
export declare const getFriendship: (uid1: string, uid2: string) => Promise<Friendship | null>;
/**
 * 내 친구 목록 조회 (수락된 상태)
 */
export declare const getFriendList: (userId: string) => Promise<Friendship[]>;
/**
 * 받은 친구 요청 목록 조회
 */
export declare const getReceivedRequests: (userId: string) => Promise<Friendship[]>;
