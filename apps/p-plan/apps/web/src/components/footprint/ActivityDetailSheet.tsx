'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { cn, type FootprintActivity } from '@pplaner/shared';

interface ActivityDetailSheetProps {
    activity: FootprintActivity | null;
    onClose: () => void;
    onRename: (activity: FootprintActivity, title: string) => void;
    onDelete: (activity: FootprintActivity) => void;
    onWriteTravelog: (activity: FootprintActivity) => void;
}

const TYPE_LABEL: Record<string, string> = {
    visit: '방문', wander: '배회/산책', transit: '이동', unknown: '미분류',
};

export default function ActivityDetailSheet({
    activity, onClose, onRename, onDelete, onWriteTravelog,
}: ActivityDetailSheetProps) {
    const [title, setTitle] = useState(activity?.title || '');
    const [editing, setEditing] = useState(false);

    if (!activity) return null;

    const allPhotos = activity.photoUrls?.length
        ? activity.photoUrls
        : activity.places.flatMap((p) => p.photoUrls || []);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
            >
                <motion.div
                    initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]"
                >
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0 flex-1">
                            <span className="inline-block text-xs font-semibold text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full mb-1.5">
                                {TYPE_LABEL[activity.type] || activity.type}
                            </span>
                            {editing ? (
                                <input
                                    autoFocus
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    onBlur={() => { setEditing(false); onRename(activity, title.trim()); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                    className="w-full text-lg font-semibold text-slate-900 dark:text-white bg-transparent border-b-2 border-primary/40 focus:outline-none"
                                />
                            ) : (
                                <button onClick={() => setEditing(true)} className="text-left group">
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                                        {activity.title || activity.places[0]?.name || '이름 없는 활동'}
                                    </h3>
                                </button>
                            )}
                            <p className="text-xs font-bold text-slate-400 mt-1 tabular-nums">
                                {format(new Date(activity.startAt), 'HH:mm')} – {format(new Date(activity.endAt), 'HH:mm')}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        >
                            <span className="material-symbols-rounded text-lg">close</span>
                        </button>
                    </div>

                    {allPhotos.length > 0 && (
                        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
                            {allPhotos.map((url, i) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img key={i} src={url} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0 bg-slate-100 dark:bg-slate-800" />
                            ))}
                        </div>
                    )}

                    {activity.places.length > 0 ? (
                        <div className="space-y-2 mb-4">
                            {activity.places.map((p) => (
                                <div key={p.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                                    <span className="material-symbols-rounded text-primary text-lg shrink-0">location_on</span>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                                        {p.name || '이름 없는 장소'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs font-bold text-slate-400 mb-4">아직 장소가 연결되지 않았어요.</p>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={() => onDelete(activity)}
                            className="px-4 py-3 rounded-2xl text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            삭제
                        </button>
                        <button
                            onClick={() => onWriteTravelog(activity)}
                            className={cn(
                                'flex-1 py-3 rounded-2xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5',
                            )}
                        >
                            <span className="material-symbols-rounded text-base">auto_stories</span>
                            이걸로 기록 쓰기
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
