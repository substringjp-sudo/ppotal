# Next.js Travel App Setup & Task Plan

## 목표 (Objective)
사용자가 제공한 피그마 가이드(`guide.html`)를 기반으로 새로운 모바일/데스크톱 반응형 Next.js 예약 및 플래닝 대시보드를 구축합니다. "Travel Wizard" 및 일정 생성의 UI/UX를 위한 기본 환경 구성을 완료하는 것이 목표입니다.

## 진행 목록 (Task List)

- [x] **Next.js 프로젝트 초기화**
  - App Router, TypeScript, Tailwind CSS 기반 프로젝트 생성 (`web/` 디렉터리).
- [x] **패키지 및 폰트 설정**
  - 상태 관리를 위한 `zustand`, 유틸리티 `clsx`, `tailwind-merge`, 날짜 처리 `date-fns` 등 핵심 패키지 설치 완료.
  - 가이드라인에 맞추어 `Public Sans` 구글 폰트 및 `Material Symbols Outlined` 아이콘 적용 (`layout.tsx`).
- [x] **Tailwind v4 테마 설정**
  - `globals.css` 파일에 CSS 변수(`--background-light`, `--primary` 등) 및 Tailwind `@theme` 설정 적용을 통해 다크 모드와 라이트 모드 호환성 유지.
- [x] **Dashboard 컴포넌트 분리 및 상태 관리 연동**
  - `Header`, `TripHeader`, `StatsSection`, `TransportationCard`, `AccommodationTimeline`, `BudgetDeepDive`, `ChecklistWidget`, `PrepTimelineWidget`, `BucketListWidget` 등으로 컴포넌트 분리 완료.
  - `Zustand`를 이용한 `tripStore` 구축 및 모의 데이터(Mock Data) 연동.
  - 체크리스트 토글 기능 등 실시간 상태 업데이트 로직 구현.
- [x] **Wizard (여행준비단계) 상태 관리 및 UI 초기 구현**
  - `wizardStore`를 이용한 6단계 프로세스 관리.
  - `Header`에 'New Trip' 버튼 연동 및 위저드 실행 로직 구현.
  - `WizardModal` 기본 프레임워크 및 애니메이션 전환 구현.

## 다음 단계 (Next Steps)
- **Google Maps 기반 "매직 브러시" 선택 가이드 및 폴리곤 로직 구현**
  - [x] `MasteryGlobe.tsx` 수정: 전체 국가명 데이터 매핑 및 전달 로직 개선
  - [x] `CountryDetailMap.tsx` 수정: D3-zoom을 이용한 줌/팬 기능 구현
  - [x] `CountryDetailMap.tsx` 수정: 좌측 상단 브레드크럼 UI 적용 및 레이아웃 개편
  - [x] 줌/팬 및 네비게이션 동작 확인 (검증)
  - [x] 최종 결과 보고 (Walkthrough 작성)
- **Wizard 각 단계별 입력 폼 UI 고도화**
  - [x] 인원/예산/테마 입력 UI (Participants, Budget, Theme Step) 디자인 시스템 적용.
  - [x] Wizard 최종 결과 `tripStore` 연동 및 대시보드 업데이트.
