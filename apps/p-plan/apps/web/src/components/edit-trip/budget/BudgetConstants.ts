export const CURRENCY_OPTIONS = [
    { value: 'KRW', label: '대한민국 원 (KRW) ₩', icon: 'payments' },
    { value: 'USD', label: '미국 달러 (USD) $', icon: 'attach_money' },
    { value: 'JPY', label: '일본 엔 (JPY) ¥', icon: 'currency_yen' },
    { value: 'EUR', label: '유럽 유로 (EUR) €', icon: 'euro' },
    { value: 'GBP', label: '영국 파운드 (GBP) £', icon: 'currency_pound' },
    { value: 'CNY', label: '중국 위안 (CNY) ¥', icon: 'currency_exchange' },
    { value: 'VND', label: '베트남 동 (VND) ₫', icon: 'payments' },
    { value: 'THB', label: '태국 바트 (THB) ฿', icon: 'payments' },
    { value: 'TWD', label: '대만 달러 (TWD) NT$', icon: 'payments' },
    { value: 'HKD', label: '홍콩 달러 (HKD) HK$', icon: 'payments' },
    { value: 'SGD', label: '싱가포르 달러 (SGD) S$', icon: 'payments' },
    { value: 'AUD', label: '호주 달러 (AUD) A$', icon: 'payments' },
    { value: 'CAD', label: '캐나다 달러 (CAD) C$', icon: 'payments' },
    { value: 'CHF', label: '스위스 프랑 (CHF) CHF', icon: 'payments' },
];

export const CATEGORY_OPTIONS = [
    { value: 'food', label: '식비', icon: 'restaurant' },
    { value: 'transport', label: '교통', icon: 'directions_bus' },
    { value: 'accommodation', label: '숙소', icon: 'hotel' },
    { value: 'shopping', label: '쇼핑', icon: 'shopping_bag' },
    { value: 'activity', label: '활동', icon: 'explore' },
    { value: 'other', label: '기타', icon: 'more_horiz' },
];

export const PAYMENT_METHOD_OPTIONS = [
    { value: 'cash', label: '현금', icon: 'payments' },
    { value: 'credit_card', label: '신용카드', icon: 'credit_card' },
    { value: 'prepaid_card', label: '충전형 카드', icon: 'account_balance_wallet' },
];

export const PAYMENT_STATUS_OPTIONS = [
    { value: 'paid', label: '결제 완료', icon: 'check_circle' },
    { value: 'pre_paid', label: '미리 결제', icon: 'fact_check' },
    { value: 'pending', label: '결제 예정', icon: 'schedule' },
];
