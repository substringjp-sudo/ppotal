'use client';

import React, { useState } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useI18n } from '../../lib/i18n-context';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TRANSLATIONS = {
    ko: {
        login: '로그인',
        signup: '회원가입',
        saveProgress: '진행 상황을 클라우드에 저장하세요.',
        nickname: '닉네임',
        email: '이메일',
        password: '비밀번호',
        authFailed: '인증에 실패했습니다.',
        switchToSignup: '계정이 없으신가요? 회원가입',
        switchToLogin: '이미 계정이 있으신가요? 로그인'
    },
    en: {
        login: 'Login',
        signup: 'Sign Up',
        saveProgress: 'Save your progress to the cloud.',
        nickname: 'Nickname',
        email: 'Email',
        password: 'Password',
        authFailed: 'Authentication failed',
        switchToSignup: "Don't have an account? Sign Up",
        switchToLogin: "Already have an account? Login"
    },
    ja: {
        login: 'ログイン',
        signup: '新規登録',
        saveProgress: '進行状況をクラウドに保存します。',
        nickname: 'ニックネーム',
        email: 'メールアドレス',
        password: 'パスワード',
        authFailed: '認証に失敗しました。',
        switchToSignup: 'アカウントをお持ちでないですか？新規登録',
        switchToLogin: 'すでにアカウントをお持ちですか？ログイン'
    }
};

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const { language } = useI18n();
    const t = TRANSLATIONS[language as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                if (displayName) {
                    await updateProfile(userCredential.user, { displayName });
                }
            }
            onClose();
        } catch (err: unknown) {
            console.error('Auth error:', err);
            setError(err instanceof Error ? err.message : t.authFailed);
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
                        {isLogin ? t.login : t.signup}
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>
                        {t.saveProgress}
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {!isLogin && (
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

                    {error && (
                        <div style={{ color: '#ef4444', fontSize: '13px', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '10px', border: '1px solid #fee2e2' }}>
                            {error}
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
                        {loading ? '...' : (isLogin ? t.login : t.signup)}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '24px' }}>
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        style={{
                            background: 'none', border: 'none', color: '#64748b', fontSize: '14px', cursor: 'pointer',
                            textDecoration: 'underline'
                        }}
                    >
                        {isLogin ? t.switchToSignup : t.switchToLogin}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
