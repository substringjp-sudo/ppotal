/**
 * PPLANER - 공통 애니메이션 상수
 * Framer Motion에서 일관된 사용자 경험을 제공하기 위해 사용합니다.
 */

// 기존 강조 커브 — 240ms 이상 구간(뷰 전환 · 패널 열림)에서만 쓴다.
// 호버 · 포커스처럼 짧은 반응은 EASE_OUT을 쓴다.
export const ANIMATION_EASE = [0.23, 1, 0.32, 1] as const; // Smooth, organic deceleration

export const TRANSITION_DEFAULT = {
  duration: 0.5,
  ease: ANIMATION_EASE
} as const;

// 드래그 정렬 복귀 전용 스프링 (위젯 · 타임라인 카드)
export const TRANSITION_SPRING = {
  type: "spring",
  stiffness: 260,
  damping: 24
} as const;

export const TRANSITION_SPRING_BOUNCY = {
  type: "spring",
  stiffness: 400,
  damping: 20
} as const;

/**
 * 모션 토큰 — duration(ms)과 easing 곡선.
 *   instant  120ms  눌림 · 체크박스
 *   fast     160ms  호버 · 포커스 · 색 전환                → EASE_OUT
 *   base     240ms  뷰 전환 · 패널 열림                     → EASE_EMPH
 *   slow     320ms  시트 · 모달 · 드로어                    → EASE_EMPH
 * ≤200ms 반응엔 EASE_OUT, ≥240ms 이동엔 EASE_EMPH를 쓴다.
 */
export const MOTION_MS = {
  instant: 120,
  fast: 160,
  base: 240,
  slow: 320,
} as const;

export const EASE_OUT = [0, 0, 0.2, 1] as const;
export const EASE_EMPH = [0.2, 0.8, 0.2, 1] as const;

export const TRANSITION_FAST = { duration: MOTION_MS.fast / 1000, ease: EASE_OUT } as const;
export const TRANSITION_BASE = { duration: MOTION_MS.base / 1000, ease: EASE_EMPH } as const;
export const TRANSITION_SLOW = { duration: MOTION_MS.slow / 1000, ease: EASE_EMPH } as const;

/**
 * 페이지 전환 애니메이션 (Next.js App Router 호환 프레임 깜빡임 제로 페이드인)
 */
export const PAGE_TRANSITION_VARIANTS = {
  initial: {
    opacity: 0,
    y: 4
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.18,
      ease: ANIMATION_EASE
    }
  }
} as const;

/**
 * 요소 순차 등장 애니메이션 (Stagger)
 */
export const STAGGER_CONTAINER = {
  animate: {
    transition: {
      staggerChildren: 0.05
    }
  }
} as const;

export const STAGGER_ITEM_VARIANTS = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: ANIMATION_EASE }
  }
} as const;
