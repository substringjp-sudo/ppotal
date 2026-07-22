import { Trip, TripWarning, SubCategory } from '../../types/trip';
import { TravelStyle } from '../../types/user';

export function validateDateConsistency(trip: Trip, warnings: TripWarning[]) {
    if (!trip.dates || !trip.dates.startDate || !trip.dates.endDate) return;

    const tripStart = trip.dates.startDate;
    const tripEnd = trip.dates.endDate;

    (trip.flights || []).forEach(f => {
        if (f.date && (f.date < tripStart || f.date > tripEnd)) {
            warnings.push({
                id: `date-flight-${f.id}`,
                type: 'timeline_conflict',
                severity: 'warning',
                message: `항공권 일정이 여행 기간(${tripStart} ~ ${tripEnd})을 벗어납니다.`,
                sourceType: 'flight',
                sourceId: f.id
            });
        }
    });

    (trip.accommodation || []).forEach(acc => {
        if (!acc.startDate || !acc.endDate) return;
        if (acc.startDate < tripStart || acc.endDate > tripEnd) {
            warnings.push({
                id: `date-acc-${acc.id}`,
                type: 'timeline_conflict',
                severity: 'warning',
                message: `숙소 일정이 여행 기간(${tripStart} ~ ${tripEnd})을 벗어납니다.`,
                sourceType: 'accommodation',
                sourceId: acc.id
            });
        }
    });

    (trip.driving || []).forEach(d => {
        if (d.date && (d.date < tripStart || d.date > tripEnd)) {
            warnings.push({
                id: `date-driving-${d.id}`,
                type: 'timeline_conflict',
                severity: 'warning',
                message: `운행 일정이 여행 기간(${tripStart} ~ ${tripEnd})을 벗어납니다.`,
                sourceType: 'driving',
                sourceId: d.id
            });
        }
    });

    (trip.publicTransport || []).forEach(pt => {
        if (pt.date && (pt.date < tripStart || pt.date > tripEnd)) {
            warnings.push({
                id: `date-pt-${pt.id}`,
                type: 'timeline_conflict',
                severity: 'warning',
                message: `대중교통 이용 일정이 여행 기간(${tripStart} ~ ${tripEnd})을 벗어납니다.`,
                sourceType: 'publicTransport',
                sourceId: pt.id
            });
        }
    });
}

export function validateVisaRequirements(trip: Trip, warnings: TripWarning[]) {
    const isInternational = trip.flights?.some(f => f.isInternational);
    if (!isInternational) return;

    const hasWarning = warnings.some(w => w.id === 'visa-check');
    if (hasWarning) return;

    warnings.push({
        id: 'visa-check',
        type: 'not_booked',
        severity: 'info',
        message: '해외 여행 시 목적지(비자 면제 여부, 여권 잔여 기간 등)의 입국 요건을 반드시 확인하세요.',
        suggestion: '방문 국가의 비자 면제 여부와 여권 잔여 기간(보통 6개월 이상)을 외교부 홈페이지나 대사관에서 확인하세요.',
        sourceType: 'flight'
    });
}

// 전자여행허가(ETA) 국가별 안내 — 국가 고유 제도라 국가 데이터셋으로 매핑 (기후와 달리 위도 일반화 불가)
interface EntryAuthSystem {
    aliases: string[];
    system: string;
    note: string;
}

