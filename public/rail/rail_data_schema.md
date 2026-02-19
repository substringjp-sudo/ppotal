# `public/rail` 데이터 스키마

이 문서는 `public/rail` 디렉토리에 있는 JSON 파일들의 구조와 관계를 설명합니다.

## 파일 목록 및 설명

-   `companies.json`: 철도 회사 정보를 담고 있습니다.
-   `lines.json`: 노선 정보를 담고 있습니다.
-   `platforms.json`: 승강장 정보를 담고 있습니다.
-   `stations.json`: 역 정보를 담고 있습니다.
-   `sections.json`: 노선의 구간 정보를 담고 있습니다.
-   `railroad_graph.json`: 역 간의 연결 관계를 그래프 형태로 담고 있습니다.
-   `railroad_hierarchy.json`: 회사 > 노선 > 역/구간의 계층 구조를 담고 있습니다.

## 스키마 상세

### `companies.json`

-   **설명**: 철도 회사 정보를 정의합니다.
-   **Key**: 회사 ID (`corp_id`)
-   **구조**:
    ```json
    {
        "0": {
            "id": 0,
            "name": "IRいしかわ鉄道",
            "name_en": "IRいしかわ Railway"
        }
    }
    ```

### `lines.json`

-   **설명**: 각 노선의 상세 정보를 정의합니다. `corp_id`를 통해 `companies.json`과 연결됩니다.
-   **Key**: 노선 ID (`line_id`)
-   **구조**:
    ```json
    {
      "0": {
        "id": 0,
        "name": "IRいしかわ鉄道線",
        "name_en": "IRいしかわ鉄道 Line",
        "corp_id": 0,
        "total_length": 1048.9686754370828
      }
    }
    ```

### `platforms.json`

-   **설명**: 개별 승강장의 위치 및 소속 노선 등의 정보를 정의합니다.
-   **Key**: 승강장 ID (`platform_id`)
-   **구조**:
    ```json
    {
      "010112": {
        "code": "010112",
        "name": "二月田",
        "isMatched": true,
        "company": 28,
        "line": 52,
        "lat": 31.25432,
        "lon": 130.6301,
        "geometries": [
          [
            [
              130.63035,
              31.25405
            ],
            [
              130.62985,
              31.25459
            ]
          ]
        ],
        "length": 76.57947502907555
      }
    }
    ```

### `stations.json`

-   **설명**: 역의 대표 좌표와 해당 역에 속한 승강장 목록을 정의합니다.
-   **Key**: 역 ID (`station_id` or `group_id`)
-   **구조**:
    ```json
    {
        "010112": {
            "id": "010112",
            "name": "二月田",
            "lat": 31.25432,
            "lon": 130.6301,
            "platform_ids": [
                "010112"
            ]
        }
    }
    ```

### `sections.json`

-   **설명**: 노선을 구성하는 각 구간의 지오메트리 정보와 시작/종료 역 정보를 정의합니다.
-   **Key**: `sections` 배열의 각 요소
-   **구조**:
    ```json
    {
        "sections": [
            {
                "id": 1,
                "company_id": 117,
                "line_id": 401,
                "geometry": [
                    [127.67948, 26.21454],
                    [127.6797, 26.21474]
                ],
                "start_station": "010136",
                "end_station": "010133",
                "length": 0.6887078436403412
            }
        ]
    }
    ```

### `railroad_graph.json`

-   **설명**: 역 간의 연결 정보를 인접 리스트 형태로 표현한 그래프입니다. 한 역에서 다른 역으로 갈 때 어떤 `section`을 거쳐야 하는지 나타냅니다.
-   **Key**: 출발역 ID
-   **Value**: `{ "도착역 ID": [구간 ID 배열] }`
-   **구조**:
    ```json
    {
        "010136": {
            "010133": [1],
            "010137": [974]
        }
    }
    ```

### `railroad_hierarchy.json`

-   **설명**: 전체 철도 데이터를 회사 > 노선 > (역, 구간)의 계층 구조로 정리한 파일입니다. 데이터 탐색의 시작점으로 사용될 수 있습니다.
-   **구조**:
    ```json
    {
        "companies": {
            "0": {
                "id": 0,
                "lines": {
                    "0": {
                        "id": 0,
                        "corp_id": 0,
                        "stations": [
                            { "group_id": "001986", "platform_id": "001986" }
                        ],
                        "sections": [
                            { "id": 9556, "start_station": "002076", "end_station": "002092" }
                        ]
                    }
                }
            }
        }
    }
    ```
