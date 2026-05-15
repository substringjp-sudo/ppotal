"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTrip = validateTrip;
const location_validators_1 = require("./validators/location-validators");
const accommodation_validators_1 = require("./validators/accommodation-validators");
const transport_validators_1 = require("./validators/transport-validators");
const itinerary_validators_1 = require("./validators/itinerary-validators");
const budget_validators_1 = require("./validators/budget-validators");
const progress_validators_1 = require("./validators/progress-validators");
const other_validators_1 = require("./validators/other-validators");
const logistics_validators_1 = require("./validators/logistics-validators");
/**
 * 여행 일정 검증 엔진 - 분리된 검증 로직들을 통합하여 수행합니다.
 */
function validateTrip(trip, geometries, style) {
    const warnings = [];
    const loaded = trip._loadedSubCollections;
    // 로드 여부 확인 헬퍼 (로드 안된 데이터에 대한 가짜 경고 방지)
    const isLoaded = (subCol) => !loaded || loaded.includes(subCol);
    // 1. 위치 관련 검증
    (0, location_validators_1.validateAirportDistance)(trip, warnings);
    if (isLoaded('accommodation'))
        (0, location_validators_1.validateAccommodationRegion)(trip, warnings, geometries);
    if (isLoaded('dailyTimeline')) {
        (0, location_validators_1.validateEventLocations)(trip, warnings, geometries);
        (0, location_validators_1.validateLocationClusters)(trip, warnings);
    }
    // 2. 숙소 관련 검증
    if (isLoaded('accommodation')) {
        (0, accommodation_validators_1.validateAccommodationOverlap)(trip, warnings, style);
        (0, accommodation_validators_1.validateAccommodationGaps)(trip, warnings, style);
        (0, accommodation_validators_1.validateAccommodationCapacity)(trip, warnings);
        (0, accommodation_validators_1.validateAccommodationExpectedTimes)(trip, warnings, style);
        (0, accommodation_validators_1.validateNoAccommodation)(trip, warnings); // A2: 숙소 0개 탐지
        if (isLoaded('dailyTimeline')) {
            (0, accommodation_validators_1.validateCheckoutDaySchedule)(trip, warnings); // C4: 체크아웃 날 일정 경고
        }
        if (isLoaded('flights')) {
            (0, accommodation_validators_1.checkAccommodationFlightConflict)(trip, warnings);
        }
    }
    // 3. 교통 관련 검증
    if (isLoaded('flights')) {
        (0, transport_validators_1.validateFlightCompleteness)(trip, warnings, style);
        (0, transport_validators_1.validateFlightTimeRange)(trip, warnings);
        (0, transport_validators_1.validateFlightSpeed)(trip, warnings);
        (0, transport_validators_1.validateFlightLayovers)(trip, warnings);
    }
    if (isLoaded('publicTransport')) {
        (0, transport_validators_1.validatePublicTransportFeasibility)(trip, warnings);
        (0, transport_validators_1.validatePublicTransportConflicts)(trip, warnings);
    }
    if (isLoaded('driving')) {
        (0, transport_validators_1.validateDrivingFeasibility)(trip, warnings);
        (0, transport_validators_1.validateRentalCarPeriod)(trip, warnings);
        (0, transport_validators_1.validateDrivingConflicts)(trip, warnings);
    }
    // 4. 일정 관련 검증
    if (isLoaded('dailyTimeline')) {
        (0, itinerary_validators_1.validateItineraryConflicts)(trip, warnings, style);
        (0, itinerary_validators_1.validateInterEventTravel)(trip, warnings, style);
        (0, itinerary_validators_1.validateDailyIntensity)(trip, warnings, style);
        (0, itinerary_validators_1.validateEventDates)(trip, warnings);
        (0, itinerary_validators_1.validateOperatingHours)(trip, warnings);
        (0, itinerary_validators_1.validateDuplicateEvents)(trip, warnings); // B5: 중복 일정
        (0, itinerary_validators_1.validateMealTimeGaps)(trip, warnings, style); // C1: 식사 시간
        (0, itinerary_validators_1.validateConsecutiveTravelDays)(trip, warnings); // C2: 연속 이동일
        if (isLoaded('flights')) {
            (0, itinerary_validators_1.validateLastDayPressure)(trip, warnings); // B7+C8: 마지막날 과잉/공항 이동
        }
    }
    // 5. 예산 관련 검증
    (0, budget_validators_1.validateBudget)(trip, warnings, style);
    (0, budget_validators_1.validateBudgetRealism)(trip, warnings, style);
    (0, budget_validators_1.validateExpenseAnomalies)(trip, warnings); // B1: 비용 이상치
    (0, budget_validators_1.validateCurrencyMismatch)(trip, warnings); // B2: 통화 불일치
    // 6. 준비 상태 관련 검증
    if (isLoaded('checklist'))
        (0, progress_validators_1.validateChecklistProgress)(trip, warnings, style);
    if (isLoaded('prepTimeline'))
        (0, progress_validators_1.validatePrepTaskProgress)(trip, warnings, style);
    // 여행 전체 준비도 체크 (날짜 기반)
    (0, other_validators_1.checkPreparationReadiness)(trip, warnings);
    (0, other_validators_1.checkPassportRules)(trip, warnings);
    (0, other_validators_1.checkPowerAdapterRequirement)(trip, warnings);
    (0, other_validators_1.checkTravelInsurance)(trip, warnings);
    (0, other_validators_1.validateUrgentBookings)(trip, warnings); // A4: D-3 임박 예매
    if (isLoaded('dailyTimeline'))
        (0, other_validators_1.checkEmptyTimelineDays)(trip, warnings);
    // 7. 기타 정합성 및 안내
    (0, other_validators_1.validateDateConsistency)(trip, warnings);
    (0, other_validators_1.validateVisaRequirements)(trip, warnings);
    (0, other_validators_1.validateSeasonalCaution)(trip, warnings);
    (0, other_validators_1.validateCrowdPreference)(trip, warnings, style);
    // 항공-숙소 연계 (심야 도착 등)
    if (isLoaded('flights') && isLoaded('accommodation')) {
        (0, other_validators_1.checkLateArrivalAccommodation)(trip, warnings);
    }
    // 8. 물류/안전 검증 (신규)
    if (isLoaded('checklist')) {
        (0, logistics_validators_1.validateInternationalLicense)(trip, warnings); // B6: 국제면허
        (0, logistics_validators_1.validateHealthPreparation)(trip, warnings); // C5: 건강정보
        (0, logistics_validators_1.validateCommunicationPrep)(trip, warnings); // C7: SIM/로밍
    }
    if (isLoaded('flights') && isLoaded('dailyTimeline')) {
        (0, logistics_validators_1.validateAirportTransfer)(trip, warnings); // A3: 공항→시내 교통
    }
    if (isLoaded('dailyTimeline') && isLoaded('accommodation')) {
        (0, logistics_validators_1.validateLateNightReturn)(trip, warnings); // C3: 심야 귀숙
    }
    return warnings;
}
