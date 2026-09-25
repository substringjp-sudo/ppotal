#!/usr/bin/env python3
"""
격자 기반 역 이용객 우선순위 데이터 생성 스크립트

입력:
  - data/S12-24_NumberOfPassengers.geojson : 역별 이용객 수 (S12_057 = 2023년)
  - public/rail/stations_lod.json          : 역 좌표 및 메타데이터

출력:
  - public/data/passenger_grid.json
    {
      zoom_5: { "gridKey": "stationId", ... },  // 격자키 -> 대표역 ID
      zoom_6: { ... },
      ...
      zoom_14: { ... }
    }

    그리고 전역 이용객 수 맵:
    passengers: { "stationId": passengerCount, ... }

로직:
  - 줌 레벨별로 1400x800 화면을 20등분한 격자 크기를 계산
  - 각 격자 안에서 가장 이용객이 많은 역 하나만 선택

역을 잇는 법 (여기가 예전에 틀려 있었다):
  원본 S12 는 **사업자마다 한 줄**이다. 渋谷 는 東急·JR東·京王·메트로가 각각 제
  줄을 갖고, 줄마다 다른 S12_001c 를 쓴다(003922 / 003926 / 003930 / 003932).
  東京 는 12줄, 新宿 는 11줄로 쪼개져 있다.

  예전에는 `S12_001c` 를 그대로 키로 잡고 **같은 id 끼리만** 합쳤다. 그래서
    (a) 사업자 사이가 안 합쳐졌고 — 新宿 이 京王 몫 105만으로만 남았다(실제 약 390만),
    (b) stations_lod.json 이 쓰는 허브 대표 id 가 값 없는 사업자 줄인 경우
        아예 0 이 됐다. 9,033개 중 1,644개(18%)가 0 이었고, 하필 渋谷·東京·
        京都·品川·大宮 이 전부 0 이었다.

  지금은 **이름 + 근접**으로 잇는다. lod 항목마다 이름이 같고 HUB_DEG 안에 있는
  S12 줄을 전부 모아 더하고, 줄 하나는 **가장 가까운 허브 하나에만** 들어간다
  (같은 이름의 다른 역이 근처에 있어도 두 번 세지 않는다). 이 묶는 규칙은
  generate_station_lod.js 의 허브 묶기와 같은 기준이다.
"""

import json
import math
import os
import sys

GEOJSON_PATH = 'data/S12-24_NumberOfPassengers.geojson'
STATIONS_LOD_PATH = 'public/rail/stations_lod.json'
OUTPUT_PATH = 'public/data/passenger_grid.json'

# 줌 레벨 범위
ZOOM_MIN = 5
ZOOM_MAX = 14

# 화면 크기 기준 (px) - 일반적인 데스크탑 기준
SCREEN_WIDTH_PX = 1400
SCREEN_HEIGHT_PX = 800

# 격자 분할 수
GRID_DIVISIONS = 20

# 같은 역으로 볼 거리(도). generate_station_lod.js 의 허브 묶기와 같은 값이다.
# 0.005도 는 위도로 약 550m — 한 역 구내의 사업자별 출입구가 흩어지는 범위다.
HUB_DEG = 0.005


def zoom_to_cell_size(zoom: int):
    """줌 레벨에서 격자 하나의 크기(도)를 반환"""
    px_per_deg_lon = 256 * (2 ** zoom) / 360
    screen_deg_lon = SCREEN_WIDTH_PX / px_per_deg_lon
    screen_deg_lat = screen_deg_lon * (SCREEN_HEIGHT_PX / SCREEN_WIDTH_PX)
    cell_lon = screen_deg_lon / GRID_DIVISIONS
    cell_lat = screen_deg_lat / GRID_DIVISIONS
    return cell_lat, cell_lon


def grid_key(lat: float, lon: float, cell_lat: float, cell_lon: float) -> str:
    """좌표를 격자 키로 변환"""
    row = math.floor(lat / cell_lat)
    col = math.floor(lon / cell_lon)
    return f"{row}_{col}"


