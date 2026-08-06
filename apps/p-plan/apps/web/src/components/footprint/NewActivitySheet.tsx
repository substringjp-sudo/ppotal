'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

interface NewActivitySheetProps {
    range: { start: Date; end: Date } | null;
    onClose: () => void;
    onCreate: (title: string) => void;
}

export default function NewActivitySheet({ range, onClose, onCreate }: NewActivitySheetProps) {
    const [title, setTitle] = useState('');

    if (!range) return null;

    const submit = () => {
        onCreate(title.trim());
        setTitle('');
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            >
                <motion.div
                    initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]"
                >
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">새 활동</p>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 tabular-nums">
                        {format(range.start, 'HH:mm')} – {format(range.end, 'HH:mm')}
                    </p>
                    <input
                        autoFocus
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                        placeholder="이 시간에 뭘 했나요?"
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-2xl text-sm font-black text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            취소
                        </button>
                        <button
                            onClick={submit}
                            className="flex-1 py-3 rounded-2xl bg-primary text-white text-sm font-black hover:bg-primary/90 transition-colors"
                        >
                            추가
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
