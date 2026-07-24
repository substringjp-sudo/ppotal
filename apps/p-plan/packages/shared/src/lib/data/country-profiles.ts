/**
 * 국가별 여행 준비 관련 속성 데이터셋.
 *
 * 거주국 ↔ 여행국의 차이(플러그·전압·통화·운전 방향·국제면허 필요 여부 등)를 비교해
 * 필요한 준비물을 자동으로 뽑아내기 위한 데이터다. 온디바이스 계산용(비용 0).
 *
 * 국가 고유 사실이므로 국가별 데이터셋으로 관리하며, 주요 여행지 위주로 큐레이션했다.
 * 확장 시 이 배열에 항목을 추가하면 준비물 생성기가 자동으로 반영한다.
 */

export type PlugType = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O';

/** 외국인 관광객 운전 시 국제운전면허 처리 방식 */
export type IdpPolicy =
    | 'required'      // 국제운전면허(IDP)로 운전 가능 — 발급 필요
    | 'recommended'   // 자국 면허로도 단기 가능하나 IDP 권장
    | 'not-accepted'; // IDP 불인정 — 현지 임시면허 등 별도 절차 필요(예: 중국)

export interface CountryProfile {
    key: string;
    aliases: string[];
    currency: string;        // ISO 4217
    plugTypes: PlugType[];
    voltage: number;         // 대표 전압(V)
    drivingSide: 'left' | 'right';
    idp: IdpPolicy;
    entryAuth?: string;      // 전자여행허가/제도 (준비물 안내용)
    esimSupported?: boolean; // eSIM 보편적으로 사용 가능
}

export const COUNTRY_PROFILES: CountryProfile[] = [
    { key: 'KR', aliases: ['한국', '대한민국', 'korea', '서울', '부산', '제주'], currency: 'KRW', plugTypes: ['C', 'F'], voltage: 220, drivingSide: 'right', idp: 'required', esimSupported: true },
    { key: 'JP', aliases: ['일본', 'japan', '도쿄', '오사카', '교토', '후쿠오카', '홋카이도', '오키나와', '나고야'], currency: 'JPY', plugTypes: ['A', 'B'], voltage: 100, drivingSide: 'left', idp: 'required', entryAuth: 'Visit Japan Web', esimSupported: true },
    { key: 'CN', aliases: ['중국', 'china', '베이징', '상하이', '상해', '광저우'], currency: 'CNY', plugTypes: ['A', 'C', 'I'], voltage: 220, drivingSide: 'right', idp: 'not-accepted', esimSupported: false },
    { key: 'TW', aliases: ['대만', 'taiwan', '타이완', '타이베이'], currency: 'TWD', plugTypes: ['A', 'B'], voltage: 110, drivingSide: 'right', idp: 'required', esimSupported: true },
    { key: 'HK', aliases: ['홍콩', 'hong kong'], currency: 'HKD', plugTypes: ['G'], voltage: 220, drivingSide: 'left', idp: 'required', esimSupported: true },
    { key: 'US', aliases: ['미국', 'united states', 'usa', '뉴욕', '로스앤젤레스', '하와이', '괌', '샌프란시스코'], currency: 'USD', plugTypes: ['A', 'B'], voltage: 120, drivingSide: 'right', idp: 'recommended', entryAuth: 'ESTA', esimSupported: true },
    { key: 'CA', aliases: ['캐나다', 'canada'], currency: 'CAD', plugTypes: ['A', 'B'], voltage: 120, drivingSide: 'right', idp: 'recommended', entryAuth: 'eTA', esimSupported: true },
    { key: 'GB', aliases: ['영국', 'united kingdom', 'england', 'britain', '런던'], currency: 'GBP', plugTypes: ['G'], voltage: 230, drivingSide: 'left', idp: 'recommended', entryAuth: 'UK ETA', esimSupported: true },
    { key: 'FR', aliases: ['프랑스', 'france', '파리'], currency: 'EUR', plugTypes: ['C', 'E'], voltage: 230, drivingSide: 'right', idp: 'required', entryAuth: 'ETIAS', esimSupported: true },
    { key: 'DE', aliases: ['독일', 'germany', '베를린', '뮌헨'], currency: 'EUR', plugTypes: ['C', 'F'], voltage: 230, drivingSide: 'right', idp: 'required', entryAuth: 'ETIAS', esimSupported: true },
    { key: 'IT', aliases: ['이탈리아', 'italy', '로마', '밀라노'], currency: 'EUR', plugTypes: ['C', 'F', 'L'], voltage: 230, drivingSide: 'right', idp: 'required', entryAuth: 'ETIAS', esimSupported: true },
    { key: 'ES', aliases: ['스페인', 'spain', '바르셀로나', '마드리드'], currency: 'EUR', plugTypes: ['C', 'F'], voltage: 230, drivingSide: 'right', idp: 'required', entryAuth: 'ETIAS', esimSupported: true },
    { key: 'CH', aliases: ['스위스', 'switzerland'], currency: 'CHF', plugTypes: ['C', 'J'], voltage: 230, drivingSide: 'right', idp: 'required', esimSupported: true },
    { key: 'AU', aliases: ['호주', '오스트레일리아', 'australia', '시드니', '멜버른'], currency: 'AUD', plugTypes: ['I'], voltage: 230, drivingSide: 'left', idp: 'required', entryAuth: 'ETA/eVisitor', esimSupported: true },
    { key: 'NZ', aliases: ['뉴질랜드', 'new zealand'], currency: 'NZD', plugTypes: ['I'], voltage: 230, drivingSide: 'left', idp: 'required', entryAuth: 'NZeTA', esimSupported: true },
    { key: 'TH', aliases: ['태국', 'thailand', '방콕', '푸켓', '치앙마이'], currency: 'THB', plugTypes: ['A', 'B', 'C', 'O'], voltage: 220, drivingSide: 'left', idp: 'required', esimSupported: true },
    { key: 'VN', aliases: ['베트남', 'vietnam', '하노이', '호치민', '다낭'], currency: 'VND', plugTypes: ['A', 'C', 'F'], voltage: 220, drivingSide: 'right', idp: 'required', esimSupported: true },
    { key: 'SG', aliases: ['싱가포르', 'singapore'], currency: 'SGD', plugTypes: ['G'], voltage: 230, drivingSide: 'left', idp: 'required', esimSupported: true },
    { key: 'MY', aliases: ['말레이시아', 'malaysia', '쿠알라룸푸르'], currency: 'MYR', plugTypes: ['G'], voltage: 240, drivingSide: 'left', idp: 'required', esimSupported: true },
    { key: 'ID', aliases: ['인도네시아', 'indonesia', '발리', '자카르타'], currency: 'IDR', plugTypes: ['C', 'F'], voltage: 230, drivingSide: 'left', idp: 'required', esimSupported: true },
    { key: 'PH', aliases: ['필리핀', 'philippines', '세부', '마닐라', '보라카이'], currency: 'PHP', plugTypes: ['A', 'B', 'C'], voltage: 220, drivingSide: 'right', idp: 'required', esimSupported: true },
];

/** 국가 이름(별칭 포함)으로 프로필을 찾는다. */
export function resolveCountryProfile(name?: string): CountryProfile | undefined {
    if (!name) return undefined;
    const n = name.toLowerCase().trim();
    if (!n) return undefined;
    return COUNTRY_PROFILES.find(p => p.aliases.some(a => n.includes(a.toLowerCase()) || a.toLowerCase().includes(n)));
}

/** 기본 거주국(정보가 없을 때) */
export const DEFAULT_HOME_COUNTRY = 'KR';
