/**
 * 국가별 종합 인텔리전스 분석 및 조회 서비스 (Country Intelligence Service)
 * 
 * 국가 속성 조회, 특정 날짜/월의 체감 날씨 계산, 출발국 vs 도착국 간의 실전 여행 차이점 비교를 제공합니다.
 */

import { 
    CountryIntelligence, 
    COUNTRY_INTELLIGENCE_DB, 
    getCountryIntelligence, 
    MonthlyClimateInfo,
    PerceivedWeatherLevel 
} from './data/country-intelligence';
import { resolveTravelPurpose } from './data/travel-purposes';
import { evaluateTravelPersona } from './persona/persona-engine';

export interface SeasonalWeatherInsight {
    countryKey: string;
    countryNameKo: string;
    month: number;
    avgTempC: number;
    minTempC: number;
    maxTempC: number;
    humidityPercent: number;
    rainfallMm: number;
    season: string;
    perceivedWeather: PerceivedWeatherLevel;
    perceivedSummaryKo: string;
    clothingTipKo: string;
    isSouthernHemisphere: boolean;
    weatherVibeBadgeKo: string; // 예: "❄️ 매우 추움(한파)", "🍂 쌀쌀함/썰렁함", "🌿 선선하고 쾌적함", "☀️ 따뜻함", "🔥 더움", "🌊 덥고 습함(열대야)"
}

export interface CountryComparisonContext {
    isSameCountry: boolean;
    homeCountry: CountryIntelligence;
    destCountry: CountryIntelligence;
    
    // 1. 전기 & 어댑터
    electricity: {
        adapterNeeded: boolean;
        voltageDiff: boolean;
        summaryKo: string;
    };

    // 2. 통화 & 환율
    currency: {
        isDifferentCurrency: boolean;
        homeCurrency: string;
        destCurrency: string;
        rateAgainstKrw: number;
        summaryKo: string;
    };

    // 3. 수질 (연수/경수)
    water: {
        isHardWater: boolean;
        tapWaterDrinkable: boolean;
        showerFilterRecommended: boolean;
        summaryKo: string;
    };

    // 4. 종교 & 팁 문화
    culture: {
        tippingType: string;
        summaryKo: string;
    };

    // 5. 운전 방향 & 면허 인정
    driving: {
        isOppositeSide: boolean;
        drivingSideKo: string;
        idpRequired: boolean;
        koreanEnglishLicenseAccepted: boolean;
        summaryKo: string;
    };

    // 6. 비자 & 전자여행허가
    visa: {
        isVisaFree: boolean;
        visaFreeDays: number;
        entryAuthProgram?: string;
        isEntryAuthRequired: boolean;
        summaryKo: string;
    };
}

/**
 * 특정 여행지 및 특정 날짜/월의 체감 날씨 인사이트를 계산합니다.
 * @param countryKeyOrName 국가 코드 또는 국가명 (예: 'JP', '일본', '도쿄')
 * @param dateOrMonth '2026-08-15' 형태의 날짜 문자열 또는 1~12 월 숫자
 */
export function getSeasonalWeatherInsight(
    countryKeyOrName?: string | null,
    dateOrMonth?: string | number | null
): SeasonalWeatherInsight | null {
    const intelligence = getCountryIntelligence(countryKeyOrName);
    if (!intelligence) return null;

    let month = 1;
    if (typeof dateOrMonth === 'number' && dateOrMonth >= 1 && dateOrMonth <= 12) {
        month = Math.floor(dateOrMonth);
    } else if (typeof dateOrMonth === 'string' && dateOrMonth.trim()) {
        const parts = dateOrMonth.split('-');
        if (parts.length >= 2) {
            const parsed = parseInt(parts[1], 10);
            if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) {
                month = parsed;
            }
        }
    } else {
        // 기본값: 현재 월
        month = new Date().getMonth() + 1;
    }

    const monthlyInfo: MonthlyClimateInfo | undefined = 
        intelligence.climate.monthly.find(m => m.month === month) ||
        intelligence.climate.monthly[0];

    if (!monthlyInfo) return null;

    // 체감 배지 텍스트
    let weatherVibeBadgeKo = '선선하고 쾌적함';
    switch (monthlyInfo.perceivedWeather) {
        case 'freezing':
            weatherVibeBadgeKo = '매우 추움 (한파/패딩 필수)';
            break;
        case 'chilly':
            weatherVibeBadgeKo = '쌀쌀함/썰렁함 (도톰한 외투)';
            break;
        case 'mild':
            weatherVibeBadgeKo = '선선하고 쾌적함 (여행 황금기)';
            break;
        case 'warm':
            weatherVibeBadgeKo = '따뜻함 (온화한 날씨)';
            break;
        case 'hot':
            weatherVibeBadgeKo = '더움 (여름 옷/자외선 차단)';
            break;
        case 'sweltering':
            weatherVibeBadgeKo = '엄청 덥고 습함 (폭염/열대야)';
            break;
    }

    return {
        countryKey: intelligence.key,
        countryNameKo: intelligence.nameKo,
        month,
        avgTempC: monthlyInfo.avgTempC,
        minTempC: monthlyInfo.minTempC,
        maxTempC: monthlyInfo.maxTempC,
        humidityPercent: monthlyInfo.humidityPercent,
        rainfallMm: monthlyInfo.rainfallMm,
        season: monthlyInfo.season,
        perceivedWeather: monthlyInfo.perceivedWeather,
        perceivedSummaryKo: monthlyInfo.perceivedSummaryKo,
        clothingTipKo: monthlyInfo.clothingTipKo,
        isSouthernHemisphere: intelligence.climate.climateZone === 'south',
        weatherVibeBadgeKo
    };
}

