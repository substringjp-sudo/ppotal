"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommentsForTarget = exports.subscribeToTripComments = exports.resolveTripComment = exports.deleteTripComment = exports.updateTripComment = exports.addTripComment = void 0;
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("./firebase");
const utils_1 = require("./utils");
const TRIPS_COLLECTION = 'trips';
const COMMENTS_SUB = 'comments';
/**
 * 여행에 코멘트 추가
 */
const addTripComment = async (tripId, comment, user) => {
    try {
        const commentsRef = (0, firestore_1.collection)(firebase_1.db, TRIPS_COLLECTION, tripId, COMMENTS_SUB);
        const now = new Date().toISOString();
        const newComment = {
            ...comment,
            createdAt: now,
            updatedAt: now,
            isResolved: false
        };
        const docRef = await (0, firestore_1.addDoc)(commentsRef, (0, utils_1.removeUndefined)(newComment));
        return docRef.id;
    }
    catch (error) {
        console.error("Error adding trip comment:", error);
        throw error;
    }
};
exports.addTripComment = addTripComment;
/**
 * 코멘트 수정
 */
const updateTripComment = async (tripId, commentId, updates) => {
    try {
        const commentRef = (0, firestore_1.doc)(firebase_1.db, TRIPS_COLLECTION, tripId, COMMENTS_SUB, commentId);
        await (0, firestore_1.updateDoc)(commentRef, {
            ...(0, utils_1.removeUndefined)(updates),
            updatedAt: new Date().toISOString()
        });
    }
    catch (error) {
        console.error("Error updating trip comment:", error);
        throw error;
    }
};
exports.updateTripComment = updateTripComment;
/**
 * 코멘트 삭제
 */
const deleteTripComment = async (tripId, commentId) => {
    try {
        const commentRef = (0, firestore_1.doc)(firebase_1.db, TRIPS_COLLECTION, tripId, COMMENTS_SUB, commentId);
        await (0, firestore_1.deleteDoc)(commentRef);
    }
    catch (error) {
        console.error("Error deleting trip comment:", error);
        throw error;
    }
};
exports.deleteTripComment = deleteTripComment;
/**
 * 코멘트 해결 처리
 */
const resolveTripComment = async (tripId, commentId, resolvedBy) => {
    try {
        const commentRef = (0, firestore_1.doc)(firebase_1.db, TRIPS_COLLECTION, tripId, COMMENTS_SUB, commentId);
        await (0, firestore_1.updateDoc)(commentRef, {
            isResolved: true,
            resolvedBy, // Field doesn't exist in interface but can be added or assumed
            updatedAt: new Date().toISOString()
        });
    }
    catch (error) {
        console.error("Error resolving trip comment:", error);
        throw error;
    }
};
exports.resolveTripComment = resolveTripComment;
/**
 * 여행 코멘트 실시간 구독
 */
const subscribeToTripComments = (tripId, callback) => {
    const commentsRef = (0, firestore_1.collection)(firebase_1.db, TRIPS_COLLECTION, tripId, COMMENTS_SUB);
    const q = (0, firestore_1.query)(commentsRef, (0, firestore_1.orderBy)("createdAt", "asc"));
    return (0, firestore_1.onSnapshot)(q, (snapshot) => {
        const comments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(comments);
    }, (error) => {
        console.error("Error subscribing to trip comments:", error);
    });
};
exports.subscribeToTripComments = subscribeToTripComments;
/**
 * 특정 대상(날짜 또는 이벤트)에 대한 코멘트 필터링
 */
const getCommentsForTarget = (comments, targetId, targetType) => {
    return comments.filter(c => c.targetId === targetId && c.targetType === targetType);
};
exports.getCommentsForTarget = getCommentsForTarget;
