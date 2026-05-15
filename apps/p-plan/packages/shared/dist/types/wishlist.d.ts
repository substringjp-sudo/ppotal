import { ISODateTimeString } from './common';
export type MainCategory = 'meal' | 'shopping' | 'sightseeing' | 'people' | 'transport' | 'accommodation' | 'reservation' | 'other';
export type SubCategory = 'food' | 'dessert' | 'gift_meal' | 'drink' | 'alcohol' | 'traditional' | 'clothes' | 'gift_shopping' | 'stationery' | 'goods' | 'life' | 'crafts' | 'historical' | 'scenic' | 'landmark' | 'amusement' | 'aquarium' | 'museum' | 'concert' | 'friend' | 'acquaintance' | 'celebrity' | 'staff' | 'flight' | 'train' | 'bus' | 'taxi' | 'ship' | 'walking' | 'bicycle' | 'hotel' | 'ryokan' | 'airbnb' | 'hostel' | 'other_stay' | 'restaurant' | 'cafe' | 'activity' | 'ticket' | 'other';
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
    subCategories: {
        value: SubCategory;
        label: string;
    }[];
}
export declare const CATEGORY_MAP: Record<MainCategory, CategoryConfig>;
