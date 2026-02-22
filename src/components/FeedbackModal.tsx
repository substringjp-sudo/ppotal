'use client';

import React, { useState } from 'react';
import { submitFeedback } from '../app/actions/feedback';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
    const [content, setContent] = useState('');
    const [author, setAuthor] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage(null);

        const formData = new FormData();
        formData.append('content', content);
        formData.append('author', author);

        const result = await submitFeedback(formData);

        setIsSubmitting(false);
        if (result.success) {
            setMessage({ type: 'success', text: '건의사항이 성공적으로 전달되었습니다. 감사합니다!' });
            setContent('');
            setAuthor('');
            setTimeout(() => {
                onClose();
                setMessage(null);
            }, 2000);
        } else {
            setMessage({ type: 'error', text: result.error || '오류가 발생했습니다.' });
        }
    };

    return (
        <div style={{
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

                <h2 style={{
                    marginTop: 0,
                    marginBottom: '8px',
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#1e293b'
                }}>
                    사용자 건의함 📮
                </h2>
                <p style={{
                    color: '#64748b',
                    marginBottom: '24px',
                    fontSize: '15px'
                }}>
                    기능 제안, 버그 보고 등 의견을 자유롭게 남겨주세요.
                </p>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: '600',
                            fontSize: '14px',
                            color: '#475569'
                        }}>
                            의견 내용
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                            placeholder="개선되었으면 하는 점이나 추가되었으면 하는 기능을 적어주세요."
                            style={{
                                width: '100%',
                                height: '150px',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                fontSize: '15px',
                                outline: 'none',
                                resize: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: '600',
                            fontSize: '14px',
                            color: '#475569'
                        }}>
                            성함 또는 닉네임 (선택)
                        </label>
                        <input
                            type="text"
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                            placeholder="익명"
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                fontSize: '15px',
                                outline: 'none',
                                boxSizing: 'border-box'
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
                        {isSubmitting ? '전송 중...' : '의견 보내기'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default FeedbackModal;
