# GEMINI.md: PPLANER AI 개발 원칙 및 가이드라인

이 문서는 PPLANER 프로젝트에서 AI(Antigravity)가 작업을 수행함에 있어 준수해야 할 핵심 비전, 플랫폼별 역할, 그리고 기술적 작업 규칙을 정의합니다.

## 1. 서비스 비전 (User Vision)

PPLANER는 **"AI와 함께하는 정밀 여행 설계 및 실시간 동행"**을 지향합니다. 사용자가 꿈꾸는 여행을 웹에서 고해상도로 설계하고, 모바일 앱을 통해 현장에서 끊김 없이 가이드받는 통합 경험을 제공합니다.

---

## 2. 플랫폼 역할 정의 (Platform Roles)

### 2.1. Web: 'The Main Editor' (현재 개발 환경의 최우선 순위)
*   **목적**: 복잡한 논리 설계, 대량의 데이터 시각화, 장기적 여행 계획 수립.
*   **핵심 기술**: Next.js 16, Tailwind 4, Framer Motion, 3D Globe (react-globe.gl), Interactive Maps.
*   **특징**: 고밀도 UI, 풍부한 애니메이션, 전문가급 에디팅 툴 제공. 웹 전용 기능(3D Globe 등)을 적극적으로 도입하여 '보는 즐거움'과 '계획의 깊이'를 극대화합니다.

### 2.2. Mobile: 'The Field Agent' (타 장치 개발 환경)
*   **목적**: 실제 여행 중의 실행 지원, 실시간 상황 대응, 현장 기록 보존.
*   **핵심 기술**: React Native (Expo), Liquid Glass UI, Background Persistence.
*   **특징**: 한 손 조작 최적화, 반투명/플루이드 디자인(Glassmorphism), 위치 기반 자동 기록, 오프라인 퍼스트 전략.

---

## 3. AI 작업 규칙 (Work Rules)

### 3.1. 작업 우선순위 및 소통
1.  **웹 우선 (Web-Centric)**: 이 환경에서는 웹 기능 고도화를 최우선으로 합니다. 모바일 코드는 공유 데이터의 정합성을 깨지 않는 범위 내에서만 다룹니다.
2.  **공유 기반 (Shared-First)**: 웹에서 도입하는 새로운 데이터 구조나 비즈니스 로직은 반드시 `packages/shared`를 통해 추상화하여, 다른 장치에서 작업하는 모바일 환경과 최신성을 유지합니다.
3.  **한국어 원칙**: 모든 AI 소통, 계획서(`implementation_plan.md`), 작업 현황(`task.md`), 코드 내 주석은 **한국어**로 작성합니다.

### 3.2. 코드 품질 및 구조
*   **파일 크기 제한**: 컨텍스트 품질 유지를 위해 개별 파일은 **1000줄 이하**로 관리합니다. (초과 시 모듈 분리 제안)
*   **보안 우선**: 모든 데이터 작업 전 Firestore/Storage Security Rules를 먼저 점검하고, 환경 변수(`NEXT_PUBLIC_`, `EXPO_PUBLIC_`) 보안 규칙을 엄격히 준수합니다.
*   **디자인 충실도**: `DESIGN_GUIDE.md`를 준수하며, 플레이스홀더 대신 실제에 가까운 목업과 프리미엄 디자인 토큰을 사용합니다.

### 3.3. 기록 및 아카이브
*   **기술 결정 기록**: 주요 기술적 도전 과제나 구조적 결정 사항은 `docs/ARCHIVE/`에 기록하여 타 장치 개발자와의 정보 비대칭을 최소화합니다.

---

## 4. 참조 문서 (References)

*   `DEVELOPMENT_PLAN.md`: 전체 빌드 로드맵
*   `DESIGN_GUIDE.md`: 통합 디자인 시스템
*   `packages/shared/README.md`: 데이터 인터페이스 규칙
