import { ISODateTimeString } from './common';
export interface TripActivity {
    id: string;
    userId: string;
    userName: string;
    userPhotoURL?: string;
    action: 'create' | 'update' | 'delete' | 'invite' | 'join';
    targetType: 'trip' | 'timeline' | 'budget' | 'accommodation' | 'transport' | 'member';
    targetId?: string;
    message: string;
    createdAt: ISODateTimeString;
}
