"use strict";
/**
 * Firebase Storage URL builder for static data files.
 *
 * 데이터 파일 경로를 Firebase Storage 공개 URL로 변환합니다.
 * NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET이 설정되지 않은 경우 (빌드 중 등)
 * 로컬 /data/* 경로로 폴백합니다.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStorageDataUrl = void 0;
const DATA_STORAGE_PREFIX = 'data';
/**
 * dataPath 예시: 'region/tree.json', 'region/geoms/country/42.json'
 */
const getStorageDataUrl = (dataPath) => {
    // Shared package can access process.env if available in the environment
    const bucket = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET : undefined;
    const isProd = typeof process !== 'undefined' ? process.env.NODE_ENV === 'production' : false;
    // 개발 환경 또는 Storage 버킷이 설정되지 않은 경우 로컬 데이터 경로 반환
    if (!bucket || !isProd) {
        return `/data/${dataPath}`;
    }
    const storagePath = `${DATA_STORAGE_PREFIX}/${dataPath}`;
    const encoded = storagePath.split('/').map(encodeURIComponent).join('%2F');
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?alt=media`;
};
exports.getStorageDataUrl = getStorageDataUrl;
