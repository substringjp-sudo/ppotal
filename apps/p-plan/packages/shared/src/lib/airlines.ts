export interface Airline {
    code: string;
    nameKo: string;
    nameEn: string;
    countryKo?: string;
    logoUrl?: string;
}

/**
 * CORE_AIRLINES: 자주 사용되는 주요 항공사 리스트 (로컬 캐시용)
 * 전체 항공사 데이터(8,000+)는 data/airlines.json에 위치하며, 
 * Firebase Functions를 통해 실시간 검색이 가능합니다.
 * 여기에 정의된 항공사는 타이핑 즉시(0ms) 결과를 보여주기 위한 최적화용입니다.
 */
export const CORE_AIRLINES: Airline[] = [
    // --- 대한민국 ---
    { code: 'KE', nameKo: '대한항공', nameEn: 'Korean Air', countryKo: '대한민국' },
    { code: 'OZ', nameKo: '아시아나항공', nameEn: 'Asiana Airlines', countryKo: '대한민국' },
    { code: '7C', nameKo: '제주항공', nameEn: 'Jeju Air', countryKo: '대한민국' },
    { code: 'LJ', nameKo: '진에어', nameEn: 'Jin Air', countryKo: '대한민국' },
    { code: 'BX', nameKo: '에어부산', nameEn: 'Air Busan', countryKo: '대한민국' },
    { code: 'TW', nameKo: '티웨이항공', nameEn: 'T\'way Air', countryKo: '대한민국' },
    { code: 'RS', nameKo: '에어서울', nameEn: 'Air Seoul', countryKo: '대한민국' },
    { code: 'YP', nameKo: '에어프레미아', nameEn: 'Air Premia', countryKo: '대한민국' },
    { code: 'ZE', nameKo: '이스타항공', nameEn: 'Eastar Jet', countryKo: '대한민국' },

    // --- 일본 ---
    { code: 'JL', nameKo: '일본항공', nameEn: 'Japan Airlines', countryKo: '일본' },
    { code: 'NH', nameKo: '전일본공수', nameEn: 'All Nippon Airways', countryKo: '일본' },
    { code: 'MM', nameKo: '피치항공', nameEn: 'Peach Aviation', countryKo: '일본' },
    { code: 'GK', nameKo: '제트스타 재팬', nameEn: 'Jetstar Japan', countryKo: '일본' },
    { code: 'BC', nameKo: '스카이마크 항공', nameEn: 'Skymark Airlines', countryKo: '일본' },
    { code: '7G', nameKo: '스타플라이어', nameEn: 'StarFlyer', countryKo: '일본' },

    // --- 중화권 ---
    { code: 'CX', nameKo: '캐세이퍼시픽', nameEn: 'Cathay Pacific', countryKo: '홍콩' },
    { code: 'UO', nameKo: '홍콩 익스프레스', nameEn: 'HK Express', countryKo: '홍콩' },
    { code: 'CI', nameKo: '중화항공', nameEn: 'China Airlines', countryKo: '대만' },
    { code: 'BR', nameKo: '에바항공', nameEn: 'EVA Air', countryKo: '대만' },
    { code: 'JX', nameKo: '스타룩스 항공', nameEn: 'STARLUX Airlines', countryKo: '대만' },
    { code: 'CA', nameKo: '중국국제항공', nameEn: 'Air China', countryKo: '중국' },
    { code: 'MU', nameKo: '중국동방항공', nameEn: 'China Eastern Airlines', countryKo: '중국' },
    { code: 'CZ', nameKo: '중국남방항공', nameEn: 'China Southern Airlines', countryKo: '중국' },

    // --- 동남아시아 ---
    { code: 'SQ', nameKo: '싱가포르항공', nameEn: 'Singapore Airlines', countryKo: '싱가포르' },
    { code: 'TR', nameKo: '스쿠트', nameEn: 'Scoot', countryKo: '싱가포르' },
    { code: 'TG', nameKo: '타이항공', nameEn: 'Thai Airways', countryKo: '태국' },
    { code: 'VN', nameKo: '베트남항공', nameEn: 'Vietnam Airlines', countryKo: '베트남' },
    { code: 'VJ', nameKo: '비엣젯항공', nameEn: 'VietJet Air', countryKo: '베트남' },
    { code: 'MH', nameKo: '말레이시아 항공', nameEn: 'Malaysia Airlines', countryKo: '말레이시아' },
    { code: 'AK', nameKo: '에어아시아', nameEn: 'AirAsia', countryKo: '말레이시아' },

    // --- 미주/유럽/중동 ---
    { code: 'DL', nameKo: '델타항공', nameEn: 'Delta Air Lines', countryKo: '미국' },
    { code: 'UA', nameKo: '유나이티드 항공', nameEn: 'United Airlines', countryKo: '미국' },
    { code: 'AA', nameKo: '아메리칸 항공', nameEn: 'American Airlines', countryKo: '미국' },
    { code: 'AF', nameKo: '에어프랑스', nameEn: 'Air France', countryKo: '프랑스' },
    { code: 'LH', nameKo: '루프트한자', nameEn: 'Lufthansa', countryKo: '독일' },
    { code: 'BA', nameKo: '영국항공', nameEn: 'British Airways', countryKo: '영국' },
    { code: 'KL', nameKo: 'KLM 네덜란드 항공', nameEn: 'KLM Royal Dutch Airlines', countryKo: '네덜란드' },
    { code: 'QR', nameKo: '카타르항공', nameEn: 'Qatar Airways', countryKo: '카타르' },
    { code: 'EK', nameKo: '에미레이트 항공', nameEn: 'Emirates', countryKo: '아랍에미리트' },
    { code: 'EY', nameKo: '에티하드 항공', nameEn: 'Etihad Airways', countryKo: '아랍에미리트' },
    { code: 'TK', nameKo: '터키항공', nameEn: 'Turkish Airlines', countryKo: '튀르키예' },
];

// 하위 호환성을 위해 AIRLINES를 CORE_AIRLINES로 내보냅니다.
export const AIRLINES = CORE_AIRLINES;
