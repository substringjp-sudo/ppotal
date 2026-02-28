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
