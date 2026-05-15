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
export declare const useUserStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<UserState>, "setState" | "persist"> & {
    setState(partial: UserState | Partial<UserState> | ((state: UserState) => UserState | Partial<UserState>), replace?: false | undefined): unknown;
    setState(state: UserState | ((state: UserState) => UserState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<UserState, {
            profile: UserProfile | null;
        }, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: UserState) => void) => () => void;
        onFinishHydration: (fn: (state: UserState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<UserState, {
            profile: UserProfile | null;
        }, unknown>>;
    };
}>;
export {};
