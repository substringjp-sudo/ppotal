import { Trip } from '../types/trip';
import {
    COUNTRY_PROFILES,
    CountryProfile,
    resolveCountryProfile,
} from './data/country-profiles';
import { resolveEntryRequirement, ENTRY_REQUIREMENT_DISCLAIMER } from './data/entry-requirements';

/**
 * 여행 준비물 자동 생성.
 *
 * 거주국 ↔ 여행국의 차이(플러그·전압·통화·운전 방향·국제면허 등)와 여행 신호(항공·운전·해외),
 * 그리고 여행 타입(쇼핑·액티비티)을 종합해 준비해야 할 항목을 뽑아낸다.
 * 순수 함수 — 로그인/네트워크 불필요(온디바이스).
 */

export type PrepCategory =
    | 'documents'
    | 'money'
    | 'connectivity'
    | 'transport'
    | 'power'
    | 'health'
    | 'shopping'
    | 'activity'
    | 'general';

export type PrepPriority = 'essential' | 'recommended' | 'optional';

export interface PrepItem {
    id: string;
    title: string;
    category: PrepCategory;
    priority: PrepPriority;
    reason?: string; // 왜 필요한지(국가 차이 등)
}

export interface GeneratePrepOptions {
    /** 거주국 이름(예: "대한민국"). 없으면 기본 한국 기준. */
    homeCountryName?: string;
}

