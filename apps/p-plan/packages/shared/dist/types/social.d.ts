import { ISODateString } from './common';
export type FriendshipStatus = 'pending' | 'accepted' | 'declined' | 'blocked';
export interface Friendship {
    id: string;
    uids: string[];
    initiatorUid: string;
    receiverUid: string;
    status: FriendshipStatus;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}
export type NotificationType = 'friend_request' | 'friend_accepted' | 'trip_invite' | 'trip_invite_accepted' | 'trip_edit' | 'system';
export interface Notification {
    id: string;
    type: NotificationType;
    targetUid: string;
    senderUid?: string;
    senderName?: string;
    senderPhotoURL?: string;
    title: string;
    message: string;
    link?: string;
    data?: Record<string, unknown>;
    isRead: boolean;
    createdAt: ISODateString;
}