import { resolveEntryRequirement } from './data/entry-requirements';

export interface CrossExchangeRateResult {
    fromCurrency: string;
    toCurrency: string;
    fromSymbol: string;
    toSymbol: string;
    rate: number;         // 1 fromCurrency = rate toCurrency
    inverseRate: number;  // 1 toCurrency = inverseRate fromCurrency
    summaryKo: string;    // 예: "1 USD ≈ 147.00 JPY (100 JPY ≈ 0.68 USD)"
}

/**
 * 임의의 두 통화 간의 양방향 교차 환율(Cross Rate)을 계산합니다.
 */
export function calculateCrossExchangeRate(
    fromCodeOrKey: string = 'USD',
    toCodeOrKey: string = 'JPY'
): CrossExchangeRateResult | null {
    // 1. 통화 코드 또는 국가 키로 국가 인텔리전스 조회
    const getCurrencyMeta = (codeOrKey: string) => {
        const clean = codeOrKey.toUpperCase().trim();
        // 국가 키 매칭
        const country = getCountryIntelligence(clean);
        if (country) return country.currency;
        
        // 통화 코드로 직접 매칭
        const matched = Object.values(COUNTRY_INTELLIGENCE_DB).find(c => c.currency.code === clean);
        if (matched) return matched.currency;

        // KRW 기본
        if (clean === 'KRW') return { code: 'KRW', symbol: '₩', nameKo: '대한민국 원', krwRate: 1.0, rateUnit: 1 };
        if (clean === 'USD') return { code: 'USD', symbol: '$', nameKo: '미국 달러', krwRate: 1345.0, rateUnit: 1 };
        if (clean === 'JPY') return { code: 'JPY', symbol: '¥', nameKo: '일본 엔', krwRate: 9.15, rateUnit: 100 };
        if (clean === 'EUR') return { code: 'EUR', symbol: '€', nameKo: '유로', krwRate: 1465.0, rateUnit: 1 };
        return null;
    };

    const fromMeta = getCurrencyMeta(fromCodeOrKey);
    const toMeta = getCurrencyMeta(toCodeOrKey);

    if (!fromMeta || !toMeta) return null;

    if (fromMeta.code === toMeta.code) {
        return {
            fromCurrency: fromMeta.code,
            toCurrency: toMeta.code,
            fromSymbol: fromMeta.symbol,
            toSymbol: toMeta.symbol,
            rate: 1.0,
            inverseRate: 1.0,
            summaryKo: `동일한 통화(${fromMeta.nameKo})를 사용합니다.`
        };
    }

    // 1 fromMeta = (fromMeta.krwRate / toMeta.krwRate) toMeta
    const rate = fromMeta.krwRate / toMeta.krwRate;
    const inverseRate = toMeta.krwRate / fromMeta.krwRate;

    // 포맷팅
    let rateStr = '';
    if (rate >= 100) {
        rateStr = rate.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    } else if (rate >= 1) {
        rateStr = rate.toFixed(2);
    } else if (rate >= 0.01) {
        rateStr = rate.toFixed(4);
    } else {
        rateStr = rate.toFixed(6);
    }

    let summaryKo = '';
    if (fromMeta.code === 'KRW') {
        summaryKo = `1 ${toMeta.code} ≈ ${toMeta.krwRate.toLocaleString('ko-KR')}원`;
    } else if (toMeta.code === 'KRW') {
        summaryKo = `1 ${fromMeta.code} ≈ ${fromMeta.krwRate.toLocaleString('ko-KR')}원`;
    } else {
        summaryKo = `1 ${fromMeta.code} ≈ ${rateStr} ${toMeta.code} (${toMeta.symbol})`;
    }

    return {
        fromCurrency: fromMeta.code,
        toCurrency: toMeta.code,
        fromSymbol: fromMeta.symbol,
        toSymbol: toMeta.symbol,
        rate,
        inverseRate,
        summaryKo
    };
}

/**
 * 출발 국가(거주지/여권)와 도착 국가 간의 여행 차이점을 양방향 종합 비교 분석합니다.
 */
