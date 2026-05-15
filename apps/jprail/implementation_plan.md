# Implementation Plan: JapanRailNote 디자인 리뉴얼 (Stitch 컨셉 반영)

이 계획서는 Stitch에서 제안된 **JapanRailNote Redesign Concept**을 현재 Next.js 프로젝트에 반영하기 위한 상세 단계입니다. 현대적이고 프리미엄한 UI/UX를 구현하는 것을 목표로 합니다.

## 1. 스타일 및 기초 설정 (Style Foundation)
- [x] **Tailwind 설정 업데이트**: `tailwind.config.js`에 주색상(`#1c74e9`), 배경색(Light/Dark), 그리고 `Inter` 폰트 설정을 추가합니다.
- [x] **폰트 및 아이콘 추가**: `src/app/layout.tsx`에 `Inter` 폰트와 `Material Symbols Outlined` 아이콘 팩을 로드합니다.
- [x] **글로벌 CSS 정리**: `src/app/globals.css`에 공통 유틸리티 및 디자인 토큰을 정의합니다.

## 2. 헤더 리팩토링 (Header Redesign)
- [x] **로고 및 브랜드**: 기차 아이콘 로고와 `JapanRailNote` 타이포그래피를 적용합니다.
- [x] **검색바 구현**: 상단 중앙에 "Search stations or lines..." 검색바를 디자인합니다.
- [x] **네비게이션 메뉴**: Tips, Feedback, Export 메뉴를 아이콘과 함께 배치합니다.
- [x] **로그인/프로필**: 로그인 버튼과 사용자 아바타 스타일을 Stitch 컨셉에 맞게 수정합니다.

## 3. 좌측 사이드바 (Railroad Networks)
- [x] **상단 진행 상황 카드**: "Total Progress" (방문한 역 수 / 전체 역 수) 시각화 카드를 추가합니다.
- [x] **아코디언 스타일**: `SidebarGroup.tsx`를 수정하여 Shinkansen, JR East 등의 그룹을 세련된 아코디언 스타일로 변경합니다.
- [x] **하단 필터 버튼**: 사이드바 하단에 "Filter View" 버튼을 고정합니다.

## 4. 중앙 맵 영역 (Map & Controls)
- [x] **플로팅 컨트롤**: 하단 좌측의 줌(+/-) 및 리셋 버튼을 카드형 스타일로 리뉴얼합니다.
- [x] **액티브 뷰 라벨**: 상단 좌측에 "Greater Tokyo Area"와 같은 현재 뷰 지역명을 표시하는 라벨을 추가합니다.
- [x] **맵 배경 및 오버레이**: 맵의 그리드 느낌과 레이아웃을 컨셉에 맞춰 조정합니다.

## 5. 우측 사이드바 (Trip History)
- [x] **헤더 리뉴얼**: "Trip History" 타이틀과 "Delete All" 버튼을 배치합니다.
- [x] **기록 카드(Record Card)**: 
    - 세로형 경로 인디케이터 (원 -> 선 -> 원) 적용.
    - 노선별 색상 포인트 및 텍스트 레이아웃 개선.
    - 거리 및 날짜 정보 스타일링.

## 6. 디테일 폴리싱 (Aesthetic Polish)
- [x] **Glassmorphism 적용**: 헤더와 사이드바에 `backdrop-filter` 효과를 강화하여 깊이감을 부여합니다.
- [x] **반응형 최적화**: 모바일에서도 동일한 컨셉이 유지되도록 `isMobile` 처리를 업데이트합니다.

## 7. 검색 기능 고도화 (Rail Search Refinement)
- [x] **프리미엄 UI/UX**: Glassmorphism 팝오버, 결과 카드 디자인 개선, 아이콘 및 서체 최적화.
- [x] **검색어 하이라이팅**: 검색 결과 내 일치하는 텍스트 강조 표시 (`HighlightMatch` 컴포넌트).
- [x] **키보드 네비게이션**: 상하 화살표로 결과 선택, 엔터로 이동, ESC로 닫기 구현.
- [x] **고급 편의 기능**: `Cmd+K` / `Ctrl+K` 전역 단축키 및 "최근 검색어(localStorage)" 기능 추가.
- [x] **데이터 보강**: 역 검색 결과에 지역 정보(도부현/시군구) 및 소속 노선 정보 표시.

---
**참고 사항**: 
- `MainPageClient.tsx`의 인라인 스타일을 가급적 Tailwind 클래스로 전환하여 유지보수성을 높입니다.
- 기존 기능(필터링, 기록 삭제 등)이 깨지지 않도록 로직을 보존하며 스타일링을 입힙니다.
