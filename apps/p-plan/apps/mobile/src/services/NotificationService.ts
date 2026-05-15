import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Trip, TripEvent } from '@pplaner/shared';
import { format, parseISO, addMinutes } from 'date-fns';

// 알림 기본 설정
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

/**
 * 알림 권한 요청
 */
export const requestNotificationPermissions = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
        return false;
    }

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('pplaner-trips', {
            name: 'PPLANER 여행 알림',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#ec5b13',
        });
    }

    return true;
};

/**
 * 여행 일정 기반 로컬 알림 전체 스케줄링
 */
export const scheduleTripNotifications = async (trip: Trip) => {
    // 기존 스케줄링된 알림 모두 삭제
    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = new Date();
    
    // 주요 일정 추출 및 데이터 기반 알림 대기열 생성
    for (const plan of trip.dailyTimeline) {
        if (!plan.date || !plan.events) continue;
        
        const planDate = plan.date; // YYYY-MM-DD
        
        for (const event of plan.events) {
            if (!event.startTime) continue;
            
            // ISO 형식으로 날짜시간 합치기
            const eventDateTime = parseISO(`${planDate}T${event.startTime}:00`);
            
            // 30분 전 알림 대상 (이미 지난 시간 제외)
            const alertTime = addMinutes(eventDateTime, -30);
            
            if (alertTime > now) {
                // 항공권/숙소 등 중요 일정에 따른 맞춤 메시지
                let body = `${event.title} 일정이 30분 뒤 시작됩니다.`;
                if (event.type === 'flight') body = `항공기 탑승 ${event.title} 30분 전입니다!`;
                if (event.type === 'hotel') body = `숙소 체크인 ${event.title} 30분 전입니다!`;

                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: '🕒 PPLANER 리마인드',
                        body,
                        data: { tripId: trip.id, eventId: event.id },
                        categoryIdentifier: 'trip-alert',
                    },
                    trigger: {
                        date: alertTime,
                        channelId: 'pplaner-trips',
                    },
                });
            }
        }
    }
    
    console.log(`PPLANER: Scheduled notifications for trip: ${trip.title}`);
};

/**
 * 단일 이벤트 즉시 알림 테스트용
 */
export const scheduleImmediateTest = async () => {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: "PPLANER 테스트 알림",
            body: "오프라인 시스템이 준비되었습니다!",
        },
        trigger: { seconds: 2 },
    });
};
