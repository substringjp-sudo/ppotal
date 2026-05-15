import { useEffect } from 'react';
import { useUserStore } from '@pplaner/shared';
import { subscribeToNotifications } from '@pplaner/shared';
import { getReceivedRequests } from '@pplaner/shared';

export const useNotifications = (userId: string | undefined) => {
    const setNotifications = useUserStore((state) => state.setNotifications);
    const setPendingFriendRequests = useUserStore((state) => state.setPendingFriendRequests);

    useEffect(() => {
        if (!userId) return;

        // 알림 실시간 구독
        const unsubscribe = subscribeToNotifications(userId, (notifications) => {
            setNotifications(notifications);
        });

        // 친구 요청 초기 로드 (친구 요청은 실시간 구독 기능이 아직 없으므로 초기 로드만 수행)
        // 필요 시 friendService에도 subscribeToFriendRequests 추가 가능
        const fetchFriendRequests = async () => {
            try {
                const requests = await getReceivedRequests(userId);
                setPendingFriendRequests(requests);
            } catch (error) {
                console.error("Error fetching friend requests:", error);
            }
        };

        fetchFriendRequests();

        return () => {
            unsubscribe();
        };
    }, [userId, setNotifications, setPendingFriendRequests]);
};
