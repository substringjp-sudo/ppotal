import { TripDocument, TripSummary } from '../types/trip';
import { WishlistItem } from '../types/wishlist';
import { Travelog } from '../types/record';
import { MASTERY_EXP_VALUES, MASTERY_THRESHOLDS } from './constants/common';

export interface LocationCityNode {
    id: string | null;
    name: string;
    key: string;
    tripCount: number;     // 실제 방문 횟수
    plannedCount: number;  // 계획된 여행 횟수
    wishlistCount: number; // 위시리스트 횟수
    totalDays: number;
    wishlistItems: WishlistItem[];
    trips: (TripDocument | TripSummary)[];
    travelogs: Travelog[];
    xp: number;
    maxXp: number;
    isMastered: boolean;
    isPlanned?: boolean;   // 현재 계획 중인지 여부 (UI용)
}

export interface LocationPrefNode {
    id: string | null;
    name: string;
    key: string;
    tripCount: number;
    plannedCount: number;
    wishlistCount: number;
    totalDays: number;
    cities: Record<string, LocationCityNode>;
    wishlistItems: WishlistItem[];
    trips: (TripDocument | TripSummary)[];
    travelogs: Travelog[];
    xp: number;
    maxXp: number;
    isMastered: boolean;
    isPlanned?: boolean;
}

export interface LocationCountryNode {
    id: string | null;
    name: string;
    key: string;
    tripCount: number;
    plannedCount: number;
    wishlistCount: number;
    totalDays: number;
    prefectures: Record<string, LocationPrefNode>;
    wishlistItems: WishlistItem[];
    trips: (TripDocument | TripSummary)[];
    travelogs: Travelog[];
    xp: number;
    maxXp: number;
    isMastered: boolean;
    isPlanned?: boolean;
}

export interface LocationStats {
    summary: {
        visited: { countries: number; prefectures: number; cities: number };
        planned: { countries: number; prefectures: number; cities: number }; // 추가
        wishlist: { countries: number; prefectures: number; cities: number };
        unlocatedWishlistCount: number;
    };
    countries: Record<string, LocationCountryNode>;
}

// ── 헬퍼 ──────────────────────────────────────────────────────────────────

function strKey(name: string): string {
    return `str:${name.trim().toLowerCase()}`;
}

function getOrCreateCountry(
    countries: Record<string, LocationCountryNode>,
    key: string,
    id: string | null,
    name: string
): LocationCountryNode {
    if (!countries[key]) {
        countries[key] = { 
            id, name, key, 
            tripCount: 0, plannedCount: 0, wishlistCount: 0, 
            totalDays: 0, prefectures: {}, wishlistItems: [], trips: [], travelogs: [],
            xp: 0, maxXp: MASTERY_THRESHOLDS.COUNTRY, isMastered: false 
        };
    }
    return countries[key];
}

function getOrCreatePref(
    prefectures: Record<string, LocationPrefNode>,
    key: string,
    id: string | null,
    name: string
): LocationPrefNode {
    if (!prefectures[key]) {
        prefectures[key] = { 
            id, name, key, 
            tripCount: 0, plannedCount: 0, wishlistCount: 0, 
            totalDays: 0, cities: {}, wishlistItems: [], trips: [], travelogs: [],
            xp: 0, maxXp: MASTERY_THRESHOLDS.PREFECTURE, isMastered: false 
        };
    }
    return prefectures[key];
}

function getOrCreateCity(
    cities: Record<string, LocationCityNode>,
    key: string,
    id: string | null,
    name: string
): LocationCityNode {
    if (!cities[key]) {
        cities[key] = { 
            id, name, key, 
            tripCount: 0, plannedCount: 0, wishlistCount: 0, 
            totalDays: 0, wishlistItems: [], trips: [], travelogs: [],
            xp: 0, maxXp: MASTERY_THRESHOLDS.CITY, isMastered: false 
        };
    }
    return cities[key];
}

// ── 메인 함수 ──────────────────────────────────────────────────────────────

