"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useUserStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
exports.useUserStore = (0, zustand_1.create)()((0, middleware_1.persist)((set) => ({
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
}), {
    name: 'pplan-user-storage',
    partialize: (state) => ({ profile: state.profile }), // 프로필만 로컬 스토리지에 유지
}));
