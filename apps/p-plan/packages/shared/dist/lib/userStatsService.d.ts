export interface UserStats {
    totalTrips: number;
    totalDays: number;
    visitedRegions: {
        name: string;
        count: number;
    }[];
    stayStats: {
        totalNights: number;
        accommodationCount: number;
        types: {
            [key: string]: number;
        };
    };
    categoryStats: {
        dining: number;
        shopping: number;
        sights: number;
        transport: number;
        others: number;
    };
    topCountries: {
        name: string;
        count: number;
    }[];
}
/**
 * 사용자의 모든 여행 데이터를 집계하여 상세 통계 생성
 */
export declare const aggregateUserStats: (userId: string) => Promise<UserStats>;