const ENTRY_AUTH_SYSTEMS: EntryAuthSystem[] = [
    { aliases: ['미국', 'united states', 'usa', '괌', '하와이'], system: 'ESTA', note: '무비자 입국 시 ESTA 전자여행허가 사전 승인이 필요해요.' },
    { aliases: ['캐나다', 'canada'], system: 'eTA', note: '항공편 입국 시 eTA 전자여행허가가 필요해요.' },
    { aliases: ['호주', '오스트레일리아', 'australia'], system: 'ETA/eVisitor', note: '전자비자(ETA 또는 eVisitor) 사전 신청이 필요해요.' },
    { aliases: ['영국', 'united kingdom', 'england', 'britain'], system: 'UK ETA', note: '영국 입국 전 ETA 전자여행허가가 필요할 수 있어요.' },
    { aliases: ['뉴질랜드', 'new zealand'], system: 'NZeTA', note: '입국 전 NZeTA 전자여행허가와 관광세(IVL)가 필요해요.' },
    { aliases: ['일본', 'japan'], system: 'Visit Japan Web', note: '입국·세관 수속 간소화를 위해 Visit Japan Web을 미리 등록하면 편해요.' },
    { aliases: ['유럽', 'schengen', '솅겐', '셍겐', '프랑스', '독일', '이탈리아', '스페인', '네덜란드', '스위스', '포르투갈', '그리스', '오스트리아'], system: 'ETIAS', note: '유럽(솅겐) 여행 시 ETIAS 전자여행허가가 도입될 예정이니 출발 전 최신 요건을 확인하세요.' },
];

export function validateEntryAuthorization(trip: Trip, warnings: TripWarning[]) {
    const isInternational = trip.isOverseas || trip.flights?.some(f => f.isInternational);
    if (!isInternational) return;

    const regionNames = (trip.locations?.regions || []).map(r => (r.name || '').toLowerCase());
    if (regionNames.length === 0) return;

    ENTRY_AUTH_SYSTEMS.forEach(sys => {
        const matched = sys.aliases.some(a => regionNames.some(n => n.includes(a.toLowerCase())));
        if (matched && !warnings.some(w => w.id === `entry-auth-${sys.system}`)) {
            warnings.push({
                id: `entry-auth-${sys.system}`,
                type: 'not_booked',
                severity: 'info',
                message: `${sys.system}: ${sys.note}`,
                suggestion: '전자여행허가는 승인에 시간이 걸릴 수 있어요. 출발 전 여유 있게 공식 사이트에서 신청하세요.',
                sourceType: 'checklist'
            });
        }
    });
}

export function validateSeasonalCaution(trip: Trip, warnings: TripWarning[]) {
    if (!trip.dates?.startDate) return;
    const center = trip.locations?.center;
    if (!center || typeof center.lat !== 'number' || typeof center.lng !== 'number') return;

    const month = new Date(trip.dates.startDate).getMonth() + 1; // 1~12
    const { lat, lng } = center;
    const absLat = Math.abs(lat);
    const isNorth = lat >= 0;

    // 현지 계절 판정 (남반구는 북반구와 반대)
    const northSummer = [6, 7, 8];
    const northWinter = [12, 1, 2];
    const isLocalWinter = isNorth ? northWinter.includes(month) : northSummer.includes(month);
    const isLocalSummer = isNorth ? northSummer.includes(month) : northWinter.includes(month);

    const push = (id: string, message: string, suggestion?: string) => {
        // 같은 종류의 경고 중복 방지
        if (warnings.some(w => w.id === id)) return;
        warnings.push({ id, type: 'seasonal', severity: 'info', message, suggestion, sourceType: 'location' });
    };

    // 1. 고위도 겨울: 폭설·결빙·짧은 일조
    if (absLat >= 45 && isLocalWinter) {
        push('season-highlat-winter',
            `여행지가 고위도 지역이라 ${month}월은 폭설·결빙으로 교통이 지연될 수 있어요. 방한 준비와 넉넉한 이동 시간을 고려하세요.`,
            '겨울철 고위도는 해가 짧아 야외 일정 가능 시간이 줄어듭니다. 주요 야외 일정은 오전에 배치하세요.');
    }
    // 2. 초고위도 여름: 백야
    if (absLat >= 60 && isLocalSummer) {
        push('season-highlat-summer',
            '초고위도 지역의 여름은 백야로 밤에도 밝을 수 있어요. 숙면을 위해 안대 등을 챙기면 좋아요.');
    }
    // 3. 열대: 연중 고온다습 + 스콜
    if (absLat <= 23.5) {
        push('season-tropical',
            '열대 지역은 연중 덥고 습하며 스콜(소나기)이 잦아요. 가벼운 옷과 우비, 충분한 수분을 준비하세요.');
    }
    // 4. 중위도 여름 폭염
    else if (absLat >= 30 && absLat < 45 && isLocalSummer) {
        push('season-heat',
            `${month}월은 한낮 폭염이 있을 수 있어요. 야외 일정은 이른 오전이나 늦은 오후로 배치하고 수분을 챙기세요.`);
    }

    // 5. 동아시아 태풍·장마철 (한국·일본·대만·중국 동안·필리핀 등, 좌표 기반)
    if (lng >= 115 && lng <= 150 && lat >= 15 && lat <= 45 && [6, 7, 8, 9, 10].includes(month)) {
        push('season-typhoon',
            `${month}월 동아시아는 장마·태풍의 영향을 받을 수 있어요. 우천 시 대체할 실내 일정을 미리 준비하세요.`,
            '갑작스러운 비에 대비해 박물관·미술관·쇼핑몰 등 실내 일정 후보를 미리 찾아두세요.');
    }

    // 6. 남·동남아시아 몬순 우기 (인도·동남아 등)
    if (lng >= 70 && lng <= 110 && absLat <= 28 && [6, 7, 8, 9].includes(month)) {
        push('season-monsoon',
            `${month}월 이 지역은 몬순 우기일 수 있어요. 방수 대비와 실내 일정을 함께 준비하세요.`);
    }
}

