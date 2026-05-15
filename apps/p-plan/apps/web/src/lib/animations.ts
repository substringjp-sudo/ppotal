/**
 * PPLANER - 공통 애니메이션 상수
 * Framer Motion에서 일관된 사용자 경험을 제공하기 위해 사용합니다.
 */

export const ANIMATION_EASE = [0.23, 1, 0.32, 1] as const; // Smooth, organic deceleration

export const TRANSITION_DEFAULT = {
  duration: 0.5,
  ease: ANIMATION_EASE
} as const;

export const TRANSITION_SPRING = {
  type: "spring",
  stiffness: 300,
  damping: 30
} as const;

export const TRANSITION_SPRING_BOUNCY = {
  type: "spring",
  stiffness: 400,
  damping: 20
} as const;

/**
 * 페이지 전환 애니메이션
 */
export const PAGE_TRANSITION_VARIANTS = {
  initial: {
    opacity: 0,
    y: 8,
    scale: 0.99
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1], // Custom premium ease (expo out)
      staggerChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.995,
    transition: {
      duration: 0.3,
      ease: [0.32, 0, 0.67, 0] // Custom ease (expo in)
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
