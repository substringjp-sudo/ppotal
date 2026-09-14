import { RegionIds } from '../types/common';
import { resolveCountryProfile } from './data/country-profiles';

/**
 * 국가 ID, ISO 코드, 한글/영문 국가명을 표준 2자리 ISO 국가 코드(KR, JP, US 등)로 정규화합니다.
 * 기존 시스템의 번호 ID ('082', '093', '392', '101', '840' 등) 및 다양한 명칭과 완벽히 호환됩니다.
 */
export function normalizeCountryCode(idOrName?: string | number | null): string {
    if (idOrName === undefined || idOrName === null) return '';
    const val = String(idOrName).trim();
    if (!val) return '';

    const lower = val.toLowerCase();

    // 1. 대한민국 (KR / 082 / 093 / 001)
    if (
        ['kr', 'kor', '082', '093', '001', '82', '93', '93.json', '대한민국', '한국', 'korea', 'south korea', 'korea, south', 'republic of korea'].includes(lower)
    ) {
        return 'KR';
    }

    // 2. 일본 (JP / 392 / 101)
    if (
        ['jp', 'jpn', '392', '101', '일본', 'japan', '101.json'].includes(lower)
    ) {
        return 'JP';
    }

    // 3. 미국 (US / 840)
    if (
        ['us', 'usa', '840', '미국', 'united states', 'united states of america', 'guam', '괌', 'saipan', '사이판', 'hawaii', '하와이'].includes(lower)
    ) {
        return 'US';
    }

    // 4. 중국 (CN / 156)
    if (['cn', 'chn', '156', '중국', 'china'].includes(lower)) {
        return 'CN';
    }

    // 5. 대만 (TW / 158)
    if (['tw', 'twn', '158', '대만', '타이완', 'taiwan'].includes(lower)) {
        return 'TW';
    }

    // 6. 홍콩 (HK / 344)
    if (['hk', 'hkg', '344', '홍콩', 'hong kong'].includes(lower)) {
        return 'HK';
    }

    // 7. 영국 (GB / 826)
    if (['gb', 'gbr', 'uk', '826', '영국', 'united kingdom', 'britain', 'england'].includes(lower)) {
        return 'GB';
    }

    // 8. 프랑스 (FR / 250)
    if (['fr', 'fra', '250', '프랑스', 'france'].includes(lower)) {
        return 'FR';
    }

    // 9. 독일 (DE / 276)
    if (['de', 'deu', '276', '독일', 'germany'].includes(lower)) {
        return 'DE';
    }

    // 10. 이탈리아 (IT / 380)
    if (['it', 'ita', '380', '이탈리아', 'italy'].includes(lower)) {
        return 'IT';
    }

    // 11. 스페인 (ES / 724)
    if (['es', 'esp', '724', '스페인', 'spain'].includes(lower)) {
        return 'ES';
    }

    // 12. 스위스 (CH / 756)
    if (['ch', 'che', '756', '스위스', 'switzerland'].includes(lower)) {
        return 'CH';
    }

    // 13. 호주 (AU / 036)
    if (['au', 'aus', '036', '36', '호주', '오스트레일리아', 'australia'].includes(lower)) {
        return 'AU';
    }

    // 14. 뉴질랜드 (NZ / 554)
    if (['nz', 'nzl', '554', '뉴질랜드', 'new zealand'].includes(lower)) {
        return 'NZ';
    }

    // 15. 태국 (TH / 764)
    if (['th', 'tha', '764', '태국', 'thailand'].includes(lower)) {
        return 'TH';
    }

    // 16. 베트남 (VN / 704)
    if (['vn', 'vnm', '704', '베트남', 'vietnam'].includes(lower)) {
        return 'VN';
    }

    // 17. 싱가포르 (SG / 702)
    if (['sg', 'sgp', '702', '싱가포르', 'singapore'].includes(lower)) {
        return 'SG';
    }

    // 18. 말레이시아 (MY / 458)
    if (['my', 'mys', '458', '말레이시아', 'malaysia'].includes(lower)) {
        return 'MY';
    }

    // 19. 인도네시아 (ID / 360)
    if (['id', 'idn', '360', '인도네시아', 'indonesia', '발리', 'bali'].includes(lower)) {
        return 'ID';
    }

    // 20. 필리핀 (PH / 608)
    if (['ph', 'phl', '608', '필리핀', 'philippines', '세부', 'cebu', '보라카이', 'boracay'].includes(lower)) {
        return 'PH';
    }

    // 21. 캐나다 (CA / 124)
    if (['ca', 'can', '124', '캐나다', 'canada'].includes(lower)) {
        return 'CA';
    }

    // COUNTRY_PROFILES aliases 기반 매칭
    const profile = resolveCountryProfile(val);
    if (profile) return profile.key;

    return val.toUpperCase();
}

/**
 * 두 국가가 동일한지 판별합니다.
 */
export function isSameCountry(country1?: string | null, country2?: string | null): boolean {
    const code1 = normalizeCountryCode(country1);
    const code2 = normalizeCountryCode(country2);
    if (!code1 || !code2) return false;
    return code1 === code2;
}

/**
 * 국가 코드 또는 ID로부터 친숙한 한국어 표시명을 가져옵니다.
 */
export function getCountryDisplayName(countryCodeOrId?: string | null): string {
    const code = normalizeCountryCode(countryCodeOrId);
    const map: Record<string, string> = {
        KR: '대한민국',
        JP: '일본',
        US: '미국',
        CN: '중국',
        TW: '대만',
        HK: '홍콩',
        GB: '영국',
        FR: '프랑스',
        DE: '독일',
        IT: '이탈리아',
        ES: '스페인',
        CH: '스위스',
        AU: '호주',
        NZ: '뉴질랜드',
        TH: '태국',
        VN: '베트남',
        SG: '싱가포르',
        MY: '말레이시아',
        ID: '인도네시아',
        PH: '필리핀',
        CA: '캐나다',
    };
    return map[code] || (countryCodeOrId ? String(countryCodeOrId) : '대한민국');
}

/**
 * RegionIds 또는 지역 이름으로부터 국가 코드를 추출합니다.
 */
export function extractCountryCodeFromRegion(region: {
    countryId?: string;
    countryName?: string;
    name?: string;
    type?: string;
    regionIds?: RegionIds;
}): string {
    if (region.regionIds?.countryId) {
        return normalizeCountryCode(region.regionIds.countryId);
    }
    if (region.regionIds?.countryName) {
        return normalizeCountryCode(region.regionIds.countryName);
    }
    if (region.countryId) {
        return normalizeCountryCode(region.countryId);
    }
    if (region.countryName) {
        return normalizeCountryCode(region.countryName);
    }
    if (region.type === 'country' && region.name) {
        return normalizeCountryCode(region.name);
    }
    if (region.name) {
        return normalizeCountryCode(region.name);
    }
    return '';
}
