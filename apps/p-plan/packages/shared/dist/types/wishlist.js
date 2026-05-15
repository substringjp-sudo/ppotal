"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CATEGORY_MAP = void 0;
exports.CATEGORY_MAP = {
    meal: {
        label: '식사',
        color: '#f97316', // Orange
        icon: 'restaurant',
        subCategories: [
            { value: 'food', label: '음식' },
            { value: 'dessert', label: '디저트' },
            { value: 'gift_meal', label: '선물' },
            { value: 'drink', label: '음료' },
            { value: 'alcohol', label: '술' },
            { value: 'traditional', label: '전통음식' },
        ],
    },
    shopping: {
        label: '쇼핑',
        color: '#ec4899', // Pink
        icon: 'shopping_bag',
        subCategories: [
            { value: 'clothes', label: '옷' },
            { value: 'gift_shopping', label: '선물' },
            { value: 'stationery', label: '문구' },
            { value: 'goods', label: '굿즈' },
            { value: 'life', label: '생활용품' },
            { value: 'crafts', label: '공예품' },
        ],
    },
    sightseeing: {
        label: '관광',
        color: '#06b6d4', // Cyan
        icon: 'explore',
        subCategories: [
            { value: 'historical', label: '유적지' },
            { value: 'scenic', label: '명승지' },
            { value: 'landmark', label: '랜드마크' },
            { value: 'amusement', label: '놀이공원' },
            { value: 'aquarium', label: '수족관' },
            { value: 'museum', label: '미술관' },
            { value: 'concert', label: '공연장' },
        ],
    },
    people: {
        label: '사람',
        color: '#fbbf24', // Amber
        icon: 'person',
        subCategories: [
            { value: 'friend', label: '친구' },
            { value: 'acquaintance', label: '지인' },
            { value: 'celebrity', label: '연예인' },
            { value: 'staff', label: '관계자' },
        ],
    },
    transport: {
        label: '이동',
        color: '#f59e0b', // Amber
        icon: 'local_shipping',
        subCategories: [
            { value: 'flight', label: '항공' },
            { value: 'train', label: '열차/지하철' },
            { value: 'bus', label: '버스' },
            { value: 'taxi', label: '택시' },
            { value: 'ship', label: '선박' },
            { value: 'walking', label: '도보' },
            { value: 'bicycle', label: '자전거' },
        ],
    },
    accommodation: {
        label: '숙소',
        color: '#10b981', // Emerald
        icon: 'bed',
        subCategories: [
            { value: 'hotel', label: '호텔' },
            { value: 'ryokan', label: '료칸' },
            { value: 'airbnb', label: '에어비앤비' },
            { value: 'hostel', label: '호스텔' },
            { value: 'other_stay', label: '기타 숙소' },
        ],
    },
    reservation: {
        label: '예약',
        color: '#f97316', // Orange
        icon: 'confirmation_number',
        subCategories: [
            { value: 'restaurant', label: '음식점' },
            { value: 'cafe', label: '카페' },
            { value: 'activity', label: '액티비티' },
            { value: 'ticket', label: '티켓/패스' },
            { value: 'other', label: '기타' },
        ],
    },
    other: {
        label: '기타',
        color: '#64748b', // Slate
        icon: 'more_horiz',
        subCategories: [
            { value: 'other', label: '기타' },
        ],
    },
};
