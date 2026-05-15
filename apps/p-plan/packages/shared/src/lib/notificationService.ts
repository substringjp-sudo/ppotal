import { collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, onSnapshot, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { Notification, NotificationType } from '../types/social';

const NOTIFICATIONS_COLLECTION = 'notifications';

/**
 * 알림 생성
 */
export const createNotification = async (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => {
    try {
        const newNotification = {
            ...notification,
            isRead: false,
            createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, NOTIFICATIONS_COLLECTION), newNotification);
    } catch (error) {
        console.error("Error creating notification:", error);
    }
};

/**
 * 사용자 알림 실시간 구독
 */
export const subscribeToNotifications = (userId: string, callback: (notifications: Notification[]) => void) => {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(
        notificationsRef,
        where("targetUid", "==", userId),
        orderBy("createdAt", "desc"),
        limit(50)
    );

    return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
        callback(notifications);
    });
};

/**
 * 알림 읽음 처리
 */
export const markAsRead = async (notificationId: string) => {
    try {
        const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
        await updateDoc(notificationRef, { isRead: true });
    } catch (error) {
        console.error("Error marking notification as read:", error);
    }
};

/**
 * 모든 알림 읽음 처리
 */
export const markAllAsRead = async (userId: string) => {
    try {
        const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
        const q = query(notificationsRef, where("targetUid", "==", userId), where("isRead", "==", false));
        const snapshot = await getDocs(q);
        
        // Firestore batch limits apply (500), but usually notifications aren't that many
        const promises = snapshot.docs.map(d => updateDoc(d.ref, { isRead: true }));
        await Promise.all(promises);
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
    }
};

/**
 * 알림 삭제
 */
export const deleteNotification = async (notificationId: string) => {
    try {
        await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId));
    } catch (error) {
        console.error("Error deleting notification:", error);
    }
};
