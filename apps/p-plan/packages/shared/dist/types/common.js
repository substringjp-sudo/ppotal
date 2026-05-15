"use strict";
/**
 * 공통 타입 정의 (Common Types)
 *
 * 프로젝트 전반에서 재사용되는 기본 타입들을 정의합니다.
 * trip.ts, wishlist.ts 등 도메인 타입에서 이 파일을 import 합니다.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
// ─── ID 생성 유틸리티 ───────────────────────────────────────────
/** 9자리 영숫자 랜덤 ID 생성 (클라이언트 측 임시 ID) */
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}
