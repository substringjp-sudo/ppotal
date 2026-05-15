'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, FileJson, Sheet, Printer, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTripStore } from '@pplaner/shared';
import { exportToICS, exportToJSON, exportToCSV } from '@pplaner/shared';
import { ExportPreviewModal } from './ExportPreviewModal';

interface ExportModalProps {
    onClose: () => void;
}

type ExportFormat = 'ics' | 'print';

export function ExportModal({ onClose }: ExportModalProps) {
    const currentTrip = useTripStore((state) => state.currentTrip);
    const [loading, setLoading] = useState<ExportFormat | null>(null);
    const [done, setDone] = useState<Set<ExportFormat>>(new Set());
    const [showPreview, setShowPreview] = useState(false);

    if (!currentTrip) return null;

    if (showPreview) {
        return <ExportPreviewModal onClose={onClose} />;
    }

    const flightCount = (currentTrip.flights?.length ?? 0) +
        (currentTrip.driving?.length ?? 0) +
        (currentTrip.publicTransport?.length ?? 0);
    const accomCount = currentTrip.accommodation?.length ?? 0;
    const eventCount = currentTrip.dailyTimeline?.reduce(
        (acc, day) => acc + (day.events?.length ?? 0), 0
    ) ?? 0;
    const reservationCount = currentTrip.reservations?.length ?? 0;
    const prepCount = currentTrip.prepTimeline?.length ?? 0;
    const expenseCount = currentTrip.budget?.expenses?.length ?? 0;

    const handle = async (format: ExportFormat) => {
        if (loading) return;
        if (format === 'print') {
            setShowPreview(true);
            return;
        }

        setLoading(format);
        try {
            if (format === 'ics') {
                exportToICS(currentTrip);
                toast.success('캘린더 파일이 다운로드 되었습니다');
            }
            setDone(prev => new Set([...prev, format]));
        } catch {
            toast.error('내보내기 중 오류가 발생했습니다');
        } finally {
            setLoading(null);
        }
    };

    const formats: {
        id: ExportFormat;
        icon: React.ReactNode;
        label: string;
        sub: string;
        detail: string;
        color: string;
        bg: string;
    }[] = [
        {
            id: 'ics',
            icon: <Calendar className="w-6 h-6" />,
            label: '캘린더 추가',
            sub: '.ics · 모든 캘린더 앱',
            detail: '구글캘린더, 애플캘린더, 아웃룩에 직접 추가',
            color: 'text-primary',
            bg: 'bg-orange-50 dark:bg-orange-950/30 border-orange-100 dark:border-orange-900/40 hover:border-primary/40',
        },

        {
            id: 'print',
            icon: <Printer className="w-6 h-6" />,
            label: '인쇄 / PDF',
            sub: '브라우저 인쇄 최적화',
            detail: '한눈에 보는 여행 요약 — 인쇄 또는 PDF 저장',
            color: 'text-sky-600',
            bg: 'bg-sky-50 dark:bg-sky-950/30 border-sky-100 dark:border-sky-900/40 hover:border-sky-400/40',
        },
    ];

    const summaryItems = [
        flightCount > 0 && `교통 ${flightCount}편`,
        accomCount > 0 && `숙소 ${accomCount}건`,
        eventCount > 0 && `일정 ${eventCount}건`,
        reservationCount > 0 && `예약 ${reservationCount}건`,
        prepCount > 0 && `준비항목 ${prepCount}건`,
        expenseCount > 0 && `예산 ${expenseCount}건`,
    ].filter(Boolean) as string[];

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
                    className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-7 pt-7 pb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="material-symbols-rounded text-xl text-primary">download</span>
                                <h2 className="text-lg font-black text-slate-900 dark:text-white">내보내기</h2>
                            </div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-7">
                                {currentTrip.titleSuggestion || currentTrip.title}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            <X className="w-4 h-4 text-slate-500" />
                        </button>
                    </div>

                    {/* Format grid */}
                    <div className="px-7 pb-2 grid grid-cols-2 gap-3">
                        {formats.map((fmt) => {
                            const isLoading = loading === fmt.id;
                            const isDone = done.has(fmt.id);
                            return (
                                <button
                                    key={fmt.id}
                                    onClick={() => handle(fmt.id)}
                                    disabled={loading !== null}
                                    className={`relative flex flex-col items-start gap-2 p-4 rounded-2xl border-2 transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed ${fmt.bg}`}
                                >
                                    <div className={`${fmt.color}`}>
                                        {isLoading ? (
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        ) : isDone ? (
                                            <Check className="w-6 h-6 text-green-500" />
                                        ) : (
                                            fmt.icon
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-800 dark:text-slate-100">{fmt.label}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{fmt.sub}</p>
                                    </div>
                                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">{fmt.detail}</p>
                                </button>
                            );
                        })}
                    </div>

                    {/* Summary */}
                    {summaryItems.length > 0 && (
                        <div className="mx-7 mb-7 mt-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <div className="flex items-start gap-2">
                                <span className="material-symbols-rounded text-sm text-slate-400 mt-0.5">info</span>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">포함 항목</p>
                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                        {summaryItems.join(' · ')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
