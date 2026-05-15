import { WishlistItem } from '../types/wishlist';
import { Trip } from '../types/trip';
export interface WishlistRecommendation {
    item: WishlistItem;
    reason: 'in_region' | 'nearby' | 'none';
    distance?: number;
}
/**
 * 여행 정보와 위시리스트 항목들을 비교하여 추천 순위가 포함된 목록을 반환합니다.
 */
export declare function getRecommendedWishlistItems(wishlist: WishlistItem[], trip: Trip): WishlistRecommendation[];
