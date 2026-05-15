'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTripStore } from '@pplaner/shared';
import { useUserStore } from '@pplaner/shared';
import { TripComment } from '@pplaner/shared';
import { format } from 'date-fns';
import { cn } from '@pplaner/shared';

// ─── 댓글 아이템 컴포넌트 ────────────────────────────────────────

interface CommentItemProps {
    comment: TripComment;
    user: any;
    onUpdate: (id: string, updates: Partial<TripComment>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onResolve: (comment: TripComment) => Promise<void>;
    onReply: (content: string) => Promise<void>;
    replies: TripComment[];
    depth?: number;
}

function CommentItem({ comment, user, onUpdate, onDelete, onResolve, onReply, replies, depth = 0 }: CommentItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(comment.content);
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const editRef = useRef<HTMLTextAreaElement>(null);
    const replyRef = useRef<HTMLInputElement>(null);
    const isOwn = comment.userId === user?.userId;

    const handleUpdate = async () => {
        if (!editedContent.trim() || editedContent === comment.content) { setIsEditing(false); return; }
        await onUpdate(comment.id, { content: editedContent });
        setIsEditing(false);
    };

    const handleReply = async () => {
        if (!replyContent.trim()) return;
        await onReply(replyContent);
        setReplyContent('');
        setIsReplying(false);
    };

    useEffect(() => {
        if (isEditing) editRef.current?.focus();
        if (isReplying) replyRef.current?.focus();
    }, [isEditing, isReplying]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("group/comment", depth > 0 && "ml-10 mt-2")}
        >
            <div className="flex gap-3">
                {/* 아바타 */}
                <div className="relative shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-slate-200/50 dark:border-slate-700/50 overflow-hidden shadow-sm">
                        {comment.userPhotoURL ? (
                            <img src={comment.userPhotoURL} alt={comment.userName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[11px] font-black text-slate-400">
                                {comment.userName.charAt(0)}
                            </div>
                        )}
                    </div>
                    {isOwn && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-white dark:border-slate-900" />
                    )}
                </div>

                {/* 본문 */}
                <div className="flex-1 min-w-0 space-y-1">
                    {/* 이름 + 시간 */}
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "text-[11px] font-black",
                            isOwn ? "text-primary" : "text-slate-800 dark:text-white"
                        )}>
                            {comment.userName}
                        </span>
                        {comment.isResolved && (
                            <span className="px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">
                                Resolved
                            </span>
                        )}
                        <span className="text-[9px] font-bold text-slate-400 ml-auto tabular-nums">
                            {format(new Date(comment.createdAt), 'M/d HH:mm')}
                        </span>
                    </div>

                    {/* 내용 */}
                    {isEditing ? (
                        <div className="space-y-2">
                            <textarea
                                ref={editRef}
                                value={editedContent}
                                onChange={e => setEditedContent(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleUpdate();
                                    if (e.key === 'Escape') setIsEditing(false);
                                }}
                                className="w-full bg-white dark:bg-slate-800/80 border border-primary/30 rounded-xl px-3 py-2.5 text-xs text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-primary/10 min-h-[72px] resize-none"
                            />
                            <div className="flex justify-end gap-1.5">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-3 py-1.5 text-[9px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleUpdate}
                                    className="px-3 py-1.5 bg-primary text-white text-[9px] font-black rounded-lg uppercase tracking-widest shadow-sm shadow-primary/20 hover:opacity-90 transition-opacity"
                                >
                                    저장
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className={cn(
                            "px-3.5 py-2.5 rounded-[14px] rounded-tl-none text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap break-words border transition-all",
                            comment.isResolved
                                ? "bg-slate-50/60 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800/40 opacity-40"
                                : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/50 group-hover/comment:border-slate-200 dark:group-hover/comment:border-slate-700 shadow-sm"
                        )}>
                            {comment.content}
                        </div>
                    )}

                    {/* 액션 버튼 (편집 모드 아닐 때만) */}
                    {!isEditing && (
                        <div className="flex items-center gap-3 px-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                            {depth === 0 && (
                                <button
                                    onClick={() => setIsReplying(!isReplying)}
                                    className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors flex items-center gap-1"
                                >
                                    <span className="material-symbols-rounded text-[10px]">reply</span>
                                    답글
                                </button>
                            )}
                            <button
                                onClick={() => onResolve(comment)}
                                className={cn(
                                    "text-[9px] font-black uppercase tracking-widest transition-colors flex items-center gap-1",
                                    comment.isResolved ? "text-amber-500 hover:text-amber-600" : "text-emerald-500 hover:text-emerald-600"
                                )}
                            >
                                <span className="material-symbols-rounded text-[10px]">{comment.isResolved ? 'unarchive' : 'check_circle'}</span>
                                {comment.isResolved ? '재열기' : '해결'}
                            </button>
                            {isOwn && (
                                <>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1"
                                    >
                                        <span className="material-symbols-rounded text-[10px]">edit</span>
                                        편집
                                    </button>
                                    <button
                                        onClick={() => onDelete(comment.id)}
                                        className="text-[9px] font-black uppercase tracking-widest text-rose-400/60 hover:text-rose-500 transition-colors flex items-center gap-1"
                                    >
                                        <span className="material-symbols-rounded text-[10px]">delete</span>
                                        삭제
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* 답글 입력 */}
                    {isReplying && (
                        <div className="flex gap-2 pt-1">
                            <input
                                ref={replyRef}
                                value={replyContent}
                                onChange={e => setReplyContent(e.target.value)}
                                placeholder="답글을 남겨보세요..."
                                className="flex-1 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-[11px] outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/20"
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleReply();
                                    if (e.key === 'Escape') setIsReplying(false);
                                }}
                            />
                            <button
                                onClick={handleReply}
                                disabled={!replyContent.trim()}
                                className={cn(
                                    "w-8 h-8 rounded-xl flex items-center justify-center transition-all shadow-sm text-[10px] shrink-0",
                                    replyContent.trim()
                                        ? "bg-primary text-white hover:opacity-90"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-300"
                                )}
                            >
                                <span className="material-symbols-rounded text-sm">send</span>
                            </button>
                        </div>
                    )}

                    {/* 답글 목록 */}
                    {replies.length > 0 && (
                        <div className="space-y-2 mt-1">
                            {replies.map(reply => (
                                <CommentItem
                                    key={reply.id}
                                    comment={reply}
                                    user={user}
                                    onUpdate={onUpdate}
                                    onDelete={onDelete}
                                    onResolve={onResolve}
                                    onReply={onReply}
                                    replies={[]}
                                    depth={1}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// ─── 메인 패널 ───────────────────────────────────────────────────

interface CommentOverlayProps {
    targetId: string;
    targetLabel?: string;
    onClose: () => void;
}

export default function CommentOverlay({ targetId, targetLabel, onClose }: CommentOverlayProps) {
    const allComments = useTripStore((state) => state.comments);
    const { addComment, updateComment, deleteComment } = useTripStore();
    const user = useUserStore((state) => state.profile);

    const [newComment, setNewComment] = useState('');
    const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');
    const inputRef = useRef<HTMLInputElement>(null);

    const rootComments = allComments.filter(c => c.targetId === targetId && !c.parentId);
    const filteredComments = rootComments.filter(c => {
        if (filter === 'pending') return !c.isResolved;
        if (filter === 'resolved') return c.isResolved;
        return true;
    });

    const pendingCount = rootComments.filter(c => !c.isResolved).length;
    const resolvedCount = rootComments.filter(c => c.isResolved).length;

    const handleAddComment = useCallback(async () => {
        if (!newComment.trim()) return;
        await addComment({
            content: newComment,
            targetType: 'event',
            targetId,
        });
        setNewComment('');
    }, [newComment, addComment, targetId]);

    const handleToggleResolve = useCallback(async (comment: TripComment) => {
        await updateComment(comment.id, { isResolved: !comment.isResolved });
    }, [updateComment]);

    // 패널 열릴 때 입력창 포커스
    useEffect(() => {
        const timer = setTimeout(() => inputRef.current?.focus(), 300);
        return () => clearTimeout(timer);
    }, []);

    // Esc 키로 닫기
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-end pointer-events-none">
            {/* 배경 오버레이 (클릭하면 닫기) */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-auto"
                onClick={onClose}
            />

            {/* 패널 */}
            <motion.div
                initial={{ opacity: 0, x: 60, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="relative w-[400px] h-[calc(100vh-2rem)] m-4 bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl rounded-[36px] border border-white/40 dark:border-slate-800/60 shadow-2xl flex flex-col overflow-hidden pointer-events-auto"
            >
                {/* ─ 헤더 ─ */}
                <div className="px-7 pt-7 pb-5 flex-shrink-0">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-7 h-7 rounded-[10px] bg-primary/10 flex items-center justify-center">
                                    <span className="material-symbols-rounded text-primary text-sm">chat_bubble</span>
                                </div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white">에디터 코멘트</h3>
                            </div>
                            {targetLabel && (
                                <p className="text-[10px] font-bold text-slate-400 pl-0.5">
                                    <span className="text-primary"># </span>{targetLabel}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors text-slate-400 hover:text-slate-600"
                        >
                            <span className="material-symbols-rounded text-lg">close</span>
                        </button>
                    </div>

                    {/* 통계 요약 */}
                    <div className="flex items-center gap-2">
                        {[
                            { id: 'all', label: '전체', count: rootComments.length },
                            { id: 'pending', label: '미해결', count: pendingCount },
                            { id: 'resolved', label: '해결됨', count: resolvedCount },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setFilter(tab.id as typeof filter)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all",
                                    filter === tab.id
                                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700"
                                )}
                            >
                                {tab.label}
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-full text-[8px]",
                                    filter === tab.id ? "bg-white/20 dark:bg-slate-900/20" : "bg-slate-200 dark:bg-slate-700"
                                )}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ─ 코멘트 목록 ─ */}
                <div className="flex-1 overflow-y-auto px-7 space-y-5 custom-scrollbar">
                    <AnimatePresence mode="popLayout">
                        {filteredComments.length === 0 ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center h-full py-20 text-slate-300 dark:text-slate-600 gap-4"
                            >
                                <div className="w-16 h-16 rounded-[24px] bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
                                    <span className="material-symbols-rounded text-3xl">
                                        {filter === 'resolved' ? 'check_circle' : 'forum_off'}
                                    </span>
                                </div>
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-center">
                                    {filter === 'all' ? '코멘트가 없습니다' :
                                     filter === 'pending' ? '미해결 코멘트 없음' : '해결된 코멘트 없음'}
                                </p>
                                {filter === 'all' && (
                                    <p className="text-[10px] text-slate-400 text-center">
                                        아래 입력창에서 의견을 남겨보세요
                                    </p>
                                )}
                            </motion.div>
                        ) : (
                            filteredComments.map(comment => (
                                <CommentItem
                                    key={comment.id}
                                    comment={comment}
                                    user={user}
                                    onUpdate={updateComment}
                                    onDelete={deleteComment}
                                    onResolve={handleToggleResolve}
                                    replies={allComments.filter(c => c.parentId === comment.id)}
                                    onReply={async (content) => { await addComment({ content, targetType: 'event', targetId, parentId: comment.id }); }}
                                />
                            ))
                        )}
                    </AnimatePresence>
                    {/* 스크롤 여백 */}
                    <div className="h-4" />
                </div>

                {/* ─ 하단 입력창 ─ */}
                <div className="px-6 pb-7 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex-shrink-0">
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-2 border border-slate-200 dark:border-slate-800 focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/5 transition-all">
                        {/* 내 아바타 */}
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 overflow-hidden">
                            {user?.photoURL ? (
                                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="material-symbols-rounded text-sm">person</span>
                            )}
                        </div>
                        <input
                            ref={inputRef}
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            placeholder="생각이나 수정을 제안해보세요..."
                            className="flex-1 bg-transparent text-xs font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none"
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddComment();
                                }
                            }}
                        />
                        <button
                            onClick={handleAddComment}
                            disabled={!newComment.trim()}
                            className={cn(
                                "w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0",
                                newComment.trim()
                                    ? "bg-primary text-white shadow-md shadow-primary/20 hover:opacity-90 active:scale-90"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-300 cursor-not-allowed"
                            )}
                        >
                            <span className="material-symbols-rounded text-base">send</span>
                        </button>
                    </div>
                    <p className="text-center text-[9px] font-bold text-slate-300 mt-2">Enter로 전송 · Esc로 닫기</p>
                </div>
            </motion.div>
        </div>
    );
}
