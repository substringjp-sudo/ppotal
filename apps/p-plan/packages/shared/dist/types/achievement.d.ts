export type AchievementCategory = 'firstSteps' | 'milestones' | 'cumulative' | 'destinations' | 'planning' | 'intervals' | 'duration' | 'social' | 'transport' | 'accommodation' | 'density' | 'eventTypes' | 'budget' | 'currency' | 'preparation' | 'warnings' | 'seasons' | 'records' | 'legacy' | 'geography' | 'easterEggs';
export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    category: AchievementCategory;
    hint?: string;
    maxProgress?: number;
    hidden?: boolean;
}
export interface UserAchievement {
    achievementId: string;
    unlockedAt?: string;
    currentProgress?: number;
    isUnlocked: boolean;
}
