'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { CloseIcon } from '@ppotal/ui';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useI18n } from '../lib/i18n-context';
import { FEEDBACK_TRANSLATIONS, getTranslations } from '../lib/translations';
import { Z } from '../lib/layers';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
    const { language } = useI18n();
    const t = getTranslations(FEEDBACK_TRANSLATIONS, language);
    const [content, setContent] = useState('');
    const [author, setAuthor] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            setContent('');
            setMessage(null);
            const handleEscape = (e: KeyboardEvent) => {
                if (e.key === 'Escape') onClose();
            };
            window.addEventListener('keydown', handleEscape);
            return () => window.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!content || content.trim().length === 0) {
            setMessage({ type: 'error', text: t.errorEmpty });
            return;
        }

        setIsSubmitting(true);
        setMessage(null);

        try {
            await addDoc(collection(db, 'feedbacks'), {
                content,
                author: author.trim() || 'Anonymous',
                timestamp: serverTimestamp(),
                language,
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
                app: 'jprail'
            });

            setMessage({ type: 'success', text: t.successMsg });
            setContent('');
            setAuthor('');
            setTimeout(() => {
                onClose();
                setMessage(null);
            }, 1500);
        } catch (error) {
            console.error('Error submitting feedback:', error);
            setMessage({ type: 'error', text: t.errorMsg });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-modal-title"
            aria-describedby="feedback-modal-desc"
            style={{ zIndex: Z.modal }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 sm:p-8 animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800 relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 size-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    aria-label="닫기"
                >
                    <CloseIcon className="w-5 h-5" />
                </button>

                {/* Title & Desc */}
                <div className="flex items-center gap-2.5 mb-2">
                    <div className="size-9 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-primary">
                        <MessageSquare className="w-5 h-5" />
                    </div>
                    <h2 id="feedback-modal-title" className="text-xl font-black text-slate-900 dark:text-white">
                        {t.title}
                    </h2>
                </div>
                <p id="feedback-modal-desc" className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                    {t.desc}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="feedback-content" className="block mb-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                            {t.labelFeedback}
                        </label>
                        <textarea
                            id="feedback-content"
                            autoFocus
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                            placeholder={t.placeholderFeedback}
                            className="w-full h-32 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all"
                        />
                    </div>

                    <div>
                        <label htmlFor="feedback-author" className="block mb-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                            {t.labelName}
                        </label>
                        <input
                            id="feedback-author"
                            type="text"
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                            placeholder={t.placeholderName}
                            className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                    </div>

                    {message && (
                        <div className={`p-3 rounded-xl text-xs font-bold ${
                            message.type === 'success'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}>
                            {message.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-sm font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] cursor-pointer mt-2"
                    >
                        {isSubmitting ? t.submitting : t.submitBtn}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default FeedbackModal;
