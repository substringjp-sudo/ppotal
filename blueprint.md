# PPLANER 통합 설계도 (blueprint.md)

## 1. 개요 및 비전
PPLANER 프로젝트는 **"AI와 함께하는 정밀 여행 설계 및 실시간 동행"**을 실현하는 멀티 플랫폼 서비스입니다.
이 중 웹 서비스(Web)는 복잡한 데이터 시각화 및 대량의 디자인 에디팅을 위한 메인 에디터(The Main Editor) 역할을 수행하며, `JapanRailNote (JPRAIL)`과 `Regionevel (REGIONEVEL)`로 구성됩니다.

## 2. 프로젝트 역사 및 현재 상태
*   **JapanRailNote (JPRAIL)**: 일본 철도 노선을 탐색하고 여행 기록을 아카이브할 수 있는 웹 기반 에디팅 서비스입니다.
*   **Regionevel (REGIONEVEL)**: 전 세계 국가, 행정구역(Prefecture/Province), 도시(City) 단위의 여행 흔적(Footprint)을 기록하고 레벨을 평가하는 서비스입니다.
*   **현재 개발 진행 사항**:
    *   두 앱 모두 개별적인 지도 컴포넌트(Leaflet 기반)와 헤더, 리스트 뷰를 갖추고 있습니다.
    *   각 앱의 디자인 요소(바다 색상, 헤더 높이, 디테일 툴팁/패널 크기와 위치, 전체 컨테이너 너비 제약 등)가 완벽히 정렬되지 않은 상태입니다.

## 3. 룩앤필 정합성 일치화 계획 (현재 요청된 변경 사항)
JPRAIL과 REGIONEVEL의 디자인 톤앤매너와 구조적 룩앤필을 완벽히 맞추기 위해 다음 작업을 수행합니다.

### 3.1. 상단 헤더 높이 통일 (56px / `h-14`)
*   **목적**: 두 앱 모두 데스크톱 및 모바일에서 균일한 화면 비율과 깔끔한 구조를 갖추도록 헤더 높이를 일치시킵니다.
*   **작업 내용**:
    *   `JPRAIL`: `MainPageClient.tsx` 헤더 클래스를 `h-16` (또는 `isMobile ? 'h-[60px]' : 'h-16'`)에서 `h-14` (56px)로 통일.
    *   `REGIONEVEL`: `Nav.tsx`에 `h-14` 클래스를 부여하여 세로 높이를 56px로 명시적으로 고정하고 내부 정렬(`items-center`) 보완.

### 3.2. 지도의 바다(배경) 색상 통일 (`#e0f2fe`)
*   **목적**: 두 지도 서비스 모두 동일한 스카이블루 바다 톤을 공유하여 하나의 패밀리 서비스 느낌을 줍니다.
*   **작업 내용**:
    *   `JPRAIL`: `Map.tsx` 내 Leaflet `MapContainer`의 백그라운드 색상을 `#a0c4ff`에서 `#e0f2fe`로 변경.
    *   `REGIONEVEL`: 기존 `#e0f2fe` 설정을 유지 및 확인.

### 3.3. 화면 전체 너비 및 마진 레이아웃 일치
*   **목적**: 대화면 데스크톱 디스플레이 환경에서 1920px 최대 너비 제한과 그림자 효과를 공유하여 정적이고 안정감 있는 프리미엄 레이아웃을 제공합니다.
*   **작업 내용**:
    *   `JPRAIL`: 기존 `max-w-[1920px] mx-auto w-full shadow-2xl shadow-slate-900/10` 레이아웃 유지.
    *   `REGIONEVEL`: `layout.tsx`에서 전체 뷰를 감싸는 래퍼 컨테이너에 동일한 `max-w-[1920px] mx-auto w-full shadow-2xl bg-white shadow-slate-900/10` 스타일을 주입하고, `body` 배경에 동일한 미세 도트 패턴 배경(`bg-slate-50 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]`)을 적용합니다.
    *   `REGIONEVEL`의 지도 뷰(`/map`) 및 리스트 뷰(`/list`)에서 화면이 꽉 찬 지도를 볼 수 있도록 스크롤바와 겹치는 하단 `Footer`를 조건부로 비활성화합니다.

### 3.4. 범주(상세 정보) 페이지의 크기와 위치 정합
*   **목적**: 상세 패널 노출 시의 둥글기, 그림자, 위치의 룩앤필 정렬.
*   **작업 내용**:
    *   `REGIONEVEL`의 `RegionTooltip`이 데스크톱 환경(`!isMobile`)에서 마우스를 따라다니지 않고, 화면 우측에 고정된 슬라이드 플로팅 카드(`absolute top-[72px] right-4 z-[2000] w-80`)로 표시되도록 레이아웃 수정.
    *   두 어플리케이션의 상세 모달/패널 모서리 둥글기(`rounded-2xl` 및 `rounded-t-[32px]`), 그림자 깊이를 프리미엄 가이드에 따라 고도화.