export function validateCrowdPreference(trip: Trip, warnings: TripWarning[], style?: TravelStyle) {
    if (!style?.crowdPreference) return;

    (trip.dailyTimeline || []).forEach((day, dayIdx) => {
        (day.events || []).forEach(event => {
            if (style.crowdPreference === 'quiet') {
                const crowdedSubCategories: SubCategory[] = ['amusement', 'landmark', 'aquarium', 'concert', 'historical'];
                if (event.subCategory && crowdedSubCategories.includes(event.subCategory)) {
                    warnings.push({
                        id: `crowd-quiet-${event.id}`,
                        type: 'location',
                        severity: 'info',
                        message: `'${event.title}'은(는) 인파가 몰리는 유명 장소일 가능성이 높습니다. 한적한 여행을 원하신다면 방문 시간을 조정하거나 대안을 찾아보세요.`,
                        sourceType: 'event',
                        sourceId: event.id,
                        metadata: { dayIndex: dayIdx }
                    });
                }
            }
        });
    });
}
export function checkPreparationReadiness(trip: Trip, warnings: TripWarning[]) {
    if (!trip.dates?.startDate) return;

    const today = new Date();
    const startDate = new Date(trip.dates.startDate);
    const diffDays = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // 1. 여권/비자 체크 (해외 여행인 경우)
    if (trip.isOverseas || trip.flights?.some(f => f.isInternational)) {
        const essentialItems = ['여권', '비권', 'Passport', 'Visa'];
        const checkedEssentials = trip.checklist?.filter(item => 
            essentialItems.some(essential => item.title.includes(essential)) && item.isDone
        ) || [];

        // 여행이 14일 이내로 다가왔는데 여권/비자 항목이 체크되지 않았거나 아예 없는 경우
        if (checkedEssentials.length === 0 && diffDays <= 14 && diffDays >= -1) {
            warnings.push({
                id: 'prep-essential-missing',
                type: 'not_booked',
                severity: diffDays <= 7 ? 'critical' : 'warning',
                message: `여행이 ${diffDays}일 남았습니다. 여권, 비자 등 필수 준비물이 완료되었는지 확인해 주세요.`,
                suggestion: '출국 전 여권 실물 소지 여부와 비자 승인 여부를 반드시 마지막으로 확인하세요.',
                sourceType: 'checklist'
            });
        }
    }

    // 2. 예약 누락 체크 (숙소/항공편 중 status가 booked가 아닌 것)
    const unbookedAcc = trip.accommodation?.filter(acc => acc.status !== 'booked') || [];
    if (unbookedAcc.length > 0 && diffDays <= 14 && diffDays >= -1) {
        warnings.push({
            id: 'prep-acc-unbooked',
            type: 'not_booked',
            severity: 'warning',
            message: `아직 예약이 확정되지 않은 숙소가 ${unbookedAcc.length}곳 있습니다. 여행 전 예약을 마무리하세요.`,
            suggestion: '여행 기간이 얼마 남지 않았습니다. 숙소 예약을 서둘러 확정하고 확약서를 출력하거나 폰에 저장하세요.',
            sourceType: 'accommodation'
        });
    }
}

