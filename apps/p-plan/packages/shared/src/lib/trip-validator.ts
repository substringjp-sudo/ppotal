import { Trip, TripWarning } from '../types/trip';
import { GeoJSONGeometry } from './geo-utils';
import { TravelStyle } from '../types/user';
import { validateAirportDistance, validateAccommodationRegion, validateEventLocations, validateLocationClusters } from './validators/location-validators';
import { validateAccommodationOverlap, validateAccommodationGaps, validateAccommodationCapacity, validateAccommodationExpectedTimes, checkAccommodationFlightConflict, validateNoAccommodation, validateCheckoutDaySchedule } from './validators/accommodation-validators';
import { validateFlightCompleteness, validateFlightTimeRange, validateFlightSpeed, validateRentalCarPeriod, validatePublicTransportFeasibility, validateDrivingFeasibility, validateFlightLayovers, validatePublicTransportConflicts, validateDrivingConflicts } from './validators/transport-validators';
import { validateItineraryConflicts, validateInterEventTravel, validateDailyIntensity, validateEventDates, validateOperatingHours, validateDuplicateEvents, validateLastDayPressure, validateMealTimeGaps, validateConsecutiveTravelDays } from './validators/itinerary-validators';
import { validateBudget, validateBudgetRealism, validateExpenseAnomalies, validateCurrencyMismatch } from './validators/budget-validators';
import { validateChecklistProgress, validatePrepTaskProgress } from './validators/progress-validators';
import { validateDateConsistency, validateVisaRequirements, validateSeasonalCaution, validateCrowdPreference, checkPreparationReadiness, checkPassportRules, checkLateArrivalAccommodation, checkPowerAdapterRequirement, checkEmptyTimelineDays, checkTravelInsurance, validateUrgentBookings } from './validators/other-validators';
import { validateInternationalLicense, validateHealthPreparation, validateCommunicationPrep, validateAirportTransfer, validateLateNightReturn } from './validators/logistics-validators';

/**
 * 여행 일정 검증 엔진 - 분리된 검증 로직들을 통합하여 수행합니다.
 */
export function validateTrip(trip: Trip, geometries?: Record<string, GeoJSONGeometry>, style?: TravelStyle): TripWarning[] {
    const warnings: TripWarning[] = [];
    const loaded = trip._loadedSubCollections;

    // 로드 여부 확인 헬퍼 (로드 안된 데이터에 대한 가짜 경고 방지)
    const isLoaded = (subCol: string) => !loaded || loaded.includes(subCol);

    // 1. 위치 관련 검증
    validateAirportDistance(trip, warnings);
    if (isLoaded('accommodation')) validateAccommodationRegion(trip, warnings, geometries);
    if (isLoaded('dailyTimeline')) {
        validateEventLocations(trip, warnings, geometries);
        validateLocationClusters(trip, warnings);
    }

    // 2. 숙소 관련 검증
    if (isLoaded('accommodation')) {
        validateAccommodationOverlap(trip, warnings, style);
        validateAccommodationGaps(trip, warnings, style);
        validateAccommodationCapacity(trip, warnings);
        validateAccommodationExpectedTimes(trip, warnings, style);
        validateNoAccommodation(trip, warnings);                    // A2: 숙소 0개 탐지
        if (isLoaded('dailyTimeline')) {
            validateCheckoutDaySchedule(trip, warnings);            // C4: 체크아웃 날 일정 경고
        }
        if (isLoaded('flights')) {
            checkAccommodationFlightConflict(trip, warnings);
        }
    }

    // 3. 교통 관련 검증
    if (isLoaded('flights')) {
        validateFlightCompleteness(trip, warnings, style);
        validateFlightTimeRange(trip, warnings);
        validateFlightSpeed(trip, warnings);
        validateFlightLayovers(trip, warnings);
    }
    
    if (isLoaded('publicTransport')) {
        validatePublicTransportFeasibility(trip, warnings);
        validatePublicTransportConflicts(trip, warnings);
    }
    if (isLoaded('driving')) {
        validateDrivingFeasibility(trip, warnings);
        validateRentalCarPeriod(trip, warnings);
        validateDrivingConflicts(trip, warnings);
    }

    // 4. 일정 관련 검증
    if (isLoaded('dailyTimeline')) {
        validateItineraryConflicts(trip, warnings, style);
        validateInterEventTravel(trip, warnings, style);
        validateDailyIntensity(trip, warnings, style);
        validateEventDates(trip, warnings);
        validateOperatingHours(trip, warnings);
        validateDuplicateEvents(trip, warnings);                    // B5: 중복 일정
        validateMealTimeGaps(trip, warnings, style);                // C1: 식사 시간
        validateConsecutiveTravelDays(trip, warnings);              // C2: 연속 이동일
        if (isLoaded('flights')) {
            validateLastDayPressure(trip, warnings);                // B7+C8: 마지막날 과잉/공항 이동
        }
    }

    // 5. 예산 관련 검증
    validateBudget(trip, warnings, style);
    validateBudgetRealism(trip, warnings, style);
    validateExpenseAnomalies(trip, warnings);                       // B1: 비용 이상치
    validateCurrencyMismatch(trip, warnings);                       // B2: 통화 불일치

    // 6. 준비 상태 관련 검증
    if (isLoaded('checklist')) validateChecklistProgress(trip, warnings, style);
    if (isLoaded('prepTimeline')) validatePrepTaskProgress(trip, warnings, style);
    
    // 여행 전체 준비도 체크 (날짜 기반)
    checkPreparationReadiness(trip, warnings);
    checkPassportRules(trip, warnings);
    checkPowerAdapterRequirement(trip, warnings);
    checkTravelInsurance(trip, warnings);
    validateUrgentBookings(trip, warnings);                         // A4: D-3 임박 예매
    if (isLoaded('dailyTimeline')) checkEmptyTimelineDays(trip, warnings);

    // 7. 기타 정합성 및 안내
    validateDateConsistency(trip, warnings);
    validateVisaRequirements(trip, warnings);
    validateSeasonalCaution(trip, warnings);
    validateCrowdPreference(trip, warnings, style);
    
    // 항공-숙소 연계 (심야 도착 등)
    if (isLoaded('flights') && isLoaded('accommodation')) {
        checkLateArrivalAccommodation(trip, warnings);
    }

    // 8. 물류/안전 검증 (신규)
    if (isLoaded('checklist')) {
        validateInternationalLicense(trip, warnings);               // B6: 국제면허
        validateHealthPreparation(trip, warnings);                  // C5: 건강정보
        validateCommunicationPrep(trip, warnings);                  // C7: SIM/로밍
    }
    if (isLoaded('flights') && isLoaded('dailyTimeline')) {
        validateAirportTransfer(trip, warnings);                    // A3: 공항→시내 교통
    }
    if (isLoaded('dailyTimeline') && isLoaded('accommodation')) {
        validateLateNightReturn(trip, warnings);                    // C3: 심야 귀숙
    }

    return warnings;
}
