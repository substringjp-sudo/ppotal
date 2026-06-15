# PPLANER 통합 설계도 (blueprint.md)

## 1. 개요 및 비전
PPLANER 프로젝트는 **"AI와 함께하는 정밀 여행 설계 및 실시간 동행"**을 실현하는 멀티 플랫폼 서비스입니다.
이 중 웹 서비스(Web)는 복잡한 데이터 시각화 및 대량의 디자인 에디팅을 위한 메인 에디터(The Main Editor) 역할을 수행하며, `JapanRailNote (JPRAIL)`과 `Regionevel (REGIONEVEL)`로 구성됩니다.

## 2. 프로젝트 역사 및 현재 상태
*   **JapanRailNote (JPRAIL)**: 일본 철도 노선을 탐색하고 여행 기록을 아카이브할 수 있는 웹 기반 에디팅 서비스입니다.
*   **Regionevel (REGIONEVEL)**: 전 세계 국가, 행정구역(Prefecture/Province), 도시(City) 단위의 여행 흔적(Footprint)을 기록하고 레벨을 평가하는 서비스입니다.
*   **현재 개발 진행 사항**:
    *   1차 디자인 룩앤필 정합 완료: 바다 색상 통일(`#e0f2fe`), 헤더 높이 통일(`56px`), REGIONEVEL의 1920px 래퍼 컨테이너 및 도트 배경 패턴 삽입, 상세 툴팁 패널의 데스크톱 우측 고정 플로팅 카드화.

## 3. 룩앤필 정합성 일치화 (헤더 고도화 및 검색창 추가 완료)
JPRAIL과 REGIONEVEL의 세부 디자인 일관성을 극대화하기 위해, REGIONEVEL의 상단 네비게이션 헤더에 JPRAIL의 UI 컴포넌트 룩앤필(글꼴, 아이콘, 굵기, 메뉴 배치, 프로필 아바타 원형)과 검색 점프 기능을 통합 적용하였습니다.

### 3.1. 상단 네비게이션 메뉴 및 스타일 정합 (완료)
*   **글꼴 및 굵기 일치**:
    *   REGIONEVEL 네비게이션 글꼴 및 굵기, 색상을 JPRAIL과 통일했습니다 (`text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors`).
*   **아이콘 및 우측 정렬**:
    *   `Map` 및 `List` 메뉴 옆에 어울리는 Lucide 아이콘(`MapIcon`, `Trophy` 등)을 적용했습니다.
    *   기존의 튀는 내보내기(`ExportMapButton`) 버튼을 `Map`, `List`와 동일한 텍스트+아이콘 일반 메뉴 스타일로 수정하여 `nav` 내부로 이동시켜 통일감 있는 배치를 구현했습니다.
*   **로고 영역 고도화**:
    *   로고 왼쪽에 둥근 사각형 지도 아이콘 컨테이너(`size-8 bg-blue-600 rounded-lg flex items-center justify-center text-white`)를 추가하고, 글자 크기 및 두께를 JPRAIL 타이틀과 완벽히 일치(`text-lg md:text-xl font-black tracking-tight text-slate-800 dark:text-white`)시켰습니다.
    *   JPRAIL 역시 기존의 기본 train 텍스트 아이콘 대신, 새로 제작한 JRN 이니셜 모노그램 기반 로고 아이콘(`icon.png`, `apple-icon.png`)을 페이지 파비콘 및 상단 헤더 로고 영역에 전면 도입했습니다.

### 3.2. 로그인 아바타 원형(계정 이니셜 서클) 구현 (완료)
*   **동작 및 디자인**:
    *   로그인 상태 시 계정 이메일 또는 이름의 첫 글자를 따서 동그란 아바타 원형(`size-8 md:size-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold cursor-pointer shadow-md transition-transform hover:scale-105 dark:ring-slate-800`)을 렌더링하도록 업데이트했습니다.
    *   아바타를 클릭하면 이메일 주소 확인, "JPRAIL에서 가져오기" 수동 동기화, 및 "로그아웃"을 할 수 있는 드롭다운 메뉴가 정상 작동하도록 구성하였습니다.

