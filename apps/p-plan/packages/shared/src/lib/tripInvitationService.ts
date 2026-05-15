import { doc, updateDoc, arrayUnion, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from './firebase';
import { TripDocument } from '../types/trip';
import { getUserProfile } from './userService';

const TRIPS_COLLECTION = 'trips';

/**
 * 여행에 대한 고유 초대 토큰을 생성하거나 반환
 */
export const getOrCreateInviteToken = async (tripId: string): Promise<string> => {
    try {
        const tripRef = doc(db, TRIPS_COLLECTION, tripId);
        const tripSnap = await getDoc(tripRef);
        
        if (!tripSnap.exists()) throw new Error("Trip not found");
        
        const data = tripSnap.data() as TripDocument;
        if (data.inviteToken) return data.inviteToken;
        
        // 새로운 8자리 랜덤 토큰 생성
        const newToken = Math.random().toString(36).substring(2, 10).toUpperCase();
        await updateDoc(tripRef, { inviteToken: newToken });
        
        return newToken;
    } catch (error) {
        console.error("Error getting/creating invite token:", error);
        throw error;
    }
};

/**
 * 초대 토큰으로 여행 정보를 조회
 */
export const getTripByInviteToken = async (token: string): Promise<TripDocument & { id: string } | null> => {
    try {
        const tripsRef = collection(db, TRIPS_COLLECTION);
        const q = query(tripsRef, where("inviteToken", "==", token.toUpperCase()), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) return null;
        
        const docSnap = querySnapshot.docs[0];
        return { id: docSnap.id, ...docSnap.data() } as TripDocument & { id: string };
    } catch (error) {
        console.error("Error getting trip by invite token:", error);
        return null;
    }
};

/**
 * 초대 링크를 통해 여행에 멤버로 가입
 */
export const joinTripByToken = async (token: string, userId: string): Promise<string | null> => {
    try {
        const trip = await getTripByInviteToken(token);
        if (!trip) return null;
        
        // 이미 참여 중인지 확인
        if (trip.participants.some(p => p.id === userId) || trip.userId === userId) {
            return trip.id;
        }

        // 실제 사용자 프로필 정보 가져오기
        const userProfile = await getUserProfile(userId);
        const userName = userProfile?.displayName || "초대된 멤버";
        const userPhotoURL = userProfile?.photoURL || "";
        
        const tripRef = doc(db, TRIPS_COLLECTION, trip.id);
        await updateDoc(tripRef, {
            participants: arrayUnion({
                id: userId,
                name: userName,
                photoURL: userPhotoURL,
                role: 'group member',
                status: 'accepted'
            })
        });
        
        return trip.id;
    } catch (error) {
        console.error("Error joining trip by token:", error);
        return null;
    }
};
