'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, MapPin, ArrowRight, Plane, Building, Activity } from 'lucide-react';
import { TripSummary, cn } from '@pplaner/shared';
import { format, parseISO } from 'date-fns';

interface TripSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    trips: TripSummary[];
    onSelect: (tripId: string) => void;
}

/**
 * TripSelectModal - 여행 기록을 생성하기 위해 기존 여행 계획을 선택하는 모달
 */
export default function TripSelectModal({ isOpen, onClose, trips, onSelect }: TripSelectModalProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            >
                <motion.div
                    initial={{ opacity: 0, y: 40, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 40, scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-7 pt-7 pb-4 flex-shrink-0">
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="material-symbols-rounded text-xl text-primary">auto_stories</span>
                                <h2 className="text-lg font-black text-slate-900 dark:text-white">여행 계획에서 기록 생성</h2>
                            </div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-7">
                                완료된 여행 계획을 선택하여 멋진 여행기를 시작해보세요.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            <X className="w-4 h-4 text-slate-500" />
                        </button>
                    </div>

                    {/* Trip List */}
                    <div className="px-5 pb-7 overflow-y-auto custom-scrollbar">
                        <div className="space-y-3">
                            {trips.length === 0 ? (
                                <div className="py-12 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-300">
                                        <span className="material-symbols-rounded text-4xl">travel_explore</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-400">선택 가능한 여행 계획이 없습니다.</p>
                                    <p className="text-xs text-slate-400 mt-1">먼저 여행 계획을 세워보세요!</p>
                                </div>
                            ) : (
                                trips.map((trip) => (
                                    <button
                                        key={trip.id}
                                        onClick={() => onSelect(trip.id)}
                                        className="group w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 hover:border-primary/40 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all text-left"
                                    >
                                        {/* Thumbnail or Icon */}
                                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0 relative">
                                            {trip.locations?.thumbnailUrl ? (
                                                <img 
                                                    src={trip.locations.thumbnailUrl} 
                                                    alt={trip.title} 
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/30">
                                                    <span className="material-symbols-rounded text-primary text-xl">map</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-black text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                                                {trip.title}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {format(parseISO(trip.dates.startDate), 'yyyy.MM.dd')}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {trip.locations?.regionNames?.[0] || 'Unknown Location'}
                                                </div>
                                            </div>
                                            
                                            {/* Stats summary */}
                                            <div className="flex items-center gap-3 mt-2">
                                                {trip.flightCount !== undefined && trip.flightCount > 0 && (
                                                    <div className="flex items-center gap-1 text-[9px] font-black text-slate-400">
                                                        <Plane className="w-2.5 h-2.5" />
                                                        {trip.flightCount}
                                                    </div>
                                                )}
                                                {trip.accommodationCount !== undefined && trip.accommodationCount > 0 && (
                                                    <div className="flex items-center gap-1 text-[9px] font-black text-slate-400">
                                                        <Building className="w-2.5 h-2.5" />
                                                        {trip.accommodationCount}
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1 text-[9px] font-black text-slate-400">
                                                    <Activity className="w-2.5 h-2.5" />
                                                    PLAN READY
                                                </div>
                                            </div>
                                        </div>

                                        {/* Arrow */}
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:bg-primary group-hover:text-white transition-all flex items-center justify-center">
                                            <ArrowRight className="w-4 h-4" />
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
