# PPLANER Web: The Main Editor

PPLANER 서비스의 핵심 설계 및 분석을 담당하는 웹 애플리케이션입니다.

## 1. 역할 정의
*   **Trip Design**: AI 위저드를 통한 정밀 여행 설계 및 타임라인 편집.
*   **Visual Analysis**: 3D Globe 및 인터랙티브 지도를 통한 공간적 여행 경험 제공.
*   **Resource Management**: 통합 예산 관리, 항공/숙소 상세 정보 에디팅.
*   **Shared Brain**: 모든 플랫폼에서 공유될 여행 데이터의 원천(Single Source of Truth) 관리.

## 2. 기술 스택
*   **Core**: Next.js 16 (React 19, App Router)
*   **State**: Zustand (Local), React Query (Server)
*   **Style**: Tailwind CSS 4, Framer Motion
*   **Visual**: react-globe.gl, d3-geo, Google Maps API
*   **DB/Auth**: Firebase (Firestore, Auth, Storage)

## 3. 개발 가이드라인
본 웹 프로젝트는 `GEMINI.md`의 **웹 우선주의(Web-Centric)** 정책에 따라 개발됩니다.
- 복잡한 로직은 최대한 웹에서 처리하고 결과물을 `packages/shared`에 정형화합니다.
- 모바일 앱과 공유되는 타입이나 서비스 로직 수정 시 정합성을 항상 확인합니다.

## Getting Started
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to start planning.
