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
-   `sections_geom_high.json`: 높은 해상도의 구간 지오메트리ㄹ(Polyline)를 담고 있습니다.
-   `sections_geom_mid.json`: 중간 해상도의 구간 지오메트리(Polyline)를 담고 있습니다.
-   `sections_geom_low.json`: 낮은 해상도의 구간 지오메트리(Polyline)를 담고 있습니다.
-   `railroad_graph.json`: 역 간의 연결 관계를 그래프 형태로 담고 있습니다.
-   `railroad_hierarchy.json`: 회사 > 노선 > 역/구간의 계층 구조를 담고 있습니다.
-   `joints.json`: 노선 연결점 정보를 담고 있습니다.
-   `services.json`: **운행계통(運転系統)** 정보를 담고 있습니다. `scripts/build_services.mjs` 로 생성합니다.
-   `graph_patch.json`: `station_graph.json` 이 빠뜨린 **선로 간선**. `scripts/build_graph_patch.cjs` 로 생성합니다.

## 스키마 상세

### `stations_master.json`

-   **설명**: 역의 대표 좌표와 해당 역에 속한 승강장 목록을 정의합니다. 용량 최적화를 위해 키 이름을 단축했습니다.
-   **Key**: 역 ID (`id`)
-   **구조**:
    ```json
    {
        "010112": {
            "id": "010112",
            "name": "二月田",
            "name_en": "Nigatsuden",
            "name_kr": "니가쓰덴",
            "lat": 31.25432,
            "lon": 130.6301,
            "prefecture_id": "p20",
            "city_id": "c559",
            "platform_ids": ["010112"]
        }
    }
    ```

    > 이전 문서에는 키가 `n`/`en`/`la`/`lo`/`p` 로 단축되어 있다고 적혀 있었지만 실제
    > 파일은 위와 같이 전체 이름을 씁니다.

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
        "length": 688
      }
    }
    ```

    > ⚠️ **`length` 의 단위는 미터입니다.** 이전 문서에는 `0.68` 처럼 km 로 적혀
    > 있었지만 실제 값은 미터입니다(전체 중앙값 1364). 이 오기 때문에 안드로이드
    > 앱이 미터를 km 로 읽어 전 구간 거리가 1000배로 어긋난 적이 있습니다.
    > 읽는 쪽에서 `/ 1000` 해서 km 로 환산하세요.

    > `start`/`end` 는 역 ID 이지만, 역이 아닌 **분기점**(`J_` 로 시작)일 수도 있습니다.
    > 분기점은 지나가는 점일 뿐 역으로 세면 안 됩니다.
-   **sections_geom_high.json 구조**:
    ```json
    {
      "1": "a~lD_~hbE..."
    }
    ```
    - 값은 Google Polyline으로 인코딩된 문자열입니다.

## 데이터 로드 전략

애플리케이션(`useRailData` 훅)은 메타데이터와 지오메트리 파일을 각각 fetch한 후, 클라이언트 측에서 `decodePolyline` 유틸리티를 사용하여 원래의 배열 형태로 복구하고 메타데이터와 병합하여 사용합니다. 이를 통해 네트워크 전송량을 최대 80% 이상 절감할 수 있습니다.

### `graph_patch.json`

-   **설명**: `station_graph.json` 이 노선 경계·접합부에서 빠뜨린 **선로 간선** 목록.
-   **왜 필요한가**: 구간 데이터에는 선로가 멀쩡히 있는데 그래프에 간선이 없어서, 붙어 있는
    두 역 사이에 엉뚱하게 먼 경로가 나옵니다. 가장 컸던 것이 세토대교로 **시코쿠 376역이
    혼슈에서 통째로 끊겨** 있었습니다.
-   **왜 파일인가**: 되살리는 규칙이 웹(`lib/routeSearch`)과 앱(`domain/engine/GraphRepair.kt`)
    에 **따로** 구현되어 있어, 한쪽만 틀리면 같은 기록에서 앱과 웹이 다른 경로를 냅니다.
    실제로 그런 적이 있습니다. 그래서 규칙은 빌드 때 한 번만 돌리고 결과를 여기 적습니다.
    두 구현은 이제 런타임이 아니라 **검증**에 씁니다 — 각자 이 파일과 같은 답을 내는지.
-   **생성**: `npm run build:graph-patch`
-   **구조**:
    ```json
    {
      "version": "f407ff696ae9",
      "edges": [
        {
          "from": "005075",
          "to": "005033",
          "km": 6.088,
          "line_ids": [382],
          "section_ids": [12207, 12201],
          "rule": "junction",
          "from_name": "米原",
          "to_name": "醒ヶ井"
        }
      ]
    }
    ```
    - `version`: 내용이 같으면 같은 값이 나오는 판본. 받아 둔 것과 비교할 때 씁니다.
    - **한 역쌍은 한 줄**입니다. 읽는 쪽이 양방향으로 넣습니다.
    - `rule`: `joint-chain`(통과형 접합부를 접은 것) 또는 `junction`(분기형을 넘은 것).
      사람이 읽기 위한 것으로 적용에는 쓰지 않습니다.
    - `*_name` 도 사람이 읽기 위한 것입니다.
-   **읽는 쪽이 할 일**: 이미 있는 방향은 건드리지 말고, 없는 방향만 간선으로 넣습니다.
    파일이 없으면 예전처럼 규칙을 그 자리에서 돌립니다(결과는 같습니다).

### `services.json`

-   **설명**: **운행계통(運転系統)** 정의. `lines.json` 이 담은 **선적(線籍)** 과는 다른 층입니다.
-   **왜 필요한가**: 원본 국토수치정보 N02 는 선적만 담습니다. 그래서 `山手線`(320)은
    시나가와~다바타 17역이 전부이고(이것이 JR 공식 선적입니다), 우리가 아는 순환선은
    `山手線`·`東北線`·`東海道線` 세 선적을 밟는 운행계통입니다. 같은 이유로 `京浜東北線`·
    `湘南新宿ライン` 은 데이터에 아예 없습니다.
-   **생성**: `node scripts/build_services.mjs` — OpenStreetMap `route=train` 릴레이션을 읽어
    정차역을 좌표로 우리 역에 붙이고, 릴레이션의 선로 모양 위에 투영해 순서를 세운 뒤,
    **기존 구간 그래프로 이어지는지 검증한 것만** 내보냅니다.
-   **구조**:
    ```json
    {
      "services": {
        "relation_1972960": {
          "id": "relation_1972960",
          "name": "JR山手線",
          "name_kr": "야마노테선",
          "color": "#B1CB39",
          "kind": "LOOP",
          "is_loop": true,
          "stops": ["004095", "004061", "..."],
          "sections": [12345, 12346]
        }
      }
    }
    ```
    - `stops`: 정차역 ID 를 **운행 순서대로**. `is_loop` 면 마지막에서 첫 역으로 돌아옵니다.
    - `sections`: 이 계통이 밟는 구간 ID. 지도에 그릴 선이자 완승률을 셀 단위입니다.
-   **한 구간을 여러 계통이 품는 것이 정상입니다.** 다바타~도쿄 선로는 선적으로는
    도호쿠 본선이면서 동시에 야마노테선과 케이힌토호쿠선이 올라타 있습니다.
-   **출처**: © OpenStreetMap contributors, ODbL 1.0. 이 파일을 배포할 때 표기가 따라붙습니다.