export function checkPassportRules(trip: Trip, warnings: TripWarning[]) {
    if (!trip.dates?.startDate) return;
    if (!(trip.isOverseas || trip.flights?.some(f => f.isInternational))) return;

    // 간단한 체크: 체크리스트에 '여권' 관련 항목이 완료되었는지 확인
    const passportItem = trip.checklist?.find(item => item.title.includes('여권') || item.title.toLowerCase().includes('passport'));
    
    if (!passportItem || !passportItem.isDone) {
        warnings.push({
            id: 'passport-validity-check',
            type: 'not_booked',
            severity: 'warning',
            message: '해외 여행 시 여권 만료일이 입국일 기준 6개월 이상 남았는지 꼭 확인하세요.',
            suggestion: '여권 잔여 기간이 부족하면 입국이 거절될 수 있습니다. 지금 즉시 여권 만료일을 확인하고 필요시 재발급 신청을 하세요.',
            sourceType: 'checklist'
        });
    }
}

export function checkLateArrivalAccommodation(trip: Trip, warnings: TripWarning[]) {
    if (!trip.flights || !trip.accommodation) return;

    trip.flights.forEach(flight => {
        if (!flight.arrivalTime || !flight.date) return;
        
        const hour = parseInt(flight.arrivalTime.split(':')[0]);
        if (hour >= 21 || hour < 5) { // 밤 9시 이후 도착 고려
            // 해당 날짜에 숙박이 시작되는지 확인
            const accStartsThisDay = trip.accommodation.find(acc => acc.startDate === flight.date);
            
            if (accStartsThisDay) {
                warnings.push({
                    id: `late-checkin-${flight.id}`,
                    type: 'timeline_conflict',
                    severity: 'warning',
                    message: `항공편이 늦은 시간(${flight.arrivalTime})에 도착합니다. '${accStartsThisDay.name}' 숙소의 체크인 마감 시간을 확인하거나 미리 연락해 두세요.`,
                    suggestion: '심야 도착 시 숙소 입구 비밀번호나 셀프 체크인 가이드를 숙소 측에 요청하여 미리 받아두세요.',
                    sourceType: 'flight',
                    sourceId: flight.id
                });
            }
        }
    });
}

export function checkPowerAdapterRequirement(trip: Trip, warnings: TripWarning[]) {
    if (!trip.isOverseas) return;

    warnings.push({
        id: 'power-adapter-info',
        type: 'seasonal',
        severity: 'info',
        message: '방문 국가의 전압과 플러그 타입(돼지코 등)을 확인하고 멀티 어댑터를 준비하세요.',
        suggestion: '해당 국가는 한국과 다른 플러그 타입을 사용합니다. 유니버설 어댑터를 미리 챙겨 가세요.',
        sourceType: 'other'
    });
}

