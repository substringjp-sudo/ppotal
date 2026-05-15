"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTravelStats = void 0;
const ACHIEVEMENTS = [
    { id: 'first_step', title: '첫 번째 발자국', description: '첫 번째 여행 계획을 세웠습니다.', icon: '👣', maxXp: 100, category: 'milestones' },
    { id: 'world_traveler', title: '세계 여행자', description: '3개 이상의 국가를 방문했습니다.', icon: '🌍', maxXp: 500, category: 'destinations' },
    { id: 'record_master', title: '기록의 마스터', description: '10개 이상의 트래블로그를 작성했습니다.', icon: '✍️', maxXp: 300, category: 'records' },
    { id: 'planner', title: '철두철미 플래너', description: '일정 밀도가 매우 높은 여행을 계획했습니다.', icon: '📅', maxXp: 200, category: 'planning' },
];
const CATEGORY_MAP = {
    'meal': { label: '식사', icon: '🍴' },
    'sightseeing': { label: '관광', icon: '📸' },
    'activity': { label: '액티비티', icon: '🏄' },
    'shopping': { label: '쇼핑', icon: '🛍️' },
    'transport': { label: '이동', icon: '🚌' },
    'accommodation': { label: '숙소', icon: '🏨' },
    'other': { label: '기타', icon: '✨' }
};
const XP_GAIN = {
    TRIP_PLANNED: 20,
    TRIP_COMPLETED_BASE: 100,
    TRIP_PER_DAY: 20,
    TRIP_PER_FLIGHT: 50,
    TRIP_PER_STAY: 30,
    CITY_PLANNED: 10,
    CITY_COMPLETED: 50,
    LOG_BASE: 60,
    LOG_PREFECTURE: 40,
    LOG_CITY: 25,
    EMOTION_MULTIPLIER: 5,
    EVENT_ACTION: 5
};
/**
 * Calculates comprehensive travel statistics and analysis from user data.
 */
