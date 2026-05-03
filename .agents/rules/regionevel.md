---
trigger: always_on
---

# Pplaner — Workspace Rules

## 프로젝트 개요
여행 저널 PWA. EXIF 기반 자동 타임라인, H3 헥사 인덱싱 오프라인 지오코딩.
AI API 호출 없이 비용 효율적으로 작동하는 게 핵심 제약.

## 기술 스택
- Framework: Next.js 15 (App Router, Server Components 우선)
- Language: TypeScript strict mode
- Styling: Tailwind CSS v4 + Liquid Glass 디자인 토큰
- Database: Firestore + Firebase Storage
- Auth: Firebase Auth
- Architecture: Feature-Sliced Design (FSD)
- Deploy: Firebase Hosting + Cloud Functions
- PWA: next-pwa, Workbox

## 폴더 구조 (FSD)
- src/app — Next.js App Router 라우트만
- src/pages — FSD pages 레이어 (라우트 아님)
- src/widgets — 페이지 단위 조합 컴포넌트
- src/features — 사용자 시나리오 단위
- src/entities — 비즈니스 엔티티
- src/shared — 공통 UI, lib, api, config

## 절대 금지
- features 간 직접 import 금지. shared 또는 entities 거쳐서.
- AI API (OpenAI, Gemini API 등) 신규 추가 금지. 룰 기반 로직 우선.
- 클라이언트에서 Firebase Admin SDK 사용 금지. Cloud Functions에서만.
- Firestore에 사용자 입력 raw 저장 금지. Zod로 검증 후 저장.

## Firebase 컨벤션
- 컬렉션명은 복수형 (users, journals, places)
- Firestore 보안 규칙은 firestore.rules에서 관리. 코드 변경 시 규칙도 같이 업데이트 검토.
- Cloud Functions는 functions/ 디렉토리. 리전은 asia-northeast3 (서울).
- Storage 경로: users/{uid}/journals/{journalId}/{filename}

## H3 / 지오 관련
- 좌표는 항상 [lng, lat] 순서 (GeoJSON 표준).
- H3 resolution은 9를 기본으로. 변경 시 사유 명시.

## 테스트 / 검증
- 변경 후 `pnpm typecheck`와 `pnpm lint` 실행.
- Firebase 관련 변경은 emulator에서 먼저 검증.