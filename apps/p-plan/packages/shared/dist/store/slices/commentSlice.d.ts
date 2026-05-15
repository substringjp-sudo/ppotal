import { StateCreator } from 'zustand';
import { TripState } from '../types';
import { TripComment } from '../../types/trip';
export interface CommentSlice {
    comments: TripComment[];
    setComments: (comments: TripComment[]) => void;
    addComment: (comment: Pick<TripComment, 'content' | 'targetType' | 'targetId' | 'parentId' | 'position'>) => Promise<string | void>;
    updateComment: (id: string, updates: Partial<TripComment>) => Promise<void>;
    deleteComment: (id: string) => Promise<void>;
    subscribeComments: (tripId: string) => () => void;
}
export declare const createCommentSlice: StateCreator<TripState, [], [], CommentSlice>;
