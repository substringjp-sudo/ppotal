import { LocationInfo, ISODateTimeString } from './common';

export type MainCategory = 'meal' | 'shopping' | 'sightseeing' | 'people' | 'transport' | 'accommodation' | 'reservation' | 'other';

export type SubCategory =
    // Meal
    | 'food' | 'dessert' | 'gift_meal' | 'drink' | 'alcohol' | 'traditional'
    // Shopping
    | 'clothes' | 'gift_shopping' | 'stationery' | 'goods' | 'life' | 'crafts'
    // Sightseeing
    | 'historical' | 'scenic' | 'landmark' | 'amusement' | 'aquarium' | 'museum' | 'concert'
    // People
    | 'friend' | 'acquaintance' | 'celebrity' | 'staff'
    // Transport
    | 'flight' | 'train' | 'bus' | 'taxi' | 'ship' | 'walking' | 'bicycle'
    // Accommodation
    | 'hotel' | 'ryokan' | 'airbnb' | 'hostel' | 'other_stay'
    // Reservation
    | 'restaurant' | 'cafe' | 'activity' | 'ticket'
    | 'other';

/**
 * 위시리스트 아이템의 장소 정보
 * LocationInfo를 확장하면서 기존 필드와 하위 호환성 유지
 */
export interface WishlistPlace {
    name: string;
    address?: string;
    lat?: number;
    lng?: number;
    googleMapsUrl?: string;
    placeId?: string;
    city?: string;
    prefecture?: string;
    country?: string;
    countryId?: string;
    prefectureId?: string;
    cityId?: string;
}

export interface WishlistItem {
    id: string;
    wishlistId?: string;
    tripId?: string;
    title: string;
    description?: string;
    sourceLink?: string;
    imageUrls?: string[];
    price?: number;
    currency?: string;
    mainCategory?: MainCategory;
    subCategory?: SubCategory;
    place?: WishlistPlace;
    createdAt: ISODateTimeString;
    updatedAt: ISODateTimeString;
}

/** 카테고리 설정 (라벨, 색상, 아이콘, 하위 카테고리) */
export interface CategoryConfig {
    label: string;
    color: string;
    icon: string;
    subCategories: { value: SubCategory; label: string }[];
}

export const CATEGORY_MAP: Record<MainCategory, CategoryConfig> = {
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
