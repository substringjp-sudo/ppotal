# PPLANER 통합 설계도 (blueprint.md)

## 1. 개요 및 비전
PPLANER 프로젝트는 **"AI와 함께하는 정밀 여행 설계 및 실시간 동행"**을 실현하는 멀티 플랫폼 서비스입니다.
이 중 웹 서비스(Web)는 복잡한 데이터 시각화 및 대량의 디자인 에디팅을 위한 메인 에디터(The Main Editor) 역할을 수행하며, `JapanRailNote (JPRAIL)`과 `Regionevel (REGIONEVEL)`로 구성됩니다.

## 2. 프로젝트 역사 및 현재 상태
*   **JapanRailNote (JPRAIL)**: 일본 철도 노선을 탐색하고 여행 기록을 아카이브할 수 있는 웹 기반 에디팅 서비스입니다.
*   **Regionevel (REGIONEVEL)**: 전 세계 국가, 행정구역(Prefecture/Province), 도시(City) 단위의 여행 흔적(Footprint)을 기록하고 레벨을 평가하는 서비스입니다.
*   **현재 개발 진행 사항**:
    *   1차 디자인 룩앤필 정합 완료: 바다 색상 통일(`#e0f2fe`), 헤더 높이 통일(`56px`), REGIONEVEL의 1920px 래퍼 컨테이너 및 도트 배경 패턴 삽입, 상세 툴팁 패널의 데스크톱 우측 고정 플로팅 카드화.

## 3. 룩앤필 정합성 일치화 계획 (헤더 고도화 및 검색창 추가)
JPRAIL과 REGIONEVEL의 세부 디자인 일관성을 극대화하기 위해, REGIONEVEL의 상단 네비게이션 헤더에 JPRAIL의 UI 컴포넌트 룩앤필(글꼴, 아이콘, 굵기, 메뉴 배치, 프로필 아바타 원형)과 검색 점프 기능을 통합 적용합니다.

### 3.1. 상단 네비게이션 메뉴 및 스타일 정합
*   **글꼴 및 굵기 일치**:
    *   REGIONEVEL 네비게이션 글꼴 및 굵기, 색상을 JPRAIL과 통일합니다 (`text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors`).
*   **아이콘 및 우측 정렬**:
    *   `Map` 및 `List` 메뉴 옆에 어울리는 Lucide 아이콘(`MapIcon`, `Trophy` 등)을 추가하여 시각적 인지성을 높입니다.
    *   기존에 좌측 로고 바로 옆에 배치되었던 메뉴 링크들을 오른쪽 섹션(사용자 프로필 영역 앞)으로 이동시켜 JPRAIL과 메뉴 배치를 통일합니다.

### 3.2. 로그인 아바타 원형(계정 이니셜 서클) 구현
*   **동작 및 디자인**:
    *   로그인 상태 시 계정 이메일 또는 이름의 첫 글자를 따서 동그란 아바타 원형(`size-8 md:size-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold cursor-pointer shadow-md transition-transform hover:scale-105`)을 렌더링합니다.
    *   아바타를 클릭하면 이메일 주소 확인 및 "로그아웃"을 할 수 있는 드롭다운 메뉴가 뜨도록 구성하여 프리미엄 사용성을 확보합니다.

### 3.3. 지역(도도부현, 시정촌) 검색 및 지도 이동 기능
*   **검색창 컴포넌트 (`RegionSearch.tsx`) 신설**:
    *   데스크톱 뷰 기준 네비게이션 중앙 영역에 JPRAIL과 같은 프리미엄 디자인의 검색창을 추가합니다.
    *   `/data/regions.json`을 사용하여 브라우저에서 전 세계의 국가, 도도부현, 시정촌을 한국어, 영어, 일본어 등으로 빠르게 필터링하여 리스트업합니다.
*   **지역 점프 액션 (`jumpToRegion`) 추가**:
    *   `useMapStore`에 검색어 선택 시 지도를 해당 지역의 계층 구조로 즉시 포커싱해주는 액션을 구현합니다.
    *   시정촌(City) 선택 시 부모 도도부현으로 이동 후 시정촌 레벨(`viewLevel=2`)을 활성화하고 해당 지역을 강조(selectedId 셋업)합니다.
