"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geodataEngine = void 0;
/**
 * 전역 지리 정보 엔진 매니저
 */
class GeodataEngine {
    provider = null;
    setProvider(provider) {
        this.provider = provider;
    }
    async initialize() {
        if (!this.provider)
            throw new Error('Geodata provider not set');
        await this.provider.initialize();
    }
    async lookup(lat, lng) {
        if (!this.provider)
            return null;
        return this.provider.lookup(lat, lng);
    }
    async getChildren(parentId, type, includeGeometry) {
        if (!this.provider)
            return [];
        return this.provider.getChildren(parentId, type, includeGeometry);
    }
    async getMetadata(id, includeGeometry) {
        if (!this.provider)
            return null;
        return this.provider.getMetadata(id, includeGeometry);
    }
    async searchRegions(query, options) {
        if (!this.provider)
            return [];
        return this.provider.searchRegions(query, options);
    }
}
exports.geodataEngine = new GeodataEngine();
