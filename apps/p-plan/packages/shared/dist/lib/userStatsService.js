"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateUserStats = void 0;
const tripService_1 = require("./tripService");
const recordService_1 = require("./recordService");
/**
 * 사용자의 모든 여행 데이터를 집계하여 상세 통계 생성
 */
const aggregateUserStats = async (userId) => {
    try {
        const summaries = await (0, tripService_1.getUserTrips)(userId);
        const travelogs = await (0, recordService_1.getUserTravelogs)(userId);
        // 각 여행의 상세 데이터를 가져와서 집계 (병렬 처리, 개별 오류 방지)
        const detailedTrips = await Promise.all(summaries.map(async (s) => {
            try {
                return await (0, tripService_1.getTrip)(s.id);
            }
            catch (e) {
                console.error(`Failed to fetch trip details for ${s.id}:`, e);
                return null;
            }
        }));
        const stats = {
            totalTrips: summaries.length,
            totalDays: 0,
            visitedRegions: [],
            stayStats: {
                totalNights: 0,
                accommodationCount: 0,
                types: {}
            },
            categoryStats: {
                dining: 0,
                shopping: 0,
                sights: 0,
                transport: 0,
                others: 0
            },
            topCountries: []
        };
        // ID를 키로 하여 중복 방지 및 정합성 확보
        const regionMap = new Map();
        const countryMap = new Map();
        detailedTrips.forEach(trip => {
            if (!trip)
                return;
            // 1. 기간 집계
            if (trip.dates && !trip.dates.isUndecided && trip.dates.startDate && trip.dates.endDate) {
                const start = new Date(trip.dates.startDate);
                const end = new Date(trip.dates.endDate);
                const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                stats.totalDays += diff;
            }
            // 2. 지역 및 국가 집계 (ID 기반 최우선)
            if (trip.locations?.regions) {
                trip.locations.regions.forEach(r => {
                    // ID가 있으면 ID를, 없으면 이름을 키로 사용 (정합성 확보)
                    const rid = String(r.id || r.name);
                    // 모든 지역 카운트 (ID를 키로 저장하되 이름은 표시용으로 유지)
                    const rData = regionMap.get(rid) || { name: r.name, count: 0 };
                    regionMap.set(rid, { ...rData, count: rData.count + 1 });
                    if (r.type === 'country') {
                        const cid = String(r.countryId || r.id || r.name);
                        const cData = countryMap.get(cid) || { name: r.name, count: 0 };
                        countryMap.set(cid, { ...cData, count: cData.count + 1 });
                    }
                });
            }
            // 3. 숙박 집계
            if (trip.accommodation) {
                stats.stayStats.accommodationCount += trip.accommodation.length;
                trip.accommodation.forEach(acc => {
                    // 숙소 유형 카운트 (있을 경우)
                    const type = acc.type || 'hotel';
                    stats.stayStats.types[type] = (stats.stayStats.types[type] || 0) + 1;
                });
            }
            // 4. 카테고리별 이벤트 집계 (식사, 쇼핑 등)
            if (trip.dailyTimeline) {
                trip.dailyTimeline.forEach(day => {
                    if (day.events) {
                        day.events.forEach((event) => {
                            const category = event.category?.toLowerCase() || '';
                            if (category.includes('dining') || category.includes('food') || category.includes('restaurant')) {
                                stats.categoryStats.dining++;
                            }
                            else if (category.includes('shopping') || category.includes('mall') || category.includes('market')) {
                                stats.categoryStats.shopping++;
                            }
                            else if (category.includes('sight') || category.includes('attraction') || category.includes('museum')) {
                                stats.categoryStats.sights++;
                            }
                            else if (category.includes('transport') || category.includes('move') || category.includes('flight')) {
                                stats.categoryStats.transport++;
                            }
                            else {
                                stats.categoryStats.others++;
                            }
                        });
                    }
                });
            }
        });
        // Map을 배열로 변환 및 정렬
        stats.visitedRegions = Array.from(regionMap.entries())
            .map(([_, data]) => ({ name: data.name, count: data.count }))
            .sort((a, b) => b.count - a.count);
        stats.topCountries = Array.from(countryMap.entries())
            .map(([_, data]) => ({ name: data.name, count: data.count }))
            .sort((a, b) => b.count - a.count);
        return stats;
    }
    catch (error) {
        console.error("Error aggregating user stats:", error);
        return {
            totalTrips: 0,
            totalDays: 0,
            visitedRegions: [],
            stayStats: { totalNights: 0, accommodationCount: 0, types: {} },
            categoryStats: { dining: 0, shopping: 0, sights: 0, transport: 0, others: 0 },
            topCountries: []
        };
    }
};
exports.aggregateUserStats = aggregateUserStats;
