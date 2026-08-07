/**
 * PPLANER Design Tokens
 * 프로젝트 전반의 시각적 일관성을 유지하기 위한 디자인 토큰 시스템입니다.
 */

export const DESIGN_TOKENS = {
    colors: {
        primary: {
            DEFAULT: '#4f46e5', // Indigo 600 — 기본 액션 · 활성 상태
            hover: '#4338ca',   // Indigo 700
            press: '#3730a3',   // Indigo 800
            soft: 'rgba(79, 70, 229, 0.08)',
            focusRing: 'rgba(79, 70, 229, 0.28)',
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
        // 카테고리 색 — 지도 마커 · 간트 바 · 이벤트 카드 좌측 레일에서 동일하게 쓴다.
        // '방문 완료(visited)'는 옛 브랜드 오렌지를 물려받은 상태 전용 색이지, 브랜드색이 아니다.
        status: {
            visited: '#ec5b13',  // 구 브랜드 오렌지 — 방문 완료 전용
            planned: '#3b82f6',  // Blue 500
            mastered: '#10b981', // Emerald 500
            danger: '#ef4444',   // Red 500
            info: '#0ea5e9',     // Cyan 500 — 이동 · 교통
            accent: '#8b5cf6',   // Purple 500 — 관광 · 인사이트
        }
    },

    // 그라디언트는 D-day 카드 한 곳에만 허용한다(gradients.dday). 나머지 곳은 단색 primary.
    gradients: {
        dday: 'linear-gradient(160deg, #4f46e5 0%, #4338ca 100%)',
        surface: 'linear-gradient(180deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%)',
        glass: 'backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-slate-800/20',
    },

    shadows: {
        // Elevation scale — e0(border only)는 별도 정의 없이 border만 쓴다.
        e1: '0 1px 2px rgba(15, 23, 42, .05)',   // 카드 기본
        e2: '0 4px 14px -4px rgba(15, 23, 42, .10)', // hover · 드롭다운
        e3: '0 20px 44px -16px rgba(15, 23, 42, .28)', // 모달 · 시트
    },

    // 크기별 반경 스케일. 전역 단일 반경(unified)은 폐기 — 카드 안에 카드가 있는
    // 대시보드에서 계층을 지워버렸다.
    radius: {
        pill: '999px',   // chip / pill / avatar
        badge: '8px',    // badge / tag
        control: '10px', // input / button
        inner: '14px',   // inner block
        card: '20px',    // card / widget / panel
        sheet: '28px',   // modal / sheet / drawer
    },

    // 모션 토큰 — 짧은 반응(≤200ms)엔 ease-out, 긴 이동(≥240ms)엔 ease-emph.
    motion: {
        instant: 120,
        fast: 160,
        base: 240,
        slow: 320,
        easeOut: [0, 0, .2, 1] as [number, number, number, number],
        easeEmph: [.2, .8, .2, 1] as [number, number, number, number],
    },

    animations: {
        spring: {
            type: "spring",
            stiffness: 260,
            damping: 24
        },
        gentle: {
            type: "spring",
            stiffness: 100,
            damping: 20
        }
    }
} as const;

export type DesignTokens = typeof DESIGN_TOKENS;
