# `public/rail` 데이터 스키마 (최적화 버전)

이 문서는 `public/rail` 디렉토리에 있는 JSON 파일들의 구조와 관계를 설명합니다. 성능 최적화를 위해 데이터가 수직 분할(Vertical Partitioning)되어 있으며, 지오메트리 정보는 Google Polyline 알고리즘으로 압축되어 있습니다.

## 파일 목록 및 설명

-   `companies.json`: 철도 회사 정보를 담고 있습니다.
-   `lines.json`: 노선 정보를 담고 있습니다.
-   `stations_master.json`: 모든 역의 마스터 정보를 담고 있습니다. (기존 `stations.json` 대체)
-   `stations_lod.json`: 줌 레벨에 따른 역 노출 정보를 담고 있습니다.
-   `platforms_meta.json`: 승강장의 메타데이터(이름, 소속 등)를 담고 있습니다.
-   `platforms_geom.json`: 승강장의 지오메트리(Polyline)를 담고 있습니다.
-   `sections_meta.json`: 구간의 메타데이터(시작/종료, 노선 ID 등)를 담고 있습니다.
-   `sections_geom_high.json`: 높은 해상도의 구간 지오메트리(Polyline)를 담고 있습니다.
-   `sections_geom_mid.json`: 중간 해상도의 구간 지오메트리(Polyline)를 담고 있습니다.
-   `sections_geom_low.json`: 낮은 해상도의 구간 지오메트리(Polyline)를 담고 있습니다.
-   `railroad_graph.json`: 역 간의 연결 관계를 그래프 형태로 담고 있습니다.
-   `railroad_hierarchy.json`: 회사 > 노선 > 역/구간의 계층 구조를 담고 있습니다.
-   `joints.json`: 노선 연결점 정보를 담고 있습니다.

## 스키마 상세

### `stations_master.json`

-   **설명**: 역의 대표 좌표와 해당 역에 속한 승강장 목록을 정의합니다. 용량 최적화를 위해 키 이름을 단축했습니다.
-   **Key**: 역 ID (`id`)
-   **구조**:
    ```json
    {
        "010112": {
            "n": "二月田",
            "en": "Nigatsuden",
            "la": 31.25432,
            "lo": 130.6301,
            "p": ["010112"]
        }
    }
    ```
    - `n`: name (이름)
    - `en`: name_en (영문 이름)
    - `la`: lat (위도)
    - `lo`: lon (경도)
    - `p`: platform_ids (승강장 ID 목록)

### `platforms_meta.json` & `platforms_geom.json`

-   **설명**: 메타데이터와 지오메트리를 분리하여 관리합니다.
-   **platforms_meta.json 구조**:
    ```json
    {
      "010112": {
        "code": "010112",
        "name": "二月田",
        "company": 28,
        "line": 52,
        "lat": 31.25432,
        "lon": 130.6301,
        "length": 76.57
      }
    }
    ```
-   **platforms_geom.json 구조**:
    ```json
    {
      "010112": "_p~iF~ps|U_ulLnnqC..."
    }
    ```
    - 값은 Google Polyline으로 인코딩된 문자열입니다.

### `sections_meta.json` & `sections_geom_*.json`

-   **설명**: 구간 정보를 메타데이터와 다양한 해상도(LOD)의 지오메트리로 분리했습니다.
-   **sections_meta.json 구조**:
    ```json
    {
      "1": {
        "company_id": 117,
        "line_id": 401,
        "start": "010136",
        "end": "010133",
        "length": 0.68
      }
    }
    ```
-   **sections_geom_high.json 구조**:
    ```json
    {
      "1": "a~lD_~hbE..."
    }
    ```
    - 값은 Google Polyline으로 인코딩된 문자열입니다.

## 데이터 로드 전략

애플리케이션(`useRailData` 훅)은 메타데이터와 지오메트리 파일을 각각 fetch한 후, 클라이언트 측에서 `decodePolyline` 유틸리티를 사용하여 원래의 배열 형태로 복구하고 메타데이터와 병합하여 사용합니다. 이를 통해 네트워크 전송량을 최대 80% 이상 절감할 수 있습니다.
