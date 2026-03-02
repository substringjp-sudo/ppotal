# Design Renewal (Stitch Concept)

## 완료된 작업 (Completed Tasks)
- [x] Stitch 프로젝트에서 스크린샷 및 소스 코드 추출 완료
- [x] `implementation_plan.md` 수립 완료
- [x] **1. 스타일 및 기초 설정 완료**
- [x] **2. 헤더 리뉴얼 완료**
- [x] **3. 좌측 사이드바 리뉴얼 완료**
- [x] **4. 중앙 맵 영역 리뉴얼 완료**
- [x] **5. 우측 사이드바 리뉴얼 완료**
- [x] **6. 최종 폴리싱 (Glassmorphism, 반응형) 완료**

<hr>

# Mobile Map UX Refactor (이전 작업 기록)

## 완료된 작업 (Completed Tasks)
- [x] `MapPane.tsx`: 모바일 환경 감지(`isMobile`) 및 호버 이벤트 비활성화
- [x] `Stations.tsx`: 모바일에서 툴팁 비활성화 및 클릭 이벤트 개선 (노선 정보 전달)
- [x] `RailroadLayer.tsx`: 모바일에서 불필요한 인터랙션 방지
- [x] `page.tsx`: 모바일 레이아웃 구현
- [x] `useIsMobile` 훅 추가 (또는 로직 구현)
- [x] `MobileBottomSheet` 통합 (요약 정보 및 노선 목록 표시)
- [x] 헤더 아래 영역에 `MobileStationPreview` 및 `MobileLinePreview` 표시 로직 추가
- [x] 데스크탑 사이드바를 모바일 바텀 시트로 이동
- [x] 상세 정보(노선/역) 선택 상태 관리 (`selectedStation` 등)
- [x] 모바일 인터랙션 개선 (Feedback 반영)
- [x] 상단 디테일 패널을 지도 위 오버레이(Overlay)로 변경하여 지도 영역 침범 방지
- [x] 역 선택 시 시각적 강조(테두리 표시) 추가 (`selectedStation` prop 활용)
- [x] 모바일 환경에서 역 표시 점 크기 확대 (클릭 편의성 증대)
- [x] 모바일 환경에서 줌 슬라이더 및 리셋 버튼 숨김 (`MapControls` 조건부 렌더링)
- [x] `Stations.tsx`: 줌 레벨에 따른 역명 표시 최적화 (10 미만: 숨김, 10-13: 환승역만, 14+: 전체)
- [x] **A11Y (Accessibility) & Landmark Integration**
- [x] `<main>` landmark implementation in `MainPageClient.tsx`
- [x] "Skip to Content" link for keyboard users
- [x] Keyboard accessibility (Enter/Space) and ARIA roles for `SidebarGroup.tsx`
- [x] ARIA Dialog patterns and `Escape` key close listener for `HowToModal.tsx` and `FeedbackModal.tsx`
- [x] Managed initial focus for modals
- [x] Lighthouse accessibility audit resolution

<hr>

# Map Data Loading & Integrity Fix
## 완료된 작업 (Completed Tasks)
- [x] `adm2_low.geojson` 파일 무결성 확인 및 전체 일본 지역 포함 여부 검증
- [x] `MapPane.tsx`: 줌 레벨에 따른 LOD(Level of Detail) 전환 시 렌더링 신뢰성을 위해 고유 Key 적용
- [x] `JapanMap.tsx`: 도부현(Prefecture) 클릭 인터랙션 지원 (`onPrefectureClick`)
- [x] `MainPageClient.tsx`: 도부현 클릭 핸들러 추가 및 이벤트 추적 연동
- [x] `MainPageClient.tsx`: 중복된 `handleLineClick` 함수 제거 및 코드 정리

<hr>

# Multi-language Localization (진행 중)
## 완료된 작업 (Completed Tasks)
- [x] `MainPageClient.tsx`: 헤더 버튼(도움말, 피드백, 내보내기, 로그인) 다국어화
- [x] `MapControls.tsx`: 지도 컨트롤(재설정, 역 이름, 줌) 다국어화
- [x] `MapStylePanel.tsx`: 지도 스타일 설정 레이블 다국어화
- [x] `HowToModal.tsx`: 도움말 내용 다국어화 (KO, EN, JA)
- [x] `FeedbackModal.tsx`: 피드백 폼 다국어화
- [x] `AuthModal.tsx`: 인증 폼 다국어화
- [x] `SEOContent.tsx`: 정적 콘텐츠 다국어화
- [x] `Sidebar.tsx`, `LineDetailPane.tsx`, `StationDetailPane.tsx`: UI 요소 다국어화 (KO, EN, JA)
- [x] **번역 데이터 중앙 집중화**: 모든 컴포넌트의 `TRANSLATIONS`을 `src/lib/translations.ts`로 통합
- [x] **번역 데이터 최적화**: `MAIN_PAGE_TRANSLATIONS`와 `SEO_TRANSLATIONS` 통합 및 중복 제거

- [x] 다국어 지원 QA 및 안정화 (언어 전환 시 모든 UI가 올바르게 업데이트되는지 확인)
- [x] **지도 렌더링 동기화**: 줌(Zoom) 전환 시 플랫폼 및 역 표시 타이밍 동기화 (잔상 제거 및 개별 Canvas Renderer 적용)

- [x] **7. 역 상세 정보 UI 고도화**: 다이어그램 및 레이아웃을 더 세련되고 컴팩트하게 개선
- [x] **8. 하이드레이션 및 버그 수정**: 서버/클라이언트 불일치 문제 해결 및 타입 안정성 강화
- [ ] `node_modules` 권한 문제 해결 (빌드 및 배포를 위해 필요 - 현재 환경 제약)

<hr>

# Railroad Network Migration
## 완료된 작업 (Completed Tasks)
- [x] `src/types/railData.ts` 인터페이스 및 타입 선언 업데이트 (`NetworkStationGraph`, `NetworkLineData` 등 추가)
- [x] `useRailData.ts` 데이터 로딩 방식 수정 (`station_graph.json` 제거, `railroad_network.json` 추가) 및 동적 hierarchy 구축 로직(`buildHierarchyFromLineData`) 구현
- [x] `RoutingGraph.ts` 내부 `loadGranularData` 그래프 파싱 로직 업데이트 (다중 connections 지원, distance 단위/방향 최적화 적용)
- [x] 노선도 그리기: `getLineSegments`에서 `railroadNetwork.line_data` 직접 참조로 로직 단순화
- [x] 역 환승역/진행방향 표시 보전을 위한 `platform_graph.json` 제거 및 `railroad_network.line_data` 기반 논리 방향 추출 로직으로 재구현 (버그 및 성능 개선)
- [x] `useStationHierarchy.ts`와 새 구조 호환성 달성 및 배열 추출 버그 예방
- [x] **조인트 분기 및 스케매틱 레이아웃 렌더링 (Directional Branching)**: 
    - [x] `scripts/build_graph_v3.js`: 기하학적 각도 분석으로 `through_pairs` 추출
    - [x] `public/rail/joints.json`: 각 조인트에 `through_pairs` 메타데이터 추가
    - [x] `useLineTopology.ts`: Longest Simple Path 알고리즘 적용 (순환선 지원 및 라쏘 형태 캡슐 모양 자동 변환)
    - [x] `RoutingGraph.ts`: `sectionId` 전달로 UI 방향성 판단 가능 개선
- [x] 리팩토링 검증 (본선 강제 직진, 겹침 100% 방지, 순환선 레이아웃 완벽 지원)

