/**
 * 국가별 종합 여행 인텔리전스 데이터셋 (Country Travel Intelligence)
 * 
 * 여행에 필요한 모든 실전 국가 속성을 통합 관리합니다.
 * - 콘센트 타입, 전압, eSIM
 * - 언어, 통화, 기준 환율
 * - 비자, 사전 전자여행허가(ETA/ESTA 등)
 * - 수질(연수 vs 석회질 경수, 수돗물 음용 가능 여부)
 * - 종교, 팁 문화, 문화적 에티켓
 * - 운전 방향(우측/좌측 통행), 한국 영문면허 인정 여부, 국제운전면허증(IDP)
 * - 1~12월 월별 기후(평균/최저/최고 기온, 습도, 계절, 체감 날씨 지수, 추천 옷차림)
 */

import { PlugType } from './country-profiles';

/** 체감 날씨 지수 */
export type PerceivedWeatherLevel = 
    | 'freezing'     // 매우 추움 / 혹한 / 패딩 및 방한 필수
    | 'chilly'       // 쌀쌀함 / 썰렁함 / 도톰한 외투, 자켓
    | 'mild'         // 선선하고 쾌적함 / 봄·가을 날씨 / 여행 황금기
    | 'warm'         // 따뜻함 / 온화함 / 가벼운 긴팔 or 반팔
    | 'hot'          // 더움 / 여름 날씨 / 반팔 및 자외선 차단
    | 'sweltering';  // 엄청 덥고 습함 / 폭염 및 열대야 / 통풍성 의류, 냉방 필수

/** 계절 분류 */
export type ClimateSeasonType = 
    | 'spring'       // 봄
    | 'summer'       // 여름
    | 'autumn'       // 가을
    | 'winter'       // 겨울
    | 'dry'          // 건기
    | 'rainy';       // 우기 / 몬순

/** 월별 기후 및 체감 지수 (1~12월) */
export interface MonthlyClimateInfo {
    month: number;               // 1 ~ 12
    avgTempC: number;           // 평균 기온 (°C)
    minTempC: number;           // 평균 최저 기온 (°C)
    maxTempC: number;           // 평균 최고 기온 (°C)
    humidityPercent: number;    // 평균 습도 (%)
    rainfallMm: number;         // 평균 강수량 (mm)
    season: ClimateSeasonType;  // 계절
    perceivedWeather: PerceivedWeatherLevel; // 체감 날씨
    perceivedSummaryKo: string; // 체감 한줄 요약 (예: "썰렁하고 일교차 큼", "쾌적하고 맑음", "매우 덥고 습함")
    clothingTipKo: string;      // 맞춤 옷차림 추천
}

/** 팁 문화 */
export type TippingCultureType = 
    | 'mandatory'    // 필수 (미국/캐나다 등 15~20%)
    | 'customary'    // 관례/일반적 (유럽 고급식당, 가이드/포터 등 5~10%)
    | 'optional'     // 선택/감사의 표시 (서비스 차지 미포함 시 잔돈 남기기 등)
    | 'no_tip';      // 팁 문화 없음 (한국, 일본 등 - 팁 주면 거절하거나 당황)

/** 수질 유형 */
export type WaterHardnessType = 
    | 'soft'         // 연수 (단물 - 거품 잘 나고 피부에 부드러움, 예: 한국, 일본)
    | 'medium'       // 중경수 (보통)
    | 'hard'         // 경수 / 석회수 (석회질 많음 - 피부 건조, 머릿결 뻣뻣, 예: 유럽, 동남아 등);

/** 통행 방향 */
export type DrivingSideType = 'left' | 'right';

/** 국가별 종합 인텔리전스 인터페이스 */
export interface CountryIntelligence {
    key: string;                 // ISO 2자리 코드 (KR, JP, US 등)
    nameKo: string;              // 한국어 국가명 (대한민국, 일본 등)
    nameEn: string;              // 영어 국가명
    aliases: string[];           // 별칭, 주요 도시명 등
    capitalKo: string;           // 수도
    languages: string[];         // 공식/주요 언어
    
    // 1. 전기 & 통신
    plugTypes: PlugType[];       // 플러그 규격 (A, B, C, F, G, I 등)
    voltage: number;             // 전압 (V)
    frequencyHz: number;         // 주파수 (Hz)
    plugSummaryKo: string;       // 플러그 요약 설명 (예: "110V 11자형(A/B) 돼지코 어댑터 필수")
    esimSupported: boolean;      // eSIM 보편 사용 여부
    
    // 2. 통화 & 기준 환율
    currency: {
        code: string;            // JPY, USD, EUR 등
        symbol: string;          // ¥, $, € 등
        nameKo: string;          // 일본 엔, 미국 달러 등
        krwRate: number;         // 1 단위당 현재 시점 기준 원화(KRW) 환율
        rateUnit: number;        // 환율 표기 단위 (예: JPY는 100단위, 나머지는 1단위)
    };

    // 3. 수질 & 위생 (연수/경수)
    water: {
        hardness: WaterHardnessType; // 연수 vs 경수
        tapWaterDrinkable: boolean;  // 수돗물 바로 음용 가능 여부
        waterSummaryKo: string;      // 수질 요약 안내
        showerFilterRecommended: boolean; // 여행용 샤워 필터 권장 여부
    };

    // 4. 종교 & 문화적 에티켓
    culture: {
        majorReligions: string[];    // 주요 종교
        tipping: TippingCultureType; // 팁 문화
        tippingGuideKo: string;      // 팁 가이드 설명
        etiquetteTipsKo: string[];   // 문화/종교적 주의사항 및 에티켓
    };

    // 5. 운전 & 교통
    driving: {
        drivingSide: DrivingSideType; // 우측(좌핸들) vs 좌측(우핸들)
        koreanEnglishLicenseAccepted: boolean; // 한국 영문 운전면허증 단독 인정 여부
        idpRequired: boolean;         // 제네바 국제운전면허증(IDP) 발급 필수 여부
        drivingSummaryKo: string;     // 운전 정책 요약
        drivingTipsKo: string[];      // 실전 운전 팁
    };

    // 6. 비자 & 사전 전자여행허가 (대한민국 여권 기준)
    visa: {
        visaFreeDays: number;         // 무비자 체류 가능 일수 (0 = 비자 필수)
        isVisaRequired: boolean;      // 일반 관광비자 필수 여부
        entryAuthProgram?: string;    // Visit Japan Web, ESTA, eTA, ETIAS, SG Arrival Card 등
        isEntryAuthRequired?: boolean; // 사전 등록/허가 필수 여부 (미신청 시 탑승 거부 등)
        entrySummaryKo: string;       // 입국 요건 요약 안내
    };

    // 7. 1~12월 월별 기후 & 체감 날씨 지수
    climate: {
        climateZone: 'north' | 'south' | 'tropical';
        generalSummaryKo: string;
        monthly: MonthlyClimateInfo[];
    };
}

/**
 * 전 세계 주요 20+개국 종합 여행 인텔리전스 데이터베이스
 */
