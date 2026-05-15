'use client';
import React from 'react';
import { toast } from 'sonner';

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

/**
 * 글로벌 에러 바운더리
 * 런타임 에러를 포착하여 앱 전체가 흰 화면이 되는 것을 방지합니다.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        // 실제 서비스에서는 Sentry 등 모니터링 툴로 전송
        console.error('ErrorBoundary caught:', error, info);
        toast.error('예상치 못한 시스템 오류가 발생했습니다.', {
            description: error.message,
            duration: 5000,
        });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: undefined });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                        <span className="material-symbols-rounded text-red-500 text-3xl">error_outline</span>
                    </div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">
                        예상치 못한 오류가 발생했습니다
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
                        {this.state.error?.message || '일시적인 오류입니다. 다시 시도해 주세요.'}
                    </p>
                    <button
                        onClick={this.handleReset}
                        className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-all"
                    >
                        다시 시도
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * 위젯 단위의 경량 에러 바운더리
 * 하나의 위젯 오류가 전체 대시보드에 영향을 주지 않도록 합니다.
 */
export function WidgetErrorBoundary({ children, widgetName }: { children: React.ReactNode; widgetName?: string }) {
    return (
        <ErrorBoundary
            fallback={
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                    <span className="material-symbols-rounded text-red-400 text-xl">warning</span>
                    <div>
                        <p className="text-sm font-bold text-red-700 dark:text-red-300">
                            {widgetName ? `"${widgetName}" 위젯 오류` : '위젯 로드 실패'}
                        </p>
                        <p className="text-xs text-red-500 dark:text-red-400">새로고침 후 다시 시도해 주세요.</p>
                    </div>
                </div>
            }
        >
            {children}
        </ErrorBoundary>
    );
}
