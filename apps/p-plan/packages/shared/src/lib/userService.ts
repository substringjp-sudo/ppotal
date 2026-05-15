import { collection, query, where, getDocs, doc, getDoc, limit, updateDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
// import { toast } from 'sonner';
import { UserProfile } from '../types/user';

const USERS_COLLECTION = 'users';

/**
 * 이메일로 사용자 검색 (일치하는 첫 번째 사용자 반환)
 */
export const searchUserByEmail = async (email: string): Promise<UserProfile | null> => {
    try {
        const usersRef = collection(db, USERS_COLLECTION);
        const q = query(usersRef, where("email", "==", email), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) return null;
        
        const doc = querySnapshot.docs[0];
        return { userId: doc.id, ...doc.data() } as UserProfile;
    } catch (error) {
        console.error("Error searching user by email:", error);
        // toast.error("사용자 검색 중 오류가 발생했습니다.");
        return null;
    }
};

/**
 * 이름/닉네임으로 사용자 검색 (최대 10명)
 */
export const searchUsersByName = async (name: string): Promise<UserProfile[]> => {
    if (!name || name.length < 2) return [];
    
    try {
        const usersRef = collection(db, USERS_COLLECTION);
        // Firestore는 부분 문자열 검색이 약하므로, prefix 검색을 활용 (name >= 'abc' && name <= 'abc\uf8ff')
        const q = query(
            usersRef, 
            where("displayName", ">=", name), 
            where("displayName", "<=", name + '\uf8ff'),
            limit(10)
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({ 
            userId: doc.id, 
            ...doc.data() 
        } as UserProfile));
    } catch (error) {
        console.error("Error searching users by name:", error);
        // toast.error("사용자 검색 중 오류가 발생했습니다.");
        return [];
    }
};

/**
 * UID로 사용자 프로필 조회
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        const docSnap = await getDoc(userRef);
        
        if (!docSnap.exists()) return null;
        return { userId: docSnap.id, ...docSnap.data() } as UserProfile;
    } catch (error) {
        console.error("Error getting user profile:", error);
        return null;
    }
};

/**
 * 사용자 프로필 정보 업데이트 ( Upsert 방식 )
 */
export const updateUserProfile = async (userId: string, data: Partial<UserProfile>): Promise<void> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        // setDoc with merge: true creates the document if it doesn't exist (Upsert)
        await setDoc(userRef, {
            ...data,
            updatedAt: new Date().toISOString()
        }, { merge: true });
    } catch (error) {
        console.error("Error updating user profile:", error);
        // toast.error("프로필 업데이트에 실패했습니다.");
        throw error;
    }
};
