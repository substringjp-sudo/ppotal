/**
 * PPLANER Design Tokens
 * 프로젝트 전반의 시각적 일관성을 유지하기 위한 디자인 토큰 시스템입니다.
 */
export declare const DESIGN_TOKENS: {
    readonly colors: {
        readonly primary: {
            readonly DEFAULT: "#ec5b13";
            readonly light: "#ff6b21";
            readonly dark: "#c1450a";
            readonly soft: "rgba(236, 91, 19, 0.1)";
        };
        readonly success: {
            readonly DEFAULT: "#10b981";
            readonly light: "#34d399";
            readonly dark: "#059669";
            readonly soft: "rgba(16, 185, 129, 0.1)";
        };
        readonly warning: {
            readonly DEFAULT: "#f59e0b";
            readonly light: "#fbbf24";
            readonly dark: "#d97706";
            readonly soft: "rgba(245, 158, 11, 0.1)";
        };
        readonly danger: {
            readonly DEFAULT: "#ef4444";
            readonly light: "#f87171";
            readonly dark: "#dc2626";
            readonly soft: "rgba(239, 68, 68, 0.1)";
        };
        readonly slate: {
            readonly 50: "#f8fafc";
            readonly 100: "#f1f5f9";
            readonly 200: "#e2e8f0";
            readonly 300: "#cbd5e1";
            readonly 400: "#94a3b8";
            readonly 500: "#64748b";
            readonly 600: "#475569";
            readonly 700: "#334155";
            readonly 800: "#1e293b";
            readonly 900: "#0f172a";
        };
        readonly status: {
            readonly visited: "#ea580c";
            readonly planned: "#3b82f6";
            readonly mastered: "#10b981";
            readonly danger: "#ef4444";
            readonly info: "#0ea5e9";
            readonly accent: "#8b5cf6";
        };
    };
    readonly gradients: {
        readonly primary: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)";
        readonly surface: "linear-gradient(180deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%)";
        readonly glass: "backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-slate-800/20";
    };
    readonly shadows: {
        readonly sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)";
        readonly DEFAULT: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)";
        readonly premium: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)";
        readonly soft: "0 10px 30px -5px rgba(99, 102, 241, 0.15)";
    };
    readonly radius: {
        readonly sm: "0.75rem";
        readonly md: "1rem";
        readonly lg: "1.5rem";
        readonly xl: "2rem";
        readonly '2xl': "2rem";
        readonly '3xl': "2rem";
        readonly unified: "2rem";
    };
    readonly animations: {
        readonly spring: {
            readonly type: "spring";
            readonly stiffness: 300;
            readonly damping: 30;
        };
        readonly gentle: {
            readonly type: "spring";
            readonly stiffness: 100;
            readonly damping: 20;
        };
    };
};
export type DesignTokens = typeof DESIGN_TOKENS;
