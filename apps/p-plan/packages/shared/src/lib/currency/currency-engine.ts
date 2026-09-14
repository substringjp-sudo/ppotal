/**
 * 스마트 플루이드 통화 엔진 (Fluid Currency & Natural Language Parser Engine)
 * 
 * 1) 목적지/국가 기반 스마트 기본 통화 및 원터치 칩 리스트 제공
 * 2) 키보드 자연어 입력 파서 (예: 1500j, 25eur, 50$, 30000원 -> 통화 & 금액 자동 분해)
 * 3) 실시간 양방향 환산 및 실루엣 고스트 환율 계산
 */

import { DEFAULT_EXCHANGE_RATES, CURRENCY_SYMBOLS, WORLD_CURRENCIES } from '../currency-utils';

export interface CurrencyQuickChip {
    code: string;
    symbol: string;
    name: string;
    isLocal: boolean;
    isHome: boolean;
}

export interface ParsedCurrencyInput {
    raw: string;
    amount: number;
    currencyCode: string | null;
    hasExplicitCurrency: boolean;
    formattedGhostEstimate: string | null;
    convertedAmountKRW: number | null;
}

/**
 * 목적지(국가/도시)와 홈 통화를 기반으로 상시 노출할 3~5개의 원터치 통화 칩 리스트 산출
 */
export function resolveSuggestedCurrencies(
    destinationCountryOrCity?: string,
    homeCurrency = 'KRW'
): { primaryLocalCode: string; chips: CurrencyQuickChip[] } {
    let localCode = 'JPY'; // 기본 fallback

    if (destinationCountryOrCity) {
        const dest = destinationCountryOrCity.toLowerCase();
        if (dest.includes('일본') || dest.includes('도쿄') || dest.includes('오사카') || dest.includes('후쿠오카') || dest.includes('홋카이도') || dest.includes('japan') || dest.includes('tokyo')) {
            localCode = 'JPY';
        } else if (dest.includes('미국') || dest.includes('뉴욕') || dest.includes('하와이') || dest.includes('괌') || dest.includes('usa') || dest.includes('사이판')) {
            localCode = 'USD';
        } else if (dest.includes('프랑스') || dest.includes('파리') || dest.includes('이탈리아') || dest.includes('로마') || dest.includes('스페인') || dest.includes('바르셀로나') || dest.includes('독일') || dest.includes('유럽') || dest.includes('europe')) {
            localCode = 'EUR';
        } else if (dest.includes('영국') || dest.includes('런던') || dest.includes('uk') || dest.includes('london')) {
            localCode = 'GBP';
        } else if (dest.includes('스위스') || dest.includes('인터라켄') || dest.includes('swiss') || dest.includes('chf')) {
            localCode = 'CHF';
        } else if (dest.includes('대만') || dest.includes('타이베이') || dest.includes('taiwan')) {
            localCode = 'TWD';
        } else if (dest.includes('태국') || dest.includes('방콕') || dest.includes('치앙마이') || dest.includes('thailand') || dest.includes('phuket')) {
            localCode = 'THB';
        } else if (dest.includes('베트남') || dest.includes('다낭') || dest.includes('나트랑') || dest.includes('하노이') || dest.includes('vietnam')) {
            localCode = 'VND';
        } else if (dest.includes('홍콩') || dest.includes('hong kong')) {
            localCode = 'HKD';
        } else if (dest.includes('싱가포르') || dest.includes('singapore')) {
            localCode = 'SGD';
        } else if (dest.includes('중국') || dest.includes('상하이') || dest.includes('베이징') || dest.includes('china')) {
            localCode = 'CNY';
        } else if (dest.includes('한국') || dest.includes('제주') || dest.includes('서울') || dest.includes('부산') || dest.includes('korea')) {
            localCode = 'KRW';
        }
    }

    const priorityCodes = Array.from(new Set([
        localCode,
        homeCurrency,
        'USD',
        localCode === 'EUR' ? 'GBP' : 'EUR'
    ])).slice(0, 4);

    const chips: CurrencyQuickChip[] = priorityCodes.map(code => {
        const found = WORLD_CURRENCIES.find(c => c.code === code);
        return {
            code,
            symbol: CURRENCY_SYMBOLS[code] || code,
            name: found?.name || code,
            isLocal: code === localCode && code !== homeCurrency,
            isHome: code === homeCurrency
        };
    });

    return {
        primaryLocalCode: localCode,
        chips
    };
}

