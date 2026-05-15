"use strict";
/**
 * PPLANER Design Tokens
 * 프로젝트 전반의 시각적 일관성을 유지하기 위한 디자인 토큰 시스템입니다.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DESIGN_TOKENS = void 0;
exports.DESIGN_TOKENS = {
    colors: {
        primary: {
            DEFAULT: '#ec5b13', // Brand Orange
            light: '#ff6b21',
            dark: '#c1450a',
            soft: 'rgba(236, 91, 19, 0.1)',
        },
        success: {
            DEFAULT: '#10b981', // Emerald 500
            light: '#34d399',
            dark: '#059669',
            soft: 'rgba(16, 185, 129, 0.1)',
        },
        warning: {
            DEFAULT: '#f59e0b', // Amber 500
            light: '#fbbf24',
            dark: '#d97706',
            soft: 'rgba(245, 158, 11, 0.1)',
        },
        danger: {
            DEFAULT: '#ef4444', // Red 500
            light: '#f87171',
            dark: '#dc2626',
            soft: 'rgba(239, 68, 68, 0.1)',
        },
        slate: {
            50: '#f8fafc',
            100: '#f1f5f9',
            200: '#e2e8f0',
            300: '#cbd5e1',
            400: '#94a3b8',
            500: '#64748b',
            600: '#475569',
            700: '#334155',
            800: '#1e293b',
            900: '#0f172a',
        },
        status: {
            visited: '#ea580c', // Orange 600
            planned: '#3b82f6', // Blue 500
            mastered: '#10b981', // Emerald 500
            danger: '#ef4444', // Red 500
            info: '#0ea5e9', // Cyan 500
            accent: '#8b5cf6', // Purple 500
        }
    },
    gradients: {
        primary: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
        surface: 'linear-gradient(180deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%)',
        glass: 'backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-slate-800/20',
    },
    shadows: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        premium: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        soft: '0 10px 30px -5px rgba(99, 102, 241, 0.15)',
    },
    radius: {
        sm: '0.75rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '2rem',
        '3xl': '2rem',
        unified: '2rem', // New unified token for clarity
    },
    animations: {
        spring: {
            type: "spring",
            stiffness: 300,
            damping: 30
        },
        gentle: {
            type: "spring",
            stiffness: 100,
            damping: 20
        }
    }
};