export function checkEmptyTimelineDays(trip: Trip, warnings: TripWarning[]) {
    if (!trip.dailyTimeline || trip.dailyTimeline.length === 0) return;
    if (!trip.dates?.startDate || !trip.dates?.endDate) return;

    const totalDays = Math.ceil(
        (new Date(trip.dates.endDate).getTime() - new Date(trip.dates.startDate).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    // 3일 이상 여행인 경우만 체크 (당일치기는 제외)
    if (totalDays < 3) return;

    const daysWithEvents = trip.dailyTimeline.filter(day => day.events && day.events.length > 0).length;
    const emptyDays = totalDays - daysWithEvents;

    if (emptyDays > 0 && emptyDays >= Math.ceil(totalDays * 0.4)) {
        warnings.push({
            id: 'timeline-empty-days',
            type: 'timeline_conflict',
            severity: 'info',
            message: `${totalDays}일 여행 중 ${emptyDays}일의 일정이 아직 비어 있어요. 빈 날을 채워보시겠어요?`,
            suggestion: '일정이 없는 날에 방문하고 싶은 장소나 식당을 하나씩 적어보세요.',
            sourceType: 'event'
        });
    }
}

export function checkTravelInsurance(trip: Trip, warnings: TripWarning[]) {
    if (!(trip.isOverseas || trip.flights?.some(f => f.isInternational))) return;
    if (!trip.dates?.startDate) return;

    const today = new Date();
    const startDate = new Date(trip.dates.startDate);
    const diffDays = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // 출발 30일 이내인 경우만 안내
    if (diffDays > 30 || diffDays < -1) return;

    const hasInsurance = trip.checklist?.some(item =>
        item.title.includes('보험') || item.title.toLowerCase().includes('insurance')
    );

    if (!hasInsurance) {
        warnings.push({
            id: 'travel-insurance-missing',
            type: 'not_booked',
            severity: 'info',
            message: '여행자 보험이 준비물에 기록되어 있지 않아요. 혹시 챙기셨나요?',
            suggestion: '만일의 사고나 질병에 대비해 여행자 보험을 준비해두는 것을 추천해요. 출발 전까지 가입 가능합니다.',
            sourceType: 'checklist'
        });
    }
}

// A4: D-3 임박 예매 미완료 긴급 경고
export function validateUrgentBookings(trip: Trip, warnings: TripWarning[]) {
    if (!trip.dates?.startDate) return;

    const today = new Date();
    const startDate = new Date(trip.dates.startDate);
    const diffDays = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // 출발 3일 이내만 해당
    if (diffDays > 3 || diffDays < 0) return;

    const urgentItems: string[] = [];

    // 미예약 항공편
    const unbookedFlights = (trip.flights || []).filter(f => !f.isBooked && (f.type === 'outbound' || f.type === 'inbound'));
    if (unbookedFlights.length > 0) {
        urgentItems.push(`항공편 ${unbookedFlights.length}건`);
    }

    // 미예약 숙소
    const unbookedAccomm = (trip.accommodation || []).filter(acc => acc.status !== 'booked');
    if (unbookedAccomm.length > 0) {
        urgentItems.push(`숙소 ${unbookedAccomm.length}건`);
    }

    // 미예약 렌터카
    const unbookedDriving = (trip.driving || []).filter(d => !d.isBooked);
    if (unbookedDriving.length > 0) {
        urgentItems.push(`렌터카 ${unbookedDriving.length}건`);
    }

    if (urgentItems.length > 0) {
        const dLabel = diffDays === 0 ? '오늘 출발' : diffDays === 1 ? '내일 출발' : `출발 ${diffDays}일 전`;
        warnings.push({
            id: 'urgent-bookings',
            type: 'booking_urgent',
            severity: 'critical',
            message: `${dLabel}인데 아직 예약되지 않은 항목이 있습니다: ${urgentItems.join(', ')}. 즉시 확인이 필요합니다!`,
            suggestion: '출발이 임박했습니다. 예약이 완료되지 않은 항목은 지금 바로 처리해 주세요. 당일 예약은 가격이 높거나 불가능할 수 있습니다.',
            sourceType: 'general'
        });
    }
}
