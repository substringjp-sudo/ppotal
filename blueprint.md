# JPRail 프로젝트 청사진 (Blueprint)

## 1. 프로젝트 개요
JPRail은 일본의 철도 데이터를 시각화하고 사용자에게 최적의 경로를 제공하는 웹 애플리케이션입니다.

### 핵심 목표
- **DB 기반 데이터 관리:** 대용량 JSON 파일을 탈피하여 Firestore 기반의 효율적 데이터 관리 체계 구축.
- **서버 사이드 연산:** 복잡한 경로 탐색 로직을 Cloud Functions로 이관하여 성능 최적화.
- **실시간성:** 데이터 수정 시 배포 없이 즉시 반영되는 시스템 구축.

## 2. 시스템 아키텍처 (개편안)

### 데이터 계층 (Firestore)
- `stations`: 역 정보 (이름, 언어별 명칭, 좌표)
- `lines`: 노선 정보 (회사, 이름, 색상)
- `sections`: 물리적 연결 구간 및 거리, 지오메트리
- `platforms`: 역과 노선의 교차 정보

### 비즈니스 로직 계층 (Cloud Functions)
- `findPath`: 출발/도착역 ID를 입력받아 최단 경로 계산 (Dijkstra)
- `getLineInfo`: 노선 상세 정보 및 소속 역 목록 반환
- `getStationInfo`: 특정 역의 상세 메타데이터 반환

### 프론트엔드 계층 (Next.js)
- 대용량 데이터 로직 제거 및 API 기반 데이터 페칭.
- 서버에서 계산된 결과값만을 시각화하는 경량 브라우저 렌더링.

## 3. 현재 작업 계획 (Current Tasks)

### 1단계: Firebase 환경 고도화
- [ ] `firebase init functions` 실행 및 개발 환경 구축
- [ ] Firestore 보안 규칙(`firestore.rules`) 업데이트

### 2단계: 데이터 마이그레이션
- [ ] `scripts/migrate-to-firestore.ts` 작성 및 실행
- [ ] 대용량 GeoJSON 데이터의 Firestore 저장 최적화 (Chunking 또는 Storage 연동)

### 3단계: Cloud Functions 구현 및 배포
- [ ] `src/lib/RoutingGraph.ts` 로직을 서버용으로 마이그레이션
- [ ] 경로 탐색 API 구현 및 배포

### 4단계: 클라이언트 연동
- [ ] 기존 로컬 데이터 로드 로직 제거
- [ ] API 인터페이스 연결 및 성능 테스트
