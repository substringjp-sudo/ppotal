import { TripComment } from '../types/trip';
/**
 * 여행에 코멘트 추가
 */
export declare const addTripComment: (tripId: string, comment: Omit<TripComment, "id" | "createdAt" | "updatedAt" | "isResolved">, user: {
    uid: string;
    name: string;
    photoURL?: string;
}) => Promise<string>;
/**
 * 코멘트 수정
 */
export declare const updateTripComment: (tripId: string, commentId: string, updates: Partial<Pick<TripComment, "content" | "isResolved" | "targetType" | "targetId">>) => Promise<void>;
/**
 * 코멘트 삭제
 */
export declare const deleteTripComment: (tripId: string, commentId: string) => Promise<void>;
/**
 * 코멘트 해결 처리
 */
export declare const resolveTripComment: (tripId: string, commentId: string, resolvedBy: string) => Promise<void>;
/**
 * 여행 코멘트 실시간 구독
 */
export declare const subscribeToTripComments: (tripId: string, callback: (comments: TripComment[]) => void) => import("@firebase/firestore").Unsubscribe;
/**
 * 특정 대상(날짜 또는 이벤트)에 대한 코멘트 필터링
 */
export declare const getCommentsForTarget: (comments: TripComment[], targetId: string, targetType: TripComment["targetType"]) => TripComment[];
