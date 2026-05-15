"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserProfile = exports.getUserProfile = exports.searchUsersByName = exports.searchUserByEmail = void 0;
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("./firebase");
const USERS_COLLECTION = 'users';
/**
 * 이메일로 사용자 검색 (일치하는 첫 번째 사용자 반환)
 */
const searchUserByEmail = async (email) => {
    try {
        const usersRef = (0, firestore_1.collection)(firebase_1.db, USERS_COLLECTION);
        const q = (0, firestore_1.query)(usersRef, (0, firestore_1.where)("email", "==", email), (0, firestore_1.limit)(1));
        const querySnapshot = await (0, firestore_1.getDocs)(q);
        if (querySnapshot.empty)
            return null;
        const doc = querySnapshot.docs[0];
        return { userId: doc.id, ...doc.data() };
    }
    catch (error) {
        console.error("Error searching user by email:", error);
        // toast.error("사용자 검색 중 오류가 발생했습니다.");
        return null;
    }
};
exports.searchUserByEmail = searchUserByEmail;
/**
 * 이름/닉네임으로 사용자 검색 (최대 10명)
 */
const searchUsersByName = async (name) => {
    if (!name || name.length < 2)
        return [];
    try {
        const usersRef = (0, firestore_1.collection)(firebase_1.db, USERS_COLLECTION);
        // Firestore는 부분 문자열 검색이 약하므로, prefix 검색을 활용 (name >= 'abc' && name <= 'abc\uf8ff')
        const q = (0, firestore_1.query)(usersRef, (0, firestore_1.where)("displayName", ">=", name), (0, firestore_1.where)("displayName", "<=", name + '\uf8ff'), (0, firestore_1.limit)(10));
        const querySnapshot = await (0, firestore_1.getDocs)(q);
        return querySnapshot.docs.map(doc => ({
            userId: doc.id,
            ...doc.data()
        }));
    }
    catch (error) {
        console.error("Error searching users by name:", error);
        // toast.error("사용자 검색 중 오류가 발생했습니다.");
        return [];
    }
};
exports.searchUsersByName = searchUsersByName;
/**
 * UID로 사용자 프로필 조회
 */
const getUserProfile = async (userId) => {
    try {
        const userRef = (0, firestore_1.doc)(firebase_1.db, USERS_COLLECTION, userId);
        const docSnap = await (0, firestore_1.getDoc)(userRef);
        if (!docSnap.exists())
            return null;
        return { userId: docSnap.id, ...docSnap.data() };
    }
    catch (error) {
        console.error("Error getting user profile:", error);
        return null;
    }
};
exports.getUserProfile = getUserProfile;
/**
 * 사용자 프로필 정보 업데이트 ( Upsert 방식 )
 */
const updateUserProfile = async (userId, data) => {
    try {
        const userRef = (0, firestore_1.doc)(firebase_1.db, USERS_COLLECTION, userId);
        // setDoc with merge: true creates the document if it doesn't exist (Upsert)
        await (0, firestore_1.setDoc)(userRef, {
            ...data,
            updatedAt: new Date().toISOString()
        }, { merge: true });
    }
    catch (error) {
        console.error("Error updating user profile:", error);
        // toast.error("프로필 업데이트에 실패했습니다.");
        throw error;
    }
};
exports.updateUserProfile = updateUserProfile;
