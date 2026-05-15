'use client';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile } from '@pplaner/shared';
import { getUserTripSummary } from '@pplaner/shared';

interface FriendProfileModalProps {
    friend: UserProfile | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function FriendProfileModal({ friend, isOpen, onClose }: FriendProfileModalProps) {
    const [summary, setSummary] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && friend) {
            const fetchSummary = async () => {
                setIsLoading(true);
                const data = await getUserTripSummary(friend.userId);
                setSummary(data);
                setIsLoading(false);
            };
            fetchSummary();
        }
    }, [isOpen, friend]);

    if (!friend) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-slate-800 overflow-hidden"
                    >
                        {/* Header Image Background */}
                        <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />

                        <div className="px-8 pb-8">
                            {/* Profile Info */}
                            <div className="relative -mt-12 mb-6 flex flex-col items-center">
                                <div 
                                    className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-900 shadow-xl bg-slate-200 bg-cover bg-center mb-4"
                                    style={{ backgroundImage: `url('${friend.photoURL || ''}')` }}
                                />
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white">{friend.displayName}</h2>
                                <p className="text-sm text-slate-500 font-medium">{friend.email}</p>
                            </div>

                            {/* Statistics Grid */}
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="p-4 bg-primary/5 dark:bg-primary/10 rounded-3xl border border-primary/10 flex flex-col items-center">
                                    <span className="text-xs font-bold text-primary uppercase tracking-wider mb-1">총 여행 회수</span>
                                    <span className="text-2xl font-black text-slate-900 dark:text-white">{isLoading ? '...' : summary?.totalTrips || 0}</span>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">방문 지역</span>
                                    <span className="text-2xl font-black text-slate-900 dark:text-white">{isLoading ? '...' : summary?.locationCount || 0}</span>
                                </div>
                            </div>

                            {/* Recent Trips Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">최근 여행 활동</h3>
                                    {!isLoading && summary?.recentTrips?.length > 0 && (
                                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-bold">Latest 3</span>
                                    )}
                                </div>

                                {isLoading ? (
                                    <div className="space-y-3">
                                        {[1, 2].map(i => (
                                            <div key={i} className="h-16 animate-pulse bg-slate-50 dark:bg-slate-800/50 rounded-2xl" />
                                        ))}
                                    </div>
                                ) : summary?.recentTrips?.length > 0 ? (
                                    <div className="space-y-3">
                                        {summary.recentTrips.map((trip: any) => (
                                            <div key={trip.id} className="p-4 bg-slate-50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 transition-all group">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">{trip.title}</h4>
                                                        <p className="text-[10px] text-slate-400">
                                                            {trip.dates?.isUndecided ? '날짜 미정' : `${trip.dates?.startDate} ~ ${trip.dates?.endDate}`}
                                                        </p>
                                                    </div>
                                                    <span className="material-symbols-rounded text-slate-300 group-hover:text-primary text-sm transition-all -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100">
                                                        arrow_forward_ios
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                                        <p className="text-xs text-slate-400 font-medium">기록된 여행 정보가 없습니다.</p>
                                    </div>
                                )}
                            </div>

                            {/* Representative Regions */}
                            {!isLoading && summary?.uniqueRegions?.length > 0 && (
                                <div className="mt-6">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">대표 방문 지역</p>
                                    <div className="flex flex-wrap gap-2 px-1">
                                        {summary.uniqueRegions.map((region: string) => (
                                            <span key={region} className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full">
                                                {region}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Close Button */}
                            <button 
                                onClick={onClose}
                                className="w-full mt-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
                            >
                                닫기
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
