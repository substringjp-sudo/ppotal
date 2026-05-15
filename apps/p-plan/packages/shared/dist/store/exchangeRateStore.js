"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useExchangeRateStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("../lib/firebase");
const currency_utils_1 = require("../lib/currency-utils");
const common_1 = require("../lib/constants/common");
exports.useExchangeRateStore = (0, zustand_1.create)()((0, middleware_1.persist)((set, get) => ({
    rates: currency_utils_1.DEFAULT_EXCHANGE_RATES,
    lastUpdated: null,
    isLoading: false,
    error: null,
    fetchRates: async () => {
        // 이미 데이터를 가져오는 중이면 중복 실행 방지
        const { isLoading } = get();
        if (isLoading)
            return;
        set({ isLoading: true, error: null });
        try {
            const docRef = (0, firestore_1.doc)(firebase_1.db, 'metadata', 'exchange_rates');
            // 네트워크 지연으로 인한 무한 대기 방지 (3초 타임아웃)
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), common_1.DEFAULT_API_TIMEOUT));
            const docSnap = await Promise.race([
                (0, firestore_1.getDoc)(docRef),
                timeoutPromise
            ]);
            if (docSnap && docSnap.exists()) {
                const data = docSnap.data();
                set({
                    rates: { ...currency_utils_1.DEFAULT_EXCHANGE_RATES, ...data.rates },
                    lastUpdated: data.updatedAt,
                    isLoading: false
                });
            }
            else {
                set({ isLoading: false });
            }
        }
        catch (error) {
            if (error.message === 'TIMEOUT') {
                console.warn('환율 정보 서버 응답 지연: 로컬 캐시 또는 기본값을 사용합니다.');
            }
            else {
                console.error('환율 정보를 불러오는 중 오류 발생:', error);
            }
            set({
                isLoading: false,
                // 에러가 발생해도 기존 rates(캐시된 것)는 유지되므로 별도의 처리는 불필요
            });
        }
    },
    getRate: (code) => {
        const { rates } = get();
        return rates[code] || 1;
    }
}), {
    name: 'pplan-exchange-rates-storage',
    // rates와 lastUpdated만 로컬 스토리에 유지
    partialize: (state) => ({
        rates: state.rates,
        lastUpdated: state.lastUpdated
    }),
}));
