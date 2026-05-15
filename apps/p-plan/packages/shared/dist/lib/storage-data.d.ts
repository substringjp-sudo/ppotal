/**
 * Firebase Storage URL builder for static data files.
 *
 * 데이터 파일 경로를 Firebase Storage 공개 URL로 변환합니다.
 * NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET이 설정되지 않은 경우 (빌드 중 등)
 * 로컬 /data/* 경로로 폴백합니다.
 */
/**
 * dataPath 예시: 'region/tree.json', 'region/geoms/country/42.json'
 */
export declare const getStorageDataUrl: (dataPath: string) => string;