### 3.3. 지역(도도부현, 시정촌) 검색 및 지도 이동 기능
*   **검색창 컴포넌트 (`RegionSearch.tsx`) 신설**:
    *   데스크톱 뷰 기준 네비게이션 중앙 영역에 JPRAIL과 같은 프리미엄 디자인의 검색창을 추가했습니다.
    *   `/data/regions.json`을 사용하여 브라우저에서 전 세계의 국가, 도도부현, 시정촌을 한국어, 영어, 일본어 등으로 빠르게 필터링하여 리스트업합니다.
*   **지역 점프 액션 (`jumpToRegion`) 추가**:
    *   `useMapStore`에 검색어 선택 시 지도를 해당 지역의 계층 구조로 즉시 포커싱해주는 액션을 구현했습니다.
    *   시정촌(City) 선택 시 부모 도도부현으로 이동 후 시정촌 레벨(`viewLevel=2`)을 활성화하고 해당 지역을 강조(selectedId 셋업)합니다.

## 4. JPRAIL - REGIONEVEL 수동 연동 (Sync-on-Click) 구현 및 개선 완료

실시간 자동 동기화로 인한 리소스 낭비 및 사용자 혼선을 방지하기 위해, 사용자가 명시적으로 버튼을 클릭했을 때만 데이터를 상호 동기화하는 "수동 연동" 기능이 구현되었으며 최적화되었습니다.

### 4.1. 데이터 저장 구조 개선
*   **JPRAIL**: 여행 기록 저장 시, 해당 경로에 포함된 역들의 시정촌 ID 목록(`cityIds: string[]`)을 추출하여 `trips` 파이어스토어 문서에 함께 저장합니다. 이를 통해 `regionevel`은 역 마스터 데이터를 별도로 로드하지 않고도 `cityIds` 필드만으로 바로 연동을 처리할 수합니다.

### 4.2. REGIONEVEL에서의 연동 ("JPRAIL에서 가져오기")
*   **UI 단일화**: 지도 우측 하단 플로팅 카드를 제거하고, 상단 네비게이션 헤더 우측의 **프로필 아바타 드롭다운 메뉴** 내부로 동기화 버튼을 이동했습니다.
*   **동작**:
    1. Firestore의 `users/{uid}/trips`를 조회합니다.
    2. 모든 trips 도큐먼트의 `cityIds`를 수집하고 중복을 제거합니다.
    3. 수집된 `cityIds`를 `city_mapping.json`을 사용하여 Regionevel `shapeID`로 변환합니다.
    4. 각 `shapeID`에 대해 `visits` 컬렉션의 `pass` 카운트를 1씩 반영(또는 기존 값이 있으면 증가)합니다.
    5. **(개선)** 로컬 상태 갱신 즉시 Firestore `users/{uid}/visits`에 직접 `setDoc`을 호출하여 영구 저장 정합성을 보장합니다.
*   **결과 요약 모달 (`SyncSummaryModal`)**: 동기화 완료 후 연동 성공한 시정촌 개수 및 세부 지역명 목록을 칩(Chip) 리스트 형태로 시각화해 주는 팝업창을 띄워 사용자에게 동기화 결과를 상세 피드백합니다.

### 4.3. JPRAIL에서의 연동 ("Regionevel에서 가져오기")
*   **UI 단일화**: 데스크톱 뷰 기준 지도의 플로팅 카드 및 My Trips 패널의 동기화 버튼을 제거하고, 우측 상단 **프로필 아바타 드롭다운 메뉴** 내에 배치하여 사용자 혼선을 줄였습니다. (모바일 뷰에서는 사이드바 `MyLinesPane` 내에 연동 버튼을 적절히 유지)
*   **렌더링 버그 해결**: React-Leaflet의 `<GeoJSON>` 컴포넌트 렌더링 시, `regionevelVisits` 데이터 해시를 결합한 dynamic `key`를 바인딩하여 데이터가 갱신되면 강제로 리마운트가 트리거되어 실시간으로 지도의 색칠(style)이 반영되도록 해결했습니다.
*   **자동 동기화**: 로그인 상태로 페이지가 로드(isLoaded)되면 자동으로 배경에서 `syncWithRegionevel(false)`를 호출하여, 사용자가 동기화 버튼을 누르지 않아도 Regionevel의 방문 점수 데이터가 실시간으로 지도에 칠해지도록 개선했습니다.
*   **동작**:
    1. 버튼 클릭 또는 최초 마운트 시 `users/{uid}/visits` 데이터를 fetch하여 `regionevelVisits` 상태를 갱신합니다.
    2. 가져온 연동 데이터를 로컬 상태에 반영하여 즉시 지도(MunicipalMap)에 렌더링하고, 다음 로드 시 재호출 비용을 줄이기 위해 `localStorage`에 캐싱합니다.
