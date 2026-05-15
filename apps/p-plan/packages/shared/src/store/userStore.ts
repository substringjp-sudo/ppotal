import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile } from '../types/user';

import { Notification, Friendship } from '../types/social';

interface UserState {
    profile: UserProfile | null;
    notifications: Notification[];
    pendingFriendRequests: Friendship[];
    unreadNotificationCount: number;
    
    setProfile: (profile: UserProfile | null) => void;
    updateProfile: (updates: Partial<UserProfile>) => void;
    
    setNotifications: (notifications: Notification[]) => void;
    setPendingFriendRequests: (requests: Friendship[]) => void;
}

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            profile: null,
            notifications: [],
            pendingFriendRequests: [],
            unreadNotificationCount: 0,
            
            setProfile: (profile) => set({ profile }),
            updateProfile: (updates) => set((state) => ({
                profile: state.profile ? { ...state.profile, ...updates } : null
            })),
            
            setNotifications: (notifications) => set({ 
                notifications,
                unreadNotificationCount: notifications.filter(n => !n.isRead).length
            }),
            setPendingFriendRequests: (requests) => set({ pendingFriendRequests: requests }),
        }),
        {
            name: 'pplan-user-storage',
            partialize: (state) => ({ profile: state.profile }), // 프로필만 로컬 스토리지에 유지
        }
    )
);