const calculateTravelStats = (trips, regionNameMap, wishlistItems = [], travelogs = []) => {
    // 1. Initialize counters and trackers
    let totalDays = 0;
    let totalPlannedDays = 0;
    let flightCount = 0;
    let accommodationCount = 0;
    let totalEvents = 0;
    let foodCount = 0;
    let activityCount = 0;
    let totalLogs = 0;
    const visitedCountryIds = new Set();
    const visitedPrefectureIds = new Set();
    const visitedCityIds = new Set();
    const idToNameMap = new Map();
    const mastery = {};
    // 2. Helper functions
    const normalizeId = (id, type) => {
        if (id === null || id === undefined)
            return undefined;
        const sId = String(id).trim();
        if (!sId || sId === 'undefined' || sId === 'null')
            return undefined;
        // Ensure format is type_id
        if (sId.startsWith(`${type}_`))
            return sId;
        // Remove existing prefixes if they don't match the current type
        const cleanId = sId.replace(/^(country|prefecture|city)_/, '');
        return `${type}_${cleanId}`;
    };
    const getMasteryNode = (type, id, name) => ({
        id,
        name: name || '알 수 없는 지역',
        type,
        xp: 0,
        maxXp: type === 'country' ? 2000 : (type === 'prefecture' ? 1000 : 500),
        level: 1,
        isMastered: false,
        sources: [],
        stats: {
            visitCount: 0,
            plannedCount: 0,
            days: 0,
            spentKrw: 0,
            events: 0,
            places: [],
            airports: [],
            accommodations: []
        }
    });
    // 3. Main processing loop for Trips
    trips.forEach(trip => {
        try {
            if (!trip)
                return;
            // Safe date calculation
            let tripDays = 0;
            const isPlanned = trip.dates?.isUndecided === false && !!trip.dates?.startDate && !!trip.dates?.endDate;
            if (trip.dates?.startDate && trip.dates?.endDate) {
                const start = new Date(trip.dates.startDate);
                const end = new Date(trip.dates.endDate);
                if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                    tripDays = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                }
            }
            totalDays += tripDays;
            if (isPlanned)
                totalPlannedDays += tripDays;
            // Safe flight/accommodation counts
            const currentFlights = Number(trip.flightCount || trip.flights?.length || 0) || 0;
            const currentHotels = Number(trip.accommodationCount || trip.accommodation?.length || 0) || 0;
            flightCount += currentFlights;
            accommodationCount += currentHotels;
            const regions = Array.isArray(trip.locations?.regions) ? trip.locations.regions : [];
            const xpGain = isPlanned ? XP_GAIN.TRIP_PLANNED : (XP_GAIN.TRIP_COMPLETED_BASE + (tripDays * XP_GAIN.TRIP_PER_DAY) + (currentFlights * XP_GAIN.TRIP_PER_FLIGHT) + (currentHotels * XP_GAIN.TRIP_PER_STAY));
            // Process regions in a way that ensures hierarchy
            regions.forEach(r => {
                if (!r || !r.id)
                    return;
                const normalizedIdVal = normalizeId(r.id, r.type);
                if (!normalizedIdVal)
                    return;
                // 1. Ensure Country exists
                if (r.type === 'country' || r.countryId) {
                    const countryId = r.type === 'country' ? normalizedIdVal : normalizeId(r.countryId, 'country');
                    if (countryId) {
                        visitedCountryIds.add(countryId);
                        if (!mastery[countryId]) {
                            mastery[countryId] = { ...getMasteryNode('country', countryId, r.type === 'country' ? r.name : r.countryName), prefectures: {} };
                        }
                        const cNode = mastery[countryId];
                        if (r.type === 'country') {
                            cNode.xp += xpGain;
                            cNode.sources.push({ type: 'trip', title: trip.title, id: trip.id });
                            const tripBudget = trip.budget;
                            if (tripBudget && typeof tripBudget.spent === 'number' && tripBudget.spent > 0) {
                                const countryCount = regions.filter(reg => reg?.type === 'country').length || 1;
                                cNode.stats.spentKrw = (cNode.stats.spentKrw || 0) + (tripBudget.spent / countryCount);
                            }
                        }
                    }
                }
                // 2. Ensure Prefecture exists within Country
                if ((r.type === 'prefecture' || r.prefectureId) && r.countryId) {
                    const countryId = normalizeId(r.countryId, 'country');
                    const prefId = r.type === 'prefecture' ? normalizedIdVal : normalizeId(r.prefectureId, 'prefecture');
                    if (mastery[countryId]) {
                        visitedPrefectureIds.add(prefId);
                        const cNode = mastery[countryId];
                        if (!cNode.prefectures)
                            cNode.prefectures = {};
                        if (!cNode.prefectures[prefId]) {
                            cNode.prefectures[prefId] = { ...getMasteryNode('prefecture', prefId, r.type === 'prefecture' ? r.name : r.prefectureName), cities: {} };
                        }
                        const pNode = cNode.prefectures[prefId];
                        if (r.type === 'prefecture') {
                            pNode.xp += xpGain;
                            pNode.sources.push({ type: 'trip', title: trip.title, id: trip.id });
                        }
                    }
                }
                // 3. Process City
                if (r.type === 'city' && r.countryId && r.prefectureId) {
                    const countryId = normalizeId(r.countryId, 'country');
                    const prefId = normalizeId(r.prefectureId, 'prefecture');
                    const cityId = normalizedIdVal;
                    if (mastery[countryId]) {
                        const cNode = mastery[countryId];
                        if (cNode.prefectures && cNode.prefectures[prefId]) {
                            visitedCityIds.add(cityId);
                            const prefNode = cNode.prefectures[prefId];
                            if (!prefNode.cities)
                                prefNode.cities = {};
                            if (!prefNode.cities[cityId]) {
                                prefNode.cities[cityId] = { ...getMasteryNode('city', cityId, r.name), sources: [] };
                            }
                            const cityXpGain = isPlanned ? XP_GAIN.CITY_PLANNED : XP_GAIN.CITY_COMPLETED;
                            const cityNode = prefNode.cities[cityId];
                            cityNode.xp += cityXpGain;
                            cityNode.stats.visitCount++;
                            cityNode.sources.push({ type: 'trip', title: trip.title, id: trip.id });
                        }
                    }
                }
            });
            // Process events for timeline
            if ('dailyTimeline' in trip && Array.isArray(trip.dailyTimeline)) {
                trip.dailyTimeline.forEach(day => {
                    if (!day || !Array.isArray(day.events))
                        return;
                    day.events.forEach(e => {
                        if (!e)
                            return;
                        totalEvents++;
                        const mainCat = (e.mainCategory || '기타');
                        if (mainCat === '식사' || mainCat === 'meal')
                            foodCount++;
                        if (mainCat === '방문' || mainCat === '참여' || mainCat === 'sightseeing' || mainCat === 'activity')
                            activityCount++;
                    });
                });
            }
        }
        catch (err) {
            console.error('Error processing trip in statsCalculator:', err);
        }
    });
    // 4. Travelog Analysis
    let logEmotionXP = 0;
    (travelogs || []).forEach(log => {
        try {
            if (!log)
                return;
            totalLogs++;
            if (!Array.isArray(log.timeline))
                return;
            log.timeline.forEach(day => {
                if (!day || !Array.isArray(day.events))
                    return;
                day.events.forEach(event => {
                    if (!event)
                        return;
                    // XP from emotions
                    if (event.emotion) {
                        const joy = Number(event.emotion.joy) || 0;
                        const sadness = Number(event.emotion.sadness) || 0;
                        const anger = Number(event.emotion.anger) || 0;
                        logEmotionXP += Math.floor((joy + sadness + anger) * XP_GAIN.EMOTION_MULTIPLIER);
                    }
                    // Regional XP from logs
                    const loc = event.location;
                    if (loc && loc.countryId) {
                        const cId = normalizeId(loc.countryId, 'country');
                        const pId = normalizeId(loc.prefectureId, 'prefecture');
                        const ctId = normalizeId(loc.cityId, 'city');
                        if (mastery[cId]) {
                            mastery[cId].xp += XP_GAIN.LOG_BASE;
                            if (mastery[cId].prefectures?.[pId]) {
                                mastery[cId].prefectures[pId].xp += XP_GAIN.LOG_PREFECTURE;
                                if (mastery[cId].prefectures[pId].cities?.[ctId]) {
                                    mastery[cId].prefectures[pId].cities[ctId].xp += XP_GAIN.LOG_CITY;
                                }
                            }
                        }
                    }
                });
            });
        }
        catch (err) {
            console.error('Error processing travelog in statsCalculator:', err);
        }
    });
    // 5. Final Calculation & Dynamic Analysis
    let totalXP = Object.values(mastery).reduce((acc, c) => acc + (Number(c.xp) || 0), 0);
    // Combine various XP sources
    totalXP += (foodCount * XP_GAIN.EVENT_ACTION) + (activityCount * XP_GAIN.EVENT_ACTION) + logEmotionXP;
    if (isNaN(totalXP) || !isFinite(totalXP))
        totalXP = 0;
    const level = Math.floor(totalXP / 500) + 1;
    // --- Advanced Persona Analysis ---
    // T (Target-oriented): Density of planned events vs days
    const avgEventsPerDay = totalDays > 0 ? totalEvents / totalDays : 0;
    const planningDensity = totalDays > 0 ? (totalEvents / totalDays) * 10 : 0;
    const persona_t = Math.min(100, (visitedCountryIds.size * 5) + (planningDensity * 5));
    // P (Planner): Preparation lead time and plan completion ratio
    const planningRatio = totalPlannedDays / Math.max(1, totalDays);
    const persona_p = Math.min(100, (planningRatio * 70) + (totalEvents > 20 ? 30 : totalEvents * 1.5));
    // A (Active): High activity ratio and frequency
    const activityRatio = activityCount / Math.max(1, totalEvents);
    const persona_a = Math.min(100, (activityRatio * 60) + (avgEventsPerDay * 8));
    // TH (Trendy): Wishlist usage and emotional exploration
    const logRatio = totalLogs / Math.max(1, trips.length);
    const persona_th = Math.min(100, ((wishlistItems?.length || 0) * 4) + (logRatio * 20) + (logEmotionXP / 50));
    const persona = { t: persona_t, p: persona_p, a: persona_a, th: persona_th };
    // --- Dynamic MBTI Prediction ---
    // E (Extraversion) vs I (Introversion): Based on average participants
    const avgParticipants = trips.reduce((acc, t) => {
        const p = t.participants;
        const count = Array.isArray(p) ? p.length : (typeof p === 'number' ? p : 1);
        return acc + count;
    }, 0) / Math.max(1, trips.length);
    // S (Sensing) vs N (Intuition): Category diversity vs specific themes
    // T (Thinking) vs F (Feeling): Budget precision vs emotional depth
    const emotionDepth = travelogs.length > 0 ? logEmotionXP / travelogs.length : 0;
    // J (Judging) vs P (Perceiving): Planning ratio
    const mbti = (avgParticipants > 2 ? "E" : "I") +
        (activityRatio > 0.4 ? "N" : "S") +
        (emotionDepth > 50 ? "F" : "T") +
        (planningRatio > 0.7 ? "J" : "P");
    // --- Fantasy Class Assignment ---
    const getFantasyClass = () => {
        if (persona.p > 80 && persona.t > 70)
            return "Grand Strategist (대마법사)";
        if (persona.a > 80 && persona.t > 60)
            return "Paladin Explorer (성기사)";
        if (persona.a > 70 && persona.p < 40)
            return "Shadow Assassin (암살자)";
        if (persona.th > 70 && persona.p < 50)
            return "Ethereal Bard (음유시인)";
        if (persona.t > 80)
            return "Dragon Slayer (용사)";
        return "Free Spirit Voyager (방랑자)";
    };
    // --- Helper for Wishlist Insights ---
    const calculateWishlistInsights = () => {
        if (!wishlistItems || wishlistItems.length === 0)
            return undefined;
        const regionCounts = {};
        const categoryCounts = {};
        wishlistItems.forEach(item => {
            if (!item)
                return;
            const countryId = item.place?.countryId;
            const countryName = item.place?.country || countryId || '알 수 없는 지역';
            if (countryId) {
                if (!regionCounts[countryId])
                    regionCounts[countryId] = { name: countryName, count: 0 };
                regionCounts[countryId].count++;
            }
            const mainCat = item.mainCategory || 'other';
            const categoryLabel = CATEGORY_MAP[mainCat]?.label || '기타';
            categoryCounts[categoryLabel] = (categoryCounts[categoryLabel] || 0) + 1;
        });
        const preferredRegions = Object.entries(regionCounts)
            .map(([id, data]) => ({ id, name: data.name, count: data.count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        const placeTendency = Object.entries(categoryCounts)
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count);
        return { preferredRegions, placeTendency, description: "당신의 여행 취향을 분석한 결과, 새로운 도전을 즐기는 성향이 강하시군요!" };
    };
    // --- Helper for Planning Style ---
    const calculatePlanningStyle = () => {
        if (trips.length === 0)
            return undefined;
        return {
            density: avgEventsPerDay > 5 ? 'intense' : avgEventsPerDay > 2 ? 'balanced' : 'relaxed',
            categoryPreference: activityRatio > 0.5
                ? [{ category: '액티비티', weight: 0.6 }, { category: '관광', weight: 0.4 }]
                : [{ category: '식사', weight: 0.7 }, { category: '휴식', weight: 0.3 }],
            preparationLeadTime: 0,
            styleDescription: avgEventsPerDay > 5 ? "매우 꼼꼼하고 열정적인 플래닝 스타일을 가지고 계시네요!" : "여유롭고 자유로운 여행을 선호하시는군요.",
            characteristics: planningRatio > 0.8 ? ['철저한 계획', '시간 엄수'] : ['즉흥적', '유연함']
        };
    };
    // Update Mastery completion status with XP capping
    Object.values(mastery).forEach(c => {
        c.isMastered = c.xp >= c.maxXp;
        c.xp = Math.min(c.xp, c.maxXp);
        if (c.prefectures) {
            Object.values(c.prefectures).forEach(p => {
                p.isMastered = p.xp >= p.maxXp;
                p.xp = Math.min(p.xp, p.maxXp);
                if (p.cities) {
                    Object.values(p.cities).forEach(city => {
                        city.isMastered = city.xp >= city.maxXp;
                        city.xp = Math.min(city.xp, city.maxXp);
                    });
                }
            });
        }
    });
    return {
        totalXP, level,
        title: ['초보 여행자', '길 위의 방랑자', '노련한 탐험가', '세계의 지배자', '전설의 개척자'][Math.min(level - 1, 4)],
        fantasyClass: getFantasyClass(),
        mbti, persona,
        badges: ACHIEVEMENTS.map(ach => {
            const isUnlocked = (ach.id === 'first_step' && trips.length > 0) ||
                (ach.id === 'world_traveler' && visitedCountryIds.size >= 3) ||
                (ach.id === 'record_master' && totalLogs >= 10) ||
                (ach.id === 'planner' && planningRatio > 0.8);
            return { ...ach, isUnlocked, progress: isUnlocked ? 100 : 0 };
        }),
        breakdown: {
            countries: visitedCountryIds.size,
            cities: visitedCityIds.size,
            totalDays,
            totalKm: flightCount * 1200 + totalDays * 12,
            averageProgress: ((totalXP % 500) / 500) * 100,
            visitedCities: Array.from(visitedCityIds),
            visitedCountries: Array.from(visitedCountryIds)
        },
        mastery, infiniteLog: [],
        wishlistInsights: calculateWishlistInsights(),
        planningStyle: calculatePlanningStyle()
    };
};
exports.calculateTravelStats = calculateTravelStats;
