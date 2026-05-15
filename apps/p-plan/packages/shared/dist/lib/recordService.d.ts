import { Trip } from '../types/trip';
import { Travelog } from '../types/record';
/**
 * 여행 계획(Trip)을 여행 기록(Travelog)으로 변환합니다.
 * 숙소 체크인/아웃, 항공 대기 시간 등 계획용 물류 정보를 제거하고 핵심 일정만 추출합니다.
 */
export declare const convertTripToTravelog: (trip: Trip, userId: string) => Travelog;
/**
 * ─── 발자취 (TripFootprint) 서비스 ─────────────────────────────────
 * @privacy 분리됨: 원시 발자취 데이터는 민감한 개인 정보이므로 Firestore와 서버로 절대 동기화되지 않습니다.
 * 모바일 앱(React Native / Expo) 측의 로컬 암호화 스토리지(SecureStore/MMKV)에 직접 접근하는 로직으로 대체되어야 합니다.
 * 공유 패키지에서는 이 영역의 CRUD 로직을 의도적으로 방치/삭제합니다.
 */
/**
 * ─── 여행기 (Travelog) 서비스 ────────────────────────────────────
 * 사용자가 발자취를 바탕으로 일부 거점만 포함시켜 직접 발행하기를 선택한 경우에 한해,
 * 서버와 동기화되고 웹으로 노출됩니다.
 */
/**
 * 새로운 여행기 저장 또는 업데이트
 */
export declare const saveTravelog: (travelog: Travelog) => Promise<void>;
/**
 *特定の 사용자의 모든 여행기 조회
 */
export declare const getUserTravelogs: (userId: string, isPublicOnly?: boolean) => Promise<Travelog[]>;
/**
 * 특정 여행기 상세 조회
 */
export declare const getTravelog: (travelogId: string) => Promise<Travelog | null>;
/**
 * 여행기 삭제
 */
export declare const deleteTravelog: (travelogId: string, authorId: string) => Promise<void>;
/**
 * 사용자의 여행기 목록을 실시간으로 구독합니다.
 */
export declare const subscribeToUserTravelogs: (userId: string, onUpdate: (travelogs: Travelog[]) => void) => import("@firebase/firestore").Unsubscribe;
export declare const calculateTravelogRepresentativeRegion: (travelog: Travelog) => Promise<{
    frequency: number;
    country?: string;
    prefecture?: string;
    city?: string;
    countryId?: string;
    prefectureId?: string;
    cityId?: string;
    countryName?: string;
    prefectureName?: string;
    cityName?: string;
} | null>;
