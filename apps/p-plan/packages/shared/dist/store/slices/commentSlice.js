"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCommentSlice = void 0;
const commentService_1 = require("../../lib/commentService");
const createCommentSlice = (set, get) => ({
    comments: [],
    setComments: (comments) => set({ comments }),
    addComment: async (comment) => {
        const currentTrip = get().currentTrip;
        if (!currentTrip)
            return;
        const { useUserStore } = await Promise.resolve().then(() => __importStar(require('../userStore')));
        const user = useUserStore.getState().profile;
        if (!user)
            return;
        return await (0, commentService_1.addTripComment)(currentTrip.id, {
            ...comment,
            tripId: currentTrip.id,
            userId: user.userId,
            userName: user.displayName || '익명',
            userPhotoURL: user.photoURL || undefined,
        }, { uid: user.userId, name: user.displayName || '익명', photoURL: user.photoURL || undefined });
    },
    updateComment: async (id, updates) => {
        const currentTrip = get().currentTrip;
        if (!currentTrip)
            return;
        await (0, commentService_1.updateTripComment)(currentTrip.id, id, updates);
    },
    deleteComment: async (id) => {
        const currentTrip = get().currentTrip;
        if (!currentTrip)
            return;
        await (0, commentService_1.deleteTripComment)(currentTrip.id, id);
    },
    subscribeComments: (tripId) => {
        return (0, commentService_1.subscribeToTripComments)(tripId, (comments) => {
            set({ comments });
        });
    }
});
exports.createCommentSlice = createCommentSlice;
