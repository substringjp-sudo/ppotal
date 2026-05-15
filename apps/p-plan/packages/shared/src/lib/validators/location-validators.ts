import { Trip, TripWarning } from '../../types/trip';
import { Airport, AIRPORTS } from '../airports';
import { calculateDistance, checkPointInRegions, GeoJSONGeometry } from '../geo-utils';

export function validateAirportDistance(trip: Trip, warnings: TripWarning[]) {
    if (!trip.locations || !trip.locations.center) return;
    const center = trip.locations.center;

    // 절대적으로 가장 가까운 공항 찾기
    let minDistance = Infinity;
    let closestAirportName = '';
    
    AIRPORTS.forEach((a: Airport) => {
        if (a.lat && a.lng) {
            const d = calculateDistance(a.lat, a.lng, center.lat, center.lng);
            if (d < minDistance) {
                minDistance = d;
                closestAirportName = a.nameKo;
            }
        }
    });

    (trip.flights || []).forEach(flight => {
        let lat = flight.arrivalLat;
        let lng = flight.arrivalLng;
        let locName = flight.arrivalLocation;

        // 좌표가 없는 경우 공항 코드로 검색
        if (!lat && flight.arrivalLocation) {
            const a = AIRPORTS.find((ap: Airport) => ap.code === flight.arrivalLocation);
            if (a) {
                lat = a.lat;
                lng = a.lng;
                locName = a.nameKo;
            }
        }

        if (flight.type === 'outbound' && lat && lng) {
            const dist = calculateDistance(lat, lng, center.lat, center.lng);

            // 1. 100km 이상 떨어져 있고 더 가까운 공항이 있는 경우
            // 거리가 최소 거리보다 10km 이상 차이날 때만 제안 (부동소수점 및 사소한 차이 무시)
            if (dist > 100 && dist > minDistance + 10) {
                warnings.push({
                    id: `dist-proximity-${flight.id}`,
                    type: 'distance',
                    severity: 'warning',
                    message: `도착 공항(${locName || flight.arrivalLocation})이 여행지 중심에서 약 ${Math.round(dist)}km 떨어져 있습니다. 더 가까운 공항(${closestAirportName})이 있는지 확인해 보세요.`,
                    sourceType: 'flight',
                    sourceId: flight.id,
                    metadata: { distance: dist }
                });
            }
        }
    });
}

export function validateAccommodationRegion(trip: Trip, warnings: TripWarning[], geometries?: Record<string, GeoJSONGeometry>) {
    (trip.accommodation || []).forEach(acc => {
        // 1. 기하학적 경계 데이터가 있는 경우 우선 적용
        if (geometries && acc.lat && acc.lng) {
            const boundaryCheck = checkPointInRegions(acc.lat, acc.lng, trip.locations.regions || [], geometries);
            
            if (!boundaryCheck.isInside) {
                const distanceMsg = boundaryCheck.minDistance > 0 
                    ? ` (경계선으로부터 약 ${Math.round(boundaryCheck.minDistance)}km 떨어짐)` 
                    : '';
                
                warnings.push({
                    id: `acc-boundary-${acc.id}`,
                    type: 'location',
                    severity: 'warning',
                    message: `숙소 '${acc.name}'가 여행 지역 경계 밖에 있습니다.${distanceMsg}`,
                    sourceType: 'accommodation',
                    sourceId: acc.id,
                    metadata: { distance: boundaryCheck.minDistance }
                });
                return; // 경계 체크 실패 시 아래 체크들은 생략
            }
            return; // 경계 내부에 있는 경우 거리 체크 생략 (사용자 요청: 둘 중 하나만)
        }

        // 3. 거리 기반 체크 (경계 데이터가 없을 때만 수행)
        if (trip.locations?.center && acc.lat && acc.lng) {
            const dist = calculateDistance(acc.lat, acc.lng, trip.locations.center.lat, trip.locations.center.lng);
            if (dist > 30) { // 경계 체크를 통과했으므로 기준을 약간 완화 (20km -> 30km)
                warnings.push({
                    id: `acc-dist-${acc.id}`,
                    type: 'distance',
                    severity: 'warning',
                    message: `숙소 '${acc.name}'가 여행 예정 지역 중심에서 약 ${Math.round(dist)}km 떨어져 있습니다. 이동 시간을 고려해 보세요.`,
                    sourceType: 'accommodation',
                    sourceId: acc.id,
                    metadata: { distance: dist }
                });
                return; // 거리 경고 발생 시 아래 FALLBACK 체크는 생략
            }
        }

        // 4. 기존 ID 기반 체크 (Fallback - 좌표가 없거나 위 체크들을 모두 통과한 경우)
        if (acc.countryId || acc.prefectureId || acc.cityId) {
            const isInRegion = trip.locations.regions?.some(r => 
                r.id === acc.countryId || 
                r.id === acc.prefectureId || 
                r.id === acc.cityId
            );

            if (!isInRegion) {
                warnings.push({
                    id: `acc-reg-${acc.id}`,
                    type: 'location',
                    severity: 'info',
                    message: `숙소 '${acc.name}'가 선택한 여행 지역 밖에 있는 것 같습니다.`,
                    sourceType: 'accommodation',
                    sourceId: acc.id
                });
            }
        }
    });
}