def main():
    # 파일 경로 검사
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)

    geojson_path = os.path.join(project_dir, GEOJSON_PATH)
    lod_path = os.path.join(project_dir, STATIONS_LOD_PATH)
    output_path = os.path.join(project_dir, OUTPUT_PATH)

    if not os.path.exists(geojson_path):
        print(f"ERROR: GeoJSON not found: {geojson_path}", file=sys.stderr)
        sys.exit(1)
    if not os.path.exists(lod_path):
        print(f"ERROR: stations_lod not found: {lod_path}", file=sys.stderr)
        sys.exit(1)

    # 1. GeoJSON에서 역별 이용객 수와 좌표 읽기
    print("Loading GeoJSON passenger data...")
    with open(geojson_path, encoding='utf-8') as f:
        geojson = json.load(f)

    # 사업자별 한 줄씩 그대로 읽는다. 합치는 것은 아래 허브 단계에서 한다.
    records: list[dict] = []
    for feature in geojson['features']:
        props = feature['properties']
        name = (props.get('S12_001') or '').strip()
        passengers = props.get('S12_057')  # 2023년 이용객 (일평균)
        if not name or passengers is None:
            continue

        # LineString의 중심점 계산
        coords = feature['geometry']['coordinates']
        records.append({
            'name': name,
            'passengers': passengers,
            'lat': sum(c[1] for c in coords) / len(coords),
            'lon': sum(c[0] for c in coords) / len(coords),
        })

    print(f"  Loaded {len(records)} operator rows")

    # 2. stations_lod에서 역 목록 읽기 (이쪽 id 가 소비자가 쓰는 id 다)
    print("Loading stations_lod...")
    with open(lod_path, encoding='utf-8') as f:
        stations_lod = json.load(f)

    hubs: list[dict] = []
    hubs_by_name: dict[str, list[dict]] = {}
    for stn in stations_lod:
        lat, lon = stn['c']  # [lat, lon]
        hub = {'id': stn['id'], 'name': (stn.get('name') or '').strip(),
               'lat': lat, 'lon': lon, 'passengers': 0}
        hubs.append(hub)
        hubs_by_name.setdefault(hub['name'], []).append(hub)

    # 3. 사업자 줄을 허브에 붙인다 — 이름이 같고 HUB_DEG 안에서 **가장 가까운** 하나.
    #
    # 가장 가까운 하나에만 넣는 것이 요점이다. 같은 이름의 다른 역이 근처에 있으면
    # 한 줄이 두 허브에 들어가 이용객이 두 번 세어진다.
    matched = 0
    unmatched_pax = 0
    for r in records:
        best, best_d = None, None
        for hub in hubs_by_name.get(r['name'], ()):
            dlat = abs(hub['lat'] - r['lat'])
            dlon = abs(hub['lon'] - r['lon'])
            if dlat >= HUB_DEG or dlon >= HUB_DEG:
                continue
            d = dlat * dlat + dlon * dlon
            if best_d is None or d < best_d:
                best, best_d = hub, d
        if best is None:
            unmatched_pax += r['passengers']
            continue
        best['passengers'] += r['passengers']
        matched += 1

    print(f"  Matched {matched}/{len(records)} rows to hubs"
          f"  (unmatched daily riders: {unmatched_pax:,})")

    # 이용객이 0 인 허브는 내보내지 않는다 — 「자료 없음」 과 「이용객 0」 을
    # 구별할 방법이 없고, 0 을 실어 보내면 소비자가 그 역을 **가장 한산한 역**으로
    # 읽는다. 없으면 없는 것이 낫다.
    valid_stations = [
        {'id': h['id'], 'passengers': h['passengers'], 'lat': h['lat'], 'lon': h['lon']}
        for h in hubs if h['passengers'] > 0
    ]

    print(f"  Hubs with ridership: {len(valid_stations)} / {len(hubs)}")

    # 이용객 수 내림차순 정렬 (같은 격자에서 먼저 배치된 역이 우선)
    valid_stations.sort(key=lambda s: s['passengers'], reverse=True)

    # 4. 줌 레벨별 격자 계산
    result_grids: dict[str, dict[str, str]] = {}

    for zoom in range(ZOOM_MIN, ZOOM_MAX + 1):
        cell_lat, cell_lon = zoom_to_cell_size(zoom)
        grid: dict[str, str] = {}

        for stn in valid_stations:
            key = grid_key(stn['lat'], stn['lon'], cell_lat, cell_lon)
            if key not in grid:
                # 이 격자에 첫 번째로 들어오는 역 (이용객 수 기준 정렬했으므로 최다)
                grid[key] = stn['id']

        result_grids[f'zoom_{zoom}'] = grid
        print(f"  Zoom {zoom}: {len(grid)} grid cells, cell_size={cell_lat:.4f}x{cell_lon:.4f}deg")

    # 5. 전역 이용객 수 맵 (런타임에서 활용)
    passengers_map = {s['id']: s['passengers'] for s in valid_stations}

    # 6. 출력
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    output = {
        'passengers': passengers_map,
        'grids': result_grids
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, separators=(',', ':'))

    size_kb = os.path.getsize(output_path) / 1024
    print(f"\nOutput written to: {output_path}")
    print(f"File size: {size_kb:.1f} KB")
    print(f"Passengers map size: {len(passengers_map)} entries")

    # 사람이 눈으로 볼 수 있는 확인. 이 목록 맨 위에 新宿·渋谷·東京 이 없으면
    # 잇는 규칙이 또 깨진 것이다 — 예전 판은 渋谷·東京 이 0 이었다.
    by_name = {h['id']: h['name'] for h in hubs}
    top = sorted(valid_stations, key=lambda s: -s['passengers'])[:10]
    print("\nTop 10 (daily riders, all operators summed):")
    for s_ in top:
        print(f"  {by_name.get(s_['id'], '?'):<10} {s_['passengers']:>10,}")


if __name__ == '__main__':
    main()
