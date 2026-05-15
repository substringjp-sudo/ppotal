"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aviationEngine = void 0;
/**
 * 전역 항공 데이터 엔진 매니저
 */
class AviationEngine {
    provider = null;
    initialized = false;
    setProvider(provider) {
        this.provider = provider;
        this.initialized = false;
    }
    async ensureInitialized() {
        if (!this.provider)
            return;
        if (!this.initialized) {
            await this.provider.initialize();
            this.initialized = true;
        }
    }
    async getAirport(code) {
        if (!this.provider)
            return null;
        await this.ensureInitialized();
        return this.provider.getAirport(code);
    }
    async getAirline(code) {
        if (!this.provider)
            return null;
        await this.ensureInitialized();
        return this.provider.getAirline(code);
    }
    async searchAirports(query, options) {
        if (!this.provider)
            return [];
        await this.ensureInitialized();
        return this.provider.searchAirports(query, options);
    }
    async getRecommendedAirports(options) {
        if (!this.provider)
            return [];
        await this.ensureInitialized();
        return this.provider.getRecommendedAirports(options);
    }
    async searchAirlines(query) {
        if (!this.provider)
            return [];
        await this.ensureInitialized();
        return this.provider.searchAirlines(query);
    }
}
exports.aviationEngine = new AviationEngine();
