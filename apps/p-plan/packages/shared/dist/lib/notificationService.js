"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.subscribeToNotifications = exports.createNotification = void 0;
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("./firebase");
const NOTIFICATIONS_COLLECTION = 'notifications';
/**
 * 알림 생성
 */
const createNotification = async (notification) => {
    try {
        const newNotification = {
            ...notification,
            isRead: false,
            createdAt: new Date().toISOString()
        };
        await (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, NOTIFICATIONS_COLLECTION), newNotification);
    }
    catch (error) {
        console.error("Error creating notification:", error);
    }
};
exports.createNotification = createNotification;
/**
 * 사용자 알림 실시간 구독
 */
const subscribeToNotifications = (userId, callback) => {
    const notificationsRef = (0, firestore_1.collection)(firebase_1.db, NOTIFICATIONS_COLLECTION);
    const q = (0, firestore_1.query)(notificationsRef, (0, firestore_1.where)("targetUid", "==", userId), (0, firestore_1.orderBy)("createdAt", "desc"), (0, firestore_1.limit)(50));
    return (0, firestore_1.onSnapshot)(q, (snapshot) => {
        const notifications = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(notifications);
    });
};
exports.subscribeToNotifications = subscribeToNotifications;
/**
 * 알림 읽음 처리
 */
const markAsRead = async (notificationId) => {
    try {
        const notificationRef = (0, firestore_1.doc)(firebase_1.db, NOTIFICATIONS_COLLECTION, notificationId);
        await (0, firestore_1.updateDoc)(notificationRef, { isRead: true });
    }
    catch (error) {
        console.error("Error marking notification as read:", error);
    }
};
exports.markAsRead = markAsRead;
/**
 * 모든 알림 읽음 처리
 */
const markAllAsRead = async (userId) => {
    try {
        const notificationsRef = (0, firestore_1.collection)(firebase_1.db, NOTIFICATIONS_COLLECTION);
        const q = (0, firestore_1.query)(notificationsRef, (0, firestore_1.where)("targetUid", "==", userId), (0, firestore_1.where)("isRead", "==", false));
        const snapshot = await (0, firestore_1.getDocs)(q);
        // Firestore batch limits apply (500), but usually notifications aren't that many
        const promises = snapshot.docs.map(d => (0, firestore_1.updateDoc)(d.ref, { isRead: true }));
        await Promise.all(promises);
    }
    catch (error) {
        console.error("Error marking all notifications as read:", error);
    }
};
exports.markAllAsRead = markAllAsRead;
/**
 * 알림 삭제
 */
const deleteNotification = async (notificationId) => {
    try {
        await (0, firestore_1.deleteDoc)((0, firestore_1.doc)(firebase_1.db, NOTIFICATIONS_COLLECTION, notificationId));
    }
    catch (error) {
        console.error("Error deleting notification:", error);
    }
};
exports.deleteNotification = deleteNotification;
