# PPLANER Shared: The Communication Hub

웹(Web)과 모바일(Mobile) 플랫폼 간의 데이터 정합성과 비즈니스 로직을 공유하는 핵심 패키지입니다.

## 1. 역할 정의
*   **Universal Types**: 모든 플랫폼에서 공통으로 사용하는 여행(`Trip`), 사용자(`User`) 등 도메인 타입 정의.
*   **Core Services**: Firebase 연동(`tripService`, `authService`), 위치 처리, 유틸리티 로직.
*   **Design Tokens**: 플랫폼 간 일관된 디자인을 유지하기 위한 색상, 간격, 테마 토큰.
*   **Store Helpers**: Zustand 등 상태 관리 라이브러리에서 공통으로 사용할 수 있는 액터/셀렉터.

## 2. 작업 규칙 (Crucial)
1.  **Backward Compatibility**: 웹에서 새로운 기능을 추가할 때, 기존 모바일 앱(다른 장치에서 개발 중)의 로직이 깨지지 않도록 타입을 관리합니다.
2.  **Shared-First**: 새로운 비즈니스 요구사항이 발생하면 `packages/shared`에 먼저 반영하는 것을 원칙으로 합니다.
3.  **Clean Architecture**: 데이터 레이어와 프레젠테이션 레이어를 분리하여 플랫폼별 특화 구현이 용이하도록 합니다.

## 3. 구조
*   `src/types/`: 공통 인터페이스 및 타입.
*   `src/lib/`: Firebase, API 등 인프라 서비스.
*   `src/store/`: 공유 상태 관리 로직 (Zustand 등).
*   `src/utils/`: 공통 유틸리티 함수.

이 패키지는 PPLANER 생태계의 '공유 뇌(Shared Brain)' 역할을 수행합니다.
