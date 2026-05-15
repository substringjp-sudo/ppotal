# PPLANER 종합 분석 보고서 및 개발 로드맵

> 프로젝트의 전반적인 구조, 기능, UX/UI를 총체적으로 분석한 결과입니다.

---

## 📊 프로젝트 현황 요약

| 항목 | 수치 |
|---|---|
| 컴포넌트 ([.tsx](file:///Users/yunhyeongseob/dev/p-plan/web/src/app/page.tsx)) | **74개** |
| 서비스/유틸 (`lib/`) | **20개 + validators 폴더** |
| 스토어 (`store/`) | **12개** (tripStore, wizardStore, userStore 등) |
| 훅 (`hooks/`) | **4개** |
| 타입 정의 (`types/`) | **5개** |
| Firestore 컬렉션 | **10+개** (trips, users, friendships 등) |
| 서브 컬렉션 | **9개** (flights, accommodation, dailyPlans 등) |
| 페이지 라우트 | **7개** (Home, EditTrip, Dashboard, Trips, Friends, Wishlist, Profile) |

---

## 🏗️ 아키텍처 평가

### ✅ 잘 구축된 부분

1. **데이터 분산 저장 구조**: [tripService.ts](file:///Users/yunhyeongseob/dev/p-plan/web/src/lib/tripService.ts)에서 Firestore 서브컬렉션 분산 저장 + On-Demand Lazy Loading은 확장성 측면에서 매우 우수합니다.
2. **검증 엔진**: [trip-validator.ts](file:///Users/yunhyeongseob/dev/p-plan/web/src/lib/trip-validator.ts)가 30개 이상의 세분화된 validator를 라우팅하는 마스터 엔진으로 잘 설계되어 있습니다.
3. **스토어 슬라이스 분리**: `tripStore`가 6개 슬라이스로 분리되어 유지보수성이 좋습니다.
4. **보안 규칙**: [firestore.rules](file:///Users/yunhyeongseob/dev/p-plan/web/firestore.rules)에서 멤버 기반 접근 제어, 서브컬렉션별 권한 분리가 잘 구현되어 있습니다.
5. **React Query 통합**: `useTripQuery` 훅으로 데이터 페칭과 캐싱이 체계적으로 관리됩니다.

### ⚠️ 개선이 필요한 부분

1. **거대 컴포넌트**: [HomePageClient.tsx](file:///Users/yunhyeongseob/dev/p-plan/web/src/app/HomePageClient.tsx) (687줄), [EditPageClient.tsx](file:///Users/yunhyeongseob/dev/p-plan/web/src/app/edit-trip/%5Bid%5D/EditPageClient.tsx) (696줄)이 단일 파일에 너무 많은 로직을 포함합니다.
2. **사용되지 않는 코드**: `mockTrip`(constants.ts)이 deprecated 표시만 되어 있고 삭제되지 않았습니다.
3. **미사용 Progressive 컴포넌트**: `ProgressiveFlightEditor`, `ProgressiveDrivingEditor`, `ProgressivePublicTransportEditor`가 아무 곳에서도 import되지 않습니다.

---

## 🔧 즉시 수정해야 할 항목

### 1. 코드 정리 (Dead Code Removal)

| 파일 | 문제 | 조치 |
|---|---|---|
| [store/constants.ts](file:///Users/yunhyeongseob/dev/p-plan/web/src/store/constants.ts) | `mockTrip` deprecated이지만 미삭제 | 삭제 |
| [ProgressiveFlightEditor.tsx](file:///Users/yunhyeongseob/dev/p-plan/web/src/components/edit-trip/ProgressiveFlightEditor.tsx) | 아무 곳에서도 import 안 됨 | 삭제 또는 통합 |
| [ProgressiveDrivingEditor.tsx](file:///Users/yunhyeongseob/dev/p-plan/web/src/components/edit-trip/ProgressiveDrivingEditor.tsx) | 아무 곳에서도 import 안 됨 | 삭제 또는 통합 |
| [ProgressivePublicTransportEditor.tsx](file:///Users/yunhyeongseob/dev/p-plan/web/src/components/edit-trip/ProgressivePublicTransportEditor.tsx) | 아무 곳에서도 import 안 됨 | 삭제 또는 통합 |
| [web/split-store-refine.js](file:///Users/yunhyeongseob/dev/p-plan/web/split-store-refine.js) | 일회성 리팩토링 스크립트 | 삭제 |

### 2. 대형 컴포넌트 분할

- **[HomePageClient.tsx](file:///Users/yunhyeongseob/dev/p-plan/web/src/app/HomePageClient.tsx) (687줄)**: 랜딩 히어로, 트립 목록, 최근 활동, D-Day 등 4개 이상의 독립 컴포넌트로 분할 권장
- **[EditPageClient.tsx](file:///Users/yunhyeongseob/dev/p-plan/web/src/app/edit-trip/%5Bid%5D/EditPageClient.tsx) (696줄)**: 사이드바 네비게이션, 자동 저장 로직, 컨텐츠 영역을 분리

---

## 📱 UX/UI 개선 제안

### 1. 전체 UX 흐름 개선

#### 온보딩 개선
- 현재 위저드가 4단계(DATES → LOCATION → PREFERENCES → REVIEW)로 빠르지만, 결과 프리뷰가 부족합니다.
- **제안**: REVIEW 단계에서 AI가 생성한 추천 일정을 카드 형태로 미리보기 제공

#### 대시보드 강화
- [IntegratedOverview.tsx](file:///Users/yunhyeongseob/dev/p-plan/web/src/components/dashboard/IntegratedOverview.tsx)의 Readiness 진행률이 단순한 4가지 기준(지역/숙소/교통/예산)으로 산출됩니다.
- **제안**: 더 세분화된 성숙도 점수 (날짜 확정, 항공 예약, 숙소 예약, 관광지 선정, 예산 배분, 준비물 확인 등) 도입

#### 네비게이션 개선
- 현재 EditTrip 페이지의 10개 섹션 사이드바가 수직 리스트 형태입니다.
- **제안**: 상태 인디케이터(완료/진행 중/미시작) 아이콘을 섹션별로 추가하여 한눈에 완성도를 파악

### 2. 컴포넌트별 UX 개선

#### 🗺️ 지도 (MapComponent)
- **현재**: 마커와 클러스터링 기본 기능 구현 완료
- **제안**:
  - 경로 시각화 (출발지→목적지 사이 Polyline + 이동수단 아이콘)
  - 숙소를 중심으로 반경 표시 (도보/대중교통 도달 범위)
  - 일자별 색상 구분 마커 (Day 1: 파랑, Day 2: 초록 등)

#### ✈️ 교통 편집기 (TransportAndTicketsEditor)
- **현재**: FlightGrid / DrivingList / PublicTransportList 탭 분리
- **제안**:
  - 비행+대중교통+운전을 타임라인 한 줄에 연결하는 "여정 체인" 뷰
  - 가격 비교 카드: 같은 구간의 교통수단별 비용/시간 비교

#### 🏨 숙소 편집기 (AccommodationEditor)
- **현재**: `ProgressiveAccommodationEditor`로 단계적 입력 구현됨
- **제안**:
  - 가격 히트맵: 날짜별 숙박비 변화를 색상으로 표시
  - 숙소 간 거리/이동시간 자동 계산

#### 📅 타임라인 (TimelineEditor)
- **현재**: 날짜별 일정 카드 + 이벤트 편집 모달
- **제안**:
  - 드래그 앤 드롭으로 일정 순서 변경
  - 시간대별 간트 차트 뷰 (8AM~11PM 시간축)
  - 빈 시간대 자동 감지 + AI 추천 ("여기 2시간 여유가 있어요, 근처 카페 어떠세요?")

#### 💰 예산 편집기 (BudgetEditor)
- **현재**: 카테고리별 지출 추적, 환율 자동 적용 구현됨
- **제안**:
  - 파이 차트 / 바 차트로 카테고리별 지출 비율 시각화
  - "예산 초과 경고" 실시간 알림 (현재 validator에서만 체크)
  - 여행 후 정산 기능 (참여자별 결제/이체 내역)

### 3. 디자인 시스템 개선

- **현재**: Tailwind 유틸리티 클래스를 직접 사용하여 스타일링
- **제안**:
  - 공통 디자인 토큰 파일 생성 (`design-tokens.ts`): 색상, 간격, 그림자, 둥글기 등
  - 재사용 가능한 UI 기반 컴포넌트: [Card](file:///Users/yunhyeongseob/dev/p-plan/web/src/app/profile/ProfilePageClient.tsx#340-379), `Badge`, `Tag`, `StatusIndicator`
  - 다크 모드 토글을 더 눈에 띄게 (현재 Header에만 존재)

---

## 🚀 기능 확장 제안

### Phase A: 협업 기능 강화 (단기)

| 기능 | 설명 | 우선순위 |
|---|---|---|
| **실시간 공동 편집** | Firestore Realtime Listener 기반 동시 편집 + 충돌 해결 | 🔴 높음 |
| **채팅/코멘트** | 일정 항목별 코멘트 스레드, 의사결정 투표 | 🟡 중간 |
| **여행 초대 UX 개선** | 현재 `inviteToken` 기반, 딥링크 + 카카오톡 공유 연동 | 🟡 중간 |
| **멤버별 역할/권한** | 편집자/뷰어/관리자 역할 분리 | 🟢 낮음 |

### Phase B: 데이터 & AI 강화 (중기)

| 기능 | 설명 | 우선순위 |
|---|---|---|
| **AI 일정 자동 생성** | 목적지/날짜/관심사 기반 AI 추천 일정 생성 (Google AI) | 🔴 높음 |
| **날씨/이벤트 API** | 여행 기간의 날씨 예보와 현지 이벤트 자동 연동 | 🟡 중간 |
| **항공권 가격 알림** | 원하는 구간의 가격 변동 모니터링 및 알림 | 🟡 중간 |
| **사진/사진첩** | 여행 후 사진 업로드 + 자동 일정 매칭(EXIF 기반) | 🟢 낮음 |

### Phase C: 플랫폼 확장 (장기)

| 기능 | 설명 | 우선순위 |
|---|---|---|
| **Flutter 모바일 앱** | 오프라인 지원 + 백그라운드 위치 기록 | 🔴 높음 |
| **여행기(Travelog) 공유** | Firestore에 `travelogs` 컬렉션 이미 정의됨, 커뮤니티 기능 | 🟡 중간 |
| **PDF 내보내기** | 여행 일정을 깔끔한 PDF로 변환하여 공유/인쇄 | 🟡 중간 |
| **오프라인 모드** | ServiceWorker + IndexedDB 기반 오프라인 접근 | 🟢 낮음 |

---

## 🔀 코드 품질 및 리팩토링 제안

### 1. 테스트 인프라 구축
- **현재**: 테스트 코드가 전혀 없습니다.
- **제안**: 
  - `trip-validator` 및 각 validator 함수에 대한 유닛 테스트 우선 작성
  - [tripService.ts](file:///Users/yunhyeongseob/dev/p-plan/web/src/lib/tripService.ts)의 저장/로드 로직에 대한 통합 테스트
  - Playwright/Cypress로 핵심 사용자 흐름 E2E 테스트

### 2. 에러 핸들링 일관성
- **현재**: 대부분 `console.error` + `try-catch`이지만 사용자에게 피드백이 부족합니다.
- **제안**: 
  - 전역 에러 바운더리 + Toast 알림 시스템 도입
  - [ErrorBoundary.tsx](file:///Users/yunhyeongseob/dev/p-plan/web/src/components/common/ErrorBoundary.tsx)가 이미 존재하나, 활용도 확인 필요

### 3. 성능 최적화
- **현재 이슈**:
  - `HomePageClient`에서 [getTrip](file:///Users/yunhyeongseob/dev/p-plan/web/src/lib/tripService.ts#179-222)을 사용해 다음 여행의 상세 정보를 가져오는데, 이는 불필요한 데이터 로딩일 수 있습니다.
  - [FriendsPage](file:///Users/yunhyeongseob/dev/p-plan/web/src/app/friends/page.tsx#22-306)에서 친구 프로필을 순차적으로 `Promise.all`로 가져오지만, 동적 import(`await import(...)`)를 사용하고 있어 비효율적입니다.
- **제안**:
  - 다음 여행 미리보기에는 [TripSummary](file:///Users/yunhyeongseob/dev/p-plan/web/src/types/trip.ts#540-558) 데이터만 사용
  - [FriendsPage](file:///Users/yunhyeongseob/dev/p-plan/web/src/app/friends/page.tsx#22-306)의 동적 import 제거, 최상단 static import로 변경
  - `React.memo` / `useMemo` 활용 확대

### 4. 타입 안전성 강화
- **현재**: `any` 타입 사용이 일부 존재 (예: `removeUndefined`, `members` 매핑)
- **제안**: `strict: true` TypeScript 설정 + `any` 사용 제거

---

## 📋 추천 작업 순서 (우선순위별)

### 🔴 즉시 (1~2주)
1. 미사용 코드 삭제 (`mockTrip`, unused `Progressive*Editor` 등)
2. [HomePageClient.tsx](file:///Users/yunhyeongseob/dev/p-plan/web/src/app/HomePageClient.tsx) 분할 리팩토링
3. [FriendsPage](file:///Users/yunhyeongseob/dev/p-plan/web/src/app/friends/page.tsx#22-306) 동적 import 수정
4. Toast 기반 에러 피드백 시스템 구축

### 🟡 단기 (1~2개월)
5. 타임라인 드래그 앤 드롭 구현
6. 예산 시각화 차트 (파이/바 차트) 추가
7. 대시보드 성숙도 점수 고도화
8. 지도 경로 시각화 (Polyline)
9. [EditPageClient.tsx](file:///Users/yunhyeongseob/dev/p-plan/web/src/app/edit-trip/%5Bid%5D/EditPageClient.tsx) 분할 리팩토링

### 🟢 중기 (3~6개월)
10. AI 일정 자동 생성 (Gemini API)
11. 실시간 공동 편집 기능
12. 유닛/통합 테스트 인프라 구축
13. 디자인 토큰 시스템 구축
14. PDF 내보내기

### 🔵 장기 (6개월+)
15. Flutter 모바일 앱 개발
16. 여행기(Travelog) 커뮤니티
17. 오프라인 모드

---

> [!NOTE]
> 현재 프로젝트는 **Phase 1~2 사이**에 위치하며, 핵심 데이터 구조와 편집 기능이 잘 갖추어져 있습니다. 가장 큰 개선 효과를 낼 수 있는 영역은 **UX 폴리싱**(타임라인 DnD, 예산 시각화)과 **AI 연동**(일정 자동 추천)입니다.
