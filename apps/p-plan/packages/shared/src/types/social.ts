import { ISODateString } from './common';

// ─── 친구 시스템 ──────────────────────────────────────────────────

export type FriendshipStatus = 'pending' | 'accepted' | 'declined' | 'blocked';

export interface Friendship {
    id: string;
    uids: string[]; // [uid1, uid2] - 조회 편의성을 위해 UID 두 개를 배열로 저장
    initiatorUid: string;
    receiverUid: string;
    status: FriendshipStatus;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

// ─── 알림 시스템 ──────────────────────────────────────────────────

export type NotificationType = 
    | 'friend_request' 
    | 'friend_accepted' 
    | 'trip_invite' 
    | 'trip_invite_accepted' 
    | 'trip_edit'
    | 'system';

export interface Notification {
    id: string;
    type: NotificationType;
    targetUid: string;       // 알림을 받을 사용자 UID
    senderUid?: string;      // 알림을 보낸 사용자 UID (시스템 알림의 경우 없을 수 있음)
    senderName?: string;     // 표시용 발신자 이름
    senderPhotoURL?: string; // 표시용 발신자 아바타
    title: string;
    message: string;
    link?: string;           // 클릭 시 이동할 경로 (예: /edit-trip/abc)
    data?: Record<string, unknown>; // 추가 페이로드 (tripId 등)
    isRead: boolean;
    createdAt: ISODateString;
}
