import { StateCreator } from 'zustand';
import { TripState } from '../types';
import { TripComment } from '../../types/trip';
import { subscribeToTripComments, addTripComment, updateTripComment, deleteTripComment } from '../../lib/commentService';

export interface CommentSlice {
    comments: TripComment[];
    setComments: (comments: TripComment[]) => void;
    addComment: (comment: Pick<TripComment, 'content' | 'targetType' | 'targetId' | 'parentId' | 'position'>) => Promise<string | void>;
    updateComment: (id: string, updates: Partial<TripComment>) => Promise<void>;
    deleteComment: (id: string) => Promise<void>;
    subscribeComments: (tripId: string) => () => void;
}

export const createCommentSlice: StateCreator<TripState, [], [], CommentSlice> = (set, get) => ({
    comments: [],

    setComments: (comments) => set({ comments }),

    addComment: async (comment) => {
        const currentTrip = get().currentTrip;
        if (!currentTrip) return;

        const { useUserStore } = await import('../userStore');
        const user = useUserStore.getState().profile;
        if (!user) return;

        return await addTripComment(
            currentTrip.id,
            {
                ...comment,
                tripId: currentTrip.id,
                userId: user.userId,
                userName: user.displayName || '익명',
                userPhotoURL: user.photoURL || undefined,
            },
            { uid: user.userId, name: user.displayName || '익명', photoURL: user.photoURL || undefined }
        );
    },

    updateComment: async (id, updates) => {
        const currentTrip = get().currentTrip;
        if (!currentTrip) return;

        await updateTripComment(currentTrip.id, id, updates);
    },

    deleteComment: async (id) => {
        const currentTrip = get().currentTrip;
        if (!currentTrip) return;

        await deleteTripComment(currentTrip.id, id);
    },

    subscribeComments: (tripId) => {
        return subscribeToTripComments(tripId, (comments) => {
            set({ comments });
        });
    }
});
