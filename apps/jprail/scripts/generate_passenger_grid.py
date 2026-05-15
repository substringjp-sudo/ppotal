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
  - S12_001c가 stations_lod.json의 id와 일치
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

    # S12_001c -> {passengers, lat, lon} 맵
    station_passengers: dict[str, dict] = {}
    for feature in geojson['features']:
        props = feature['properties']
        station_id = props.get('S12_001c') or ''
        station_id = station_id.strip() if isinstance(station_id, str) else ''
        passengers = props.get('S12_057')  # 2023년 이용객 (일평균)
        if not station_id or passengers is None:
            continue

        # LineString의 중심점 계산
        coords = feature['geometry']['coordinates']
        lat = sum(c[1] for c in coords) / len(coords)
        lon = sum(c[0] for c in coords) / len(coords)

        # 동일 역 ID가 여러 번 등장하면 이용객 수 합산
        if station_id in station_passengers:
            station_passengers[station_id]['passengers'] += passengers
        else:
            station_passengers[station_id] = {
                'passengers': passengers,
                'lat': lat,
                'lon': lon
            }

    print(f"  Loaded {len(station_passengers)} stations with passenger data")

    # 2. stations_lod에서 역 목록 읽기 (좌표 보정용)
    print("Loading stations_lod...")
    with open(lod_path, encoding='utf-8') as f:
        stations_lod = json.load(f)

    # lod_id -> 좌표 맵 (GeoJSON 좌표보다 더 정확할 수 있음)
    lod_coords: dict[str, tuple] = {}
    lod_ids: set[str] = set()
    for stn in stations_lod:
        lod_ids.add(stn['id'])
        lod_coords[stn['id']] = tuple(stn['c'])  # [lat, lon]

    # 3. stations_lod에 있는 역만 필터링하고 좌표를 lod 기준으로 보정
    valid_stations: list[dict] = []
    for sid, info in station_passengers.items():
        if sid not in lod_ids:
            continue
        lat, lon = lod_coords[sid]
        valid_stations.append({
            'id': sid,
            'passengers': info['passengers'],
            'lat': lat,
            'lon': lon
        })

    print(f"  Valid stations (in lod): {len(valid_stations)}")

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


if __name__ == '__main__':
    main()
