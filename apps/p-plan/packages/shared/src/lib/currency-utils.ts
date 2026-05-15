/**
 * 국가/지역명 기반 통화 매핑 및 환율 유틸리티
 */
import { TripRegion } from '../types/trip';

export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
    '일본': 'JPY',
    '미국': 'USD',
    '유럽': 'EUR',
    '영국': 'GBP',
    '한국': 'KRW',
    '베트남': 'VND',
    '태국': 'THB',
    '중국': 'CNY',
    '대만': 'TWD',
    '홍콩': 'HKD',
    '싱가포르': 'SGD',
    '호주': 'AUD',
    '캐나다': 'CAD',
    '스위스': 'CHF',
};

export const WORLD_CURRENCIES = [
    { code: 'KRW', name: '대한민국 원', symbol: '₩' },
    { code: 'USD', name: '미국 달러', symbol: '$' },
    { code: 'JPY', name: '일본 엔', symbol: '¥' },
    { code: 'EUR', name: '유로', symbol: '€' },
    { code: 'GBP', name: '영국 파운드', symbol: '£' },
    { code: 'CNY', name: '중국 위안', symbol: '¥' },
    { code: 'VND', name: '베트남 동', symbol: '₫' },
    { code: 'THB', name: '태국 바트', symbol: '฿' },
    { code: 'TWD', name: '대만 달러', symbol: 'NT$' },
    { code: 'HKD', name: '홍콩 달러', symbol: 'HK$' },
    { code: 'SGD', name: '싱가포르 달러', symbol: 'S$' },
    { code: 'AUD', name: '호주 달러', symbol: 'A$' },
    { code: 'CAD', name: '캐나다 달러', symbol: 'C$' },
    { code: 'CHF', name: '스위스 프랑', symbol: 'CHF' },
    { code: 'NZD', name: '뉴질랜드 달러', symbol: 'NZ$' },
    { code: 'PHP', name: '필리핀 페소', symbol: '₱' },
    { code: 'MYR', name: '말레이시아 링깃', symbol: 'RM' },
    { code: 'IDR', name: '인도네시아 루피아', symbol: 'Rp' },
    { code: 'INR', name: '인도 루피', symbol: '₹' },
    { code: 'MNT', name: '몽골 투그릭', symbol: '₮' },
    { code: 'MXN', name: '멕시코 페소', symbol: '$' },
    { code: 'BRL', name: '브라질 레알', symbol: 'R$' },
    { code: 'ZAR', name: '남아공 랜드', symbol: 'R' },
    { code: 'RUB', name: '러시아 루블', symbol: '₽' },
    { code: 'TRY', name: '터키 리라', symbol: '₺' },
    { code: 'AED', name: 'UAE 디르함', symbol: 'د.إ' },
    { code: 'SAR', name: '사우디 리얄', symbol: '﷼' },
    { code: 'EGP', name: '이집트 파운드', symbol: 'E£' },
];


export const CURRENCY_SYMBOLS: Record<string, string> = {
    'KRW': '₩',
    'USD': '$',
    'JPY': '¥',
    'EUR': '€',
    'GBP': '£',
    'VND': '₫',
    'THB': '฿',
    'CNY': '¥',
    'TWD': 'NT$',
    'HKD': 'HK$',
    'SGD': 'S$',
    'AUD': 'A$',
    'CAD': 'C$',
    'CHF': 'CHF',
};

// 기준 통화가 KRW일 때의 대략적인 환율 (Mock/Fallback)
export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
    'JPY': 9.2,   // 1 JPY = 9.2 KRW
    'USD': 1380,
    'EUR': 1480,
    'GBP': 1750,
    'VND': 0.054,
    'THB': 38.5,
    'CNY': 192,
    'TWD': 43,
    'HKD': 177,
    'SGD': 1050,
    'AUD': 920,
    'CAD': 1020,
    'CHF': 1580,
    'KRW': 1,
};

/**
 * 전용 환율 계산 함수. dynamicRates가 있으면 사용하고, 없으면 기본값 사용.
 * 모든 환율은 1 단위 통화당 KRW 가격 기준입니다.
 */
export function getExchangeRate(code: string, dynamicRates?: Record<string, number>): number {
    if (dynamicRates && dynamicRates[code]) {
        return dynamicRates[code];
    }
    return DEFAULT_EXCHANGE_RATES[code] || 1;
}