export function generatePreparationItems(trip: Trip, options?: GeneratePrepOptions): PrepItem[] {
    const items: PrepItem[] = [];
    const add = (item: PrepItem) => {
        if (!items.some(i => i.id === item.id)) items.push(item);
    };

    const home = resolveCountryProfile(options?.homeCountryName) || COUNTRY_PROFILES[0]; // 기본 KR
    const isOverseas = !!trip.isOverseas || !!trip.flights?.some(f => f.isInternational);

    // 여행 대상국 프로필 수집 (지역명 기반)
    const destProfiles: CountryProfile[] = [];
    (trip.locations?.regions || []).forEach(r => {
        const p = resolveCountryProfile(r.name);
        if (p && p.key !== home.key && !destProfiles.some(d => d.key === p.key)) destProfiles.push(p);
    });

    const hasFlights = (trip.flights?.length || 0) > 0 || !!trip.transportSettings?.useFlight;
    const hasDriving = (trip.driving?.length || 0) > 0 || !!trip.transportSettings?.useDriving;

    // 여행 타입 신호 (일정 카테고리 기반)
    let shoppingCount = 0;
    let activityCount = 0;
    (trip.dailyTimeline || []).forEach(day => {
        (day.events || []).forEach(e => {
            const main = e.mainCategory || e.type;
            const sub = e.subCategory;
            if (main === 'shopping' || (sub && ['clothes', 'gift_shopping', 'goods', 'life', 'crafts', 'stationery'].includes(sub))) shoppingCount++;
            if (sub === 'activity' || sub === 'scenic') activityCount++;
        });
    });

    // ── 서류 ──────────────────────────────────────────────
    if (isOverseas) {
        add({ id: 'prep-passport', title: '여권 (유효기간 6개월 이상)', category: 'documents', priority: 'essential', reason: '해외 여행 필수. 잔여 유효기간이 부족하면 입국이 거절될 수 있어요.' });
    }
    destProfiles.forEach(d => {
        // 거주국(여권) 기준 양자 입국 요건 데이터가 있으면 우선 사용 — 목적지 단독 정보보다 정밀하다.
        const bilateral = resolveEntryRequirement(home.key, d.key);
        if (bilateral) {
            const reason = `${bilateral.note} ${ENTRY_REQUIREMENT_DISCLAIMER}`;
            if (bilateral.tier === 'visa-free') {
                add({ id: `prep-entry-${d.key}`, title: '무비자 입국 가능 (체류기간 확인)', category: 'documents', priority: 'optional', reason });
            } else if (bilateral.tier === 'eta-optional') {
                add({ id: `prep-entry-${d.key}`, title: `${bilateral.program} 등록 (선택, 권장)`, category: 'documents', priority: 'recommended', reason });
            } else if (bilateral.tier === 'eta-required') {
                add({ id: `prep-entry-${d.key}`, title: `${bilateral.program} 신청 (필수)`, category: 'documents', priority: 'essential', reason });
            } else if (bilateral.tier === 'visa-required') {
                add({ id: `prep-visa-${d.key}`, title: '비자 발급 신청', category: 'documents', priority: 'essential', reason });
            }
        } else if (d.entryAuth) {
            // 거주국별 정밀 데이터가 아직 없는 경우: 목적지 단독 정보로 안전하게 폴백
            add({ id: `prep-entry-${d.key}`, title: `${d.entryAuth} 신청`, category: 'documents', priority: 'essential', reason: `${d.aliases[0]} 입국에 필요한 전자여행허가예요(여권 발급국에 따라 다를 수 있어요). ${ENTRY_REQUIREMENT_DISCLAIMER}` });
        }
    });
    if (hasFlights) {
        const anyUnbooked = (trip.flights || []).some(f => !f.isBooked);
        add({ id: 'prep-flight-booking', title: '항공권 예매 확정', category: 'documents', priority: anyUnbooked ? 'essential' : 'recommended', reason: '탑승권(모바일/출력)과 예약 번호를 미리 준비하세요.' });
    }

    // ── 돈 ───────────────────────────────────────────────
    const foreignCurrencies = Array.from(
        new Set(destProfiles.map(d => d.currency).filter(c => c && c !== home.currency))
    );
    if (foreignCurrencies.length > 0) {
        add({ id: 'prep-currency', title: `환전 / 트래블카드 (${foreignCurrencies.join(', ')})`, category: 'money', priority: 'essential', reason: `현지 통화가 거주국(${home.currency})과 달라요.` });
    }
    if (isOverseas) {
        add({ id: 'prep-credit-card', title: '해외결제 가능 신용/체크카드', category: 'money', priority: 'recommended', reason: '해외 결제 활성화 여부와 수수료를 미리 확인하세요.' });
    }

    // ── 통신 ─────────────────────────────────────────────
    if (isOverseas) {
        const esim = destProfiles.some(d => d.esimSupported);
        add({ id: 'prep-connectivity', title: esim ? '현지 데이터: eSIM / 유심 / 로밍' : '현지 데이터: 유심 / 로밍 / 포켓와이파이', category: 'connectivity', priority: 'recommended', reason: '지도·번역 앱 사용을 위해 데이터 통신이 필요해요.' + (esim ? ' 이 지역은 eSIM이 편리해요.' : '') });
    }

    // ── 전원(플러그/전압) ────────────────────────────────
    destProfiles.forEach(d => {
        const compatible = home.plugTypes.some(hp => d.plugTypes.includes(hp));
        if (!compatible) {
            add({ id: `prep-adapter-${d.key}`, title: `전원 어댑터 (${d.aliases[0]}: ${d.plugTypes.join('/')}형)`, category: 'power', priority: 'essential', reason: `거주국 플러그(${home.plugTypes.join('/')}형)와 달라 변환 어댑터가 필요해요.` });
        }
        if (Math.abs(d.voltage - home.voltage) >= 80) {
            const higher = d.voltage > home.voltage;
            add({ id: `prep-voltage-${d.key}`, title: `전압 확인 (${d.voltage}V)`, category: 'power', priority: 'recommended', reason: higher ? `거주국(${home.voltage}V)보다 전압이 높아요. 듀얼볼트(100~240V) 기기인지 확인하세요.` : `거주국(${home.voltage}V)보다 전압이 낮아요. 고전력 기기는 성능이 떨어질 수 있어요.` });
        }
    });

    // ── 교통(운전/면허) ──────────────────────────────────
    if (hasDriving) {
        add({ id: 'prep-license', title: '운전면허증', category: 'transport', priority: 'essential' });
        if (isOverseas) {
            destProfiles.forEach(d => {
                if (d.idp === 'required') {
                    add({ id: `prep-idp-${d.key}`, title: '국제운전면허증(IDP) 발급', category: 'transport', priority: 'essential', reason: `${d.aliases[0]}에서 외국인이 운전하려면 국제운전면허증이 필요해요.` });
                } else if (d.idp === 'recommended') {
                    add({ id: `prep-idp-${d.key}`, title: '국제운전면허증(IDP) — 권장', category: 'transport', priority: 'recommended', reason: `${d.aliases[0]}는 자국 면허로 단기 운전이 가능할 수 있으나 IDP를 권장해요.` });
                } else if (d.idp === 'not-accepted') {
                    add({ id: `prep-idp-${d.key}`, title: `현지 임시운전면허 확인 (${d.aliases[0]})`, category: 'transport', priority: 'essential', reason: `${d.aliases[0]}는 국제운전면허를 인정하지 않아, 별도 현지 면허 절차가 필요해요.` });
                }
                if (d.drivingSide !== home.drivingSide) {
                    add({ id: `prep-driving-side-${d.key}`, title: `반대 차선 운전 주의 (${d.drivingSide === 'left' ? '좌측' : '우측'}통행)`, category: 'transport', priority: 'recommended', reason: `거주국과 통행 방향이 반대예요.` });
                }
            });
        }
    }

    // ── 건강 ─────────────────────────────────────────────
    if (isOverseas) {
        add({ id: 'prep-insurance', title: '여행자 보험', category: 'health', priority: 'recommended', reason: '해외 의료비는 매우 비쌀 수 있어요.' });
        if ((trip.dates?.durationDays || 0) >= 5) {
            add({ id: 'prep-medicine', title: '상비약 / 개인 처방약', category: 'health', priority: 'recommended', reason: '현지에서 익숙한 약을 구하기 어려울 수 있어요.' });
        }
    }

    // ── 여행 타입: 쇼핑 ──────────────────────────────────
    // 택스리펀/면세 한도는 해외 여행에만 해당(자국 내 쇼핑에는 적용되지 않음)
    if (shoppingCount >= 2 && isOverseas) {
        add({ id: 'prep-taxrefund', title: '택스리펀(Tax Refund) 준비 — 여권 지참', category: 'shopping', priority: 'recommended', reason: '일정 금액 이상 구매 시 부가세 환급을 받으려면 여권과 서류가 필요해요.' });
        add({ id: 'prep-dutyfree', title: '면세 한도 확인 / 사전 예약 쿠폰·바우처', category: 'shopping', priority: 'optional', reason: '귀국 시 면세 한도를 초과하면 세금이 부과돼요.' });
    }

    // ── 여행 타입: 액티비티/아웃도어 ─────────────────────
    if (activityCount >= 2) {
        add({ id: 'prep-activity-booking', title: '액티비티·입장권 사전 예약 바우처', category: 'activity', priority: 'recommended', reason: '인기 액티비티는 현장 마감되거나 더 비쌀 수 있어요.' });
        add({ id: 'prep-activity-gear', title: '아웃도어 장비(방수·등산화 등) 및 상비약', category: 'activity', priority: 'optional', reason: '등산·캠핑 등 야외 활동에 대비하세요.' });
        add({ id: 'prep-activity-insurance', title: '여행자 보험 액티비티/스포츠 특약 확인', category: 'activity', priority: 'recommended', reason: '익스트림 스포츠는 일반 여행자 보험에서 제외될 수 있어요.' });
    }

    return items;
}