export function calculateLocationStats(
    trips: (TripDocument | TripSummary)[],
    wishlistItems: WishlistItem[],
    travelogs: Travelog[] = []
): LocationStats {
    const countries: Record<string, LocationCountryNode> = {};

    // ── 1. 여행 기록(Travelogs - 실제 방문 데이터) 순회 ────────────────────────
    // 계획 데이터보다 실제 기록 데이터를 먼저 처리하여 방문 여부를 우선 확정합니다.
    travelogs.forEach(log => {
        let tripDays = 0;
        if (log.startDate && log.endDate) {
            const start = new Date(log.startDate);
            const end = new Date(log.endDate);
            tripDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        }

        // 이번 travelog에서 등장한 지역 ID 추적 (중복 카운팅 방지)
        const seenCountryKeys = new Set<string>();
        const seenPrefKeys = new Set<string>();
        const seenCityKeys = new Set<string>();

        const dailyTimeline = log.timeline || [];
        dailyTimeline.forEach(day => {
            const events = day.events || [];
            events.forEach(event => {
                const loc = event.location;
                if (!loc) return;

                const countryId = loc.countryId ? String(loc.countryId) : null;
                const prefId = loc.prefectureId ? String(loc.prefectureId) : null;
                const cityId = loc.cityId ? String(loc.cityId) : null;

                if (!countryId) return;

                // 국가 노드 업데이트
                const cKey = countryId;
                const cNode = getOrCreateCountry(countries, cKey, countryId, loc.country || 'Unknown');
                if (!seenCountryKeys.has(cKey)) {
                    cNode.tripCount++;
                    cNode.totalDays += tripDays;
                    cNode.travelogs.push(log);
                    seenCountryKeys.add(cKey);
                }

                // 도도부현 노드 업데이트
                if (prefId) {
                    const pKey = prefId;
                    const pNode = getOrCreatePref(cNode.prefectures, pKey, prefId, loc.prefecture || 'Unknown');
                    if (!seenPrefKeys.has(pKey)) {
                        pNode.tripCount++;
                        pNode.totalDays += tripDays;
                        pNode.travelogs.push(log);
                        seenPrefKeys.add(pKey);
                    }

                    // 도시 노드 업데이트
                    if (cityId) {
                        const tKey = cityId;
                        const tNode = getOrCreateCity(pNode.cities, tKey, cityId, loc.city || 'Unknown');
                        if (!seenCityKeys.has(tKey)) {
                            tNode.tripCount++;
                            tNode.totalDays += tripDays;
                            tNode.travelogs.push(log);
                            seenCityKeys.add(tKey);
                        }
                    }
                }
            });
        });
    });

    // ── 2. 여행 계획(Trips) 순회 ───────────────────────────────────────────
    trips.forEach(trip => {
        let tripDays = 0;
        if (trip.dates?.startDate && trip.dates?.endDate && !trip.dates.isUndecided) {
            const start = new Date(trip.dates.startDate);
            const end = new Date(trip.dates.endDate);
            tripDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        }

        const regions = trip.locations?.regions ?? [];

        const now = new Date();
        const endDate = trip.dates?.endDate ? new Date(trip.dates.endDate) : null;
        const isFuture = endDate ? endDate > now : true;
        const isDraft = !trip.dates?.endDate || trip.planningStatus === 'ideation' || trip.planningStatus === 'tentative';
        const isPlanned = isFuture || isDraft;

        const seenCountryKeys = new Set<string>();
        const seenPrefKeys = new Set<string>();
        const seenCityKeys = new Set<string>();

        // 2.1 country 노드 업데이트
        regions.filter(r => r && r.type === 'country' && r.id).forEach(r => {
            const key = String(r.id);
            const node = getOrCreateCountry(countries, key, String(r.id), r.name || 'Unknown');
            if (!seenCountryKeys.has(key)) {
                if (isPlanned) {
                    node.plannedCount++;
                    node.isPlanned = true;
                } else {
                    node.tripCount++;
                }
                node.totalDays += tripDays;
                node.trips.push(trip);
                seenCountryKeys.add(key);
            }
        });

        // 2.2 prefecture 노드 업데이트
        regions.filter(r => r && r.type === 'prefecture' && r.id && r.countryId != null).forEach(r => {
            const countryKey = String(r.countryId);
            const countryNode = countries[countryKey];
            if (!countryNode) return;

            const prefKey = String(r.id);
            const prefNode = getOrCreatePref(countryNode.prefectures, prefKey, String(r.id), r.name || 'Unknown');
            if (!seenPrefKeys.has(prefKey)) {
                if (isPlanned) {
                    prefNode.plannedCount++;
                    prefNode.isPlanned = true;
                } else {
                    prefNode.tripCount++;
                }
                prefNode.totalDays += tripDays;
                prefNode.trips.push(trip);
                seenPrefKeys.add(prefKey);
            }
        });

        // 2.3 city 노드 업데이트
        regions.filter(r => r && r.type === 'city' && r.id && r.countryId != null && r.prefectureId != null).forEach(r => {
            const countryKey = String(r.countryId);
            const prefKey = String(r.prefectureId);
            const countryNode = countries[countryKey];
            if (!countryNode) return;
            const prefNode = countryNode.prefectures[prefKey];
            if (!prefNode) return;

            const cityKey = String(r.id);
            const cityNode = getOrCreateCity(prefNode.cities, cityKey, String(r.id), r.name || 'Unknown');
            if (!seenCityKeys.has(cityKey)) {
                if (isPlanned) {
                    cityNode.plannedCount++;
                    cityNode.isPlanned = true;
                } else {
                    cityNode.tripCount++;
                }
                cityNode.totalDays += tripDays;
                cityNode.trips.push(trip);
                
                if (!seenPrefKeys.has(prefKey)) {
                    prefNode.trips.push(trip);
                }
                if (!seenCountryKeys.has(countryKey)) {
                    countryNode.trips.push(trip);
                }
                seenCityKeys.add(cityKey);
            }
        });
    });

    // ── 3. 위시리스트 순회 ────────────────────────────────────────────────
    let unlocatedWishlistCount = 0;

    wishlistItems.forEach(item => {
        const place = item.place;
        
        if (!place?.countryId) {
            unlocatedWishlistCount++;
            return;
        }

        const countryKey = String(place.countryId);
        const countryNode = getOrCreateCountry(countries, countryKey, String(place.countryId), place.country || 'Unknown');
        
        countryNode.wishlistCount++;
        countryNode.wishlistItems.push(item);

        if (!place.prefectureId) return;
        
        const prefKey = String(place.prefectureId);
        const prefNode = getOrCreatePref(countryNode.prefectures, prefKey, String(place.prefectureId), place.prefecture || 'Unknown');
        
        prefNode.wishlistCount++;
        prefNode.wishlistItems.push(item);

        if (!place.cityId) return;

        const cityKey = String(place.cityId);
        const cityNode = getOrCreateCity(prefNode.cities, cityKey, String(place.cityId), place.city || 'Unknown');

        cityNode.wishlistCount++;
        cityNode.wishlistItems.push(item);
    });

    // ── 4. 숙련도 및 후처리 ──────────────────────────────────────────────
    const XP = { 
        COUNTRY: MASTERY_EXP_VALUES.COUNTRY_VISIT, 
        PREF: MASTERY_EXP_VALUES.PREFECTURE_VISIT, 
        CITY: MASTERY_EXP_VALUES.CITY_VISIT, 
        DAY: MASTERY_EXP_VALUES.DAY_STAY 
    };

    Object.values(countries).forEach(cNode => {
        if (cNode.tripCount > 0 || cNode.plannedCount > 0) cNode.xp += XP.COUNTRY;
        cNode.xp += Math.min(MASTERY_EXP_VALUES.MAX_DAY_BONUS_COUNTRY, cNode.totalDays * XP.DAY);

        Object.values(cNode.prefectures).forEach(pNode => {
            if (pNode.tripCount > 0 || pNode.plannedCount > 0) {
                pNode.xp += XP.PREF;
                cNode.xp += XP.PREF;
            }
            pNode.xp += Math.min(MASTERY_EXP_VALUES.MAX_DAY_BONUS_PREF, pNode.totalDays * XP.DAY);

            for (const cityNode of Object.values(pNode.cities)) {
                if (cityNode.tripCount > 0 || cityNode.plannedCount > 0) {
                    cityNode.xp += XP.CITY;
                    pNode.xp += XP.CITY;
                    cNode.xp += XP.CITY;
                }
                
                cityNode.xp += Math.min(25, cityNode.totalDays * XP.DAY);
                
                cityNode.xp = Math.min(cityNode.maxXp, cityNode.xp);
                cityNode.isMastered = cityNode.xp >= cityNode.maxXp;
            }

            pNode.xp = Math.min(pNode.maxXp, pNode.xp);
            pNode.isMastered = pNode.xp >= pNode.maxXp;
        });

        cNode.xp = Math.min(cNode.maxXp, cNode.xp);
        cNode.isMastered = cNode.xp >= cNode.maxXp;
    });

    // ── 5. summary 계산 ───────────────────────────────────────────────────
    let visitedCountries = 0, visitedPrefectures = 0, visitedCities = 0;
    let plannedCountries = 0, plannedPrefectures = 0, plannedCities = 0;
    let wishlistCountries = 0, wishlistPrefectures = 0, wishlistCities = 0;

    Object.values(countries).forEach(c => {
        if (c.tripCount > 0) visitedCountries++;
        if (c.plannedCount > 0) plannedCountries++;
        if (c.wishlistCount > 0) wishlistCountries++;

        Object.values(c.prefectures).forEach(p => {
            if (p.tripCount > 0) visitedPrefectures++;
            if (p.plannedCount > 0) plannedPrefectures++;
            if (p.wishlistCount > 0) wishlistPrefectures++;

            Object.values(p.cities).forEach(city => {
                if (city.tripCount > 0) visitedCities++;
                if (city.plannedCount > 0) plannedCities++;
                if (city.wishlistCount > 0) wishlistCities++;
            });
        });
    });

    return {
        summary: {
            visited: { countries: visitedCountries, prefectures: visitedPrefectures, cities: visitedCities },
            planned: { countries: plannedCountries, prefectures: plannedPrefectures, cities: plannedCities },
            wishlist: { countries: wishlistCountries, prefectures: wishlistPrefectures, cities: wishlistCities },
            unlocatedWishlistCount,
        },
        countries,
    };
}
