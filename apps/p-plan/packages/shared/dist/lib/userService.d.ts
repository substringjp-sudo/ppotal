import { UserProfile } from '../types/user';
/**
 * 이메일로 사용자 검색 (일치하는 첫 번째 사용자 반환)
 */
export declare const searchUserByEmail: (email: string) => Promise<UserProfile | null>;
/**
 * 이름/닉네임으로 사용자 검색 (최대 10명)
 */
export declare const searchUsersByName: (name: string) => Promise<UserProfile[]>;
/**
 * UID로 사용자 프로필 조회
 */
export declare const getUserProfile: (userId: string) => Promise<UserProfile | null>;
/**
 * 사용자 프로필 정보 업데이트 ( Upsert 방식 )
 */
export declare const updateUserProfile: (userId: string, data: Partial<UserProfile>) => Promise<void>;
