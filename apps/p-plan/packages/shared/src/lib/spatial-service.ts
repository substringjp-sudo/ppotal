import { geodataEngine } from './geodata-engine';

/**
 * [Main Entry] 특정 좌표의 행정구역 계층 정보를 분석합니다.
 * 통합 Geodata Engine을 사용하여 환경(Web/Mobile)에 맞는 프로바이더(Firestore/SQLite)로 자동 전환됩니다.
 */
export const getHierarchyByCoordinates = async (lat: number, lng: number) => {
    try {
        const result = await geodataEngine.lookup(lat, lng);
        if (!result) return null;
        
        return {
            countryId: result.countryId,
            countryName: result.countryName,
            regionId: result.prefectureId, // 내부적으로 prefecture를 region 레벨로 사용
            regionName: result.prefectureName
        };
    } catch (error) {
        console.error('PPLANER: Failed to lookup coordinates in Geodata Engine', error);
        return null;
    }
};

// 하위 호환성을 위해 유지되는 레거시 함수들 (점진적 제거 대상)
export const loadCountryBounds = async () => ({ "93": [[124.0, 33.0], [132.0, 39.0]] });
export const findCandidateCountryIds = async () => [];
