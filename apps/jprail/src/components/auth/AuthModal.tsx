'use client';

import React, { useState } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useI18n } from '../../lib/i18n-context';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

import { AUTH_TRANSLATIONS, getTranslations } from '../../lib/translations';


const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const { language } = useI18n();
    const t = getTranslations(AUTH_TRANSLATIONS, language);
    const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const getFriendlyErrorMessage = (err: any, lang: string): string => {
        const code = err?.code;
        if (!code) {
            return err instanceof Error ? err.message : t.authFailed;
        }

        const messages: Record<string, Record<string, string>> = {
            'auth/invalid-credential': {
                ko: '이메일 또는 비밀번호가 올바르지 않습니다.',
                en: 'Invalid email or password. Please try again.',
                ja: 'メールアドレスまたはパスワードが正しくありません。'
            },
            'auth/email-already-in-use': {
                ko: '이미 사용 중인 이메일 주소입니다.',
                en: 'This email is already in use.',
                ja: 'このメールアドレスはすでに使用されています。'
            },
            'auth/weak-password': {
                ko: '비밀번호가 너무 취약합니다. 최소 6자 이상이어야 합니다.',
                en: 'Password is too weak. Must be at least 6 characters.',
                ja: 'パスワードが弱すぎます。6文字以上である必要があります。'
            },
            'auth/invalid-email': {
                ko: '올바르지 않은 이메일 형식입니다.',
                en: 'Invalid email address format.',
                ja: '無効なメールアドレスの形式です。'
            },
            'auth/user-not-found': {
                ko: '가입되지 않은 이메일입니다.',
                en: 'Account not found.',
                ja: 'アカウントが見つかりません。'
            },
            'auth/wrong-password': {
                ko: '비밀번호가 올바르지 않습니다.',
                en: 'Incorrect password.',
                ja: 'パスワードが正しくありません。'
            },
            'auth/too-many-requests': {
                ko: '너무 많은 시도가 감지되었습니다. 잠시 후 다시 시도해주세요.',
                en: 'Too many attempts. Please try again later.',
                ja: '試行回数が多すぎます。しばらく時間をおいてから再度お試しください。'
            }
        };

        const langKey = lang === 'ko' || lang === 'ja' ? lang : 'en';
        return messages[code]?.[langKey] || err.message || t.authFailed;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            if (mode === 'login') {
                await signInWithEmailAndPassword(auth, email, password);
                onClose();
            } else if (mode === 'signup') {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                if (displayName) {
                    await updateProfile(userCredential.user, { displayName });
                }
                onClose();
            } else if (mode === 'reset') {
                await sendPasswordResetEmail(auth, email);
                setSuccessMessage(t.resetEmailSent);
            }
        } catch (err: unknown) {
            console.error('Auth error:', err);
            setError(getFriendlyErrorMessage(err, language));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 3000, padding: '20px'
        }} onClick={onClose}>
            <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '400px',
                padding: '40px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                position: 'relative',
                animation: 'modalAppear 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }} onClick={e => e.stopPropagation()}>

                <style>{`
                    @keyframes modalAppear {
                        from { opacity: 0; transform: translateY(20px) scale(0.95); }
                        to { opacity: 1; transform: translateY(0) scale(1); }
                    }
                    .auth-input:focus {
                        border-color: #3b82f6 !important;
                        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1) !important;
                    }
                    .auth-input::placeholder {
                        color: #94a3b8 !important;
                        opacity: 1;
                    }
                    .auth-input::selection {
                        background-color: rgba(59, 130, 246, 0.2) !important;
                        color: #1e293b !important;
                    }
                    .auth-input {
                        color: #1e293b !important;
                    }
                `}</style>

                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                        {mode === 'login' ? t.login : mode === 'signup' ? t.signup : t.resetPassword}
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>
                        {mode === 'reset' ? t.resetPasswordDesc : t.saveProgress}
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {mode === 'signup' && (
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {t.nickname}
                            </label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={e => setDisplayName(e.target.value)}
                                className="auth-input"
                                placeholder="Tetsudo Mania"
                                style={{
                                    width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0',
                                    outline: 'none', transition: 'all 0.2s', fontSize: '16px', backgroundColor: 'rgba(255,255,255,0.5)',
                                    color: '#1e293b'
                                }}
                            />
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {t.email}
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="auth-input"
                            placeholder="rail@example.com"
                            style={{
                                width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0',
                                outline: 'none', transition: 'all 0.2s', fontSize: '16px', backgroundColor: 'rgba(255,255,255,0.5)',
                                color: '#1e293b'
                            }}
                        />
                    </div>

                    {mode !== 'reset' && (
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {t.password}
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="auth-input"
                                placeholder="••••••••"
                                style={{
                                    width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0',
                                    outline: 'none', transition: 'all 0.2s', fontSize: '16px', backgroundColor: 'rgba(255,255,255,0.5)',
                                    color: '#1e293b'
                                }}
                            />
                        </div>
                    )}

                    {mode === 'login' && (
                        <div style={{ textAlign: 'right', marginTop: '-10px' }}>
                            <button
                                type="button"
                                onClick={() => { setMode('reset'); setError(null); setSuccessMessage(null); }}
                                style={{
                                    background: 'none', border: 'none', color: '#3b82f6', fontSize: '13px', cursor: 'pointer',
                                    textDecoration: 'underline', padding: 0
                                }}
                            >
                                {t.forgotPassword}
                            </button>
                        </div>
                    )}

                    {error && (
                        <div style={{ color: '#ef4444', fontSize: '13px', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '10px', border: '1px solid #fee2e2' }}>
                            {error}
                        </div>
                    )}

                    {successMessage && (
                        <div style={{ color: '#10b981', fontSize: '13px', backgroundColor: '#ecfdf5', padding: '12px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
                            {successMessage}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%', padding: '14px', borderRadius: '12px', backgroundColor: '#3b82f6', color: '#fff',
                            border: 'none', fontWeight: '700', fontSize: '16px', cursor: 'pointer', transition: 'all 0.2s',
                            marginTop: '10px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                        }}
                    >
                        {loading ? '...' : (mode === 'login' ? t.login : mode === 'signup' ? t.signup : t.sendResetLink)}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '24px' }}>
                    {mode === 'reset' ? (
                        <button
                            onClick={() => { setMode('login'); setError(null); setSuccessMessage(null); }}
                            style={{
                                background: 'none', border: 'none', color: '#64748b', fontSize: '14px', cursor: 'pointer',
                                textDecoration: 'underline'
                            }}
                        >
                            {t.backToLogin}
                        </button>
                    ) : (
                        <button
                            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setSuccessMessage(null); }}
                            style={{
                                background: 'none', border: 'none', color: '#64748b', fontSize: '14px', cursor: 'pointer',
                                textDecoration: 'underline'
                            }}
                        >
                            {mode === 'login' ? t.switchToSignup : t.switchToLogin}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
