import React, { useState, useRef, useEffect } from 'react';
import { useUserStore } from '@pplaner/shared';
import { markAsRead, markAllAsRead, deleteNotification } from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import Link from 'next/link';

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const { notifications, unreadNotificationCount, profile } = useUserStore();
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleMarkAsRead = async (id: string) => {
        await markAsRead(id);
    };

    const handleMarkAllRead = async () => {
        if (profile?.userId) {
            await markAllAsRead(profile.userId);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'friend_request': return 'person_add';
            case 'friend_accepted': return 'person_check';
            case 'trip_invite': return 'luggage';
            case 'trip_invite_accepted': return 'group_add';
            case 'trip_edit': return 'edit_note';
            default: return 'notifications';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-9 h-9 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-transparent hover:border-primary/20 focus:outline-none group"
                aria-label="알림 열기"
            >
                <span className="material-symbols-rounded text-xl group-hover:text-primary transition-all">notifications</span>
                {unreadNotificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 shadow-sm animate-bounce">
                        {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden"
                    >
                        <div className="p-4 border-b border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white">알림</h3>
                            {unreadNotificationCount > 0 && (
                                <button 
                                    onClick={handleMarkAllRead}
                                    className="text-[11px] font-bold text-primary hover:underline"
                                >
                                    모두 읽음 처리
                                </button>
                            )}
                        </div>

                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            {notifications.length > 0 ? (
                                <div className="divide-y divide-slate-50 dark:divide-slate-700">
                                    {notifications.map((notification) => (
                                        <div 
                                            key={notification.id}
                                            className={`p-4 flex gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer relative ${!notification.isRead ? 'bg-primary/5' : ''}`}
                                            onClick={() => {
                                                if (!notification.isRead) handleMarkAsRead(notification.id);
                                                if (notification.link) {
                                                    setIsOpen(false);
                                                    // Router push or Link logic
                                                }
                                            }}
                                        >
                                            <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                                                !notification.isRead ? 'bg-primary/20 text-primary' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                                            }`}>
                                                <span className="material-symbols-rounded text-xl">
                                                    {getIcon(notification.type)}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-0.5">
                                                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                                                        {notification.title}
                                                    </p>
                                                    <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                                                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: ko })}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                                    {notification.message}
                                                </p>
                                                {notification.link && (
                                                    <Link 
                                                        href={notification.link}
                                                        className="inline-block mt-2 px-3 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-all"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        자세히 보기
                                                    </Link>
                                                )}
                                            </div>
                                            {!notification.isRead && (
                                                <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-primary rounded-full" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                                    <span className="material-symbols-rounded text-4xl mb-2 opacity-20">notifications_off</span>
                                    <p className="text-xs font-bold">새로운 알림이 없습니다.</p>
                                </div>
                            )}
                        </div>

                        {notifications.length > 0 && (
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 text-center">
                                <Link 
                                    href="/friends" // Or a dedicated notifications page if created
                                    className="text-[11px] font-black text-slate-500 hover:text-primary transition-colors"
                                    onClick={() => setIsOpen(false)}
                                >
                                    내 친구 및 활동 관리
                                </Link>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
