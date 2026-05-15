import { collection, doc, getDocs, query, orderBy, limit, addDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';
import { createNotification } from './notificationService';
import { TripActivity } from '../types/activity';
import { Participant } from '../types/trip';

const TRIPS_COLLECTION = 'trips';
const ACTIVITIES_SUB = 'activities';

/**
 * 여행에 친구 초대
 */
export const inviteFriendToTrip = async (
    tripId: string, 
    tripTitle: string, 
    inviterUid: string, 
    inviterName: string, 
    inviterPhotoURL: string | undefined, 
    friendUid: string
) => {
    try {
        // 알림 생성
        await createNotification({
            type: 'trip_invite',
            targetUid: friendUid,
            senderUid: inviterUid,
            senderName: inviterName,
            senderPhotoURL: inviterPhotoURL,
            title: '여행 초대',
            message: `${inviterName}님이 '${tripTitle}' 여행에 초대하셨습니다.`,
            link: `/edit-trip/${tripId}?invite=true`,
            data: { tripId }
        });

        // 활동 로그 기록
        await logTripActivity(tripId, {
            userId: inviterUid,
            userName: inviterName,
            userPhotoURL: inviterPhotoURL,
            action: 'invite',
            targetType: 'member',
            message: `${inviterName}님이 새로운 멤버를 초대했습니다.`
        });
    } catch (error) {
        console.error("Error inviting friend to trip:", error);
        throw error;
    }
};

/**
 * 초대 수락 및 멤버 추가
 */
export const acceptTripInvite = async (
    tripId: string, 
    userId: string, 
    userName: string, 
    userPhotoURL?: string
) => {
    try {
        const tripRef = doc(db, TRIPS_COLLECTION, tripId);
        const newParticipant: Participant = {
            id: userId,
            name: userName,
            avatarUrl: userPhotoURL,
            role: 'group member',
            status: 'accepted'
        };

        // members (UID array)와 participants (Object array) 동시 업데이트
        await updateDoc(tripRef, {
            members: arrayUnion(userId),
            participants: arrayUnion(newParticipant),
            updatedAt: new Date().toISOString()
        });

        // 활동 로그
        await logTripActivity(tripId, {
            userId,
            userName,
            userPhotoURL,
            action: 'join',
            targetType: 'member',
            message: `${userName}님이 여행에 참여했습니다.`
        });
    } catch (error) {
        console.error("Error accepting trip invite:", error);
        throw error;
    }
};

/**
 * 여행 활동 로그 기록
 */
export const logTripActivity = async (tripId: string, activity: Omit<TripActivity, 'id' | 'createdAt'>) => {
    try {
        const activitiesRef = collection(db, TRIPS_COLLECTION, tripId, ACTIVITIES_SUB);
        await addDoc(activitiesRef, {
            ...activity,
            createdAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error logging trip activity:", error);
    }
};

/**
 * 여행 활동 로그 조회
 */
export const getTripActivities = async (tripId: string, limitCount = 20): Promise<TripActivity[]> => {
    try {
        const activitiesRef = collection(db, TRIPS_COLLECTION, tripId, ACTIVITIES_SUB);
        const q = query(activitiesRef, orderBy("createdAt", "desc"), limit(limitCount));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TripActivity));
    } catch (error) {
        console.error("Error getting trip activities:", error);
        return [];
    }
};

/**
 * 사용자가 참여 중인 모든 여행의 최근 활동 로그 통합 조회
 */
export const getUserRecentActivities = async (trips: { id: string }[], limitCount = 5): Promise<TripActivity[]> => {
    try {
        if (!trips || trips.length === 0) return [];

        const activitiesPromises = trips.map(t => getTripActivities(t.id, limitCount));
        const results = await Promise.all(activitiesPromises);

        // 모든 여행의 로그를 하나로 합침
        const allActivities = results.flat();

        // 시간순 정렬 (최신순)
        return allActivities
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, limitCount);
    } catch (error) {
        console.error("Error getting consolidated user activities:", error);
        return [];
    }
};
