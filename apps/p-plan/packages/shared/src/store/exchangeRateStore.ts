import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DEFAULT_EXCHANGE_RATES } from '../lib/currency-utils';
import { DEFAULT_API_TIMEOUT } from '../lib/constants/common';

interface ExchangeRateState {
    rates: Record<string, number>;
    lastUpdated: string | null;
    isLoading: boolean;
    error: string | null;
    
    fetchRates: () => Promise<void>;
    getRate: (code: string) => number;
}

export const useExchangeRateStore = create<ExchangeRateState>()(
    persist(
        (set, get) => ({
            rates: DEFAULT_EXCHANGE_RATES,
            lastUpdated: null,
            isLoading: false,
            error: null,

            fetchRates: async () => {
                // 이미 데이터를 가져오는 중이면 중복 실행 방지
                const { isLoading } = get();
                if (isLoading) return;

                set({ isLoading: true, error: null });
                
                try {
                    const docRef = doc(db, 'metadata', 'exchange_rates');
                    
                    // 네트워크 지연으로 인한 무한 대기 방지 (3초 타임아웃)
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('TIMEOUT')), DEFAULT_API_TIMEOUT)
                    );

                    const docSnap = await Promise.race([
                        getDoc(docRef),
                        timeoutPromise
                    ]) as any;

                    if (docSnap && docSnap.exists()) {
                        const data = docSnap.data();
                        set({ 
                            rates: { ...DEFAULT_EXCHANGE_RATES, ...data.rates }, 
                            lastUpdated: data.updatedAt,
                            isLoading: false 
                        });
                    } else {
                        set({ isLoading: false });
                    }
                } catch (error: any) {
                    if (error.message === 'TIMEOUT') {
                        console.warn('환율 정보 서버 응답 지연: 로컬 캐시 또는 기본값을 사용합니다.');
                    } else {
                        console.error('환율 정보를 불러오는 중 오류 발생:', error);
                    }
                    
                    set({ 
                        isLoading: false,
                        // 에러가 발생해도 기존 rates(캐시된 것)는 유지되므로 별도의 처리는 불필요
                    });
                }
            },

            getRate: (code: string) => {
                const { rates } = get();
                return rates[code] || 1;
            }
        }),
        {
            name: 'pplan-exchange-rates-storage',
            // rates와 lastUpdated만 로컬 스토리에 유지
            partialize: (state) => ({ 
                rates: state.rates, 
                lastUpdated: state.lastUpdated 
            }),
        }
    )
);
