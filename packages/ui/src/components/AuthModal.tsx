'use client';

import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '@ppotal/firebase';
import { X, Mail, Lock, User as UserIcon, ArrowRight, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  appName?: string;
  language?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, appName = "Portal", language }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const getFriendlyErrorMessage = (err: any): string => {
    const code = err?.code;
    const defaultFail = 'Authentication failed';
    if (!code) {
      return err instanceof Error ? err.message : defaultFail;
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

    const userLang = language || (typeof navigator !== 'undefined' ? navigator.language : 'en');
    const langKey = userLang.startsWith('ko') ? 'ko' : userLang.startsWith('ja') ? 'ja' : 'en';
    return messages[code]?.[langKey] || err.message || defaultFail;
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
        const userLang = language || (typeof navigator !== 'undefined' ? navigator.language : 'en');
        const isKo = userLang.startsWith('ko');
        const isJa = userLang.startsWith('ja');
        setSuccessMessage(
          isKo ? '비밀번호 재설정 이메일이 발송되었습니다. 메일함을 확인해주세요.' :
          isJa ? 'パスワード再設定メールを送信しました。メールボックスをご確認ください。' :
          'Password reset email sent. Please check your inbox.'
        );
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay">
      {/* Backdrop */}
      <div className="auth-modal-backdrop" onClick={onClose} />

      {/* Modal Content */}
      <div className="auth-modal-container">
        <button className="auth-modal-close-btn" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="auth-modal-header">
          <div className="auth-modal-icon-container">
            <UserIcon size={24} />
          </div>
          <h2>{mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Join the Journey' : 'Reset Password'}</h2>
          <p>{mode === 'login' ? `Log in to access ${appName} services` : mode === 'signup' ? `Create an account for all ${appName} features` : `Enter your email to receive a password reset link`}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-modal-form">
          {mode === 'signup' && (
            <div className="auth-form-group">
              <label>Nickname</label>
              <div className="auth-input-wrapper">
                <UserIcon size={18} className="auth-input-icon" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Name"
                />
              </div>
            </div>
          )}

          <div className="auth-form-group">
            <label>Email Address</label>
            <div className="auth-input-wrapper">
              <Mail size={18} className="auth-input-icon" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div className="auth-form-group">
              <label>Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          {mode === 'login' && (
            <div style={{ textAlign: 'right', marginTop: '-0.5rem' }}>
              <button 
                type="button" 
                onClick={() => { setMode('reset'); setError(null); setSuccessMessage(null); }} 
                className="auth-toggle-btn"
                style={{ fontSize: '0.8rem', textDecoration: 'none' }}
              >
                {language?.startsWith('ko') ? '비밀번호를 잊으셨나요?' : language?.startsWith('ja') ? 'パスワードをお忘れですか？' : 'Forgot Password?'}
              </button>
            </div>
          )}

          {error && (
            <div className="auth-error-block">
              {error}
            </div>
          )}

          {successMessage && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              color: '#10b981',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              fontSize: '0.85rem',
              lineHeight: '1.4'
            }}>
              {successMessage}
            </div>
          )}

          <button type="submit" disabled={loading} className="auth-submit-btn">
            {loading ? (
              <Loader2 className="auth-spinner" size={20} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span>{mode === 'login' ? 'Log In' : mode === 'signup' ? 'Create Account' : (language?.startsWith('ko') ? '재설정 메일 전송' : language?.startsWith('ja') ? '再設定メールを送信' : 'Send Reset Link')}</span>
                <ArrowRight size={18} />
              </div>
            )}
          </button>
        </form>

        <div className="auth-modal-footer">
          {mode === 'reset' ? (
            <button onClick={() => { setMode('login'); setError(null); setSuccessMessage(null); }} className="auth-toggle-btn">
              {language?.startsWith('ko') ? '로그인 화면으로 돌아가기' : language?.startsWith('ja') ? 'ログイン画面に戻る' : 'Back to Login'}
            </button>
          ) : (
            <>
              <span>{mode === 'login' ? "Don't have an account?" : "Already have an account?"}</span>
              <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setSuccessMessage(null); }} className="auth-toggle-btn">
                {mode === 'login' ? 'Sign up for free' : 'Log in here'}
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        .auth-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .auth-modal-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(8, 8, 11, 0.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          animation: authFadeIn 0.3s ease forwards;
        }

        .auth-modal-container {
          position: relative;
          width: 100%;
          max-width: 420px;
          background: rgba(20, 20, 25, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), 
                      inset 0 1px 0 rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          padding: 2.5rem;
          box-sizing: border-box;
          color: #ffffff;
          animation: authScaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          z-index: 2;
        }

        .auth-modal-close-btn {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
          border-radius: 50%;
          transition: all 0.2s ease;
        }

        .auth-modal-close-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
        }

        .auth-modal-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .auth-modal-icon-container {
          width: 56px;
          height: 56px;
          background: #6366f1;
          color: #ffffff;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.25rem;
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.35);
        }

        .auth-modal-header h2 {
          font-size: 1.6rem;
          font-weight: 850;
          letter-spacing: -0.02em;
          margin: 0 0 0.5rem 0;
          background: linear-gradient(to bottom, #ffffff 60%, rgba(255, 255, 255, 0.75));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .auth-modal-header p {
          font-size: 0.95rem;
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
        }

        .auth-modal-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .auth-form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .auth-form-group label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.4);
        }

        .auth-input-wrapper {
          position: relative;
          width: 100%;
        }

        .auth-input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255, 255, 255, 0.35);
          pointer-events: none;
        }

        .auth-input-wrapper input {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 0.85rem 1rem 0.85rem 2.75rem;
          box-sizing: border-box;
          color: #ffffff;
          font-size: 0.95rem;
          outline: none;
          transition: all 0.2s ease;
        }

        .auth-input-wrapper input:focus {
          border-color: #6366f1;
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
        }

        .auth-error-block {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border-radius: 12px;
          padding: 0.75rem 1rem;
          font-size: 0.85rem;
          line-height: 1.4;
        }

        .auth-submit-btn {
          margin-top: 0.5rem;
          background: #6366f1;
          color: #ffffff;
          border: none;
          border-radius: 14px;
          padding: 0.95rem;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.25);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .auth-submit-btn:hover:not(:disabled) {
          background: #4f46e5;
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(99, 102, 241, 0.35);
        }

        .auth-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .auth-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .auth-spinner {
          animation: authSpin 1s linear infinite;
        }

        .auth-modal-footer {
          margin-top: 2rem;
          text-align: center;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
        }

        .auth-toggle-btn {
          background: transparent;
          border: none;
          color: #6366f1;
          font-weight: 700;
          cursor: pointer;
          font-size: 0.875rem;
          padding: 0;
          text-decoration: underline;
        }

        .auth-toggle-btn:hover {
          color: #818cf8;
        }

        @keyframes authFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes authScaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        @keyframes authSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
