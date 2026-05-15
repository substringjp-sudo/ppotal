import { collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { Friendship, FriendshipStatus } from '../types/social';

const FRIENDSHIPS_COLLECTION = 'friendships';

/**
 * 친구 요청 보내기
 */
export const sendFriendRequest = async (initiatorUid: string, receiverUid: string) => {
    if (initiatorUid === receiverUid) throw new Error("자신에게 친구 요청을 보낼 수 없습니다.");

    try {
        // 이미 관계가 있는지 확인
        const existing = await getFriendship(initiatorUid, receiverUid);
        if (existing) {
            if (existing.status === 'accepted') throw new Error("이미 친구 관계입니다.");
            if (existing.status === 'pending') throw new Error("이미 대기 중인 요청이 있습니다.");
            // 거절된 경우 등은 재요청 가능하게 하거나 업데이트 로직 필요
            if (existing.status === 'declined') {
                await updateDoc(doc(db, FRIENDSHIPS_COLLECTION, existing.id), {
                    status: 'pending',
                    initiatorUid: initiatorUid,
                    receiverUid: receiverUid,
                    updatedAt: new Date().toISOString()
                });
                return;
            }
        }

        const newFriendship: Omit<Friendship, 'id'> = {
            uids: [initiatorUid, receiverUid].sort(),
            initiatorUid,
            receiverUid,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await addDoc(collection(db, FRIENDSHIPS_COLLECTION), newFriendship);
    } catch (error) {
        console.error("Error sending friend request:", error);
        throw error;
    }
};

/**
 * 친구 요청 수락
 */
export const acceptFriendRequest = async (friendshipId: string) => {
    try {
        const friendshipRef = doc(db, FRIENDSHIPS_COLLECTION, friendshipId);
        await updateDoc(friendshipRef, {
            status: 'accepted',
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error accepting friend request:", error);
        throw error;
    }
};

/**
 * 친구 요청 거절 또는 친구 삭제
 */
export const deleteFriendship = async (friendshipId: string) => {
    try {
        const friendshipRef = doc(db, FRIENDSHIPS_COLLECTION, friendshipId);
        await deleteDoc(friendshipRef);
    } catch (error) {
        console.error("Error deleting friendship:", error);
        throw error;
    }
};

/**
 * 특정 사용자와의 친구 관계 조회
 */
export const getFriendship = async (uid1: string, uid2: string): Promise<Friendship | null> => {
    try {
        const friendshipsRef = collection(db, FRIENDSHIPS_COLLECTION);
        const uids = [uid1, uid2].sort();
        const q = query(friendshipsRef, where("uids", "==", uids));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) return null;
        const d = querySnapshot.docs[0];
        return { id: d.id, ...d.data() } as Friendship;
    } catch (error) {
        console.error("Error getting friendship:", error);
        return null;
    }
};

/**
 * 내 친구 목록 조회 (수락된 상태)
 */
export const getFriendList = async (userId: string): Promise<Friendship[]> => {
    try {
        const friendshipsRef = collection(db, FRIENDSHIPS_COLLECTION);
        const q = query(
            friendshipsRef, 
            where("uids", "array-contains", userId),
            where("status", "==", "accepted")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Friendship));
    } catch (error) {
        console.error("Error getting friend list:", error);
        return [];
    }
};

/**
 * 받은 친구 요청 목록 조회
 */
export const getReceivedRequests = async (userId: string): Promise<Friendship[]> => {
    try {
        const friendshipsRef = collection(db, FRIENDSHIPS_COLLECTION);
        const q = query(
            friendshipsRef, 
            where("uids", "array-contains", userId),
            where("receiverUid", "==", userId),
            where("status", "==", "pending")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Friendship));
    } catch (error) {
        console.error("Error getting received requests:", error);
        return [];
    }
};
