import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { TripComment } from '../types/trip';
import { removeUndefined } from './utils';

const TRIPS_COLLECTION = 'trips';
const COMMENTS_SUB = 'comments';

/**
 * 여행에 코멘트 추가
 */
export const addTripComment = async (
    tripId: string,
    comment: Omit<TripComment, 'id' | 'createdAt' | 'updatedAt' | 'isResolved'>,
    user: { uid: string, name: string, photoURL?: string }
) => {
    try {
        const commentsRef = collection(db, TRIPS_COLLECTION, tripId, COMMENTS_SUB);
        const now = new Date().toISOString();
        
        const newComment: Omit<TripComment, 'id'> = {
            ...comment,
            createdAt: now,
            updatedAt: now,
            isResolved: false
        };

        const docRef = await addDoc(commentsRef, removeUndefined(newComment));

        return docRef.id;
    } catch (error) {
        console.error("Error adding trip comment:", error);
        throw error;
    }
};

/**
 * 코멘트 수정
 */
export const updateTripComment = async (
    tripId: string,
    commentId: string,
    updates: Partial<Pick<TripComment, 'content' | 'isResolved' | 'targetType' | 'targetId'>>
) => {
    try {
        const commentRef = doc(db, TRIPS_COLLECTION, tripId, COMMENTS_SUB, commentId);
        await updateDoc(commentRef, {
            ...removeUndefined(updates),
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error updating trip comment:", error);
        throw error;
    }
};

/**
 * 코멘트 삭제
 */
export const deleteTripComment = async (tripId: string, commentId: string) => {
    try {
        const commentRef = doc(db, TRIPS_COLLECTION, tripId, COMMENTS_SUB, commentId);
        await deleteDoc(commentRef);
    } catch (error) {
        console.error("Error deleting trip comment:", error);
        throw error;
    }
};

/**
 * 코멘트 해결 처리
 */
export const resolveTripComment = async (tripId: string, commentId: string, resolvedBy: string) => {
    try {
        const commentRef = doc(db, TRIPS_COLLECTION, tripId, COMMENTS_SUB, commentId);
        await updateDoc(commentRef, {
            isResolved: true,
            resolvedBy, // Field doesn't exist in interface but can be added or assumed
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error resolving trip comment:", error);
        throw error;
    }
};

/**
 * 여행 코멘트 실시간 구독
 */
export const subscribeToTripComments = (
    tripId: string,
    callback: (comments: TripComment[]) => void
) => {
    const commentsRef = collection(db, TRIPS_COLLECTION, tripId, COMMENTS_SUB);
    const q = query(commentsRef, orderBy("createdAt", "asc"));

    return onSnapshot(q, (snapshot) => {
        const comments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as TripComment));
        callback(comments);
    }, (error) => {
        console.error("Error subscribing to trip comments:", error);
    });
};

/**
 * 특정 대상(날짜 또는 이벤트)에 대한 코멘트 필터링
 */
export const getCommentsForTarget = (comments: TripComment[], targetId: string, targetType: TripComment['targetType']) => {
    return comments.filter(c => c.targetId === targetId && c.targetType === targetType);
};