export function compareCountryContext(
    homeKeyOrName: string = 'KR',
    destKeyOrName: string = 'JP'
): CountryComparisonContext {
    const home = getCountryIntelligence(homeKeyOrName) || COUNTRY_INTELLIGENCE_DB['KR'];
    const dest = getCountryIntelligence(destKeyOrName) || COUNTRY_INTELLIGENCE_DB['JP'] || COUNTRY_INTELLIGENCE_DB['KR'];

    const isSameCountry = home.key === dest.key;

    // 1. 전기 & 플러그 호환성
    const sharedPlugs = dest.plugTypes.filter(p => home.plugTypes.includes(p));
    const adapterNeeded = !isSameCountry && sharedPlugs.length === 0;
    const voltageDiff = !isSameCountry && Math.abs(home.voltage - dest.voltage) > 30;

    let elecSummary = '';
    if (isSameCountry) {
        elecSummary = `${dest.nameKo} 국내 전력 규격(${dest.voltage}V)과 동일합니다.`;
    } else if (adapterNeeded) {
        elecSummary = `${home.nameKo} 콘센트(${home.plugTypes.join('/')} 타입)와 규격이 달라 돼지코 어댑터(${dest.plugTypes.join('/')} 타입)가 필수이며 대표 전압은 ${dest.voltage}V입니다.`;
    } else if (voltageDiff) {
        elecSummary = `플러그(${sharedPlugs.join('/')} 타입)는 호환되지만 전압(${home.voltage}V ➔ ${dest.voltage}V) 차이가 있으므로 프리볼트(100~240V) 기기인지 확인하세요.`;
    } else {
        elecSummary = `플러그(${dest.plugTypes.join('/')} 타입)와 전압(${dest.voltage}V)이 완전히 호환되어 별도의 어댑터 없이 사용할 수 있습니다.`;
    }

    // 2. 통화 & 교차 환율
    const isDiffCurr = home.currency.code !== dest.currency.code;
    const crossFx = calculateCrossExchangeRate(home.currency.code, dest.currency.code);
    let currSummary = '';
    if (isSameCountry || !isDiffCurr) {
        currSummary = `출발지와 동일한 통화(${dest.currency.nameKo}, ${dest.currency.code})를 사용합니다.`;
    } else {
        currSummary = `현지 통화는 ${dest.currency.nameKo}(${dest.currency.code}, ${dest.currency.symbol})이며, 기준 환율은 ${crossFx?.summaryKo || `1 ${dest.currency.code} ≈ ${dest.currency.krwRate}원`}입니다.`;
    }

    // 3. 수질 (연수/경수)
    const isHardWater = dest.water.hardness === 'hard';
    let waterSummary = '';
    if (isSameCountry) {
        waterSummary = dest.water.waterSummaryKo;
    } else if (isHardWater) {
        waterSummary = `${dest.nameKo}는 석회질이 많은 경수(Hard Water) 지역입니다. 생수 음용을 권장하며 ${dest.water.showerFilterRecommended ? '샤워 필터 지참을 추천합니다.' : ''}`;
    } else {
        waterSummary = dest.water.waterSummaryKo;
    }

    // 4. 팁 문화
    let tipSummary = '';
    if (isSameCountry) {
        tipSummary = dest.culture.tippingGuideKo;
    } else if (home.culture.tipping === 'mandatory' && dest.culture.tipping === 'no_tip') {
        tipSummary = `${home.nameKo}와 달리 ${dest.nameKo}는 팁 문화가 전혀 없습니다 (팁을 주면 정중히 거절당합니다).`;
    } else if (home.culture.tipping === 'no_tip' && dest.culture.tipping === 'mandatory') {
        tipSummary = `${home.nameKo}와 달리 ${dest.nameKo}는 식당 테이블 서빙 시 15~20% 팁이 사실상 필수입니다.`;
    } else {
        tipSummary = dest.culture.tippingGuideKo;
    }

    // 5. 운전 방향 & 면허
    const isOppositeSide = home.driving.drivingSide !== dest.driving.drivingSide;
    let drivingSummary = '';
    if (isSameCountry) {
        drivingSummary = `${dest.nameKo} 국내 운전면허증으로 운전 가능합니다.`;
    } else if (isOppositeSide) {
        drivingSummary = `${home.nameKo}(${home.driving.drivingSide === 'left' ? '좌측' : '우측'}통행)와 반대인 ${dest.driving.drivingSide === 'left' ? '좌측통행(우핸들)' : '우측통행(좌핸들)'} 국가입니다. ${dest.driving.drivingSummaryKo}`;
    } else {
        drivingSummary = `${home.nameKo}와 동일한 ${dest.driving.drivingSide === 'left' ? '좌측통행(우핸들)' : '우측통행(좌핸들)'} 국가입니다. ${dest.driving.drivingSummaryKo}`;
    }

    // 6. 비자 & 전자여행허가 (양자 룰 엔진 적용)
    const bilateralReq = resolveEntryRequirement(home.key, dest.key);
    let isVisaFree = !dest.visa.isVisaRequired;
    let visaFreeDays = dest.visa.visaFreeDays;
    let entryAuthProgram = dest.visa.entryAuthProgram;
    let isEntryAuthRequired = !!dest.visa.isEntryAuthRequired;
    let visaSummary = dest.visa.entrySummaryKo;

    if (isSameCountry) {
        visaSummary = '국내 여행으로 신분증만 지참하시면 됩니다.';
        isVisaFree = true;
        isEntryAuthRequired = false;
    } else if (bilateralReq) {
        isVisaFree = bilateralReq.tier === 'visa-free' || bilateralReq.tier === 'eta-optional' || bilateralReq.tier === 'eta-required';
        entryAuthProgram = bilateralReq.program;
        isEntryAuthRequired = bilateralReq.tier === 'eta-required';
        visaSummary = `${home.nameKo} 여권 기준: ${bilateralReq.note}`;
    }

    return {
        isSameCountry,
        homeCountry: home,
        destCountry: dest,
        electricity: {
            adapterNeeded,
            voltageDiff,
            summaryKo: elecSummary
        },
        currency: {
            isDifferentCurrency: isDiffCurr,
            homeCurrency: home.currency.code,
            destCurrency: dest.currency.code,
            rateAgainstKrw: dest.currency.krwRate,
            summaryKo: currSummary
        },
        water: {
            isHardWater,
            tapWaterDrinkable: dest.water.tapWaterDrinkable,
            showerFilterRecommended: dest.water.showerFilterRecommended,
            summaryKo: waterSummary
        },
        culture: {
            tippingType: dest.culture.tipping,
            summaryKo: tipSummary
        },
        driving: {
            isOppositeSide,
            drivingSideKo: dest.driving.drivingSide === 'left' ? '좌측통행(우핸들)' : '우측통행(좌핸들)',
            idpRequired: dest.driving.idpRequired,
            koreanEnglishLicenseAccepted: dest.driving.koreanEnglishLicenseAccepted,
            summaryKo: drivingSummary
        },
        visa: {
            isVisaFree,
            visaFreeDays,
            entryAuthProgram,
            isEntryAuthRequired,
            summaryKo: visaSummary
        }
    };
}