export const COUNTRY_INTELLIGENCE_DB: Record<string, CountryIntelligence> = {
    // ─── 1. 일본 (JP) ──────────────────────────────────────────
    JP: {
        key: 'JP',
        nameKo: '일본',
        nameEn: 'Japan',
        aliases: ['일본', 'japan', '도쿄', '오사카', '후쿠오카', '교토', '삿포로', '홋카이도', '오키나와', '나고야'],
        capitalKo: '도쿄',
        languages: ['일본어'],
        plugTypes: ['A', 'B'],
        voltage: 100,
        frequencyHz: 50, // 동일본 50Hz, 서일본 60Hz
        plugSummaryKo: '100V 11자형(Type A) 돼지코 어댑터가 필수입니다. 프리볼트(100~240V) 전자기기만 사용 가능합니다.',
        esimSupported: true,
        currency: {
            code: 'JPY',
            symbol: '¥',
            nameKo: '일본 엔',
            krwRate: 9.15, // 1엔 ≈ 9.15원 (100엔 ≈ 915원)
            rateUnit: 100
        },
        water: {
            hardness: 'soft',
            tapWaterDrinkable: true,
            waterSummaryKo: '우수한 연수(단물)로 수돗물을 바로 마실 수 있으며 피부와 모발에 자극이 거의 없습니다.',
            showerFilterRecommended: false
        },
        culture: {
            majorReligions: ['신도 (Shinto)', '불교'],
            tipping: 'no_tip',
            tippingGuideKo: '팁 문화가 전혀 없습니다. 테이블에 잔돈을 두고 가면 잊고 간 것으로 생각하고 쫓아와 돌려줍니다.',
            etiquetteTipsKo: [
                '지하철 및 대중교통 내에서는 통화 금지 및 매너 모드가 기본 에티켓입니다.',
                '신사/사찰 방문 시 입구의 테미즈야(손 씻는 물)는 마시는 물이 아닌 정화용입니다.',
                '문신(타투)이 있는 경우 대중 온천(센토) 입장이 제한될 수 있으니 사전에 확인하세요.'
            ]
        },
        driving: {
            drivingSide: 'left',
            koreanEnglishLicenseAccepted: false,
            idpRequired: true,
            drivingSummaryKo: '좌측 통행(우핸들) 국가입니다. 한국 영문면허증은 인정되지 않으며 반드시 1949 제네바 협약 국제운전면허증(IDP) 실물과 한국 면허증을 함께 지참해야 합니다.',
            drivingTipsKo: [
                '좌회전은 작게(가장 가까운 차로), 우회전은 크게 돌아야 합니다.',
                '일시정지(止まれ, 토마레) 표지판에서는 바퀴가 완전히 멈출 때까지 3초간 정지해야 합니다.',
                '고속도로 톨게이트 이용 시 렌터카 ETC 카드 대여를 적극 권장합니다.'
            ]
        },
        visa: {
            visaFreeDays: 90,
            isVisaRequired: false,
            entryAuthProgram: 'Visit Japan Web',
            isEntryAuthRequired: false, // 권장
            entrySummaryKo: '대한민국 여권 소지 시 90일 무비자 입국이 가능합니다. Visit Japan Web으로 입국심사·세관신고 QR코드를 사전 등록하면 수속이 매우 빨라집니다.'
        },
        climate: {
            climateZone: 'north',
            generalSummaryKo: '한국과 사계절이 유사하나 도쿄/오사카는 한국보다 3~5°C 온화하며 여름은 매우 습하고 덥습니다. 홋카이도는 겨울 설경이 유명합니다.',
            monthly: [
                { month: 1, avgTempC: 5.5, minTempC: 1.5, maxTempC: 10.0, humidityPercent: 50, rainfallMm: 50, season: 'winter', perceivedWeather: 'chilly', perceivedSummaryKo: '쌀쌀하고 맑음 (도쿄 기준 한겨울이나 한국보다 온화)', clothingTipKo: '코트, 패딩, 니트 등 도톰한 겨울 외투' },
                { month: 2, avgTempC: 6.5, minTempC: 2.5, maxTempC: 10.5, humidityPercent: 52, rainfallMm: 55, season: 'winter', perceivedWeather: 'chilly', perceivedSummaryKo: '쌀쌀한 늦겨울 바람', clothingTipKo: '겨울 코트, 목도리, 따뜻한 이너웨어' },
                { month: 3, avgTempC: 9.5, minTempC: 5.0, maxTempC: 14.5, humidityPercent: 58, rainfallMm: 115, season: 'spring', perceivedWeather: 'chilly', perceivedSummaryKo: '초봄의 썰렁함과 벚꽃 개화 시작', clothingTipKo: '트렌치코트, 자켓, 가디건 레이어드' },
                { month: 4, avgTempC: 14.5, minTempC: 10.0, maxTempC: 19.5, humidityPercent: 63, rainfallMm: 125, season: 'spring', perceivedWeather: 'mild', perceivedSummaryKo: '화창하고 쾌적한 벚꽃 절정기 (완벽한 여행 시즌)', clothingTipKo: '가벼운 자켓, 셔츠, 얇은 니트' },
                { month: 5, avgTempC: 19.0, minTempC: 15.0, maxTempC: 23.5, humidityPercent: 68, rainfallMm: 135, season: 'spring', perceivedWeather: 'warm', perceivedSummaryKo: '따뜻하고 화창한 초여름 날씨', clothingTipKo: '반팔 티셔츠, 얇은 가디건, 린넨 셔츠' },
                { month: 6, avgTempC: 22.5, minTempC: 19.0, maxTempC: 26.0, humidityPercent: 78, rainfallMm: 165, season: 'summer', perceivedWeather: 'hot', perceivedSummaryKo: '장마철(츠유)로 덥고 습함, 비 자주 옴', clothingTipKo: '우산/우비 필수, 통풍 잘되는 얇은 여름 옷' },
                { month: 7, avgTempC: 26.5, minTempC: 23.0, maxTempC: 30.5, humidityPercent: 79, rainfallMm: 150, season: 'summer', perceivedWeather: 'sweltering', perceivedSummaryKo: '폭염과 높은 습도, 열대야 시작', clothingTipKo: '시원한 반팔, 선글라스, 휴대용 선풍기' },
                { month: 8, avgTempC: 27.5, minTempC: 24.5, maxTempC: 31.5, humidityPercent: 77, rainfallMm: 170, season: 'summer', perceivedWeather: 'sweltering', perceivedSummaryKo: '한여름 무더위 절정, 냉방 실내와 기온차 큼', clothingTipKo: '얇은 여름 옷, 냉방 대비 얇은 겉옷, 자외선 차단제' },
                { month: 9, avgTempC: 24.0, minTempC: 20.5, maxTempC: 27.5, humidityPercent: 76, rainfallMm: 210, season: 'autumn', perceivedWeather: 'warm', perceivedSummaryKo: '초가을 온화함, 태풍 시즌 비 주의', clothingTipKo: '반팔 + 가벼운 셔츠, 접이식 우산' },
                { month: 10, avgTempC: 18.5, minTempC: 14.5, maxTempC: 22.5, humidityPercent: 69, rainfallMm: 195, season: 'autumn', perceivedWeather: 'mild', perceivedSummaryKo: '선선하고 맑은 단풍 여행 최적기', clothingTipKo: '가디건, 자켓, 긴팔 셔츠, 긴바지' },
                { month: 11, avgTempC: 13.0, minTempC: 9.0, maxTempC: 17.0, humidityPercent: 62, rainfallMm: 90, season: 'autumn', perceivedWeather: 'chilly', perceivedSummaryKo: '아침저녁 썰렁함, 완연한 가을/초겨울', clothingTipKo: '도톰한 자켓, 가을 코트, 니트' },
                { month: 12, avgTempC: 8.0, minTempC: 4.0, maxTempC: 12.5, humidityPercent: 54, rainfallMm: 50, season: 'winter', perceivedWeather: 'chilly', perceivedSummaryKo: '맑고 건조하며 쌀쌀한 겨울', clothingTipKo: '겨울 패딩, 코트, 히트텍' }
            ]
        }
    },

    // ─── 2. 미국 (US) ──────────────────────────────────────────
    US: {
        key: 'US',
        nameKo: '미국',
        nameEn: 'United States',
        aliases: ['미국', 'usa', 'united states', '뉴욕', '로스앤젤레스', 'LA', '샌프란시스코', '하와이', '괌', '사이판', '라스베이거스'],
        capitalKo: '워싱턴 D.C.',
        languages: ['영어'],
        plugTypes: ['A', 'B'],
        voltage: 120,
        frequencyHz: 60,
        plugSummaryKo: '120V 11자형(Type A/B) 돼지코 어댑터가 필요합니다. 60Hz로 한국(60Hz) 전자기기와 주파수가 호환됩니다.',
        esimSupported: true,
        currency: {
            code: 'USD',
            symbol: '$',
            nameKo: '미국 달러',
            krwRate: 1345.0,
            rateUnit: 1
        },
        water: {
            hardness: 'medium',
            tapWaterDrinkable: true,
            waterSummaryKo: '대부분의 도시에서 수돗물 음용이 가능하지만 석회질 함량이 지역마다 달라 생수를 사 마시는 것을 추천합니다.',
            showerFilterRecommended: false
        },
        culture: {
            majorReligions: ['기독교/개신교 (43%)', '가톨릭 (20%)', '무교 (25%)'],
            tipping: 'mandatory',
            tippingGuideKo: '식당 테이블 서빙 시 15~20% 팁이 사실상 의무입니다. 택시는 15~20%, 호텔 포터는 가방당 $1~2, 룸 메이드는 1박당 $2~5가 관례입니다.',
            etiquetteTipsKo: [
                '식당 계산서(Bill)에 팁(Tip/Gratuity)이 이미 포함되어 있는지 먼저 확인하세요.',
                '신분증(여권) 검사가 매우 엄격하므로 주류 구매나 바(Bar) 입장 시 항상 실물 여권을 지참하세요.',
                '횡단보도가 없는 곳 무단횡단(Jaywalking) 시 엄격히 범칙금이 부과될 수 있습니다.'
            ]
        },
        driving: {
            drivingSide: 'right',
            koreanEnglishLicenseAccepted: true, // 괌, 사이판, 캘리포니아 등 다수 주 인정
            idpRequired: false, // 주별 상이하므로 IDP 병행 지참 강력 권장
            drivingSummaryKo: '우측 통행(좌핸들)으로 한국과 동일합니다. 캘리포니아, 뉴욕, 하와이, 괌/사이판 등 상당수 주에서 한국 영문면허증을 인정하지만, 만약을 대비해 제네바 국제운전면허증(IDP)을 함께 지참하는 것이 안전합니다.',
            drivingTipsKo: [
                'STOP 표지판에서는 무조건 3초간 완전 정지 후 선진입 차량 우선으로 통행합니다.',
                '빨간불 우회전(Right Turn on Red)은 "NO TURN ON RED" 표지판이 없으면 일시정지 후 가능합니다.',
                '스쿨버스가 STOP 날개를 펴고 정차하면 반대편 차선 차량도 모두 정지해야 합니다.'
            ]
        },
        visa: {
            visaFreeDays: 90,
            isVisaRequired: false,
            entryAuthProgram: 'ESTA',
            isEntryAuthRequired: true, // 필수
            entrySummaryKo: '비자면제프로그램(VWP) 대상국으로 최대 90일 체류 가능하나, 출발 최소 72시간 전 ESTA(전자여행허가) 승인을 반드시 완료해야 비행기 탑승이 가능합니다.'
        },
        climate: {
            climateZone: 'north',
            generalSummaryKo: '광대한 영토로 뉴욕은 사계절이 뚜렷하고, 캘리포니아는 연중 온화하며, 하와이/괌은 연중 온화한 열대 휴양 기후입니다.',
            monthly: [
                { month: 1, avgTempC: 1.0, minTempC: -3.0, maxTempC: 4.5, humidityPercent: 60, rainfallMm: 85, season: 'winter', perceivedWeather: 'freezing', perceivedSummaryKo: '매우 춥고 눈/강풍 잦음 (동부 기준)', clothingTipKo: '두꺼운 롱패딩, 방한 부츠, 장갑, 목도리' },
                { month: 2, avgTempC: 2.0, minTempC: -2.0, maxTempC: 6.0, humidityPercent: 58, rainfallMm: 75, season: 'winter', perceivedWeather: 'freezing', perceivedSummaryKo: '혹한의 늦겨울 날씨', clothingTipKo: '헤비 아우터, 기모 바지, 방한용품' },
                { month: 3, avgTempC: 6.0, minTempC: 1.5, maxTempC: 10.5, humidityPercent: 55, rainfallMm: 100, season: 'spring', perceivedWeather: 'chilly', perceivedSummaryKo: '쌀쌀하고 바람 부는 초봄', clothingTipKo: '코트, 경량 패딩, 도톰한 자켓' },
                { month: 4, avgTempC: 12.0, minTempC: 7.0, maxTempC: 17.0, humidityPercent: 52, rainfallMm: 95, season: 'spring', perceivedWeather: 'mild', perceivedSummaryKo: '선선하고 쾌적한 봄 날씨', clothingTipKo: '자켓, 트렌치코트, 긴팔 셔츠' },
                { month: 5, avgTempC: 17.5, minTempC: 12.5, maxTempC: 22.5, humidityPercent: 62, rainfallMm: 105, season: 'spring', perceivedWeather: 'warm', perceivedSummaryKo: '화창하고 따뜻한 여행 최적기', clothingTipKo: '얇은 긴팔, 가디건, 반팔 티셔츠' },
                { month: 6, avgTempC: 22.5, minTempC: 18.0, maxTempC: 27.0, humidityPercent: 65, rainfallMm: 110, season: 'summer', perceivedWeather: 'hot', perceivedSummaryKo: '햇살이 강하고 더운 초여름', clothingTipKo: '반팔, 선글라스, 자외선 차단제' },
                { month: 7, avgTempC: 25.5, minTempC: 21.0, maxTempC: 30.0, humidityPercent: 66, rainfallMm: 115, season: 'summer', perceivedWeather: 'hot', perceivedSummaryKo: '무더운 한여름 날씨', clothingTipKo: '시원한 여름 옷, 모자, 선글라스' },
                { month: 8, avgTempC: 25.0, minTempC: 20.5, maxTempC: 29.5, humidityPercent: 67, rainfallMm: 110, season: 'summer', perceivedWeather: 'hot', perceivedSummaryKo: '덥고 해질녘에는 온화함', clothingTipKo: '여름 의류, 냉방 대비 얇은 겉옷' },
                { month: 9, avgTempC: 20.5, minTempC: 16.0, maxTempC: 25.0, humidityPercent: 65, rainfallMm: 100, season: 'autumn', perceivedWeather: 'mild', perceivedSummaryKo: '선선하고 맑은 초가을 (여행 추천)', clothingTipKo: '긴팔 셔츠, 가벼운 가디건, 자켓' },
                { month: 10, avgTempC: 14.5, minTempC: 10.0, maxTempC: 19.0, humidityPercent: 60, rainfallMm: 95, season: 'autumn', perceivedWeather: 'mild', perceivedSummaryKo: '쌀쌀해지기 시작하는 가을 정취', clothingTipKo: '가을 자켓, 트렌치코트, 스웨터' },
                { month: 11, avgTempC: 9.0, minTempC: 5.0, maxTempC: 13.0, humidityPercent: 62, rainfallMm: 85, season: 'autumn', perceivedWeather: 'chilly', perceivedSummaryKo: '썰렁하고 쌀쌀한 늦가을', clothingTipKo: '코트, 경량 패딩, 머플러' },
                { month: 12, avgTempC: 3.5, minTempC: 0.0, maxTempC: 7.0, humidityPercent: 61, rainfallMm: 90, season: 'winter', perceivedWeather: 'chilly', perceivedSummaryKo: '홀리데이 시즌의 쌀쌀한 겨울', clothingTipKo: '겨울 패딩, 방한 의류' }
            ]
        }
    },

    // ─── 3. 프랑스 (FR) ──────────────────────────────────────────
    FR: {
        key: 'FR',
        nameKo: '프랑스',
        nameEn: 'France',
        aliases: ['프랑스', 'france', '파리', '니스', '마르세유', '리옹', '보르도', '스트라스부르'],
        capitalKo: '파리',
        languages: ['프랑스어'],
        plugTypes: ['C', 'E'],
        voltage: 230,
        frequencyHz: 50,
        plugSummaryKo: '230V Type C/E 플러그를 사용합니다. 한국 220V 2구 플러그와 호환되지만 접지핀 구멍이 있는 유러피언 플러그가 권장됩니다.',
        esimSupported: true,
        currency: {
            code: 'EUR',
            symbol: '€',
            nameKo: '유로',
            krwRate: 1465.0,
            rateUnit: 1
        },
        water: {
            hardness: 'hard',
            tapWaterDrinkable: true,
            waterSummaryKo: '수돗물(Eau de robinet)은 정수되어 마실 수 있으나 석회질(Calcaire)이 매우 많은 경수입니다. 생수(Eau minérale) 구매를 권장하며 피부가 예민하다면 샤워 필터 사용이 좋습니다.',
            showerFilterRecommended: true
        },
        culture: {
            majorReligions: ['가톨릭 (50%)', '무교 (33%)', '이슬람 (8%)'],
            tipping: 'optional',
            tippingGuideKo: '서비스료가 법적으로 계산서(Service compris)에 포함되어 있어 팁은 필수가 아닙니다. 훌륭한 서비스를 받았다면 잔돈 1~2유로나 식사 금액의 5% 정도를 남기는 것이 매너입니다.',
            etiquetteTipsKo: [
                '상점이나 식당 입장 시 먼저 "Bonjour(봉주르)"라고 인사하는 것이 매우 중요한 기본 예절입니다.',
                '식당에서 직원을 손을 흔들며 큰 소리로 부르지 말고 눈을 마주치며 가볍게 눈인사하세요.',
                '지하철 및 관광지 소매치기(Pickpocket)에 각별히 유의하세요.'
            ]
        },
        driving: {
            drivingSide: 'right',
            koreanEnglishLicenseAccepted: false,
            idpRequired: true,
            drivingSummaryKo: '우측 통행(좌핸들)으로 한국과 통행 방향이 같습니다. 한국 영문면허증은 인정되지 않으며 제네바 협약 국제운전면허증(IDP) 실물과 한국 면허증을 필히 함께 소지해야 합니다.',
            drivingTipsKo: [
                '회전교차로(Roundabout/Rond-point)는 이미 회전 중인 좌측 진입 차량이 절대 우선입니다.',
                '파리 등 대도시 진입 시 친환경 배출가스 등급 스티커(Crit’Air)가 필요할 수 있습니다.'
            ]
        },
        visa: {
            visaFreeDays: 90,
            isVisaRequired: false,
            entryAuthProgram: 'ETIAS',
            isEntryAuthRequired: false, // ETIAS 시행 전까지 무비자, 시행 시 필수
            entrySummaryKo: '솅겐 협약국으로 180일 기간 내 최대 90일 무비자 체류가 가능합니다. (EU ETIAS 시스템 전면 시행 시 사전 온라인 등록 필수)'
        },
        climate: {
            climateZone: 'north',
            generalSummaryKo: '파리는 해양성 기후로 여름에도 습하지 않고 선선하며, 겨울은 영하로 자주 떨어지지 않으나 으슬으슬 춥고 흐린 날이 많습니다. 남프랑스는 지중해성 기후로 온화합니다.',
            monthly: [
                { month: 1, avgTempC: 5.0, minTempC: 2.5, maxTempC: 7.5, humidityPercent: 85, rainfallMm: 50, season: 'winter', perceivedWeather: 'chilly', perceivedSummaryKo: '흐리고 으슬으슬 쌀쌀한 겨울 날씨', clothingTipKo: '두꺼운 코트, 패딩, 방수 부츠, 목도리' },
                { month: 2, avgTempC: 6.0, minTempC: 2.5, maxTempC: 8.5, humidityPercent: 80, rainfallMm: 45, season: 'winter', perceivedWeather: 'chilly', perceivedSummaryKo: '쌀쌀하고 비가 자주 흩날림', clothingTipKo: '겨울 외투, 니트, 우산' },
                { month: 3, avgTempC: 9.0, minTempC: 5.0, maxTempC: 13.0, humidityPercent: 75, rainfallMm: 50, season: 'spring', perceivedWeather: 'chilly', perceivedSummaryKo: '일교차가 크고 썰렁한 초봄', clothingTipKo: '트렌치코트, 자켓, 스카프' },
                { month: 4, avgTempC: 12.0, minTempC: 7.0, maxTempC: 16.5, humidityPercent: 70, rainfallMm: 55, season: 'spring', perceivedWeather: 'mild', perceivedSummaryKo: '화창하고 선선한 봄 (야외 산책 적기)', clothingTipKo: '가벼운 자켓, 긴팔 셔츠, 가디건' },
                { month: 5, avgTempC: 15.5, minTempC: 10.5, maxTempC: 20.0, humidityPercent: 70, rainfallMm: 65, season: 'spring', perceivedWeather: 'mild', perceivedSummaryKo: '온화하고 쾌적한 최고의 여행 시즌', clothingTipKo: '긴팔 셔츠, 얇은 아우터, 원피스' },
                { month: 6, avgTempC: 19.0, minTempC: 14.0, maxTempC: 23.5, humidityPercent: 68, rainfallMm: 55, season: 'summer', perceivedWeather: 'warm', perceivedSummaryKo: '낮이 매우 길고 따뜻하며 쾌적함', clothingTipKo: '반팔 티셔츠, 얇은 셔츠, 선글라스' },
                { month: 7, avgTempC: 21.0, minTempC: 16.0, maxTempC: 26.0, humidityPercent: 65, rainfallMm: 60, season: 'summer', perceivedWeather: 'warm', perceivedSummaryKo: '맑고 건조하며 따뜻한 여름', clothingTipKo: '여름 옷, 자외선 차단제, 모자' },
                { month: 8, avgTempC: 21.0, minTempC: 15.5, maxTempC: 26.0, humidityPercent: 66, rainfallMm: 50, season: 'summer', perceivedWeather: 'warm', perceivedSummaryKo: '따뜻하고 햇살 강함 (간혹 폭염)', clothingTipKo: '시원한 여름 옷, 선글라스' },
                { month: 9, avgTempC: 17.5, minTempC: 12.5, maxTempC: 22.0, humidityPercent: 72, rainfallMm: 50, season: 'autumn', perceivedWeather: 'mild', perceivedSummaryKo: '선선하고 아름다운 가을의 시작', clothingTipKo: '가디건, 얇은 자켓, 긴바지' },
                { month: 10, avgTempC: 13.0, minTempC: 9.0, maxTempC: 16.5, humidityPercent: 80, rainfallMm: 65, season: 'autumn', perceivedWeather: 'chilly', perceivedSummaryKo: '썰렁해지고 낙엽이 지는 파리의 가을', clothingTipKo: '도톰한 자켓, 가을 코트, 니트' },
                { month: 11, avgTempC: 8.5, minTempC: 5.5, maxTempC: 11.0, humidityPercent: 85, rainfallMm: 55, season: 'autumn', perceivedWeather: 'chilly', perceivedSummaryKo: '쌀쌀하고 비가 잦은 늦가을', clothingTipKo: '겨울 코트, 패딩, 머플러' },
                { month: 12, avgTempC: 5.5, minTempC: 3.0, maxTempC: 8.0, humidityPercent: 86, rainfallMm: 60, season: 'winter', perceivedWeather: 'chilly', perceivedSummaryKo: '크리스마스 마켓과 쌀쌀한 겨울', clothingTipKo: '도톰한 패딩, 목도리, 방한 장갑' }
            ]
        }
    },

    // ─── 4. 영국 (GB) ──────────────────────────────────────────
    GB: {
        key: 'GB',
        nameKo: '영국',
        nameEn: 'United Kingdom',
        aliases: ['영국', 'uk', 'united kingdom', 'england', '런던', '에든버러', '맨체스터', '옥스퍼드'],
        capitalKo: '런던',
        languages: ['영어'],
        plugTypes: ['G'],
        voltage: 230,
        frequencyHz: 50,
        plugSummaryKo: '230V 3구 각형(Type G) 플러그를 사용하므로 영국 전용 3핀 어댑터가 필수입니다.',
        esimSupported: true,
        currency: {
            code: 'GBP',
            symbol: '£',
            nameKo: '영국 파운드',
            krwRate: 1740.0,
            rateUnit: 1
        },
        water: {
            hardness: 'hard',
            tapWaterDrinkable: true,
            waterSummaryKo: '런던 등 잉글랜드 남부는 석회질이 많은 경수입니다. 수돗물 음용은 안전하나 석회 침전물이 있어 필터나 생수를 선호합니다.',
            showerFilterRecommended: true
        },
        culture: {
            majorReligions: ['기독교/성공회 (46%)', '무교 (37%)', '이슬람 (6%)'],
            tipping: 'optional',
            tippingGuideKo: '레스토랑 계산서에 12.5% 서비스 차지가 포함되어 나오는 경우가 많으며, 포함되지 않았다면 10~12.5% 정도 남기는 것이 일반적입니다. 펍(Pub) 카운터 주문 시에는 팁이 필요 없습니다.',
            etiquetteTipsKo: [
                '에스컬레이터 이용 시 우측에 서고(Stand on the right), 좌측은 걷는 사람을 위해 비워두세요.',
                '"Please", "Thank you", "Sorry"를 자주 사용하는 공손한 화법이 중요합니다.',
                '줄서기(Queueing) 문화가 매우 엄격하므로 새치기는 금물입니다.'
            ]
        },
        driving: {
            drivingSide: 'left',
            koreanEnglishLicenseAccepted: true, // 한국 영문면허증 단기 운전 가능
            idpRequired: false, // 영문면허증 가능하나 IDP 지참 권장
            drivingSummaryKo: '좌측 통행(우핸들) 국가입니다. 한국 영문 운전면허증으로 입국 후 최대 1년간 운전이 인정되나 렌터카 업체에 따라 IDP를 요구할 수 있으니 병행 지참이 안전합니다.',
            drivingTipsKo: [
                '런던 시내 진입 시 혼잡통행료(Congestion Charge) 및 초저배출구역(ULEZ) 요금이 부과되니 대중교통 이용을 추천합니다.',
                '회전교차로(Roundabout)는 우측에서 오는 회전 차량이 절대 우선입니다.'
            ]
        },
        visa: {
            visaFreeDays: 180, // 6개월
            isVisaRequired: false,
            entryAuthProgram: 'UK ETA',
            isEntryAuthRequired: true, // 영국 ETA 필수 시행
            entrySummaryKo: '최대 6개월 무비자 관광이 가능하나, 출발 전 영국 전자여행허가(UK ETA)를 사전에 반드시 온라인으로 승인받아야 합니다.'
        },
        climate: {
            climateZone: 'north',
            generalSummaryKo: '변덕스러운 날씨와 잦은 가랑비로 유명합니다. 여름에도 25°C 안팎으로 쾌적하며, 겨울은 한국보다 덜 추우나 일조량이 적고 쌀쌀합니다.',
            monthly: [
                { month: 1, avgTempC: 5.5, minTempC: 2.5, maxTempC: 8.5, humidityPercent: 86, rainfallMm: 55, season: 'winter', perceivedWeather: 'chilly', perceivedSummaryKo: '흐리고 쌀쌀하며 해가 일찍 짐', clothingTipKo: '방풍 코트, 패딩, 보온 이너웨어' },
                { month: 2, avgTempC: 6.0, minTempC: 2.5, maxTempC: 9.0, humidityPercent: 82, rainfallMm: 45, season: 'winter', perceivedWeather: 'chilly', perceivedSummaryKo: '쌀쌀하고 잦은 이슬비', clothingTipKo: '겨울 외투, 방수 신발, 우산' },
                { month: 3, avgTempC: 8.5, minTempC: 4.5, maxTempC: 12.0, humidityPercent: 77, rainfallMm: 40, season: 'spring', perceivedWeather: 'chilly', perceivedSummaryKo: '변덕스럽고 썰렁한 초봄', clothingTipKo: '트렌치코트, 자켓, 머플러' },
                { month: 4, avgTempC: 11.0, minTempC: 6.5, maxTempC: 15.5, humidityPercent: 72, rainfallMm: 45, season: 'spring', perceivedWeather: 'mild', perceivedSummaryKo: '선선하고 화창한 날이 많아짐', clothingTipKo: '가벼운 코트, 가디건, 니트' },
                { month: 5, avgTempC: 14.5, minTempC: 9.5, maxTempC: 18.5, humidityPercent: 70, rainfallMm: 45, season: 'spring', perceivedWeather: 'mild', perceivedSummaryKo: '공원이 푸르고 쾌적한 여행 적기', clothingTipKo: '긴팔 셔츠, 얇은 자켓, 가디건' },
                { month: 6, avgTempC: 17.5, minTempC: 12.5, maxTempC: 21.5, humidityPercent: 68, rainfallMm: 45, season: 'summer', perceivedWeather: 'mild', perceivedSummaryKo: '낮이 매우 길고 선선하고 쾌적함', clothingTipKo: '반팔 티셔츠, 얇은 겉옷 (밤엔 썰렁)' },
                { month: 7, avgTempC: 19.5, minTempC: 14.5, maxTempC: 23.5, humidityPercent: 67, rainfallMm: 45, season: 'summer', perceivedWeather: 'warm', perceivedSummaryKo: '화창하고 온화한 여름 (런던 최고의 계절)', clothingTipKo: '여름 의류, 선글라스, 얇은 셔츠' },
                { month: 8, avgTempC: 19.0, minTempC: 14.0, maxTempC: 23.0, humidityPercent: 70, rainfallMm: 50, season: 'summer', perceivedWeather: 'warm', perceivedSummaryKo: '따뜻하고 쾌적한 늦여름', clothingTipKo: '반팔, 가벼운 긴팔 아우터' },
                { month: 9, avgTempC: 16.0, minTempC: 11.5, maxTempC: 20.0, humidityPercent: 75, rainfallMm: 50, season: 'autumn', perceivedWeather: 'mild', perceivedSummaryKo: '선선하고 운치 있는 가을 날씨', clothingTipKo: '자켓, 트렌치코트, 긴바지' },
                { month: 10, avgTempC: 12.0, minTempC: 8.5, maxTempC: 15.5, humidityPercent: 82, rainfallMm: 65, season: 'autumn', perceivedWeather: 'chilly', perceivedSummaryKo: '썰렁하고 비가 자주 내리는 가을', clothingTipKo: '도톰한 자켓, 가을 코트, 우산' },
                { month: 11, avgTempC: 8.5, minTempC: 5.5, maxTempC: 11.0, humidityPercent: 86, rainfallMm: 60, season: 'autumn', perceivedWeather: 'chilly', perceivedSummaryKo: '쌀쌀하고 일조시간이 짧아짐', clothingTipKo: '겨울 코트, 패딩, 머플러' },
                { month: 12, avgTempC: 6.0, minTempC: 3.0, maxTempC: 9.0, humidityPercent: 87, rainfallMm: 55, season: 'winter', perceivedWeather: 'chilly', perceivedSummaryKo: '화려한 일루미네이션과 쌀쌀한 겨울', clothingTipKo: '방한 패딩, 목도리, 장갑' }
            ]
        }
    },

    // ─── 5. 태국 (TH) ──────────────────────────────────────────
    TH: {
        key: 'TH',
        nameKo: '태국',
        nameEn: 'Thailand',
        aliases: ['태국', 'thailand', '방콕', '푸켓', '치앙마이', '파타야', '코사무이'],
        capitalKo: '방콕',
        languages: ['태국어'],
        plugTypes: ['A', 'B', 'C', 'O'],
        voltage: 220,
        frequencyHz: 50,
        plugSummaryKo: '220V 2구 콘센트(Type A/B/C)로 한국 220V 플러그를 변환 어댑터 없이 그대로 꽂아 사용할 수 있습니다.',
        esimSupported: true,
        currency: {
            code: 'THB',
            symbol: '฿',
            nameKo: '태국 바트',
            krwRate: 40.5,
            rateUnit: 1
        },
        water: {
            hardness: 'hard',
            tapWaterDrinkable: false,
            waterSummaryKo: '수돗물은 절대 마시면 안 됩니다. 양치할 때도 생수를 사용하는 것이 좋으며, 호텔이나 마트의 밀봉된 생수(Bottled water)만 드세요. 여행용 샤워 필터 지참을 적극 권장합니다.',
            showerFilterRecommended: true
        },
        culture: {
            majorReligions: ['소승불교 (93%)', '이슬람 (5%)'],
            tipping: 'customary',
            tippingGuideKo: '마사지 이용 시 50~100바트(1~2시간 기준), 호텔 벨보이/룸메이드는 20~50바트가 매너입니다. 일반 로컬 식당은 팁이 필요 없으나 고급 레스토랑에서는 잔돈을 남기거나 5~10%를 줍니다.',
            etiquetteTipsKo: [
                '왕실과 국왕에 대한 모독은 엄격한 형사처벌 대상이므로 절대 왕실을 비하하거나 지폐를 밟지 마세요.',
                '사원 방문 시 민소매, 반바지, 샌들(슬리퍼) 등 노출 복장은 입장이 제한됩니다.',
                '어린이라도 머리를 쓰다듬는 것은 영혼을 해친다고 여겨 금기시되며, 발바닥으로 사람이나 불상을 가리키지 마세요.'
            ]
        },
        driving: {
            drivingSide: 'left',
            koreanEnglishLicenseAccepted: false,
            idpRequired: true,
            drivingSummaryKo: '좌측 통행(우핸들) 국가입니다. 한국 영문면허증은 불가하며 제네바 국제운전면허증(IDP)이 필수입니다. 오토바이 렌탈 시에도 IDP의 2종 소형(A칸) 도장이 없으면 무면허 단속 및 사고 시 보험 처리가 안 됩니다.',
            drivingTipsKo: [
                '방콕 등 대도시는 교통체증과 오토바이 끼어들기가 매우 심해 렌터카보다 그랩(Grab)/볼트(Bolt) 및 BTS/MRT 이용을 추천합니다.'
            ]
        },
        visa: {
            visaFreeDays: 90, // 한-태 관광 협정
            isVisaRequired: false,
            entrySummaryKo: '대한민국 여권 소지자는 관광 목적 최대 90일 무비자 체류가 가능합니다.'
        },
        climate: {
            climateZone: 'tropical',
            generalSummaryKo: '연중 30°C를 웃도는 열대 몬순 기후입니다. 11월~2월은 건기(쾌적하고 여행 최적기), 3월~5월은 무더위 시즌, 6월~10월은 우기(스콜성 폭우)입니다.',
            monthly: [
                { month: 1, avgTempC: 27.0, minTempC: 22.0, maxTempC: 32.5, humidityPercent: 65, rainfallMm: 15, season: 'dry', perceivedWeather: 'warm', perceivedSummaryKo: '비가 거의 안 오고 따뜻하고 쾌적함 (여행 최고 시즌)', clothingTipKo: '가벼운 여름 옷, 밤/실내용 얇은 가디건' },
                { month: 2, avgTempC: 28.5, minTempC: 23.5, maxTempC: 33.5, humidityPercent: 68, rainfallMm: 20, season: 'dry', perceivedWeather: 'hot', perceivedSummaryKo: '맑고 햇살이 강하며 따뜻함', clothingTipKo: '시원한 여름 옷, 선글라스, 자외선 차단' },
                { month: 3, avgTempC: 30.0, minTempC: 25.5, maxTempC: 34.5, humidityPercent: 70, rainfallMm: 40, season: 'dry', perceivedWeather: 'hot', perceivedSummaryKo: '기온이 크게 오르며 더워짐', clothingTipKo: '통풍 잘되는 얇은 반팔, 모자, 양산' },
                { month: 4, avgTempC: 31.0, minTempC: 26.5, maxTempC: 35.5, humidityPercent: 72, rainfallMm: 75, season: 'dry', perceivedWeather: 'sweltering', perceivedSummaryKo: '연중 가장 무더운 달 (송끄란 물축제 시즌)', clothingTipKo: '시원한 민소매/반팔, 방수팩, 자외선 차단제' },
                { month: 5, avgTempC: 30.0, minTempC: 26.0, maxTempC: 34.5, humidityPercent: 77, rainfallMm: 190, season: 'rainy', perceivedWeather: 'sweltering', perceivedSummaryKo: '무덥고 간헐적 스콜 시작', clothingTipKo: '우산, 방수 샌들, 얇은 여름 옷' },
                { month: 6, avgTempC: 29.5, minTempC: 25.5, maxTempC: 33.5, humidityPercent: 78, rainfallMm: 160, season: 'rainy', perceivedWeather: 'sweltering', perceivedSummaryKo: '덥고 습하며 오후 스콜 주의', clothingTipKo: '통기성 의류, 접이식 우산' },
                { month: 7, avgTempC: 29.0, minTempC: 25.0, maxTempC: 33.0, humidityPercent: 79, rainfallMm: 175, season: 'rainy', perceivedWeather: 'sweltering', perceivedSummaryKo: '고온다습하며 비가 자주 내림', clothingTipKo: '가벼운 여름 옷, 슬리퍼/샌들' },
                { month: 8, avgTempC: 29.0, minTempC: 25.0, maxTempC: 33.0, humidityPercent: 80, rainfallMm: 200, season: 'rainy', perceivedWeather: 'sweltering', perceivedSummaryKo: '습도 높고 우기 절정', clothingTipKo: '시원한 여름 옷, 우산, 에어컨 대비 겉옷' },
                { month: 9, avgTempC: 28.5, minTempC: 24.5, maxTempC: 32.5, humidityPercent: 83, rainfallMm: 330, season: 'rainy', perceivedWeather: 'sweltering', perceivedSummaryKo: '연중 강수량 최고 (폭우 및 침수 주의)', clothingTipKo: '방수 가방, 우비/우산, 잘 마르는 옷' },
                { month: 10, avgTempC: 28.5, minTempC: 24.5, maxTempC: 32.5, humidityPercent: 81, rainfallMm: 240, season: 'rainy', perceivedWeather: 'hot', perceivedSummaryKo: '우기가 끝나가며 비 빈도 감소', clothingTipKo: '여름 옷, 접이식 우산' },
                { month: 11, avgTempC: 27.5, minTempC: 23.0, maxTempC: 32.0, humidityPercent: 72, rainfallMm: 50, season: 'dry', perceivedWeather: 'warm', perceivedSummaryKo: '건기 시작, 아침저녁 선선하고 쾌적', clothingTipKo: '여름 옷, 얇은 긴팔 가디건' },
                { month: 12, avgTempC: 26.5, minTempC: 21.0, maxTempC: 31.5, humidityPercent: 65, rainfallMm: 10, season: 'dry', perceivedWeather: 'warm', perceivedSummaryKo: '연중 가장 쾌적하고 맑은 건기', clothingTipKo: '가벼운 여름 옷, 선글라스' }
            ]
        }
    },

    // ─── 6. 베트남 (VN) ──────────────────────────────────────────
    VN: {
        key: 'VN',
        nameKo: '베트남',
        nameEn: 'Vietnam',
        aliases: ['베트남', 'vietnam', '다낭', '하노이', '호치민', '나트랑', '푸꾸옥', '호이안', '달랏'],
        capitalKo: '하노이',
        languages: ['베트남어'],
        plugTypes: ['A', 'C', 'F'],
        voltage: 220,
        frequencyHz: 50,
        plugSummaryKo: '220V Type A/C 콘센트로 한국 220V 플러그를 어댑터 없이 그대로 꽂아 사용 가능합니다.',
        esimSupported: true,
        currency: {
            code: 'VND',
            symbol: '₫',
            nameKo: '베트남 동',
            krwRate: 0.055, // 10,000동 ≈ 550원 (뒤의 0 떼고 나누기 20)
            rateUnit: 1000
        },
        water: {
            hardness: 'hard',
            tapWaterDrinkable: false,
            waterSummaryKo: '석회질과 배관 노후화로 수돗물 음용 절대 불가입니다. 양치 시 생수를 사용하고 길거리 노점의 얼음 섭취에 주의하세요. 샤워 필터 지참을 강력 권장합니다.',
            showerFilterRecommended: true
        },
        culture: {
            majorReligions: ['불교 (15%)', '가톨릭 (7%)', '무교/토속신앙 (70%)'],
            tipping: 'optional',
            tippingGuideKo: '로컬 식당은 팁 문화가 없으나 마사지 샵은 5만~10만 동(약 2,500~5,000원), 호텔 벨보이/하우스키핑은 2만 동 정도의 팁이 관례입니다.',
            etiquetteTipsKo: [
                '베트남 화폐는 단위가 크고 인물(호찌민 주석)이 모두 같으므로 50만 동과 2만 동의 색상 구분에 유의하세요.',
                '사원이나 호찌민 묘소 방문 시 단정한 복장(무릎/어깨 덮는 옷)이 필수입니다.'
            ]
        },
        driving: {
            drivingSide: 'right',
            koreanEnglishLicenseAccepted: false,
            idpRequired: false,
            drivingSummaryKo: '우측 통행(좌핸들)이나 외국인의 일반 렌터카 자가운전은 제네바 IDP가 인정되지 않아 사실상 불가능합니다. 그랩(Grab) 차량 호출이나 기사 포함 렌터카(Private Car)를 이용하는 것이 정석입니다.',
            drivingTipsKo: [
                '도로에 오토바이가 매우 많으므로 길을 건널 때는 뛰지 말고 일정한 속도로 천천히 걸어가야 오토바이들이 피해 갑니다.'
            ]
        },
        visa: {
            visaFreeDays: 45, // 45일 무비자
            isVisaRequired: false,
            entrySummaryKo: '대한민국 여권 소지 시 최대 45일 무비자 체류가 가능합니다. 여권 유효기간 6개월 이상 필수.'
        },
        climate: {
            climateZone: 'tropical',
            generalSummaryKo: '북부(하노이)는 4계절이 있어 겨울(12~2월)에 10~15°C로 쌀쌀하며, 중부(다낭)는 9~12월 우기, 남부(호치민/푸꾸옥)는 연중 더운 열대 기후입니다.',
            monthly: [
                { month: 1, avgTempC: 22.0, minTempC: 18.0, maxTempC: 26.0, humidityPercent: 80, rainfallMm: 30, season: 'dry', perceivedWeather: 'warm', perceivedSummaryKo: '중남부 따뜻하고 쾌적, 북부 하노이는 쌀쌀', clothingTipKo: '여름 옷 + 하노이 방문 시 가디건/자켓' },
                { month: 2, avgTempC: 23.5, minTempC: 19.5, maxTempC: 27.5, humidityPercent: 78, rainfallMm: 20, season: 'dry', perceivedWeather: 'warm', perceivedSummaryKo: '맑고 온화한 여행 성수기', clothingTipKo: '가벼운 여름 옷, 선글라스' },
                { month: 3, avgTempC: 26.0, minTempC: 22.0, maxTempC: 30.0, humidityPercent: 78, rainfallMm: 25, season: 'dry', perceivedWeather: 'hot', perceivedSummaryKo: '화창하고 기온 상승', clothingTipKo: '반팔 티셔츠, 린넨 셔츠, 자외선 차단' },
                { month: 4, avgTempC: 28.5, minTempC: 24.5, maxTempC: 32.5, humidityPercent: 77, rainfallMm: 45, season: 'dry', perceivedWeather: 'hot', perceivedSummaryKo: '더운 건기 날씨', clothingTipKo: '시원한 여름 옷, 모자, 선글라스' },
                { month: 5, avgTempC: 30.0, minTempC: 25.5, maxTempC: 34.5, humidityPercent: 78, rainfallMm: 120, season: 'rainy', perceivedWeather: 'sweltering', perceivedSummaryKo: '무더위와 간헐적 소나기', clothingTipKo: '통풍 잘되는 얇은 반팔, 접이식 우산' },
                { month: 6, avgTempC: 30.5, minTempC: 26.0, maxTempC: 35.0, humidityPercent: 76, rainfallMm: 130, season: 'rainy', perceivedWeather: 'sweltering', perceivedSummaryKo: '한여름 무더위 절정', clothingTipKo: '시원한 여름 옷, 수영복, 쿨토시' },
                { month: 7, avgTempC: 30.0, minTempC: 25.5, maxTempC: 34.5, humidityPercent: 77, rainfallMm: 140, season: 'rainy', perceivedWeather: 'sweltering', perceivedSummaryKo: '덥고 습한 여름 날씨', clothingTipKo: '얇은 여름 옷, 휴대용 선풍기' },
                { month: 8, avgTempC: 29.5, minTempC: 25.0, maxTempC: 34.0, humidityPercent: 79, rainfallMm: 170, season: 'rainy', perceivedWeather: 'sweltering', perceivedSummaryKo: '고온다습, 오후 스콜 주의', clothingTipKo: '가벼운 여름 옷, 우산' },
                { month: 9, avgTempC: 28.0, minTempC: 24.0, maxTempC: 32.0, humidityPercent: 82, rainfallMm: 350, season: 'rainy', perceivedWeather: 'hot', perceivedSummaryKo: '중부 다낭 우기 시작 (강수량 많음)', clothingTipKo: '방수 가방, 우비, 샌들' },
                { month: 10, avgTempC: 26.5, minTempC: 22.5, maxTempC: 30.5, humidityPercent: 83, rainfallMm: 450, season: 'rainy', perceivedWeather: 'warm', perceivedSummaryKo: '다낭/호이안 비 자주 내림', clothingTipKo: '우산/우비 필수, 잘 마르는 옷' },
                { month: 11, avgTempC: 25.0, minTempC: 21.0, maxTempC: 28.5, humidityPercent: 82, rainfallMm: 280, season: 'rainy', perceivedWeather: 'warm', perceivedSummaryKo: '선선해지며 비 빈도 감소', clothingTipKo: '반팔 + 얇은 겉옷' },
                { month: 12, avgTempC: 23.0, minTempC: 19.0, maxTempC: 27.0, humidityPercent: 81, rainfallMm: 120, season: 'dry', perceivedWeather: 'warm', perceivedSummaryKo: '온화하고 선선한 건기 진입', clothingTipKo: '가벼운 여름 옷, 가디건' }
            ]
        }
    },

    // ─── 7. 대만 (TW) ──────────────────────────────────────────
    TW: {
        key: 'TW',
        nameKo: '대만',
        nameEn: 'Taiwan',
        aliases: ['대만', '타이완', 'taiwan', '타이베이', '가오슝', '타이중', '지우펀', '화롄'],
        capitalKo: '타이베이',
        languages: ['중국어(번체)', '대만어'],
        plugTypes: ['A', 'B'],
        voltage: 110,
        frequencyHz: 60,
        plugSummaryKo: '110V 11자형(Type A/B) 돼지코 어댑터가 필요합니다.',
        esimSupported: true,
        currency: {
            code: 'TWD',
            symbol: 'NT$',
            nameKo: '신대만 달러',
            krwRate: 42.0,
            rateUnit: 1
        },
        water: {
            hardness: 'medium',
            tapWaterDrinkable: false,
            waterSummaryKo: '수돗물은 끓이거나 정수하지 않고 마시는 것을 권장하지 않습니다. 생수를 사 마시는 것이 안전합니다.',
            showerFilterRecommended: false
        },
        culture: {
            majorReligions: ['불교/도교 (80%)', '기독교 (5%)'],
            tipping: 'no_tip',
            tippingGuideKo: '팁 문화가 없습니다. 고급 레스토랑에서는 10% 서비스 차지가 계산서에 자동 부과됩니다.',
            etiquetteTipsKo: [
                '지하철(MRT) 역사 및 열차 내에서 물, 껌, 사탕을 포함한 모든 음식물 섭취가 엄격히 금지되며 어길 시 무거운 벌금이 부과됩니다.',
                '사원 방문 시 오른쪽 문(용문)으로 들어가 왼쪽 문(호문)으로 나오는 것이 전통 관례입니다.'
            ]
        },
        driving: {
            drivingSide: 'right',
            koreanEnglishLicenseAccepted: false,
            idpRequired: true,
            drivingSummaryKo: '우측 통행(좌핸들)입니다. 한국-대만 상호 운전면허 인정 양해각서(MOU)에 따라 제네바 협약 국제운전면허증(IDP)으로 운전이 가능합니다.',
            drivingTipsKo: [
                '타이베이 시내는 대중교통(MRT, 버스)이 극도로 잘 발달되어 있어 렌터카보다 이지카드(EasyCard) 대중교통 이용이 훨씬 편리합니다.'
            ]
        },
        visa: {
            visaFreeDays: 90,
            isVisaRequired: false,
            entrySummaryKo: '대한민국 여권 소지자는 90일 무비자 입국이 가능합니다. 온라인 입국신고서(TWAC)를 사전에 작성하면 입국이 빨라집니다.'
        },
        climate: {
            climateZone: 'tropical',
            generalSummaryKo: '아열대 기후로 여름은 덥고 습하며 태풍이 잦고, 겨울(12~2월)은 기온이 15°C 내외지만 습도가 높아 체감온도가 썰렁합니다.',
            monthly: [
                { month: 1, avgTempC: 16.0, minTempC: 13.5, maxTempC: 19.0, humidityPercent: 78, rainfallMm: 85, season: 'winter', perceivedWeather: 'chilly', perceivedSummaryKo: '습하고 으슬으슬 썰렁한 겨울 (난방 시설 적음)', clothingTipKo: '가벼운 패딩, 코트, 히트텍, 가디건' },
                { month: 2, avgTempC: 16.5, minTempC: 14.0, maxTempC: 19.5, humidityPercent: 80, rainfallMm: 130, season: 'winter', perceivedWeather: 'chilly', perceivedSummaryKo: '비가 잦고 쌀쌀한 날씨', clothingTipKo: '도톰한 자켓, 니트, 접이식 우산' },
                { month: 3, avgTempC: 18.5, minTempC: 15.5, maxTempC: 22.0, humidityPercent: 78, rainfallMm: 150, season: 'spring', perceivedWeather: 'mild', perceivedSummaryKo: '포근해지며 봄비가 내림', clothingTipKo: '가디건, 긴팔 셔츠, 자켓' },
                { month: 4, avgTempC: 22.5, minTempC: 19.0, maxTempC: 26.0, humidityPercent: 76, rainfallMm: 140, season: 'spring', perceivedWeather: 'warm', perceivedSummaryKo: '따뜻하고 화창한 여행 적기', clothingTipKo: '얇은 긴팔, 반팔 티셔츠' },
                { month: 5, avgTempC: 25.5, minTempC: 22.5, maxTempC: 29.0, humidityPercent: 76, rainfallMm: 230, season: 'summer', perceivedWeather: 'hot', perceivedSummaryKo: '초여름 더위와 매우(장마) 시즌', clothingTipKo: '시원한 여름 옷, 우산 필수' },
                { month: 6, avgTempC: 28.0, minTempC: 25.0, maxTempC: 32.0, humidityPercent: 75, rainfallMm: 300, season: 'summer', perceivedWeather: 'sweltering', perceivedSummaryKo: '무덥고 습한 여름, 스콜/태풍 주의', clothingTipKo: '통풍 잘되는 얇은 옷, 선글라스' },
                { month: 7, avgTempC: 30.0, minTempC: 26.5, maxTempC: 34.5, humidityPercent: 72, rainfallMm: 240, season: 'summer', perceivedWeather: 'sweltering', perceivedSummaryKo: '한여름 폭염과 강한 자외선', clothingTipKo: '시원한 여름 옷, 양산, 냉방용 겉옷' },
                { month: 8, avgTempC: 29.5, minTempC: 26.0, maxTempC: 34.0, humidityPercent: 73, rainfallMm: 320, season: 'summer', perceivedWeather: 'sweltering', perceivedSummaryKo: '덥고 습하며 태풍 시즌', clothingTipKo: '여름 의류, 방수 용품' },
                { month: 9, avgTempC: 27.5, minTempC: 24.5, maxTempC: 31.5, humidityPercent: 74, rainfallMm: 260, season: 'autumn', perceivedWeather: 'hot', perceivedSummaryKo: '늦더위와 쾌적한 바람의 교차', clothingTipKo: '반팔 티셔츠, 얇은 셔츠' },
                { month: 10, avgTempC: 24.5, minTempC: 21.5, maxTempC: 27.5, humidityPercent: 75, rainfallMm: 120, season: 'autumn', perceivedWeather: 'mild', perceivedSummaryKo: '선선하고 비가 줄어드는 여행 최고 시즌', clothingTipKo: '긴팔 셔츠, 가벼운 가디건' },
                { month: 11, avgTempC: 21.5, minTempC: 18.5, maxTempC: 24.5, humidityPercent: 76, rainfallMm: 70, season: 'autumn', perceivedWeather: 'mild', perceivedSummaryKo: '쾌적하고 온화한 가을 날씨', clothingTipKo: '가디건, 자켓, 긴바지' },
                { month: 12, avgTempC: 18.0, minTempC: 15.0, maxTempC: 21.0, humidityPercent: 76, rainfallMm: 75, season: 'winter', perceivedWeather: 'chilly', perceivedSummaryKo: '선선하고 썰렁한 초겨울 날씨', clothingTipKo: '가을/겨울 자켓, 니트, 머플러' }
            ]
        }
    },

    // ─── 8. 싱가포르 (SG) ──────────────────────────────────────────
    SG: {
        key: 'SG',
        nameKo: '싱가포르',
        nameEn: 'Singapore',
        aliases: ['싱가포르', 'singapore', '싱가폴', '센토사', '마리나베이'],
        capitalKo: '싱가포르',
        languages: ['영어', '말레이어', '중국어', '타밀어'],
        plugTypes: ['G'],
        voltage: 230,
        frequencyHz: 50,
        plugSummaryKo: '230V 3구 각형(Type G, 영국식) 플러그를 사용하므로 멀티 어댑터가 필요합니다.',
        esimSupported: true,
        currency: {
            code: 'SGD',
            symbol: 'S$',
            nameKo: '싱가포르 달러',
            krwRate: 1035.0,
            rateUnit: 1
        },
        water: {
            hardness: 'medium',
            tapWaterDrinkable: true,
            waterSummaryKo: '수돗물 정수 시스템(NEWater)이 세계 최고 수준으로 수돗물을 바로 마셔도 안전합니다.',
            showerFilterRecommended: false
        },
        culture: {
            majorReligions: ['불교 (31%)', '기독교 (19%)', '이슬람 (15%)', '도교 (9%)', '힌두교 (5%)'],
            tipping: 'no_tip',
            tippingGuideKo: '대부분의 식당에서 10% 서비스 차지와 GST(소비세)가 부과되므로 팁을 줄 필요가 없습니다.',
            etiquetteTipsKo: [
                '껌 반입 및 길거리 투기 금지, 쓰레기 무단투기 및 무단횡단 시 엄격한 벌금이 부과됩니다.',
                '지하철(MRT) 내 음식물 및 음료 섭취(물 포함) 시 최대 500 SGD 벌금이 부과됩니다.'
            ]
        },
        driving: {
            drivingSide: 'left',
            koreanEnglishLicenseAccepted: true,
            idpRequired: false,
            drivingSummaryKo: '좌측 통행(우핸들) 국가입니다. 한국 영문 운전면허증으로 최대 12개월간 운전 가능합니다.',
            drivingTipsKo: [
                '도시국가 특성상 대중교통(MRT, 버스, 그랩)이 매우 편리하여 렌터카가 거의 필요하지 않습니다.'
            ]
        },
        visa: {
            visaFreeDays: 90,
            isVisaRequired: false,
            entryAuthProgram: 'SG Arrival Card (SGAC)',
            isEntryAuthRequired: true, // 온라인 입국신고서 필수
            entrySummaryKo: '90일 무비자 체류 가능하며, 입국 3일 전부터 전자 입국신고서(SG Arrival Card)를 온라인으로 무료 작성해야 합니다.'
        },
        climate: {
            climateZone: 'tropical',
            generalSummaryKo: '적도 바로 위 열대 우림 기후로 연중 25~32°C의 덥고 습한 날씨가 지속되며, 11월~1월은 몬순 시즌으로 비가 자주 내립니다.',
            monthly: [
                { month: 1, avgTempC: 27.0, minTempC: 24.0, maxTempC: 30.5, humidityPercent: 84, rainfallMm: 220, season: 'rainy', perceivedWeather: 'sweltering', perceivedSummaryKo: '따뜻하고 습하며 몬순 비 잦음', clothingTipKo: '통풍 잘되는 여름 옷, 접이식 우산' },
                { month: 2, avgTempC: 27.5, minTempC: 24.5, maxTempC: 31.5, humidityPercent: 80, rainfallMm: 110, season: 'dry', perceivedWeather: 'sweltering', perceivedSummaryKo: '연중 가장 맑고 덜 습한 달', clothingTipKo: '시원한 여름 옷, 선글라스' },
                { month: 3, avgTempC: 28.0, minTempC: 25.0, maxTempC: 32.0, humidityPercent: 81, rainfallMm: 150, season: 'dry', perceivedWeather: 'sweltering', perceivedSummaryKo: '덥고 햇살 강함', clothingTipKo: '가벼운 여름 옷, 자외선 차단' },
                { month: 4, avgTempC: 28.5, minTempC: 25.5, maxTempC: 32.5, humidityPercent: 82, rainfallMm: 160, season: 'summer', perceivedWeather: 'sweltering', perceivedSummaryKo: '무더운 열대 날씨', clothingTipKo: '시원한 옷차림, 실내 냉방용 가디건' },
                { month: 5, avgTempC: 28.5, minTempC: 25.5, maxTempC: 32.5, humidityPercent: 82, rainfallMm: 160, season: 'summer', perceivedWeather: 'sweltering', perceivedSummaryKo: '무덥고 습하며 오후 소나기', clothingTipKo: '통기성 의류, 양산' },
                { month: 6, avgTempC: 28.5, minTempC: 25.5, maxTempC: 32.0, humidityPercent: 81, rainfallMm: 130, season: 'summer', perceivedWeather: 'sweltering', perceivedSummaryKo: '덥고 습한 날씨 지속', clothingTipKo: '여름 옷, 휴대용 선풍기' },
                { month: 7, avgTempC: 28.0, minTempC: 25.0, maxTempC: 31.5, humidityPercent: 81, rainfallMm: 140, season: 'summer', perceivedWeather: 'sweltering', perceivedSummaryKo: '무더위와 쇼핑/미식 시즌', clothingTipKo: '얇은 여름 옷, 냉방 대비 겉옷' },
                { month: 8, avgTempC: 28.0, minTempC: 25.0, maxTempC: 31.5, humidityPercent: 81, rainfallMm: 140, season: 'summer', perceivedWeather: 'sweltering', perceivedSummaryKo: '덥고 화창한 날씨', clothingTipKo: '시원한 옷차림, 선글라스' },
                { month: 9, avgTempC: 27.5, minTempC: 24.5, maxTempC: 31.5, humidityPercent: 82, rainfallMm: 150, season: 'summer', perceivedWeather: 'sweltering', perceivedSummaryKo: '고온다습한 열대 기후', clothingTipKo: '가벼운 여름 옷, 우산' },
                { month: 10, avgTempC: 27.5, minTempC: 24.5, maxTempC: 31.5, humidityPercent: 83, rainfallMm: 170, season: 'rainy', perceivedWeather: 'sweltering', perceivedSummaryKo: '소나기(스콜) 잦아짐', clothingTipKo: '통풍 옷, 방수 신발' },
                { month: 11, avgTempC: 27.0, minTempC: 24.0, maxTempC: 31.0, humidityPercent: 85, rainfallMm: 250, season: 'rainy', perceivedWeather: 'sweltering', perceivedSummaryKo: '북동 몬순 우기 (비 자주 내림)', clothingTipKo: '우산 필수, 시원한 여름 옷' },
                { month: 12, avgTempC: 26.5, minTempC: 23.5, maxTempC: 30.5, humidityPercent: 86, rainfallMm: 300, season: 'rainy', perceivedWeather: 'sweltering', perceivedSummaryKo: '연중 가장 비가 많이 오고 온화', clothingTipKo: '여름 옷, 방수 가방, 가디건' }
            ]
        }
    },

    // ─── 9. 호주 (AU) ──────────────────────────────────────────
    AU: {
        key: 'AU',
        nameKo: '호주',
        nameEn: 'Australia',
        aliases: ['호주', '오스트레일리아', 'australia', '시드니', '멜버른', '브리즈번', '골드코스트', '퍼스', '케언즈'],
        capitalKo: '캔버라',
        languages: ['영어'],
        plugTypes: ['I'],
        voltage: 230,
        frequencyHz: 50,
        plugSummaryKo: '230V 사선 3핀(Type I) 플러그를 사용하므로 호주 전용 어댑터가 필수입니다.',
        esimSupported: true,
        currency: {
            code: 'AUD',
            symbol: 'A$',
            nameKo: '호주 달러',
            krwRate: 895.0,
            rateUnit: 1
        },
        water: {
            hardness: 'soft',
            tapWaterDrinkable: true,
            waterSummaryKo: '수돗물 수질이 매우 우수하며 어디서나 안심하고 마실 수 있습니다.',
            showerFilterRecommended: false
        },
        culture: {
            majorReligions: ['기독교 (44%)', '무교 (39%)'],
            tipping: 'optional',
            tippingGuideKo: '팁 문화가 필수가 아닙니다. 좋은 서비스를 받았을 때 식사 금액의 5~10%를 주거나 잔돈을 남기는 정도입니다.',
            etiquetteTipsKo: [
                '햇살과 자외선(UV Index)이 세계에서 가장 강하므로 자외선 차단제(SPF 50+), 선글라스, 모자가 필수입니다.',
                '검역(Biosecurity)이 세계 최고 수준으로 엄격하여 음식물, 육류, 씨앗류, 의약품 미신고 적발 시 즉시 거액의 벌금이 부과됩니다.'
            ]
        },
        driving: {
            drivingSide: 'left',
            koreanEnglishLicenseAccepted: true, // 호주 전역 한국 영문면허증 인정
            idpRequired: false,
            drivingSummaryKo: '좌측 통행(우핸들) 국가입니다. 한국 영문 운전면허증으로 호주 전역에서 단기 운전이 인정됩니다.',
            drivingTipsKo: [
                '멜버른 시내 트램과 함께 달릴 때는 우회전을 가장 바깥 차선에서 대기하다 하는 훅 턴(Hook Turn) 규칙을 숙지해야 합니다.',
                '외곽 고속도로 야간 운전 시 캥거루 등 야생동물 충돌에 각별히 유의하세요.'
            ]
        },
        visa: {
            visaFreeDays: 90,
            isVisaRequired: false,
            entryAuthProgram: 'ETA (subclass 601)',
            isEntryAuthRequired: true, // 필수
            entrySummaryKo: '최대 90일 체류 가능하나, 전용 모바일 앱(AustralianETA)을 통해 ETA 전자여행허가를 사전에 반드시 승인받아야 합니다.'
        },
        climate: {
            climateZone: 'south', // 남반구: 한국과 계절 정반대!
            generalSummaryKo: '남반구에 위치하여 한국과 계절이 정반대입니다. 12~2월이 여름(성수기), 6~8월이 겨울(한국의 늦가을 수준으로 쌀쌀함)입니다.',
            monthly: [
                { month: 1, avgTempC: 23.5, minTempC: 19.5, maxTempC: 27.5, humidityPercent: 65, rainfallMm: 95, season: 'summer', perceivedWeather: 'warm', perceivedSummaryKo: '남반구 한여름, 따뜻하고 해변 물놀이 최고 시즌', clothingTipKo: '여름 옷, 수영복, 선글라스, 자외선 차단제' },
                { month: 2, avgTempC: 23.0, minTempC: 19.5, maxTempC: 27.0, humidityPercent: 67, rainfallMm: 115, season: 'summer', perceivedWeather: 'warm', perceivedSummaryKo: '따뜻하고 화창한 여름 바다 날씨', clothingTipKo: '시원한 여름 옷, 모자, 양산' },
                { month: 3, avgTempC: 21.5, minTempC: 18.0, maxTempC: 25.5, humidityPercent: 66, rainfallMm: 120, season: 'autumn', perceivedWeather: 'mild', perceivedSummaryKo: '초가을의 온화하고 쾌적한 날씨', clothingTipKo: '반팔 + 가벼운 셔츠, 가디건' },
                { month: 4, avgTempC: 18.5, minTempC: 15.0, maxTempC: 22.5, humidityPercent: 64, rainfallMm: 110, season: 'autumn', perceivedWeather: 'mild', perceivedSummaryKo: '선선하고 아름다운 가을 정취', clothingTipKo: '긴팔 셔츠, 자켓, 긴바지' },
                { month: 5, avgTempC: 15.0, minTempC: 11.5, maxTempC: 19.5, humidityPercent: 63, rainfallMm: 95, season: 'autumn', perceivedWeather: 'chilly', perceivedSummaryKo: '아침저녁 썰렁한 늦가을 날씨', clothingTipKo: '가디건, 도톰한 자켓, 니트' },
                { month: 6, avgTempC: 13.0, minTempC: 9.5, maxTempC: 17.0, humidityPercent: 64, rainfallMm: 125, season: 'winter', perceivedWeather: 'chilly', perceivedSummaryKo: '남반구 겨울 시작, 한국 늦가을처럼 쌀쌀함', clothingTipKo: '겨울 코트, 자켓, 니트, 머플러' },
                { month: 7, avgTempC: 12.0, minTempC: 8.5, maxTempC: 16.5, humidityPercent: 60, rainfallMm: 80, season: 'winter', perceivedWeather: 'chilly', perceivedSummaryKo: '연중 가장 쌀쌀한 겨울 (시드니 기준 영하는 아님)', clothingTipKo: '도톰한 코트, 경량 패딩, 긴바지' },
                { month: 8, avgTempC: 13.5, minTempC: 9.0, maxTempC: 18.0, humidityPercent: 55, rainfallMm: 75, season: 'winter', perceivedWeather: 'chilly', perceivedSummaryKo: '화창하고 맑으나 바람 불면 썰렁함', clothingTipKo: '자켓, 코트, 스웨터' },
                { month: 9, avgTempC: 16.0, minTempC: 11.5, maxTempC: 20.5, humidityPercent: 54, rainfallMm: 60, season: 'spring', perceivedWeather: 'mild', perceivedSummaryKo: '남반구 봄 시작, 포근하고 쾌적함', clothingTipKo: '가벼운 자켓, 셔츠, 가디건' },
                { month: 10, avgTempC: 18.5, minTempC: 14.0, maxTempC: 23.0, humidityPercent: 57, rainfallMm: 70, season: 'spring', perceivedWeather: 'mild', perceivedSummaryKo: '꽃이 피고 따뜻한 봄날 (자카란다 시즌)', clothingTipKo: '긴팔 셔츠, 얇은 아우터, 원피스' },
                { month: 11, avgTempC: 20.5, minTempC: 16.5, maxTempC: 24.5, humidityPercent: 60, rainfallMm: 80, season: 'spring', perceivedWeather: 'warm', perceivedSummaryKo: '초여름 기운과 온화한 날씨', clothingTipKo: '반팔 티셔츠, 얇은 셔츠, 선글라스' },
                { month: 12, avgTempC: 22.5, minTempC: 18.5, maxTempC: 26.5, humidityPercent: 62, rainfallMm: 75, season: 'summer', perceivedWeather: 'warm', perceivedSummaryKo: '한여름의 크리스마스, 활기찬 축제 시즌', clothingTipKo: '여름 의류, 수영복, 선케어 제품' }
            ]
        }
    },

    // ─── 10. 이탈리아 (IT) ──────────────────────────────────────────
    IT: {
        key: 'IT',
        nameKo: '이탈리아',
        nameEn: 'Italy',
        aliases: ['이탈리아', '이태리', 'italy', '로마', '밀라노', '피렌체', '베네치아', '나폴리', '포지타노'],
        capitalKo: '로마',
        languages: ['이탈리아어'],
        plugTypes: ['C', 'F', 'L'],
        voltage: 230,
        frequencyHz: 50,
        plugSummaryKo: '230V Type C/F/L 플러그로 한국 2구 플러그와 대부분 호환되나 일부 슬림 3핀(Type L) 콘센트가 있습니다.',
        esimSupported: true,
        currency: {
            code: 'EUR',
            symbol: '€',
            nameKo: '유로',
            krwRate: 1465.0,
            rateUnit: 1
        },
        water: {
            hardness: 'hard',
            tapWaterDrinkable: true,
            waterSummaryKo: '로마 등 시내의 분수대(나소니) 물도 음용 가능하나 석회질이 많아 생수 구매를 추천합니다. 샤워 필터 사용이 좋습니다.',
            showerFilterRecommended: true
        },
        culture: {
            majorReligions: ['가톨릭 (80%)'],
            tipping: 'optional',
            tippingGuideKo: '테이블 자릿세(Coperto)가 1인당 1~3유로씩 자동 청구되는 경우가 많아 팁은 필수가 아닙니다. 특별히 만족스러웠다면 잔돈 1~2유로를 테이블에 둡니다.',
            etiquetteTipsKo: [
                '바티칸 성 베드로 대성당 및 주요 성당 입장 시 무릎과 어깨를 가리는 복장이 엄격히 요구됩니다.',
                '카페(Bar)에서 서서 마실 때(al banco)와 테이블에 앉아서 마실 때(al tavolo) 가격 차이가 큽니다.',
                '식사 후 오후 늦게 카푸치노를 시키면 현지인들이 의아해합니다 (카푸치노는 아침용 음료).'
            ]
        },
        driving: {
            drivingSide: 'right',
            koreanEnglishLicenseAccepted: false,
            idpRequired: true,
            drivingSummaryKo: '우측 통행(좌핸들)입니다. 제네바 협약 국제운전면허증(IDP) 실물과 한국 면허증이 필수입니다.',
            drivingTipsKo: [
                '역사 도심 진입제한구역(ZTL, Zona a Traffico Limitato)에 무단 진입 시 고액의 카메라 과태료가 부과되므로 렌터카 도심 진입에 극도로 주의하세요.'
            ]
        },
        visa: {
            visaFreeDays: 90,
            isVisaRequired: false,
            entryAuthProgram: 'ETIAS',
            isEntryAuthRequired: false,
            entrySummaryKo: '솅겐 협약국으로 180일 내 최대 90일 무비자 체류가 가능합니다.'
        },
        climate: {
            climateZone: 'north',
            generalSummaryKo: '지중해성 기후로 여름은 햇살이 강하고 건조하며, 봄과 가을이 여행하기 가장 이상적입니다.',
            monthly: [
                { month: 1, avgTempC: 8.0, minTempC: 3.5, maxTempC: 12.5, humidityPercent: 75, rainfallMm: 65, season: 'winter', perceivedWeather: 'chilly', perceivedSummaryKo: '쌀쌀하고 맑은 겨울 날씨', clothingTipKo: '도톰한 코트, 니트, 목도리' },
                { month: 2, avgTempC: 9.0, minTempC: 4.0, maxTempC: 13.5, humidityPercent: 72, rainfallMm: 60, season: 'winter', perceivedWeather: 'chilly', perceivedSummaryKo: '선선하고 온화해지는 늦겨울', clothingTipKo: '겨울 외투, 스카프' },
                { month: 3, avgTempC: 12.0, minTempC: 6.5, maxTempC: 16.5, humidityPercent: 70, rainfallMm: 60, season: 'spring', perceivedWeather: 'mild', perceivedSummaryKo: '포근하고 싱그러운 초봄', clothingTipKo: '트렌치코트, 자켓, 긴팔 셔츠' },
                { month: 4, avgTempC: 15.0, minTempC: 9.5, maxTempC: 19.5, humidityPercent: 68, rainfallMm: 65, season: 'spring', perceivedWeather: 'mild', perceivedSummaryKo: '화창하고 쾌적한 여행 황금기', clothingTipKo: '가벼운 자켓, 가디건, 셔츠' },
                { month: 5, avgTempC: 19.5, minTempC: 13.5, maxTempC: 24.5, humidityPercent: 65, rainfallMm: 50, season: 'spring', perceivedWeather: 'warm', perceivedSummaryKo: '따뜻하고 화사한 날씨 (로마 여행 최고)', clothingTipKo: '반팔 티셔츠, 얇은 겉옷, 선글라스' },
                { month: 6, avgTempC: 23.5, minTempC: 17.5, maxTempC: 28.5, humidityPercent: 60, rainfallMm: 35, season: 'summer', perceivedWeather: 'hot', perceivedSummaryKo: '햇살이 강하고 더운 초여름', clothingTipKo: '시원한 여름 옷, 모자, 선케어' },
                { month: 7, avgTempC: 26.5, minTempC: 20.0, maxTempC: 32.0, humidityPercent: 55, rainfallMm: 15, season: 'summer', perceivedWeather: 'hot', perceivedSummaryKo: '건조하고 뜨거운 한여름 무더위', clothingTipKo: '민소매/반팔, 선글라스, 양산' },
                { month: 8, avgTempC: 26.5, minTempC: 20.0, maxTempC: 32.0, humidityPercent: 58, rainfallMm: 25, season: 'summer', perceivedWeather: 'hot', perceivedSummaryKo: '햇살 강렬하고 무더움 (바캉스 시즌)', clothingTipKo: '여름 옷, 수분 섭취, 자외선 차단' },
                { month: 9, avgTempC: 22.5, minTempC: 16.5, maxTempC: 27.5, humidityPercent: 65, rainfallMm: 65, season: 'autumn', perceivedWeather: 'warm', perceivedSummaryKo: '기온이 내려가며 쾌적한 초가을', clothingTipKo: '반팔 + 얇은 셔츠/가디건' },
                { month: 10, avgTempC: 18.0, minTempC: 13.0, maxTempC: 22.5, humidityPercent: 72, rainfallMm: 95, season: 'autumn', perceivedWeather: 'mild', perceivedSummaryKo: '선선하고 운치 있는 가을', clothingTipKo: '자켓, 가디건, 긴바지' },
                { month: 11, avgTempC: 13.0, minTempC: 8.5, maxTempC: 17.0, humidityPercent: 76, rainfallMm: 110, season: 'autumn', perceivedWeather: 'chilly', perceivedSummaryKo: '비가 잦아지고 썰렁해짐', clothingTipKo: '도톰한 자켓, 코트, 우산' },
                { month: 12, avgTempC: 9.0, minTempC: 4.5, maxTempC: 13.0, humidityPercent: 77, rainfallMm: 80, season: 'winter', perceivedWeather: 'chilly', perceivedSummaryKo: '쌀쌀한 초겨울 날씨', clothingTipKo: '겨울 코트, 패딩, 니트' }
            ]
        }
    },

    // ─── 11. 스위스 (CH) ──────────────────────────────────────────
    CH: {
        key: 'CH',
        nameKo: '스위스',
        nameEn: 'Switzerland',
        aliases: ['스위스', 'switzerland', '인터라켄', '취리히', '제네바', '루체른', '체르마트', '그린델발트'],
        capitalKo: '베른',
        languages: ['독일어', '프랑스어', '이탈리아어', '로만슈어'],
        plugTypes: ['C', 'J'],
        voltage: 230,
        frequencyHz: 50,
        plugSummaryKo: '230V 육각형 3핀(Type J) 플러그를 사용합니다. 한국 2구 얇은 플러그(Type C)는 꽂히지만 두꺼운 접지 플러그는 스위스 전용 어댑터가 필요합니다.',
        esimSupported: true,
        currency: {
            code: 'CHF',
            symbol: 'CHF',
            nameKo: '스위스 프랑',
            krwRate: 1540.0,
            rateUnit: 1
        },
        water: {
            hardness: 'medium',
            tapWaterDrinkable: true,
            waterSummaryKo: '알프스 빙하수 기반의 세계 최고 수준 청정 수질로 수돗물과 길거리 음수대 물을 마음껏 마셔도 좋습니다.',
            showerFilterRecommended: false
        },
        culture: {
            majorReligions: ['가톨릭 (34%)', '개신교 (22%)', '무교 (31%)'],
            tipping: 'optional',
            tippingGuideKo: '서비스료가 요금에 법적으로 포함되어 있어 팁 의무가 없습니다. 만족 시 계산액을 반올림하여 1~2프랑 남기는 정도입니다.',
            etiquetteTipsKo: [
                '일요일과 공휴일에는 마트와 상점이 대부분 문을 닫으므로 쇼핑 일정을 미리 계획하세요.',
                '대중교통(기차/트램) 탑승 시 무임승차 단속이 매우 엄격하며 적발 시 막대한 벌금이 부과됩니다.'
            ]
        },
        driving: {
            drivingSide: 'right',
            koreanEnglishLicenseAccepted: false,
            idpRequired: true,
            drivingSummaryKo: '우측 통행(좌핸들)입니다. 제네바 협약 국제운전면허증(IDP) 실물 지참이 필수입니다.',
            drivingTipsKo: [
                '스위스 고속도로 이용 시 연간 통행권 스티커(Vignette, 40 CHF) 부착이 의무입니다 (렌터카 대여 시 포함 여부 확인).'
            ]
        },
        visa: {
            visaFreeDays: 90,
            isVisaRequired: false,
            entryAuthProgram: 'ETIAS',
            isEntryAuthRequired: false,
            entrySummaryKo: '솅겐 협약 준회원국으로 180일 내 최대 90일 무비자 체류가 가능합니다.'
        },
        climate: {
            climateZone: 'north',
            generalSummaryKo: '고도에 따라 기온 차이가 매우 큽니다. 여름에도 융프라우/체르마트 등 고산 전망대는 영하에 가깝고 쌀쌀하므로 사계절 방한 외투가 필수입니다.',
            monthly: [
                { month: 1, avgTempC: 0.5, minTempC: -3.5, maxTempC: 3.5, humidityPercent: 82, rainfallMm: 65, season: 'winter', perceivedWeather: 'freezing', perceivedSummaryKo: '눈 덮인 혹한의 겨울 (스키 시즌)', clothingTipKo: '헤비 다운 패딩, 방한화, 방한모, 장갑' },
                { month: 2, avgTempC: 1.5, minTempC: -2.5, maxTempC: 5.5, humidityPercent: 78, rainfallMm: 60, season: 'winter', perceivedWeather: 'freezing', perceivedSummaryKo: '춥고 설경이 아름다운 겨울', clothingTipKo: '방한 외투, 히트텍, 기모 의류' },
                { month: 3, avgTempC: 5.5, minTempC: 1.0, maxTempC: 10.0, humidityPercent: 72, rainfallMm: 70, season: 'spring', perceivedWeather: 'chilly', perceivedSummaryKo: '눈이 녹으며 쌀쌀한 초봄', clothingTipKo: '도톰한 코트, 자켓, 머플러' },
                { month: 4, avgTempC: 9.5, minTempC: 4.5, maxTempC: 14.5, humidityPercent: 68, rainfallMm: 80, season: 'spring', perceivedWeather: 'chilly', perceivedSummaryKo: '들꽃이 피어나지만 썰렁함', clothingTipKo: '자켓, 가디건, 경량 패딩' },
                { month: 5, avgTempC: 14.0, minTempC: 8.5, maxTempC: 19.0, humidityPercent: 68, rainfallMm: 100, season: 'spring', perceivedWeather: 'mild', perceivedSummaryKo: '선선하고 푸르른 알프스의 봄', clothingTipKo: '긴팔 셔츠, 자켓, 산악용 바람막이' },
                { month: 6, avgTempC: 17.5, minTempC: 12.0, maxTempC: 22.5, humidityPercent: 68, rainfallMm: 120, season: 'summer', perceivedWeather: 'warm', perceivedSummaryKo: '하이킹 최고 성수기, 온화함', clothingTipKo: '반팔 + 고산지대용 경량패딩/바람막이' },
                { month: 7, avgTempC: 19.5, minTempC: 14.0, maxTempC: 24.5, humidityPercent: 67, rainfallMm: 120, season: 'summer', perceivedWeather: 'warm', perceivedSummaryKo: '화창하고 맑은 알프스 여름', clothingTipKo: '여름 옷 + 전망대용 따뜻한 외투' },
                { month: 8, avgTempC: 19.0, minTempC: 13.5, maxTempC: 24.0, humidityPercent: 70, rainfallMm: 115, season: 'summer', perceivedWeather: 'warm', perceivedSummaryKo: '온화하고 야외 활동 적기', clothingTipKo: '반팔, 긴바지, 방풍 자켓' },
                { month: 9, avgTempC: 15.0, minTempC: 10.0, maxTempC: 19.5, humidityPercent: 75, rainfallMm: 95, season: 'autumn', perceivedWeather: 'mild', perceivedSummaryKo: '선선하고 단풍이 물드는 가을', clothingTipKo: '가을 자켓, 니트, 플리스' },
                { month: 10, avgTempC: 10.0, minTempC: 6.0, maxTempC: 14.0, humidityPercent: 80, rainfallMm: 85, season: 'autumn', perceivedWeather: 'chilly', perceivedSummaryKo: '썰렁하고 쌀쌀한 늦가을 날씨', clothingTipKo: '코트, 경량 패딩, 스카프' },
                { month: 11, avgTempC: 4.5, minTempC: 1.0, maxTempC: 8.0, humidityPercent: 82, rainfallMm: 75, season: 'autumn', perceivedWeather: 'chilly', perceivedSummaryKo: '초겨울 추위와 첫눈 시작', clothingTipKo: '겨울 패딩, 코트, 장갑' },
                { month: 12, avgTempC: 1.5, minTempC: -2.0, maxTempC: 4.5, humidityPercent: 83, rainfallMm: 75, season: 'winter', perceivedWeather: 'freezing', perceivedSummaryKo: '매우 춥고 눈이 많이 내림', clothingTipKo: '두꺼운 겨울 패딩, 방한 부츠' }
            ]
        }
    },

    // ─── 12. 대한민국 (KR) ──────────────────────────────────────────
    KR: {
        key: 'KR',
        nameKo: '대한민국',
        nameEn: 'South Korea',
        aliases: ['한국', '대한민국', 'korea', '서울', '부산', '제주', '인천', '강원', '경주'],
        capitalKo: '서울',
        languages: ['한국어'],
        plugTypes: ['C', 'F'],
        voltage: 220,
        frequencyHz: 60,
        plugSummaryKo: '220V 60Hz 표준 콘센트입니다.',
        esimSupported: true,
        currency: {
            code: 'KRW',
            symbol: '₩',
            nameKo: '대한민국 원',
            krwRate: 1.0,
            rateUnit: 1
        },
        water: {
            hardness: 'soft',
            tapWaterDrinkable: true,
            waterSummaryKo: '정수 처리가 완벽한 깨끗한 연수로 수돗물 음용이 가능합니다.',
            showerFilterRecommended: false
        },
        culture: {
            majorReligions: ['무교 (50%)', '개신교 (20%)', '불교 (17%)', '가톨릭 (11%)'],
            tipping: 'no_tip',
            tippingGuideKo: '팁 문화가 전혀 없으며 정찰제 가격에 모든 세금과 서비스료가 포함되어 있습니다.',
            etiquetteTipsKo: ['대중교통 내 정숙, 어른에 대한 존댓말 및 인사 예절']
        },
        driving: {
            drivingSide: 'right',
            koreanEnglishLicenseAccepted: true,
            idpRequired: false,
            drivingSummaryKo: '우측 통행(좌핸들)입니다.',
            drivingTipsKo: ['고속도로 1차로는 추월차로이며, 하이패스 차선 이용에 유의하세요.']
        },
        visa: {
            visaFreeDays: 0,
            isVisaRequired: false,
            entrySummaryKo: '내국인 기준 신분증/여권 지참.'
        },
        climate: {
            climateZone: 'north',
            generalSummaryKo: '사계절이 뚜렷하며 봄/가을은 쾌적하고, 여름은 고온다습하며, 겨울은 한파와 삼한사온이 나타납니다.',
            monthly: [
                { month: 1, avgTempC: -2.0, minTempC: -6.0, maxTempC: 2.0, humidityPercent: 55, rainfallMm: 20, season: 'winter', perceivedWeather: 'freezing', perceivedSummaryKo: '한파와 건조한 겨울', clothingTipKo: '롱패딩, 방한용품' },
                { month: 2, avgTempC: 0.5, minTempC: -4.0, maxTempC: 5.0, humidityPercent: 55, rainfallMm: 25, season: 'winter', perceivedWeather: 'freezing', perceivedSummaryKo: '늦겨울 추위와 꽃샘추위', clothingTipKo: '두꺼운 겨울 외투' },
                { month: 3, avgTempC: 6.0, minTempC: 1.5, maxTempC: 11.5, humidityPercent: 57, rainfallMm: 45, season: 'spring', perceivedWeather: 'chilly', perceivedSummaryKo: '일교차 큰 썰렁한 초봄', clothingTipKo: '자켓, 코트, 가디건' },
                { month: 4, avgTempC: 13.0, minTempC: 8.0, maxTempC: 18.5, humidityPercent: 56, rainfallMm: 70, season: 'spring', perceivedWeather: 'mild', perceivedSummaryKo: '벚꽃 개화 및 쾌적한 봄', clothingTipKo: '가벼운 자켓, 긴팔 셔츠' },
                { month: 5, avgTempC: 18.0, minTempC: 13.0, maxTempC: 23.5, humidityPercent: 62, rainfallMm: 100, season: 'spring', perceivedWeather: 'warm', perceivedSummaryKo: '따뜻하고 화창한 야외활동 적기', clothingTipKo: '얇은 긴팔, 반팔 티셔츠' },
                { month: 6, avgTempC: 22.5, minTempC: 18.5, maxTempC: 27.0, humidityPercent: 69, rainfallMm: 135, season: 'summer', perceivedWeather: 'hot', perceivedSummaryKo: '초여름 더위 시작', clothingTipKo: '반팔, 린넨 의류' },
                { month: 7, avgTempC: 25.5, minTempC: 22.5, maxTempC: 29.0, humidityPercent: 80, rainfallMm: 350, season: 'summer', perceivedWeather: 'sweltering', perceivedSummaryKo: '장마와 무더위 폭염', clothingTipKo: '시원한 여름 옷, 우산' },
                { month: 8, avgTempC: 26.0, minTempC: 23.0, maxTempC: 30.0, humidityPercent: 78, rainfallMm: 300, season: 'summer', perceivedWeather: 'sweltering', perceivedSummaryKo: '폭염과 열대야 절정', clothingTipKo: '통풍 잘되는 얇은 옷' },
                { month: 9, avgTempC: 21.5, minTempC: 17.0, maxTempC: 26.0, humidityPercent: 69, rainfallMm: 140, season: 'autumn', perceivedWeather: 'mild', perceivedSummaryKo: '선선하고 맑은 가을의 시작', clothingTipKo: '긴팔 셔츠, 가디건' },
                { month: 10, avgTempC: 15.0, minTempC: 10.0, maxTempC: 20.0, humidityPercent: 62, rainfallMm: 50, season: 'autumn', perceivedWeather: 'mild', perceivedSummaryKo: '청명하고 쾌적한 단풍 시즌', clothingTipKo: '자켓, 가을 코트, 니트' },
                { month: 11, avgTempC: 7.5, minTempC: 3.0, maxTempC: 12.0, humidityPercent: 60, rainfallMm: 50, season: 'autumn', perceivedWeather: 'chilly', perceivedSummaryKo: '썰렁하고 쌀쌀한 늦가을', clothingTipKo: '도톰한 코트, 경량 패딩' },
                { month: 12, avgTempC: 0.5, minTempC: -3.5, maxTempC: 4.5, humidityPercent: 56, rainfallMm: 25, season: 'winter', perceivedWeather: 'freezing', perceivedSummaryKo: '추운 겨울 날씨', clothingTipKo: '겨울 패딩, 방한용품' }
            ]
        }
    },

    // ─── 13. 독일 (DE) ──────────────────────────────────────────
    DE: {
        key: 'DE',
        nameKo: '독일',
        nameEn: 'Germany',
        aliases: ['독일', 'germany', '베를린', '뮌헨', '프랑크푸르트', '함부르크', '쾰른', '드레스덴'],
        capitalKo: '베를린',
        languages: ['독일어'],
        plugTypes: ['C', 'F'],
        voltage: 230,
        frequencyHz: 50,
        plugSummaryKo: '230V Type C/F 플러그로 한국 2구 플러그와 호환됩니다.',
        esimSupported: true,
        currency: {
            code: 'EUR',
            symbol: '€',
            nameKo: '유로',
            krwRate: 1465.0,
            rateUnit: 1
        },
        water: {
            hardness: 'hard',
            tapWaterDrinkable: true,
            waterSummaryKo: '수돗물 음용은 안전하나 석회질(Kalk)이 많아 생수 구매를 추천합니다.',
            showerFilterRecommended: true
        },
        culture: {
            majorReligions: ['가톨릭 (26%)', '개신교 (24%)', '무교 (43%)'],
            tipping: 'optional',
            tippingGuideKo: '식사비의 5~10% 정도를 얹어주거나 끝자리를 반올림(Stimmt so)하여 건네는 것이 매너입니다.',
            etiquetteTipsKo: [
                '보행자 신호등 준수(무단횡단 금지)가 매우 엄격하며 사회적 기본 예절입니다.',
                '일요일과 공휴일에는 마트와 상점이 전면 휴무이므로 사전 준비가 필요합니다.'
            ]
        },
        driving: {
            drivingSide: 'right',
            koreanEnglishLicenseAccepted: true,
            idpRequired: false,
            drivingSummaryKo: '우측 통행(좌핸들)입니다. 한국 영문면허증 또는 IDP로 입국 후 6개월간 운전 가능합니다.',
            drivingTipsKo: [
                '아우토반(고속도로) 1차로는 추월 전용 차로이므로 추월 후 즉시 하위 차로로 복귀해야 합니다.'
            ]
        },
        visa: {
            visaFreeDays: 90,
            isVisaRequired: false,
            entryAuthProgram: 'ETIAS',
            isEntryAuthRequired: false,
            entrySummaryKo: '솅겐 협약국으로 180일 내 90일 무비자 체류 가능.'
        },
        climate: {
            climateZone: 'north',
            generalSummaryKo: '온대 해양성 기후로 여름은 선선하고 쾌적하며 겨울은 일조량이 적고 쌀쌀합니다.',
            monthly: [
                { month: 1, avgTempC: 1.0, minTempC: -2.0, maxTempC: 3.5, humidityPercent: 86, rainfallMm: 45, season: 'winter', perceivedWeather: 'freezing', perceivedSummaryKo: '쌀쌀하고 맑거나 눈 내림', clothingTipKo: '두꺼운 겨울 코트, 패딩' },
                { month: 2, avgTempC: 2.0, minTempC: -1.5, maxTempC: 5.0, humidityPercent: 82, rainfallMm: 35, season: 'winter', perceivedWeather: 'freezing', perceivedSummaryKo: '늦겨울 추위', clothingTipKo: '겨울 외투, 니트' },
                { month: 3, avgTempC: 5.5, minTempC: 1.0, maxTempC: 9.5, humidityPercent: 76, rainfallMm: 40, season: 'spring', perceivedWeather: 'chilly', perceivedSummaryKo: '쌀쌀하고 변덕스러운 초봄', clothingTipKo: '자켓, 코트, 스카프' },
                { month: 4, avgTempC: 10.0, minTempC: 4.5, maxTempC: 14.5, humidityPercent: 68, rainfallMm: 40, season: 'spring', perceivedWeather: 'chilly', perceivedSummaryKo: '선선하고 꽃이 피어남', clothingTipKo: '가벼운 자켓, 가디건' },
                { month: 5, avgTempC: 14.5, minTempC: 9.0, maxTempC: 19.5, humidityPercent: 67, rainfallMm: 55, season: 'spring', perceivedWeather: 'mild', perceivedSummaryKo: '화창하고 쾌적한 여행 적기', clothingTipKo: '긴팔 셔츠, 얇은 겉옷' },
                { month: 6, avgTempC: 18.0, minTempC: 12.5, maxTempC: 23.0, humidityPercent: 68, rainfallMm: 65, season: 'summer', perceivedWeather: 'warm', perceivedSummaryKo: '낮이 매우 길고 쾌적함', clothingTipKo: '반팔, 가벼운 셔츠' },
                { month: 7, avgTempC: 20.0, minTempC: 14.5, maxTempC: 25.0, humidityPercent: 67, rainfallMm: 60, season: 'summer', perceivedWeather: 'warm', perceivedSummaryKo: '온화하고 야외활동 최고 시즌', clothingTipKo: '여름 의류, 선글라스' },
                { month: 8, avgTempC: 19.5, minTempC: 14.0, maxTempC: 24.5, humidityPercent: 69, rainfallMm: 60, season: 'summer', perceivedWeather: 'warm', perceivedSummaryKo: '따뜻하고 쾌적한 늦여름', clothingTipKo: '반팔, 얇은 가디건' },
                { month: 9, avgTempC: 15.5, minTempC: 10.5, maxTempC: 20.0, humidityPercent: 75, rainfallMm: 45, season: 'autumn', perceivedWeather: 'mild', perceivedSummaryKo: '옥토버페스트 시즌, 선선함', clothingTipKo: '자켓, 긴팔 셔츠' },
                { month: 10, avgTempC: 10.5, minTempC: 6.5, maxTempC: 14.0, humidityPercent: 82, rainfallMm: 40, season: 'autumn', perceivedWeather: 'chilly', perceivedSummaryKo: '썰렁하고 낙엽 지는 가을', clothingTipKo: '도톰한 자켓, 가을 코트' },
                { month: 11, avgTempC: 5.5, minTempC: 2.0, maxTempC: 8.0, humidityPercent: 86, rainfallMm: 45, season: 'autumn', perceivedWeather: 'chilly', perceivedSummaryKo: '쌀쌀하고 흐린 날이 많음', clothingTipKo: '겨울 코트, 패딩' },
                { month: 12, avgTempC: 2.0, minTempC: -1.0, maxTempC: 4.5, humidityPercent: 87, rainfallMm: 50, season: 'winter', perceivedWeather: 'freezing', perceivedSummaryKo: '크리스마스 마켓과 겨울 추위', clothingTipKo: '두꺼운 패딩, 방한용품' }
            ]
        }
    },

    // ─── 14. 캐나다 (CA) ──────────────────────────────────────────
    CA: {
        key: 'CA',
        nameKo: '캐나다',
        nameEn: 'Canada',
        aliases: ['캐나다', 'canada', '밴쿠버', '토론토', '몬트리올', '밴프', '퀘벡', '나이아가라'],
        capitalKo: '오타와',
        languages: ['영어', '프랑스어'],
        plugTypes: ['A', 'B'],
        voltage: 120,
        frequencyHz: 60,
        plugSummaryKo: '120V 11자형(Type A/B) 돼지코 어댑터가 필요합니다.',
        esimSupported: true,
        currency: {
            code: 'CAD',
            symbol: 'C$',
            nameKo: '캐나다 달러',
            krwRate: 980.0,
            rateUnit: 1
        },
        water: {
            hardness: 'soft',
            tapWaterDrinkable: true,
            waterSummaryKo: '빙하수 기반의 깨끗한 연수로 수돗물을 바로 마셔도 좋습니다.',
            showerFilterRecommended: false
        },
        culture: {
            majorReligions: ['가톨릭 (30%)', '개신교 (23%)', '무교 (35%)'],
            tipping: 'mandatory',
            tippingGuideKo: '미국과 동일하게 식당 테이블 서빙 시 15~20% 팁이 필수입니다.',
            etiquetteTipsKo: ['감사와 사과의 표현(Sorry, Thank you)이 생활화되어 있습니다.']
        },
        driving: {
            drivingSide: 'right',
            koreanEnglishLicenseAccepted: true,
            idpRequired: false,
            drivingSummaryKo: '우측 통행(좌핸들)입니다. 한국 영문면허증으로 주요 주에서 단기 운전이 인정됩니다.',
            drivingTipsKo: ['겨울철 록키산맥 등에서는 윈터타이어 또는 스노우 체인이 의무입니다.']
        },
        visa: {
            visaFreeDays: 180,
            isVisaRequired: false,
            entryAuthProgram: 'eTA',
            isEntryAuthRequired: true,
            entrySummaryKo: '최대 6개월 무비자이나 항공편 입국 시 eTA(전자여행허가) 사전 승인 필수.'
        },
        climate: {
            climateZone: 'north',
            generalSummaryKo: '사계절이 뚜렷하며 겨울은 혹한과 설경이 장관을 이루고, 여름은 20~25°C로 상쾌하고 쾌적합니다.',
            monthly: [
                { month: 1, avgTempC: -5.0, minTempC: -9.5, maxTempC: -1.0, humidityPercent: 75, rainfallMm: 60, season: 'winter', perceivedWeather: 'freezing', perceivedSummaryKo: '혹한의 눈 덮인 겨울', clothingTipKo: '헤비 다운 패딩, 방한화' },
                { month: 2, avgTempC: -4.0, minTempC: -8.5, maxTempC: 0.0, humidityPercent: 74, rainfallMm: 55, season: 'winter', perceivedWeather: 'freezing', perceivedSummaryKo: '매우 춥고 눈 잦음', clothingTipKo: '방한 외투, 방한모' },
                { month: 3, avgTempC: 1.0, minTempC: -3.5, maxTempC: 5.0, humidityPercent: 70, rainfallMm: 60, season: 'spring', perceivedWeather: 'freezing', perceivedSummaryKo: '눈이 녹으며 쌀쌀한 초봄', clothingTipKo: '두꺼운 코트, 패딩' },
                { month: 4, avgTempC: 7.5, minTempC: 2.5, maxTempC: 12.0, humidityPercent: 65, rainfallMm: 70, season: 'spring', perceivedWeather: 'chilly', perceivedSummaryKo: '썰렁하지만 봄기운 시작', clothingTipKo: '자켓, 코트, 가디건' },
                { month: 5, avgTempC: 14.0, minTempC: 8.5, maxTempC: 19.0, humidityPercent: 64, rainfallMm: 75, season: 'spring', perceivedWeather: 'mild', perceivedSummaryKo: '화창하고 쾌적한 봄 (밴프/록키 개통)', clothingTipKo: '긴팔 셔츠, 바람막이' },
                { month: 6, avgTempC: 19.0, minTempC: 13.5, maxTempC: 24.0, humidityPercent: 67, rainfallMm: 80, season: 'summer', perceivedWeather: 'warm', perceivedSummaryKo: '온화하고 상쾌한 초여름', clothingTipKo: '반팔 + 얇은 겉옷' },
                { month: 7, avgTempC: 22.0, minTempC: 16.5, maxTempC: 27.0, humidityPercent: 68, rainfallMm: 75, season: 'summer', perceivedWeather: 'warm', perceivedSummaryKo: '화창하고 최고의 여행 시즌', clothingTipKo: '여름 옷, 선글라스' },
                { month: 8, avgTempC: 21.5, minTempC: 16.0, maxTempC: 26.5, humidityPercent: 70, rainfallMm: 75, season: 'summer', perceivedWeather: 'warm', perceivedSummaryKo: '따뜻하고 쾌적한 늦여름', clothingTipKo: '반팔, 가디건' },
                { month: 9, avgTempC: 16.5, minTempC: 11.5, maxTempC: 21.5, humidityPercent: 73, rainfallMm: 80, season: 'autumn', perceivedWeather: 'mild', perceivedSummaryKo: '메이플 단풍 로드 절정 시즌', clothingTipKo: '가을 자켓, 니트' },
                { month: 10, avgTempC: 10.0, minTempC: 5.5, maxTempC: 14.0, humidityPercent: 74, rainfallMm: 65, season: 'autumn', perceivedWeather: 'chilly', perceivedSummaryKo: '쌀쌀해지는 늦가을', clothingTipKo: '도톰한 코트, 경량 패딩' },
                { month: 11, avgTempC: 4.0, minTempC: 0.0, maxTempC: 7.5, humidityPercent: 76, rainfallMm: 70, season: 'autumn', perceivedWeather: 'chilly', perceivedSummaryKo: '초겨울 추위와 첫눈', clothingTipKo: '겨울 패딩, 장갑' },
                { month: 12, avgTempC: -2.0, minTempC: -6.0, maxTempC: 1.5, humidityPercent: 78, rainfallMm: 65, season: 'winter', perceivedWeather: 'freezing', perceivedSummaryKo: '눈 덮인 겨울 날씨', clothingTipKo: '두꺼운 겨울 패딩, 방한화' }
            ]
        }
    },

    // ─── 15. 뉴질랜드 (NZ) ──────────────────────────────────────────
    NZ: {
        key: 'NZ',
        nameKo: '뉴질랜드',
        nameEn: 'New Zealand',
        aliases: ['뉴질랜드', 'new zealand', '오클랜드', '퀸스타운', '크라이스트처치', '로토루아'],
        capitalKo: '웰링턴',
        languages: ['영어', '마오리어'],
        plugTypes: ['I'],
        voltage: 230,
        frequencyHz: 50,
        plugSummaryKo: '230V 사선 3핀(Type I) 플러그로 전용 어댑터가 필수입니다.',
        esimSupported: true,
        currency: {
            code: 'NZD',
            symbol: 'NZ$',
            nameKo: '뉴질랜드 달러',
            krwRate: 815.0,
            rateUnit: 1
        },
        water: {
            hardness: 'soft',
            tapWaterDrinkable: true,
            waterSummaryKo: '청정 자연 수질로 수돗물을 바로 마셔도 안전합니다.',
            showerFilterRecommended: false
        },
        culture: {
            majorReligions: ['기독교 (37%)', '무교 (48%)'],
            tipping: 'optional',
            tippingGuideKo: '팁 문화가 없습니다.',
            etiquetteTipsKo: ['청정 자연 보호를 위한 생물 안전 검역(Biosecurity)이 매우 엄격합니다.']
        },
        driving: {
            drivingSide: 'left',
            koreanEnglishLicenseAccepted: true,
            idpRequired: false,
            drivingSummaryKo: '좌측 통행(우핸들) 국가입니다. 한국 영문면허증으로 최대 12개월간 운전 가능합니다.',
            drivingTipsKo: ['1차선 좁은 다리(One-lane Bridge) 우선권 화살표 표지판을 주의 깊게 확인하세요.']
        },
        visa: {
            visaFreeDays: 90,
            isVisaRequired: false,
            entryAuthProgram: 'NZeTA',
            isEntryAuthRequired: true,
            entrySummaryKo: '최대 90일 무비자이나 NZeTA 및 관광세(IVL) 사전 결제 승인 필수.'
        },
        climate: {
            climateZone: 'south',
            generalSummaryKo: '남반구 해양성 기후로 12~2월이 여름(여행 최고 시즌), 6~8월이 겨울(스키 시즌)입니다.',
            monthly: [
                { month: 1, avgTempC: 19.5, minTempC: 15.0, maxTempC: 23.5, humidityPercent: 75, rainfallMm: 65, season: 'summer', perceivedWeather: 'warm', perceivedSummaryKo: '따뜻하고 화창한 남반구 여름', clothingTipKo: '가벼운 여름 옷, 선글라스' },
                { month: 2, avgTempC: 20.0, minTempC: 15.5, maxTempC: 24.0, humidityPercent: 76, rainfallMm: 60, season: 'summer', perceivedWeather: 'warm', perceivedSummaryKo: '온화하고 쾌적한 여름 절정', clothingTipKo: '여름 의류, 자외선 차단' },
                { month: 3, avgTempC: 18.0, minTempC: 14.0, maxTempC: 22.0, humidityPercent: 78, rainfallMm: 70, season: 'autumn', perceivedWeather: 'mild', perceivedSummaryKo: '초가을의 선선한 날씨', clothingTipKo: '긴팔 셔츠, 얇은 가디건' },
                { month: 4, avgTempC: 15.5, minTempC: 11.5, maxTempC: 19.0, humidityPercent: 81, rainfallMm: 85, season: 'autumn', perceivedWeather: 'mild', perceivedSummaryKo: '선선하고 운치 있는 가을', clothingTipKo: '자켓, 가디건, 긴바지' },
                { month: 5, avgTempC: 13.0, minTempC: 9.5, maxTempC: 16.5, humidityPercent: 83, rainfallMm: 100, season: 'autumn', perceivedWeather: 'chilly', perceivedSummaryKo: '쌀쌀해지는 늦가을', clothingTipKo: '도톰한 자켓, 니트' },
                { month: 6, avgTempC: 11.0, minTempC: 7.5, maxTempC: 14.5, humidityPercent: 85, rainfallMm: 115, season: 'winter', perceivedWeather: 'chilly', perceivedSummaryKo: '남반구 겨울 시작 (스키 시즌)', clothingTipKo: '겨울 코트, 패딩' },
                { month: 7, avgTempC: 10.5, minTempC: 7.0, maxTempC: 14.0, humidityPercent: 85, rainfallMm: 120, season: 'winter', perceivedWeather: 'chilly', perceivedSummaryKo: '연중 가장 쌀쌀한 겨울', clothingTipKo: '도톰한 패딩, 목도리' },
                { month: 8, avgTempC: 11.0, minTempC: 7.5, maxTempC: 14.5, humidityPercent: 83, rainfallMm: 105, season: 'winter', perceivedWeather: 'chilly', perceivedSummaryKo: '쌀쌀하지만 맑은 날씨', clothingTipKo: '겨울 외투, 스웨터' },
                { month: 9, avgTempC: 12.5, minTempC: 8.5, maxTempC: 16.0, humidityPercent: 80, rainfallMm: 90, season: 'spring', perceivedWeather: 'chilly', perceivedSummaryKo: '남반구 봄 시작, 썰렁함', clothingTipKo: '자켓, 가디건' },
                { month: 10, avgTempC: 14.0, minTempC: 10.0, maxTempC: 18.0, humidityPercent: 78, rainfallMm: 80, season: 'spring', perceivedWeather: 'mild', perceivedSummaryKo: '포근하고 싱그러운 봄', clothingTipKo: '가벼운 자켓, 셔츠' },
                { month: 11, avgTempC: 16.0, minTempC: 12.0, maxTempC: 20.0, humidityPercent: 76, rainfallMm: 75, season: 'spring', perceivedWeather: 'mild', perceivedSummaryKo: '온화하고 쾌적한 초여름', clothingTipKo: '반팔 + 얇은 겉옷' },
                { month: 12, avgTempC: 18.0, minTempC: 13.5, maxTempC: 22.0, humidityPercent: 75, rainfallMm: 70, season: 'summer', perceivedWeather: 'warm', perceivedSummaryKo: '한여름 크리스마스 시즌', clothingTipKo: '여름 옷, 수영복' }
            ]
        }
    },

    // ─── 16. 스페인 (ES) ──────────────────────────────────────────
    ES: {
        key: 'ES',
        nameKo: '스페인',
        nameEn: 'Spain',
        aliases: ['스페인', 'spain', '바르셀로나', '마드리드', '세비야', '그라나다', '마요르카', '발렌시아'],
        capitalKo: '마드리드',
        languages: ['스페인어'],
        plugTypes: ['C', 'F'],
        voltage: 230,
        frequencyHz: 50,
        plugSummaryKo: '230V Type C/F 플러그로 한국 2구 플러그와 호환됩니다.',
        esimSupported: true,
        currency: {
            code: 'EUR',
            symbol: '€',
            nameKo: '유로',
            krwRate: 1465.0,
            rateUnit: 1
        },
        water: {
            hardness: 'hard',
            tapWaterDrinkable: true,
            waterSummaryKo: '바르셀로나 등 지중해 연안은 석회질이 많아 생수 구매 및 샤워 필터 사용을 권장합니다.',
            showerFilterRecommended: true
        },
        culture: {
            majorReligions: ['가톨릭 (60%)', '무교 (35%)'],
            tipping: 'optional',
            tippingGuideKo: '팁이 필수가 아니며, 바나 식당에서 잔돈(5~10%)을 남기는 정도입니다.',
            etiquetteTipsKo: ['식사 시간이 늦은 편입니다 (점심 14~16시, 저녁 21~23시). 관광지 소매치기에 주의하세요.']
        },
        driving: {
            drivingSide: 'right',
            koreanEnglishLicenseAccepted: false,
            idpRequired: true,
            drivingSummaryKo: '우측 통행(좌핸들)입니다. 제네바 협약 국제운전면허증(IDP) 실물과 한국 면허증이 필수입니다.',
            drivingTipsKo: ['회전교차로에서는 좌측에서 진입해 회전 중인 차량이 절대 우선입니다.']
        },
        visa: {
            visaFreeDays: 90,
            isVisaRequired: false,
            entryAuthProgram: 'ETIAS',
            isEntryAuthRequired: false,
            entrySummaryKo: '솅겐 협약국으로 180일 내 90일 무비자 체류 가능.'
        },
        climate: {
            climateZone: 'north',
            generalSummaryKo: '지중해성 기후로 여름은 뜨겁고 건조하며, 봄과 가을이 여행하기 가장 좋습니다.',
            monthly: [
                { month: 1, avgTempC: 9.0, minTempC: 4.5, maxTempC: 13.5, humidityPercent: 72, rainfallMm: 40, season: 'winter', perceivedWeather: 'chilly', perceivedSummaryKo: '선선하고 쌀쌀한 겨울', clothingTipKo: '코트, 자켓, 니트' },
                { month: 2, avgTempC: 10.5, minTempC: 5.5, maxTempC: 15.0, humidityPercent: 70, rainfallMm: 35, season: 'winter', perceivedWeather: 'chilly', perceivedSummaryKo: '온화해지는 늦겨울', clothingTipKo: '가을/겨울 외투' },
                { month: 3, avgTempC: 13.0, minTempC: 7.5, maxTempC: 17.5, humidityPercent: 68, rainfallMm: 35, season: 'spring', perceivedWeather: 'mild', perceivedSummaryKo: '포근하고 화창한 봄', clothingTipKo: '트렌치코트, 자켓' },
                { month: 4, avgTempC: 15.5, minTempC: 10.0, maxTempC: 20.0, humidityPercent: 66, rainfallMm: 45, season: 'spring', perceivedWeather: 'mild', perceivedSummaryKo: '화창하고 쾌적한 여행 적기', clothingTipKo: '가벼운 자켓, 셔츠' },
                { month: 5, avgTempC: 19.0, minTempC: 13.5, maxTempC: 23.5, humidityPercent: 65, rainfallMm: 50, season: 'spring', perceivedWeather: 'warm', perceivedSummaryKo: '따뜻하고 활기찬 날씨', clothingTipKo: '반팔, 가디건' },
                { month: 6, avgTempC: 23.0, minTempC: 17.5, maxTempC: 27.5, humidityPercent: 60, rainfallMm: 30, season: 'summer', perceivedWeather: 'hot', perceivedSummaryKo: '햇살 강하고 더운 초여름', clothingTipKo: '여름 옷, 선글라스' },
                { month: 7, avgTempC: 26.0, minTempC: 20.5, maxTempC: 31.0, humidityPercent: 58, rainfallMm: 15, season: 'summer', perceivedWeather: 'hot', perceivedSummaryKo: '무덥고 건조한 한여름', clothingTipKo: '시원한 여름 옷, 모자' },
                { month: 8, avgTempC: 26.0, minTempC: 20.5, maxTempC: 31.0, humidityPercent: 60, rainfallMm: 30, season: 'summer', perceivedWeather: 'hot', perceivedSummaryKo: '뜨거운 햇살과 바캉스', clothingTipKo: '여름 옷, 자외선 차단' },
                { month: 9, avgTempC: 23.0, minTempC: 17.5, maxTempC: 27.5, humidityPercent: 65, rainfallMm: 65, season: 'autumn', perceivedWeather: 'warm', perceivedSummaryKo: '온화하고 쾌적한 초가을', clothingTipKo: '반팔 + 가벼운 셔츠' },
                { month: 10, avgTempC: 18.5, minTempC: 13.5, maxTempC: 23.0, humidityPercent: 70, rainfallMm: 80, season: 'autumn', perceivedWeather: 'mild', perceivedSummaryKo: '선선하고 아름다운 가을', clothingTipKo: '자켓, 가디건, 긴바지' },
                { month: 11, avgTempC: 13.5, minTempC: 8.5, maxTempC: 17.5, humidityPercent: 73, rainfallMm: 55, season: 'autumn', perceivedWeather: 'chilly', perceivedSummaryKo: '썰렁해지는 늦가을', clothingTipKo: '도톰한 자켓, 코트' },
                { month: 12, avgTempC: 10.0, minTempC: 5.5, maxTempC: 14.0, humidityPercent: 73, rainfallMm: 45, season: 'winter', perceivedWeather: 'chilly', perceivedSummaryKo: '쌀쌀한 초겨울 날씨', clothingTipKo: '겨울 코트, 패딩' }
            ]
        }
    },

    // ─── 17. 홍콩 (HK) ──────────────────────────────────────────
    HK: {
        key: 'HK',
        nameKo: '홍콩',
        nameEn: 'Hong Kong',
        aliases: ['홍콩', 'hong kong', '침사추이', '센트럴', '몽콕', '란콰이퐁'],
        capitalKo: '홍콩',
        languages: ['광둥어', '영어', '중국어(보통화)'],
        plugTypes: ['G'],
        voltage: 220,
        frequencyHz: 50,
        plugSummaryKo: '220V 3구 각형(Type G, 영국식) 플러그로 전용 어댑터가 필요합니다.',
        esimSupported: true,
        currency: {
            code: 'HKD',
            symbol: 'HK$',
            nameKo: '홍콩 달러',
            krwRate: 174.0,
            rateUnit: 1
        },
        water: {
            hardness: 'medium',
            tapWaterDrinkable: false,
            waterSummaryKo: '수돗물 직접 음용은 권장하지 않으며 생수(Bottled water)를 구매해 드세요.',
            showerFilterRecommended: false
        },
        culture: {
            majorReligions: ['불교/도교 (50%)', '기독교 (12%)', '무교 (35%)'],
            tipping: 'optional',
            tippingGuideKo: '일반 식당은 10% 서비스 차지가 포함되며, 포함되지 않은 경우 잔돈을 남깁니다.',
            etiquetteTipsKo: ['옥토퍼스 카드(Octopus Card) 하나로 교통과 식음료 결제가 모두 가능합니다.']
        },
        driving: {
            drivingSide: 'left',
            koreanEnglishLicenseAccepted: false,
            idpRequired: true,
            drivingSummaryKo: '좌측 통행(우핸들)입니다. 대중교통(MTR, 트램, 페리)이 극도로 발달해 렌터카가 불필요합니다.',
            drivingTipsKo: ['도심 운전은 복잡하므로 대중교통 이용을 권장합니다.']
        },
        visa: {
            visaFreeDays: 90,
            isVisaRequired: false,
            entrySummaryKo: '대한민국 여권 소지자 90일 무비자 입국 가능.'
        },
        climate: {
            climateZone: 'tropical',
            generalSummaryKo: '아열대 기후로 10~3월이 쾌적하고 여행하기 가장 좋으며 여름은 매우 덥고 습합니다.',
            monthly: [
                { month: 1, avgTempC: 16.5, minTempC: 14.5, maxTempC: 18.5, humidityPercent: 74, rainfallMm: 25, season: 'winter', perceivedWeather: 'mild', perceivedSummaryKo: '선선하고 건조하여 여행 최적기', clothingTipKo: '자켓, 가디건, 긴팔 셔츠' },
                { month: 2, avgTempC: 17.0, minTempC: 15.0, maxTempC: 19.0, humidityPercent: 80, rainfallMm: 55, season: 'winter', perceivedWeather: 'mild', perceivedSummaryKo: '선선하고 흐린 날이 많음', clothingTipKo: '가디건, 코트, 니트' },
                { month: 3, avgTempC: 19.5, minTempC: 17.5, maxTempC: 21.5, humidityPercent: 82, rainfallMm: 80, season: 'spring', perceivedWeather: 'mild', perceivedSummaryKo: '포근하고 안개 잦음', clothingTipKo: '긴팔 셔츠, 얇은 자켓' },
                { month: 4, avgTempC: 23.0, minTempC: 21.0, maxTempC: 25.0, humidityPercent: 83, rainfallMm: 175, season: 'spring', perceivedWeather: 'warm', perceivedSummaryKo: '따뜻하고 습해지기 시작', clothingTipKo: '반팔 티셔츠, 얇은 셔츠' },
                { month: 5, avgTempC: 26.5, minTempC: 24.5, maxTempC: 28.5, humidityPercent: 83, rainfallMm: 290, season: 'summer', perceivedWeather: 'hot', perceivedSummaryKo: '덥고 비가 자주 내림', clothingTipKo: '여름 옷, 우산' },
                { month: 6, avgTempC: 28.5, minTempC: 26.5, maxTempC: 30.5, humidityPercent: 82, rainfallMm: 450, season: 'summer', perceivedWeather: 'sweltering', perceivedSummaryKo: '무덥고 습하며 폭우/태풍 주의', clothingTipKo: '통풍 잘되는 얇은 옷' },
                { month: 7, avgTempC: 29.5, minTempC: 27.0, maxTempC: 31.5, humidityPercent: 81, rainfallMm: 380, season: 'summer', perceivedWeather: 'sweltering', perceivedSummaryKo: '한여름 폭염과 강한 에어컨', clothingTipKo: '여름 옷 + 실내용 겉옷' },
                { month: 8, avgTempC: 29.0, minTempC: 26.5, maxTempC: 31.5, humidityPercent: 81, rainfallMm: 430, season: 'summer', perceivedWeather: 'sweltering', perceivedSummaryKo: '덥고 습하며 태풍 시즌', clothingTipKo: '시원한 옷차림, 방수용품' },
                { month: 9, avgTempC: 28.0, minTempC: 25.5, maxTempC: 30.5, humidityPercent: 78, rainfallMm: 320, season: 'autumn', perceivedWeather: 'hot', perceivedSummaryKo: '늦더위와 쾌적한 바람', clothingTipKo: '반팔, 린넨 셔츠' },
                { month: 10, avgTempC: 25.5, minTempC: 23.5, maxTempC: 28.0, humidityPercent: 73, rainfallMm: 100, season: 'autumn', perceivedWeather: 'mild', perceivedSummaryKo: '화창하고 맑은 여행 황금기', clothingTipKo: '긴팔 셔츠, 얇은 가디건' },
                { month: 11, avgTempC: 22.0, minTempC: 20.0, maxTempC: 24.5, humidityPercent: 71, rainfallMm: 40, season: 'autumn', perceivedWeather: 'mild', perceivedSummaryKo: '선선하고 쾌적한 최고의 날씨', clothingTipKo: '가디건, 자켓, 긴바지' },
                { month: 12, avgTempC: 18.0, minTempC: 16.0, maxTempC: 20.5, humidityPercent: 69, rainfallMm: 25, season: 'winter', perceivedWeather: 'mild', perceivedSummaryKo: '선선한 초겨울과 화려한 축제', clothingTipKo: '자켓, 니트, 긴팔' }
            ]
        }
    }
};

/**
 * 국가 코드 또는 명칭(별칭)으로 인텔리전스 객체를 조회합니다.
 */
export function getCountryIntelligence(idOrName?: string | null): CountryIntelligence | undefined {
    if (!idOrName) return undefined;
    const key = String(idOrName).toUpperCase().trim();
    if (COUNTRY_INTELLIGENCE_DB[key]) {
        return COUNTRY_INTELLIGENCE_DB[key];
    }
    const lower = key.toLowerCase();
    return Object.values(COUNTRY_INTELLIGENCE_DB).find(c => 
        c.key.toLowerCase() === lower ||
        c.nameKo.toLowerCase() === lower ||
        c.nameEn.toLowerCase() === lower ||
        c.aliases.some(a => lower.includes(a.toLowerCase()) || a.toLowerCase().includes(lower))
    );
}
