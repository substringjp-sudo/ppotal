'use client';

import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useI18n } from '../lib/i18n-context';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TRANSLATIONS = {
    ko: {
        title: '피드백 보내기',
        desc: '제안 사항이나 버그를 발견하셨나요? 알려주세요!',
        labelFeedback: '피드백 내용',
        placeholderFeedback: '이런 기능이 있으면 좋겠어요...',
        labelName: '이름 (선택 사항)',
        placeholderName: '익명',
        submitBtn: '피드백 제출',
        submitting: '제출 중...',
        errorEmpty: '피드백 내용을 입력해주세요.',
        successMsg: '감사합니다! 피드백이 성공적으로 제출되었습니다.',
        errorMsg: '오류가 발생했습니다. 다시 시도해주세요.'
    },
    en: {
        title: 'Submit Feedback',
        desc: 'Have a suggestion or found a bug? Let us know!',
        labelFeedback: 'Feedback',
        placeholderFeedback: 'I think it would be great if...',
        labelName: 'Your Name (Optional)',
        placeholderName: 'Anonymous',
        submitBtn: 'Submit Feedback',
        submitting: 'Submitting...',
        errorEmpty: 'Feedback content cannot be empty.',
        successMsg: 'Thank you! Your feedback has been submitted.',
        errorMsg: 'An error occurred. Please try again.'
    },
    ja: {
        title: 'フィードバックを送信',
        desc: '提案やバグを見つけましたか？ぜひ教えてください！',
        labelFeedback: 'フィードバック内容',
        placeholderFeedback: 'こんな機能があったらいいな...',
        labelName: 'お名前 (任意)',
        placeholderName: '匿名',
        submitBtn: 'フィードバックを送信',
        submitting: '送信中...',
        errorEmpty: 'フィードバック内容を入力してください。',
        successMsg: 'ありがとうございます！フィードバックが送信されました。',
        errorMsg: 'エラーが発生しました。もう一度お試しください。'
    }
};

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
    const { language } = useI18n();
    const t = TRANSLATIONS[language as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;
    const [content, setContent] = useState('');
    const [author, setAuthor] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    React.useEffect(() => {
        if (isOpen) {
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
                author: author || t.placeholderName,
                type: 'General',
                createdAt: serverTimestamp(),
                status: 'new'
            });

            setMessage({ type: 'success', text: t.successMsg });
            setContent('');
            setAuthor('');
            setTimeout(() => {
                onClose();
                setMessage(null);
            }, 2000);
        } catch (error) {
            console.error('Feedback submission error:', error);
            setMessage({ type: 'error', text: t.errorMsg });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-modal-title"
            aria-describedby="feedback-modal-desc"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                backdropFilter: 'blur(4px)',
            }} onClick={onClose}>
            <div style={{
                backgroundColor: 'white',
                padding: '32px',
                borderRadius: '24px',
                width: '90%',
                maxWidth: '500px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                position: 'relative'
            }} onClick={e => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        border: 'none',
                        background: 'none',
                        fontSize: '24px',
                        cursor: 'pointer',
                        color: '#94a3b8'
                    }}
                >
                    &times;
                </button>

                <h2 id="feedback-modal-title" style={{
                    marginTop: 0,
                    marginBottom: '8px',
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#1e293b'
                }}>
                    {t.title}
                </h2>
                <p id="feedback-modal-desc" style={{
                    color: '#64748b',
                    marginBottom: '24px',
                    fontSize: '15px'
                }}>
                    {t.desc}
                </p>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label htmlFor="feedback-content" style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: '600',
                            fontSize: '14px',
                            color: '#475569'
                        }}>
                            {t.labelFeedback}
                        </label>
                        <textarea
                            id="feedback-content"
                            autoFocus
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                            placeholder={t.placeholderFeedback}
                            style={{
                                width: '100%',
                                height: '150px',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                fontSize: '15px',
                                outline: 'none',
                                resize: 'none',
                                boxSizing: 'border-box',
                                color: '#1e293b'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label htmlFor="feedback-author" style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: '600',
                            fontSize: '14px',
                            color: '#475569'
                        }}>
                            {t.labelName}
                        </label>
                        <input
                            id="feedback-author"
                            type="text"
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                            placeholder={t.placeholderName}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                fontSize: '15px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                color: '#1e293b'
                            }}
                        />
                    </div>

                    {message && (
                        <div style={{
                            padding: '12px 16px',
                            borderRadius: '12px',
                            marginBottom: '20px',
                            fontSize: '14px',
                            backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                            color: message.type === 'success' ? '#166534' : '#991b1b',
                            border: `1px solid ${message.type === 'success' ? '#bcf0da' : '#fecaca'}`
                        }}>
                            {message.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '14px',
                            border: 'none',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            opacity: isSubmitting ? 0.7 : 1,
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
                        }}
                    >
                        {isSubmitting ? t.submitting : t.submitBtn}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default FeedbackModal;
