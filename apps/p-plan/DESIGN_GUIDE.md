# DESIGN_GUIDE.md: PPLANER 통합 디자인 가이드

PPLANER 플랫폼의 웹(Main Editor)과 모바일(Companion Agent) 간의 일관된 디자인 언어와 사용자 경험을 정의합니다.

## 1. 핵심 철학: "The Liquid Glass"

PPLANER의 디자인은 **유연함(Liquid)**과 **투명함(Glass)**을 기본으로 합니다. 데이터는 흐르듯이 배치되고, 인터페이스는 배경과 조화를 이루며 깊이감을 제공합니다.

---

## 2. 플랫폼별 디자인 전략

### 2.1. Web (Desktop - Premium Workspace)
*   **테마**: 현대적이고 정갈한 Light/Dark 모드 지원.
*   **컴포넌트**: 높은 정보 밀도를 수용할 수 있는 카드 시스템.
*   **애니메이션**: 레이아웃 변화 시 부드러운 전환(Framer Motion Layout ID 활용).
*   **강조점**: 3D 요소(Globe)와 2D 지도 간의 유선형 전환으로 공간감 극대화.

### 2.2. Mobile (Liquid Glass UI)
*   **테마**: Glassmorphism (expo-blur 활용) 적극 사용.
*   **컴포넌트**: 플로팅 탭바, 스크롤 반응형 헤더 (LiquidHeader).
*   **인터랙션**: 한 손 조작을 위한 하단 중심의 컨트롤 배치.
*   **강조점**: 반투명 레이어를 통해 하단의 지도나 정보가 항상 비치도록 하여 공간의 광활함 유지.

---

## 3. 디자인 토큰 (Shared Design Tokens)

모든 스타일은 `@pplaner/shared`의 `DESIGN_TOKENS`를 기반으로 합니다.

| 구분 | 주요 값 (Primary) | 보조 값 (Slate/Gray) | 포인트 (Success/Danger) |
| :--- | :--- | :--- | :--- |
| **Color** | Indigo-600 (#4f46e5) | Slate-500 (#64748b) | Emerald-500 / Rose-500 |
| **Radius** | 12px (Standard) | 24px (Pill/Card) | 50% (Circle) |
| **Blur** | - | - | Glass: 20px Intensity |

---

## 4. UI 작업 원칙 (Implementation Rules)

1.  **NO Placeholders**: 모든 이미지나 아바타는 실제와 같은 더미 데이터를 사용하거나 `generate_image`를 통해 생성합니다.
2.  **Micro-animations**: 버튼 클릭, 호버, 데이터 로딩 시 작은 움직임을 추가하여 살아있는 인터페이스 느낌을 줍니다.
3.  **Consistency**: 웹에서 새로 만든 UI 패턴은 반드시 모바일에서도 구현 가능한지(또는 대체 가능한지) 검토합니다.