*   **결과 요약 모달 (`SyncSummaryModal`)**: 수동 동기화 완료 시에만 성공한 일본 시정촌들의 개수와 한글/영문/일문 시정촌명 목록을 분석하여 오버레이 팝업창으로 사용자에게 표시합니다.

## 5. JRN 로고 아이콘 벡터화 및 정교화 계획 (진행 중)
*   **목적**: 사용자가 제공한 JRN 흐르는 모노그램 이미지 로고를 고해상도 SVG 벡터 도형으로 전환하고, 이를 컴포넌트화하여 웹 앱 전반에 걸쳐 고해상도 고선명 아이콘으로 사용합니다.
*   **세부 계획**:
    1. SVG 기반의 `JrnLogo.tsx` 컴포넌트 개발 (곡률 튜닝 포함).
    2. `public/icon.svg` 에셋 생성 및 `layout.tsx` 파비콘 경로 수정.
    3. `MainPageClient.tsx` 헤더 로고 수정.
    4. (완료) `layout.tsx` 내 Google Fonts(Material Symbols Outlined) 비동기 로드 적용을 통한 렌더링 차단 해제 및 LCP 최적화.
    5. (완료) `@ppotal/ui` 패키지의 `globals.css` 내 `@import` 문 제거 및 각 앱(`regionevel`, `jprail`) `layout.tsx` 내 `next/font/google` (Outfit, Inter) 통합을 통한 렌더링 차단 리소스 원천 제거.
    6. (완료) `regionevel` 앱 `layout.tsx` 내 구글 폰트 및 CDN 목적 사전 연결(`preconnect` 힌트) 추가를 통한 네트워크 연결 시간 절감 최적화.
    7. (완료) `jprail` 및 `regionevel` 이미지 포맷 캐싱 헤더(1년 TTL) 추가, `v2-ui-preview.webp` 변환 및 `fetchpriority="high"` 설정, `FloatingTooltip` 강제 리플로우 제거.
    8. (완료) `MainPageClient.tsx` 내 모달들(`FeedbackModal`, `AuthModal`, `ExportModal`, `UpdateNoticeModal`, `HowToModal`) 및 `MyLinesPane`을 비동기 dynamic import(with `ssr: false`)로 전환하여, 초기 로딩 시 불필요한 JS 실행 오버헤드 완화 및 TBT(Total Blocking Time) 최적화 완료.
    9. (완료) `SidebarGroup.tsx` 내 개별 노선, 회사, 카테고리 전체 선택 체크박스 `<input>` 태그에 다국어 대응 `aria-label` 속성을 추가하여 스크린 리더 표준(a11y) 충족 및 진단 경고 해결 완료.
    11. (완료) PPLANER 포털 내 스크린샷(7종) 연동 캐러셀 기능 개발 및 각 서브 앱(`jprail`, `regionevel`) 내 PPLANER 브랜드 소개 브릿지 페이지(`/pplaner`) 구축을 통한 서비스 간 통합성 강화.
    12. (진행 중) Google 검색 노출 극대화를 위해 각 Next.js 프로젝트별 SEO 메타데이터 대거 확충, JSON-LD 구조화 데이터 삽입, Robots.ts 및 Sitemap.ts 메타데이터 라우트 적용.
    13. (완료) 구버전 도메인(`jprail.web.app`, `jprail.firebaseapp.com`)에서 신버전 도메인(`jprail.pplaner.com`)으로의 즉각적인 클라이언트 사이드 리다이렉트 스크립트 적용 완료.

