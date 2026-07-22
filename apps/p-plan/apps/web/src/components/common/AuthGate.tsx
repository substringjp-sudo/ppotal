'use client';

import { ReactNode } from 'react';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

/**
 * 비용/저장이 필요한 기능을 로그인 뒤로 부드럽게 잠그기 위한 공용 프리미티브.
 *
 * 원칙: "벽"이 아니라 "안내". 로그인 안 한 사용자를 막아 세우는 대신,
 * 무엇을 하면 무엇이 열리는지 짧게 알려주고 한 번의 클릭으로 로그인하게 한다.
 */

export function useRequireAuth() {
    const { user, loginWithGoogle } = useAuth();

    /**
     * 로그인 상태면 action 실행(true 반환), 아니면 로그인 유도 토스트(false 반환).
     * 비용/저장 액션의 onClick 앞단에 감싸서 사용한다.
     */
    const requireAuth = (action?: () => void, opts?: { message?: string }) => {
        if (user) {
            action?.();
            return true;
        }
        toast(opts?.message || '로그인하면 이어서 사용할 수 있어요.', {
            action: { label: '로그인', onClick: () => void loginWithGoogle() },
        });
        return false;
    };

    return { user, isAuthed: !!user, requireAuth, login: loginWithGoogle };
}

interface AuthGateProps {
    /** 로그인 시 보여줄 실제 기능 */
    children: ReactNode;
    /** 비로그인 시 대체 UI. 지정하면 기본 프롬프트 대신 사용 */
    fallback?: ReactNode;
    /** 기본 프롬프트 제목/설명 */
    title?: string;
    description?: string;
    className?: string;
}

/**
 * 로그인 시 children을, 아니면 부드러운 로그인 프롬프트(또는 fallback)를 렌더한다.
 * 기능 영역 자체를 감쌀 때 사용.
 */
export function AuthGate({ children, fallback, title, description, className = '' }: AuthGateProps) {
    const { user, loginWithGoogle } = useAuth();

    if (user) return <>{children}</>;
    if (fallback !== undefined) return <>{fallback}</>;

    return (
        <div
            className={`flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-6 text-center dark:border-slate-700 dark:bg-slate-800/30 ${className}`}
        >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                <Lock className="h-4 w-4" />
            </span>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {title || '로그인하면 사용할 수 있어요'}
            </p>
            {description && (
                <p className="max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {description}
                </p>
            )}
            <button
                type="button"
                onClick={() => void loginWithGoogle()}
                className="mt-1 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
                로그인
            </button>
        </div>
    );
}
