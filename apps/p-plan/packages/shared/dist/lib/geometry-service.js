"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCachedGeometries = exports.loadTripGeometries = exports.loadRegionGeometry = void 0;
/**
 * 지역별 기하학(GeoJSON) 데이터 관리를 위한 서비스
 * (현재 썸네일 실루엣 기능 제거로 인해 비활성화됨)
 */
const geometryCache = {};
/**
 * @deprecated 썸네일 실루엣 기능 제거로 사용되지 않음
 */
const loadRegionGeometry = async (_region) => {
    return null;
};
exports.loadRegionGeometry = loadRegionGeometry;
/**
 * @deprecated 썸네일 실루엣 기능 제거로 사용되지 않음
 */
const loadTripGeometries = async (_regions) => {
    return {};
};
exports.loadTripGeometries = loadTripGeometries;
const getCachedGeometries = () => geometryCache;
exports.getCachedGeometries = getCachedGeometries;
