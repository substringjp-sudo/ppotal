export type AchievementCategory = 
  | 'firstSteps'    // 1. 첫걸음
  | 'milestones'    // 2. 통산 횟수
  | 'cumulative'    // 3. 누적 일수
  | 'destinations'  // 4. 여행지 다양성
  | 'planning'      // 5. 계획 타이밍
  | 'intervals'     // 6. 여행 간격
  | 'duration'      // 7. 개별 기간
  | 'social'        // 8. 동행 및 소셜
  | 'transport'     // 9. 교통수단
  | 'accommodation' // 10. 숙소 유형
  | 'density'       // 11. 일정 밀도
  | 'eventTypes'    // 12. 일정 카테고리
  | 'budget'        // 13. 예산 및 소비
  | 'currency'      // 14. 통화 및 환율
  | 'preparation'   // 15. 체크리스트 및 준비
  | 'warnings'      // 16. 시스템 경고
  | 'seasons'       // 17. 계절별 사냥꾼
  | 'records'       // 18. 스크랩 및 기록
  | 'legacy'        // 19. 여행의 유산
  | 'geography'     // 20. 지리 및 거리
  | 'easterEggs';   // 21. 이스터에그

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  hint?: string;
  maxProgress?: number; // 0이면 단순 달성형, 1 이상이면 프로그래스형
  hidden?: boolean;     // 이스터에그 등 달성 전까지 비공개 여부
}

export interface UserAchievement {
  achievementId: string;
  unlockedAt?: string;
  currentProgress?: number;
  isUnlocked: boolean;
}
