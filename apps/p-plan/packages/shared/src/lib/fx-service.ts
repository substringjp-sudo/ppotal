/**
 * 실시간 환율 서비스 (Frankfurter, 무키·무료·CORS 허용, ECB 데이터).
 *
 * 기존 exchangeRateStore(Firestore 문서 → 기본값)를 라이브 환율로 보강한다.
 * 앱의 환율 규약은 rates[code] = "1 code당 기준통화(KRW) 금액" 이므로,
 * Frankfurter의 (기준통화당 code) 값을 역수로 변환한다.
 */

export interface LiveExchangeRates {
    base: string;
    date: string;
    rates: Record<string, number>; // 1 code 당 base(KRW) 금액
}

let fxCache: { at: number; data: LiveExchangeRates } | null = null;
const FX_TTL_MS = 1000 * 60 * 60 * 6; // 6시간

export async function fetchLiveExchangeRates(base: string = 'KRW'): Promise<LiveExchangeRates | null> {
    if (fxCache && fxCache.data.base === base && Date.now() - fxCache.at < FX_TTL_MS) {
        return fxCache.data;
    }
    try {
        const res = await fetch(`https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`);
        if (!res.ok) return null;
        const data = await res.json();
        const raw = data?.rates;
        if (!raw || typeof raw !== 'object') return null;

        const rates: Record<string, number> = {};
        for (const [code, v] of Object.entries(raw)) {
            // v = 기준통화 1단위당 code 금액 → 역수 = 1 code당 기준통화 금액
            if (typeof v === 'number' && v > 0) rates[code] = 1 / v;
        }
        rates[base] = 1;

        const result: LiveExchangeRates = { base, date: typeof data.date === 'string' ? data.date : '', rates };
        fxCache = { at: Date.now(), data: result };
        return result;
    } catch {
        return null;
    }
}
