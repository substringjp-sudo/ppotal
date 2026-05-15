'use client';

import { useEffect } from 'react';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@pplaner/shared';
import { useAuth } from '@/hooks/useAuth';
import { useUserStore } from '@pplaner/shared';
import { UserProfile } from '@pplaner/shared';

/**
 * UserSyncProvider
 * Firestore의 사용자 프로필 데이터를 Zustand 스토어(useUserStore)와 실시간으로 동기화합니다.
 */
export default function UserSyncProvider({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const { setProfile } = useUserStore();

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            // 로그아웃 시 스토어 초기화
            setProfile(null);
            return;
        }

        // Firestore 문서 참조
        const userDocRef = doc(db, 'users', user.uid);

        // 실시간 리스너 설정
        const unsubscribe = onSnapshot(userDocRef, async (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data() as UserProfile;
                console.log('User profile synced from Firestore:', data.userId);
                setProfile(data);
            } else {
                // 문서가 존재하지 않으면 새로운 프로필 초기화
                console.log('User profile not found in Firestore. Creating initial profile...');
                const initialProfile: UserProfile = {
                    userId: user.uid,
                    displayName: user.displayName || '사용자',
                    email: user.email || '',
                    photoURL: user.photoURL || '',
                    updatedAt: new Date().toISOString()
                };
                
                try {
                    await setDoc(userDocRef, initialProfile);
                    // setProfile은 다음 스냅샷에서 호출될 것임
                } catch (error) {
                    console.error('Failed to create initial user profile:', error);
                }
            }
        }, (error) => {
            console.error('Error listening to user profile:', error);
        });

        return () => unsubscribe();
    }, [user, authLoading, setProfile]);

    return <>{children}</>;
}
