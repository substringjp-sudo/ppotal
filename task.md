# Mobile Map UX Refactor

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

## 남은 작업 (Remaining Tasks)
- [ ] 모바일 환경에서의 실제 동작 테스트 (특히 터치 감도 및 정확도)
- [ ] 다양한 화면 크기에서의 레이아웃 검증