/**
 * 자연어 단축 입력 파싱
 * 예: "1500j", "1500엔", "25eur", "50$", "30000원", "150대만달러"
 */
export function parseCurrencyExpression(
    input: string,
    currentActiveCurrency = 'KRW'
): ParsedCurrencyInput {
    if (!input || !input.trim()) {
        return {
            raw: '',
            amount: 0,
            currencyCode: null,
            hasExplicitCurrency: false,
            formattedGhostEstimate: null,
            convertedAmountKRW: null
        };
    }

    const trimmed = input.trim();
    // 콤마 제거 및 공백 정규화
    const sanitized = trimmed.replace(/,/g, '');

    // 1) 통화 키워드 정규식 맵
    const CURRENCY_MATCHERS: { regex: RegExp; code: string }[] = [
        { regex: /(?:엔|jpy|jp|¥|j)$/i, code: 'JPY' },
        { regex: /^(?:¥|jpy)/i, code: 'JPY' },
        { regex: /(?:유로|eur|euro|€|e)$/i, code: 'EUR' },
        { regex: /^(?:€|eur)/i, code: 'EUR' },
        { regex: /(?:달러|usd|dollar|\$|u)$/i, code: 'USD' },
        { regex: /^(?:\$|usd)/i, code: 'USD' },
        { regex: /(?:원|krw|won|₩|k)$/i, code: 'KRW' },
        { regex: /^(?:₩|krw)/i, code: 'KRW' },
        { regex: /(?:파운드|gbp|pound|£|g)$/i, code: 'GBP' },
        { regex: /(?:프랑|chf|franc)$/i, code: 'CHF' },
        { regex: /(?:대만달러|twd|ntd|nt\$|nt|t)$/i, code: 'TWD' },
        { regex: /(?:바트|thb|baht|฿|b)$/i, code: 'THB' },
        { regex: /(?:동|vnd|dong|₫|v)$/i, code: 'VND' },
        { regex: /(?:위안|cny|rmb|위엔)$/i, code: 'CNY' },
        { regex: /(?:홍콩달러|hkd|hk\$)$/i, code: 'HKD' },
        { regex: /(?:싱달|sgd|s\$)$/i, code: 'SGD' }
    ];

    let detectedCurrency: string | null = null;
    let numericStr = sanitized;

    for (const matcher of CURRENCY_MATCHERS) {
        if (matcher.regex.test(sanitized)) {
            detectedCurrency = matcher.code;
            numericStr = sanitized.replace(matcher.regex, '').trim();
            break;
        }
    }

    const parsedNum = parseFloat(numericStr);
    const validAmount = isNaN(parsedNum) ? 0 : Math.max(0, parsedNum);
    const finalCurrency = detectedCurrency || currentActiveCurrency;

    // 환산액 및 고스트 프리뷰 계산
    let convertedKRW: number | null = null;
    let ghostText: string | null = null;

    if (validAmount > 0) {
        if (finalCurrency === 'KRW') {
            convertedKRW = validAmount;
            ghostText = null; // 원화면 고스트 불필요
        } else {
            const rate = DEFAULT_EXCHANGE_RATES[finalCurrency] || 1;
            convertedKRW = Math.round(validAmount * rate);
            const formattedKRW = convertedKRW.toLocaleString('ko-KR');
            ghostText = `≈ ${formattedKRW}원 (1 ${finalCurrency} = ${rate >= 10 ? rate.toLocaleString('ko-KR') : rate}원)`;
        }
    }

    return {
        raw: input,
        amount: validAmount,
        currencyCode: detectedCurrency,
        hasExplicitCurrency: Boolean(detectedCurrency),
        formattedGhostEstimate: ghostText,
        convertedAmountKRW: convertedKRW
    };
}
