import { Notification } from '../types/social';
/**
 * 알림 생성
 */
export declare const createNotification: (notification: Omit<Notification, "id" | "createdAt" | "isRead">) => Promise<void>;
/**
 * 사용자 알림 실시간 구독
 */
export declare const subscribeToNotifications: (userId: string, callback: (notifications: Notification[]) => void) => import("@firebase/firestore").Unsubscribe;
/**
 * 알림 읽음 처리
 */
export declare const markAsRead: (notificationId: string) => Promise<void>;
/**
 * 모든 알림 읽음 처리
 */
export declare const markAllAsRead: (userId: string) => Promise<void>;
/**
 * 알림 삭제
 */
export declare const deleteNotification: (notificationId: string) => Promise<void>;