/**
 * 두 통화 간의 환율을 계산합니다. (1 from = ? to)
 */
export function convertCurrency(amount: number, fromCode: string, toCode: string, dynamicRates?: Record<string, number>): number {
    if (fromCode === toCode) return amount;
    
    const fromInKrw = getExchangeRate(fromCode, dynamicRates);
    const toInKrw = getExchangeRate(toCode, dynamicRates);
    
    // (amount * fromInKrw) = total in KRW
    // (total in KRW / toInKrw) = total in toCode
    return (amount * fromInKrw) / toInKrw;
}

interface RegionSummary {
    id: string;
    name: string;
    currencies?: string[];
}

/**
 * 지역 목록에서 해당 통화 코드를 유추함
 * @param regions 지역 이름 목록 또는 TripRegion 객체 배열
 * @param countryData (선택) 로드된 국가 데이터
 */
export function inferCurrencyFromRegions(regions: (string | TripRegion)[] | undefined, countryData?: RegionSummary[]): string {
    if (!regions || regions.length === 0) return 'KRW';

    // 1. 이름 기반 매칭 (우선순위 상향: COUNTRY_CURRENCY_MAP 사용)
    const names = regions.map(r => typeof r === 'string' ? r : r.name);
    for (const name of names) {
        const lowerName = name.toLowerCase();
        for (const [country, code] of Object.entries(COUNTRY_CURRENCY_MAP)) {
            if (lowerName.includes(country.toLowerCase())) return code;
        }
    }

    // 2. TripRegion 객체가 포함되어 있다면 ID 기반 매칭 (데이터가 있을 때만)
    const structuredRegions = regions.filter((r): r is TripRegion => typeof r !== 'string');
    if (countryData && structuredRegions.length > 0) {
        for (const reg of structuredRegions) {
            const cid = reg.countryId;
            if (cid) {
                const country = countryData.find(c => String(c.id) === String(cid));
                if (country?.currencies?.[0]) return country.currencies[0];
            }
        }
    }

    // 3. 국가 데이터 기반 폴백
    if (countryData) {
        for (const name of names) {
            const normalizedName = name.toLowerCase();
            for (const country of countryData) {
                if (country.name && (normalizedName.includes(country.name.toLowerCase()) || country.name.toLowerCase().includes(normalizedName))) {
                    return country.currencies?.[0] || 'USD';
                }
            }
        }
    }
    
    return 'KRW'; 
}


/**
 * 특정 국가가 사용하는 모든 통화 목록을 반환 (ID 우선, 이름 폴백)
 */
export function getCountryCurrencies(countryNameOrId: string, countryData: RegionSummary[]): string[] {
    if (!countryNameOrId || !countryData) return ['USD'];

    const normalizedInput = countryNameOrId.toLowerCase().replace(/\s+/g, '');
    
    // 1. ID로 직접 찾기 시도
    let country = countryData.find(c => String(c.id) === countryNameOrId);
    
    // 2. 이름으로 찾기 시도 (폴백)
    if (!country) {
        country = countryData.find(c => {
            if (!c.name) return false;
            const normalizedCountryName = c.name.toLowerCase().replace(/\s+/g, '');
            return normalizedCountryName === normalizedInput || 
                   normalizedInput.includes(normalizedCountryName) ||
                   normalizedCountryName.includes(normalizedInput);
        });
    }
    
    return country?.currencies || ['USD'];
}

/**
 * 통화 코드에 따른 심볼 반환
 */
export function getCurrencySymbol(code: string): string {
    return CURRENCY_SYMBOLS[code] || code;
}

/**
 * 전날 대비 혹은 과거 데이터 기반 추천 환전 날짜 계산 (Mock)
 * 여행 시작일 기준 5~10일 전 중 하나를 무작위로 선택하거나 규칙에 따라 제안
 */
export function calculateRecommendedExchangeDate(startDateStr: string): string {
    if (!startDateStr) return '날짜 미정';
    const startDate = new Date(startDateStr);
    
    // 여행 시작 7일 전을 추천일로 제안
    const recommendDate = new Date(startDate);
    recommendDate.setDate(startDate.getDate() - 7);
    
    // 현재 날짜보다 과거라면 현재 날짜 혹은 합리적 날짜 제안
    const today = new Date();
    if (recommendDate < today) {
        return '지금 바로';
    }

    return recommendDate.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}