export function validateEventLocations(trip: Trip, warnings: TripWarning[], geometries?: Record<string, GeoJSONGeometry>) {
    if (!trip.locations?.regions || trip.locations.regions.length === 0) return;

    (trip.dailyTimeline || []).forEach((day, dayIdx) => {
        (day.events || []).forEach(event => {
            // 1. 기하학적 경계 데이터가 있는 경우 우선 적용
            if (geometries && event.location?.lat && event.location?.lng) {
                const boundaryCheck = checkPointInRegions(event.location.lat, event.location.lng, trip.locations.regions || [], geometries);
                
                if (!boundaryCheck.isInside) {
                    const distanceMsg = boundaryCheck.minDistance > 0 
                        ? ` (경계선으로부터 약 ${Math.round(boundaryCheck.minDistance)}km 떨어짐)` 
                        : '';
                    
                    warnings.push({
                        id: `event-boundary-${event.id}`,
                        type: 'location',
                        severity: 'info', // 일정은 다소 유연하므로 info
                        message: `'${event.title}' 일정이 여행 지역 경계 밖에 있습니다.${distanceMsg}`,
                        sourceType: 'event',
                        sourceId: event.id,
                        metadata: { dayIndex: dayIdx, distance: boundaryCheck.minDistance }
                    });
                    return;
                }
            }

            // 2. 기존 ID 기반 체크 (Fallback)
            if (event.location?.countryId || event.location?.prefectureId || event.location?.cityId) {
                const isInRegion = trip.locations.regions?.some(r => 
                    r.id === event.location?.countryId || 
                    r.id === event.location?.prefectureId || 
                    r.id === event.location?.cityId
                );

                if (!isInRegion) {
                    warnings.push({
                        id: `event-loc-${event.id}`,
                        type: 'location',
                        severity: 'info',
                        message: `'${event.title}' 일정이 주요 여행 지역에서 다소 벗어난 곳에 위치해 있습니다.`,
                        sourceType: 'event',
                        sourceId: event.id,
                        metadata: { dayIndex: dayIdx }
                    });
                }
            }
        });
    });
}
export function validateLocationClusters(trip: Trip, warnings: TripWarning[]) {
    (trip.dailyTimeline || []).forEach((day, dayIdx) => {
        const locations = (day.events || [])
            .map(e => e.location)
            .filter((loc): loc is NonNullable<typeof loc> => !!(loc && loc.lat && loc.lng));
        
        if (locations.length < 2) return;

        // 평균 중심점 계산
        const avgLat = locations.reduce((sum, loc) => sum + loc.lat!, 0) / locations.length;
        const avgLng = locations.reduce((sum, loc) => sum + loc.lng!, 0) / locations.length;

        // 각 장소가 중심점에서 얼마나 떨어져 있는지 확인
        let maxDistFromCenter = 0;
        locations.forEach(loc => {
            const d = calculateDistance(avgLat, avgLng, loc.lat!, loc.lng!);
            if (d > maxDistFromCenter) maxDistFromCenter = d;
        });

        // 하루 일정이 반경 100km 이상 퍼져 있는 경우 (예: 도쿄와 시즈오카를 하루에 왕복)
        if (maxDistFromCenter > 100) {
            warnings.push({
                id: `loc-cluster-dispersed-${dayIdx}`,
                type: 'location',
                severity: 'warning',
                message: `${dayIdx + 1}일차 일정이 지리적으로 매우 넓은 지역에 퍼져 있습니다. 이동 시간을 충분히 고려하셨나요?`,
                sourceType: 'event',
                metadata: { dayIndex: dayIdx, maxDistance: maxDistFromCenter }
            });
        }
    });
}
