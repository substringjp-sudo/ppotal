/**
 * [Main Entry] 특정 좌표의 행정구역 계층 정보를 분석합니다.
 * 통합 Geodata Engine을 사용하여 환경(Web/Mobile)에 맞는 프로바이더(Firestore/SQLite)로 자동 전환됩니다.
 */
export declare const getHierarchyByCoordinates: (lat: number, lng: number) => Promise<{
    countryId: string | undefined;
    countryName: string | undefined;
    regionId: string | undefined;
    regionName: string | undefined;
} | null>;
export declare const loadCountryBounds: () => Promise<{
    "93": number[][];
}>;
export declare const findCandidateCountryIds: () => Promise<never[]>;