export interface TripBriefingParams {
    originCountry?: string | null;
    destinationCountry?: string | null;
    destinationRegionNames?: string[];
    startDate?: string | null;
    endDate?: string | null;
    durationDays?: number;
    guestCount?: number;
    participantDetails?: { type: string; count: number }[];
    theme?: string | null;
    isRental?: boolean;
    useFlight?: boolean;
    hasAccommodations?: boolean;
}

export interface BriefingCheckItem {
    id: string;
    title: string;
    description: string;
    isEssential: boolean;
    defaultChecked: boolean;
    category: 'basic' | 'transport' | 'accommodation' | 'reservation' | 'itinerary' | 'budget' | 'checklist';
    icon?: string;
    tag?: string;
}

export interface TripCategoryBriefing {
    category: 'basic' | 'transport' | 'accommodation' | 'reservation' | 'itinerary' | 'budget' | 'checklist';
    title: string;
    shortTitle: string;
    icon: string;
    color: string;
    badgeKo: string;
    highlightKo: string;
    summaryKo: string;
    items: BriefingCheckItem[];
}

/**
 * 목적지/기간/인원/테마를 분석하여 7대 핵심 카테고리별 필수 점검사항(Must-Check) 브리핑을 생성합니다.
 */
export function generateTripCategoryBriefing(params: TripBriefingParams): TripCategoryBriefing[] {
    const originKey = params.originCountry || 'KR';
    const destKey = params.destinationCountry || (params.destinationRegionNames && params.destinationRegionNames[0]) || 'KR';
    const comparison = compareCountryContext(originKey, destKey);
    const guestCount = Math.max(1, params.guestCount || 1);
    
    // 날씨/계절 계산
    let dateOrMonth: string | number = 1;
    if (params.startDate) {
        dateOrMonth = params.startDate;
    } else {
        const currentMonth = new Date().getMonth() + 1;
        dateOrMonth = currentMonth;
    }
    const weather = getSeasonalWeatherInsight(destKey, dateOrMonth);
    const isOverseas = !comparison.isSameCountry;
    const dest = comparison.destCountry;
    const home = comparison.homeCountry;

    const briefings: TripCategoryBriefing[] = [];

    // ─── 1. 기본 (서류·입국·안전) ───────────────────────────
    const basicItems: BriefingCheckItem[] = [];
    if (isOverseas) {
        basicItems.push({
            id: 'briefing-passport',
            title: '여권 유효기간 6개월 이상 잔여 확인',
            description: '대부분의 국가는 입국일 기준 6개월 이상 유효한 여권 원본을 필수로 요구합니다.',
            isEssential: true,
            defaultChecked: true,
            category: 'basic',
            tag: '필수 서류'
        });

        if (comparison.visa.entryAuthProgram) {
            basicItems.push({
                id: `briefing-entry-auth-${dest.key}`,
                title: `${comparison.visa.entryAuthProgram} 사전 신청 및 승인`,
                description: comparison.visa.summaryKo,
                isEssential: comparison.visa.isEntryAuthRequired,
                defaultChecked: true,
                category: 'basic',
                tag: comparison.visa.isEntryAuthRequired ? '입국 필수' : '입국 권장'
            });
        } else if (comparison.visa.isVisaFree) {
            basicItems.push({
                id: `briefing-visa-free-${dest.key}`,
                title: `${dest.nameKo} 무비자 체류 규정(${comparison.visa.visaFreeDays}일) 확인`,
                description: comparison.visa.summaryKo,
                isEssential: false,
                defaultChecked: true,
                category: 'basic',
                tag: '무비자'
            });
        } else {
            basicItems.push({
                id: `briefing-visa-req-${dest.key}`,
                title: `${dest.nameKo} 비자(Visa) 발급 신청`,
                description: comparison.visa.summaryKo,
                isEssential: true,
                defaultChecked: true,
                category: 'basic',
                tag: '비자 필수'
            });
        }

        basicItems.push({
            id: 'briefing-embassy',
            title: '재외공관 및 영사콜센터(+82-2-3210-0404) 연락처 저장',
            description: '현지에서 여권 분실, 도난, 사고 발생 시 긴급 지원을 받을 수 있습니다.',
            isEssential: false,
            defaultChecked: true,
            category: 'basic',
            tag: '비상 연락망'
        });
    } else {
        basicItems.push({
            id: 'briefing-id-card',
            title: '국내 신분증(주민등록증 / 운전면허증 / 모바일 신분증) 지참',
            description: '비행기/선박 탑승, 숙소 체크인, 렌터카 인수 시 신분증 확인이 필수입니다.',
            isEssential: true,
            defaultChecked: true,
            category: 'basic',
            tag: '필수 지참'
        });
    }

    briefings.push({
        category: 'basic',
        title: '기본 (서류·입국·안전)',
        shortTitle: '기본',
        icon: 'description',
        color: '#3b82f6',
        badgeKo: isOverseas ? '해외 입국 규정' : '국내 여행 기본',
        highlightKo: isOverseas 
            ? (comparison.visa.entryAuthProgram ? `${dest.nameKo} 입국 시 ${comparison.visa.entryAuthProgram} 확인 필수` : `여권 유효기간 6개월 이상 필수`)
            : '신분증 및 탑승권 사전 점검',
        summaryKo: isOverseas ? comparison.visa.summaryKo : '국내 여행으로 별도의 비자 없이 신분증만 지참하시면 됩니다.',
        items: basicItems
    });

    // ─── 2. 교통 (항공·렌터카·대중교통) ───────────────────────
    const transportItems: BriefingCheckItem[] = [];
    if (params.useFlight !== false || isOverseas) {
        transportItems.push({
            id: 'briefing-flight-tickets',
            title: `여행 인원(${guestCount}명) 전원 항공권 e-티켓 및 왕복 일정 확인`,
            description: `동행자 ${guestCount}명의 영문 성명(여권 철자와 100% 일치) 및 수하물 규정을 확인하세요.`,
            isEssential: true,
            defaultChecked: true,
            category: 'transport',
            tag: '항공 필수'
        });
    }

    if (params.isRental || dest.driving.idpRequired) {
        transportItems.push({
            id: 'briefing-idp-license',
            title: `1949 제네바 협약 국제운전면허증(IDP 실물) 및 국내 면허증 지참`,
            description: dest.driving.drivingSummaryKo,
            isEssential: true,
            defaultChecked: true,
            category: 'transport',
            tag: '렌터카 운전'
        });

        transportItems.push({
            id: 'briefing-car-seating',
            title: `차량 탑승 정원(${guestCount}인승 이상) 및 캐리어 적재 공간 확인`,
            description: `탑승자 ${guestCount}명과 수하물(캐리어)을 싣기 위해 최소 ${guestCount <= 2 ? '4' : guestCount <= 4 ? '5~7' : '9~11'}인승 차량을 권장합니다.`,
            isEssential: true,
            defaultChecked: true,
            category: 'transport',
            tag: '차량 정원'
        });

        if (comparison.driving.isOppositeSide) {
            transportItems.push({
                id: 'briefing-driving-side',
                title: `${comparison.destCountry.nameKo}는 ${comparison.driving.drivingSideKo} - 역주행 주의 & 우회전 신호 숙지`,
                description: '방향지시등(깜빡이)과 와이퍼 레버 위치가 반대이므로 출발 전 조작법을 숙지하세요.',
                isEssential: true,
                defaultChecked: true,
                category: 'transport',
                tag: '교통 법규'
            });
        }
    }

    // 대중교통 패스 안내
    let transitPassName = '현지 대중교통 카드/패스';
    if (dest.key === 'JP') transitPassName = '스이카(Suica)/파스모 및 JR패스/지하철 24·48·72시간권';
    else if (dest.key === 'GB') transitPassName = '오이스터 카드 또는 비접촉 트래블카드';
    else if (dest.key === 'FR') transitPassName = '나비고 이지(Navigo Easy) 교통카드';
    else if (dest.key === 'TW') transitPassName = '이지카드(EasyCard)';
    else if (dest.key === 'HK') transitPassName = '옥토퍼스(Octopus) 카드';

    transportItems.push({
        id: 'briefing-transit-pass',
        title: `${transitPassName} 사전 준비 및 충전`,
        description: '공항 ➔ 도심 고속철도/리무진 및 시내 이동을 위해 교통카드를 사전 준비하세요.',
        isEssential: false,
        defaultChecked: true,
        category: 'transport',
        tag: '대중교통'
    });

    briefings.push({
        category: 'transport',
        title: '교통 (항공·렌터카·대중교통)',
        shortTitle: '교통',
        icon: 'flight',
        color: '#0284c7',
        badgeKo: comparison.driving.drivingSideKo,
        highlightKo: comparison.driving.isOppositeSide 
            ? `운전 방향 ${comparison.driving.drivingSideKo} (역주행 주의)`
            : `${guestCount}명 항공 및 교통편 동선 점검`,
        summaryKo: comparison.driving.summaryKo,
        items: transportItems
    });

    // ─── 3. 숙소 (객실·침대 구성) ───────────────────────────
    const accItems: BriefingCheckItem[] = [];
    accItems.push({
        id: 'briefing-bed-capacity',
        title: `여행 인원(${guestCount}명) 수용 가능한 침대 구성(더블 2인, 싱글 1인) 점검`,
        description: `침대 수용 정원이 부족하지 않도록 침대 종류(더블/트윈/싱글/엑스트라베드)를 확인하세요.`,
        isEssential: true,
        defaultChecked: true,
        category: 'accommodation',
        tag: '침대 수용량'
    });

    accItems.push({
        id: 'briefing-checkin-policy',
        title: '체크인/아웃 시간 정책 및 무료 짐 보관(러기지 서비스) 확인',
        description: '일반적인 체크인은 15:00, 체크아웃은 10:00~11:00입니다. 도착 전 짐 보관 가능 여부를 확인하세요.',
        isEssential: false,
        defaultChecked: true,
        category: 'accommodation',
        tag: '투숙 정책'
    });

    if (guestCount >= 5) {
        accItems.push({
            id: 'briefing-room-count-check',
            title: `객실 수 점검 (현재 인원 ${guestCount}명 대비 독채 또는 2개 이상 객실 권장)`,
            description: '객실당 최대 투숙 인원 규정을 초과하면 현장에서 입실이 거부될 수 있습니다.',
            isEssential: true,
            defaultChecked: true,
            category: 'accommodation',
            tag: '객실 규정'
        });
    }

    briefings.push({
        category: 'accommodation',
        title: '숙소 (객실·침대 구성)',
        shortTitle: '숙소',
        icon: 'hotel',
        color: '#8b5cf6',
        badgeKo: `인원 ${guestCount}명`,
        highlightKo: `인원(${guestCount}명) 침대 수용량 및 체크인 정책`,
        summaryKo: `총 ${guestCount}명이 편안하게 휴식할 수 있도록 객실 수와 침대 정원(더블 2인, 싱글 1인)을 꼭 점검하세요.`,
        items: accItems
    });

    // ─── 4. 예약 (티켓·투어·맛집) ───────────────────────────
    const resItems: BriefingCheckItem[] = [];
    let landmarkText = '인기 랜드마크 및 테마파크';
    if (dest.key === 'JP') landmarkText = '도쿄 디즈니, USJ, 지브리 파크, 시부야스카이, 팀랩';
    else if (dest.key === 'FR') landmarkText = '루브르 박물관, 에펠탑 전망대, 베르사유 궁전';
    else if (dest.key === 'US') landmarkText = '디즈니월드, 유니버설 스튜디오, 브로드웨이 뮤지컬';
    else if (dest.key === 'ES') landmarkText = '사그라다 파밀리아 대성당, 구엘 공원';
    else if (dest.key === 'IT') landmarkText = '콜로세움, 바티칸 박물관, 우피치 미술관';

    resItems.push({
        id: 'briefing-landmark-booking',
        title: `${landmarkText} 사전 입장권 예약`,
        description: '글로벌 인기 명소는 현장 구매가 불가능하거나 조기 매진되므로 최소 2~4주 전 사전 예약이 필수입니다.',
        isEssential: true,
        defaultChecked: true,
        category: 'reservation',
        tag: '티켓 필수'
    });

    resItems.push({
        id: 'briefing-restaurant-booking',
        title: '현지 유명 맛집 및 파인다이닝 레스토랑 사전 테이블 예약',
        description: '웨이팅이 긴 인기 식당은 구글 맵, 타베로그(일본), 오픈테이블 등을 통해 미리 예약하세요.',
        isEssential: false,
        defaultChecked: true,
        category: 'reservation',
        tag: '맛집 예약'
    });

    resItems.push({
        id: 'briefing-tour-voucher',
        title: '원데이 투어 및 액티비티 모바일 바우처(QR코드) 오프라인 저장',
        description: '데이터가 불안정한 현장 상황에 대비해 예약 확인증을 캡처해 두세요.',
        isEssential: false,
        defaultChecked: true,
        category: 'reservation',
        tag: '바우처 보관'
    });

    briefings.push({
        category: 'reservation',
        title: '예약 (티켓·투어·맛집)',
        shortTitle: '예약',
        icon: 'confirmation_number',
        color: '#f59e0b',
        badgeKo: '조기 매진 주의',
        highlightKo: `${dest.nameKo} 인기 랜드마크 사전 예약 필수`,
        summaryKo: '인기 테마파크와 미술관, 미슐랭 식당은 사전 예약 없이는 입장이 어려우니 미리 일정을 확정하세요.',
        items: resItems
    });

    // ─── 5. 일정 (날씨·동선·페이싱) ───────────────────────────
    const itItems: BriefingCheckItem[] = [];
    if (weather) {
        itItems.push({
            id: 'briefing-weather-clothing',
            title: `${weather.month}월 평균 ${weather.avgTempC}°C (${weather.weatherVibeBadgeKo}) 맞춤 옷차림: ${weather.clothingTipKo}`,
            description: weather.perceivedSummaryKo,
            isEssential: true,
            defaultChecked: true,
            category: 'itinerary',
            tag: '계절 날씨'
        });
    }

    itItems.push({
        id: 'briefing-holiday-check',
        title: `현지 공휴일 및 성수기 축제 혼잡도 사전 확인`,
        description: '현지 연휴(골든위크, 춘절, 부활절, 크리스마스 등)에는 주요 관광지 휴무 및 극심한 교통 체증이 발생할 수 있습니다.',
        isEssential: false,
        defaultChecked: true,
        category: 'itinerary',
        tag: '휴일 혼잡'
    });

    itItems.push({
        id: 'briefing-pacing-balance',
        title: `하루 2~3개 핵심 스팟 중심 여유 있는 동선(페이싱) 배분`,
        description: `동행자(${guestCount}명)의 체력과 이동 시간을 고려하여 휴식 시간을 충분히 확보하세요.`,
        isEssential: false,
        defaultChecked: true,
        category: 'itinerary',
        tag: '동선 최적화'
    });

    briefings.push({
        category: 'itinerary',
        title: '일정 (날씨·동선·페이싱)',
        shortTitle: '일정',
        icon: 'calendar_month',
        color: '#10b981',
        badgeKo: weather ? weather.weatherVibeBadgeKo : '날씨 점검',
        highlightKo: weather ? `${weather.month}월 ${weather.weatherVibeBadgeKo} (${weather.avgTempC}°C)` : '계절 맞춤 옷차림',
        summaryKo: weather ? `${weather.perceivedSummaryKo}. ${weather.clothingTipKo}` : '현지 기온과 강수량을 고려하여 동선을 설계하세요.',
        items: itItems
    });

    // ─── 6. 예산 (통화·환율·팁문화) ───────────────────────────
    const budgetItems: BriefingCheckItem[] = [];
    budgetItems.push({
        id: 'briefing-exchange-card',
        title: `기준 환율 (${comparison.currency.summaryKo}) 및 수수료 0% 트래블카드 충전`,
        description: '트래블월렛, 트래블로그, 토스 외화통장 등 해외 결제/ATM 수수료 면제 카드를 준비하세요.',
        isEssential: true,
        defaultChecked: true,
        category: 'budget',
        tag: '환전 & 카드'
    });

    if (dest.key === 'JP' || dest.key === 'TH' || dest.key === 'TW' || dest.key === 'VN') {
        budgetItems.push({
            id: 'briefing-cash-needed',
            title: `${dest.nameKo} 현지 소도시/라멘/야시장/자판기용 비상 현금(지폐/동전) 환전`,
            description: '아직 카드 결제가 되지 않는 현지 로컬 맛집 및 자판기가 많으므로 현금을 꼭 지참하세요.',
            isEssential: true,
            defaultChecked: true,
            category: 'budget',
            tag: '현금 필수'
        });
    }

    budgetItems.push({
        id: 'briefing-tipping-culture',
        title: `현지 팁 문화 숙지: ${dest.culture.tippingGuideKo}`,
        description: comparison.culture.summaryKo,
        isEssential: dest.culture.tipping === 'mandatory',
        defaultChecked: true,
        category: 'budget',
        tag: dest.culture.tipping === 'mandatory' ? '팁 필수' : '팁 가이드'
    });

    briefings.push({
        category: 'budget',
        title: '예산 (통화·환율·팁문화)',
        shortTitle: '예산',
        icon: 'payments',
        color: '#eab308',
        badgeKo: dest.currency.code,
        highlightKo: `${comparison.currency.summaryKo} · ${dest.culture.tipping === 'mandatory' ? '팁 15~20% 필수' : dest.culture.tipping === 'no_tip' ? '팁 문화 없음' : '팁 선택'}`,
        summaryKo: `${comparison.currency.summaryKo}. ${dest.culture.tippingGuideKo}`,
        items: budgetItems
    });

    // ─── 7. 준비물 (전원·통신·위생) ───────────────────────────
    const checklistItems: BriefingCheckItem[] = [];
    checklistItems.push({
        id: 'briefing-power-adapter',
        title: `전기 플러그(${dest.plugTypes.join('/')} 타입, ${dest.voltage}V) ${comparison.electricity.adapterNeeded ? '돼지코 어댑터 필수 지참' : '어댑터 없이 사용 가능'}`,
        description: comparison.electricity.summaryKo,
        isEssential: comparison.electricity.adapterNeeded,
        defaultChecked: true,
        category: 'checklist',
        tag: comparison.electricity.adapterNeeded ? '어댑터 필수' : '플러그 호환'
    });

    checklistItems.push({
        id: 'briefing-data-esim',
        title: `${dest.nameKo} 현지 데이터(eSIM / 유심 / 로밍) 사전 개통 및 등록`,
        description: '현지에서 구글 지도 길찾기와 번역 앱을 원활히 쓰기 위해 데이터를 미리 준비하세요.',
        isEssential: true,
        defaultChecked: true,
        category: 'checklist',
        tag: '통신 필수'
    });

    if (comparison.water.isHardWater) {
        checklistItems.push({
            id: 'briefing-water-filter',
            title: `석회수(경수) 대비 여행용 샤워기 필터 지참 및 생수 음용 권장`,
            description: dest.water.waterSummaryKo,
            isEssential: dest.water.showerFilterRecommended,
            defaultChecked: true,
            category: 'checklist',
            tag: '수질 케어'
        });
    }

    checklistItems.push({
        id: 'briefing-travel-insurance',
        title: '해외여행자 보험 가입 (의료비/휴대품 손해/항공기 지연 보상) 및 필수 상비약',
        description: '소화제, 진통소염제, 지사제, 종합감기약, 밴드, 개인 복용약을 넉넉히 챙기세요.',
        isEssential: true,
        defaultChecked: true,
        category: 'checklist',
        tag: '보험 & 상비약'
    });

    briefings.push({
        category: 'checklist',
        title: '준비물 (전원·통신·위생)',
        shortTitle: '준비물',
        icon: 'backpack',
        color: '#ec4899',
        badgeKo: `${dest.plugTypes.join('/')} 타입`,
        highlightKo: `${comparison.electricity.adapterNeeded ? '돼지코 어댑터 필수' : '어댑터 호환'} · ${comparison.water.isHardWater ? '샤워필터 권장' : '수질 안전'}`,
        summaryKo: `${comparison.electricity.summaryKo} ${comparison.water.summaryKo}`,
        items: checklistItems
    });

    // ─── 8. 여행 목적(Theme / Purpose)별 특화 추천 항목 심층 융합 ────────
    if (params.theme) {
        const purpose = resolveTravelPurpose(params.theme);
        if (purpose && purpose.suggestions) {
            purpose.suggestions.forEach(s => {
                const catMap: Record<string, 'basic' | 'transport' | 'accommodation' | 'reservation' | 'itinerary' | 'budget' | 'checklist'> = {
                    basics: 'basic',
                    transport: 'transport',
                    accommodation: 'accommodation',
                    reservations: 'reservation',
                    timeline: 'itinerary',
                    budget: 'budget',
                    checklist: 'checklist'
                };
                const targetCategory = catMap[s.sectionId] || 'checklist';
                const targetBriefing = briefings.find(b => b.category === targetCategory);
                if (targetBriefing) {
                    if (!targetBriefing.items.some(i => i.id === s.id || i.title === s.title)) {
                        targetBriefing.items.push({
                            id: s.id,
                            title: s.title,
                            description: s.description,
                            isEssential: s.isEssential,
                            defaultChecked: true,
                            category: targetCategory,
                            tag: `${purpose.emoji} ${s.tagKo}`
                        });
                    }
                }
            });
        }
    }

    // ─── 9. 다차원 페르소나(연령·성별·인원·기간·예산·국가) 매트릭스 융합 ────
    const personaReport = evaluateTravelPersona({
        countryKey: params.destinationCountry,
        countryName: params.destinationCountry,
        startDate: params.startDate,
        endDate: params.endDate,
        participants: params.participantDetails,
        theme: params.theme
    });

    if (personaReport && personaReport.essentialActionables) {
        personaReport.essentialActionables.forEach(act => {
            const catMap: Record<string, 'basic' | 'transport' | 'accommodation' | 'reservation' | 'itinerary' | 'budget' | 'checklist'> = {
                basics: 'basic',
                transport: 'transport',
                accommodation: 'accommodation',
                reservations: 'reservation',
                timeline: 'itinerary',
                budget: 'budget',
                checklist: 'checklist'
            };
            const targetCategory = catMap[act.sectionId] || 'checklist';
            const targetBriefing = briefings.find(b => b.category === targetCategory);
            if (targetBriefing) {
                if (!targetBriefing.items.some(i => i.id === act.id || i.title === act.title)) {
                    targetBriefing.items.push({
                        id: act.id,
                        title: act.title,
                        description: act.description,
                        isEssential: act.priority === 'essential',
                        defaultChecked: true,
                        category: targetCategory,
                        tag: act.tag
                    });
                }
            }
        });
    }

    return briefings;
}


