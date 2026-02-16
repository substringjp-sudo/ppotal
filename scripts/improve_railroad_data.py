#!/usr/bin/env python3
"""
improve_railroad_data.py

N02-22_Station.geojson, N02-22_RailroadSection.geojson,
station_master_list.json, enriched_railroads.geojson 데이터를 종합하여
systematic_railroad_network.json의 정확도를 개선하는 스크립트.

주요 개선 사항:
1. enriched_railroads의 station code 기반 연결 활용 (기하투영 대신 직접 매핑)
2. 역간 거리는 enriched_railroads의 length_km합산 (geometry 기반 정확한 거리)
3. station_master_list의 group code로 환승역 연결
4. N02-22_Station의 platform geometry 유지
5. 복선 구간(동일 역쌍 다중 section) 평균 거리 처리
"""

import json
import math
import os
import sys
from collections import defaultdict
from typing import Dict, List, Tuple, Optional, Set

# ─── 경로 설정 ───────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)

STATION_GEOJSON = os.path.join(PROJECT_DIR, 'data', 'N02-22_Station.geojson')
SECTION_GEOJSON = os.path.join(PROJECT_DIR, 'data', 'N02-22_RailroadSection.geojson')
STATION_MASTER = os.path.join(PROJECT_DIR, 'public', 'data', 'station_master_list.json')
ENRICHED_RAILROADS = os.path.join(PROJECT_DIR, 'data', 'enriched_railroads.geojson')
OUTPUT_PATH = os.path.join(PROJECT_DIR, 'public', 'data', 'systematic_railroad_network.json')

# ─── 유틸리티 ────────────────────────────────────────────────────

def haversine(c1: List[float], c2: List[float]) -> float:
    """하버사인 공식으로 두 좌표 [lon, lat] 사이의 거리(km) 계산"""
    lon1, lat1 = c1
    lon2, lat2 = c2
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def polyline_length(coords: List[List[float]]) -> float:
    """LineString 좌표 배열의 총 길이(km)를 계산"""
    total = 0.0
    for i in range(len(coords) - 1):
        total += haversine(coords[i], coords[i + 1])
    return total


def round_coord(val: float, precision: int = 6) -> float:
    """좌표값 반올림"""
    return round(val, precision)


def round_coords(coords: List) -> List:
    """좌표 배열 재귀 반올림"""
    if isinstance(coords, list):
        if coords and isinstance(coords[0], (int, float)):
            return [round_coord(c) for c in coords]
        return [round_coords(c) for c in coords]
    return coords


# ─── 데이터 로드 ──────────────────────────────────────────────────

def load_data():
    """모든 원본 데이터 로드"""
    print("📂 데이터 로드 중...")
    
    with open(STATION_GEOJSON, 'r', encoding='utf-8') as f:
        station_geo = json.load(f)
    print(f"  N02-22_Station: {len(station_geo['features'])} 역 레코드")
    
    with open(SECTION_GEOJSON, 'r', encoding='utf-8') as f:
        section_geo = json.load(f)
    print(f"  N02-22_RailroadSection: {len(section_geo['features'])} 구간 레코드")
    
    with open(STATION_MASTER, 'r', encoding='utf-8') as f:
        station_master = json.load(f)
    print(f"  Station Master List: {len(station_master)} 역 그룹")
    
    with open(ENRICHED_RAILROADS, 'r', encoding='utf-8') as f:
        enriched = json.load(f)
    print(f"  Enriched Railroads: {len(enriched['features'])} 구간 레코드")
    
    return station_geo, section_geo, station_master, enriched


# ─── 역 정보 구축 ────────────────────────────────────────────────

def build_station_registry(station_geo, station_master):
    """
    N02-22_Station과 Station Master List를 결합하여
    group_code 기반의 역 레지스트리를 구축합니다.
    
    키: group_code (예: '003872')
    값: {
        primary_name, lat, lon, 
        stations: [{code, name, company, line, platforms: [coords]}]
    }
    """
    print("\n🏗️  역 레지스트리 구축 중...")
    
    # 1. N02-22_Station에서 code -> 상세 정보 매핑
    code_info: Dict[str, dict] = {}
    code_platforms: Dict[str, List] = defaultdict(list)
    
    for feat in station_geo['features']:
        p = feat['properties']
        code = p['N02_005c']
        group = p['N02_005g']
        
        if code not in code_info:
            code_info[code] = {
                'name': p['N02_005'],
                'company': p['N02_004'],
                'line': p['N02_003'],
                'group': group,
            }
        
        # 플랫폼 geometry 저장
        code_platforms[code].append(feat['geometry']['coordinates'])
    
    # 2. Station Master List에서 group -> 역 정보 구축
    # station_master는 이미 group 기반으로 구성됨
    registry: Dict[str, dict] = {}
    
    for group_code, master_entry in station_master.items():
        registry[group_code] = {
            'primary_name': master_entry['primary_name'],
            'lat': master_entry['lat'],
            'lon': master_entry['lon'],
            'stations': []
        }
        
        for stn in master_entry['stations']:
            code = stn['code']
            platforms = code_platforms.get(code, [])
            
            registry[group_code]['stations'].append({
                'code': code,
                'name': stn['name'],
                'company': stn['company'],
                'line': stn['line'],
                'group': stn['group'],
                'lat': stn['lat'],
                'lon': stn['lon'],
                'platforms': platforms
            })
    
    # 3. code -> group 매핑 (빠른 역참조)
    code_to_group: Dict[str, str] = {}
    for feat in station_geo['features']:
        p = feat['properties']
        code_to_group[p['N02_005c']] = p['N02_005g']
    
    # 4. code -> 역 상세 정보 매핑 (좌표, 플랫폼 포함 - 빠른 참조용)
    code_to_detail: Dict[str, dict] = {}
    for group_code, reg_data in registry.items():
        for stn in reg_data['stations']:
            code_to_detail[stn['code']] = {
                'name': stn['name'],
                'company': stn['company'],
                'line': stn['line'],
                'group': stn['group'],
                'lat': stn['lat'],
                'lon': stn['lon'],
                'platforms': stn.get('platforms', []),
                'group_lat': reg_data['lat'],
                'group_lon': reg_data['lon'],
            }
    
    print(f"  역 그룹: {len(registry)}")
    print(f"  역 코드 -> 그룹 매핑: {len(code_to_group)}")
    print(f"  역 코드 -> 상세 정보: {len(code_to_detail)}")
    
    return registry, code_info, code_to_group, code_to_detail


# ─── 노선별 그래프 구축 ──────────────────────────────────────────

def build_line_graphs(enriched, code_info, code_to_group, section_geo):
    """
    enriched_railroads.geojson의 start_station/end_station 매핑을 사용하여
    각 노선의 역간 연결 그래프를 구축합니다.
    
    핵심 전략:
    - start_station != end_station인 구간 = 역간 트랙 (edge 후보)
    - start_station == end_station인 구간 = 역 내부 구간 (무시)
    - 동일 역쌍의 복선 구간 = 거리 평균, geometry 합침
    """
    print("\n🔧 노선별 그래프 구축 중...")
    
    # 1. enriched_railroads에서 노선별 역간 구간 수집
    # 키: (company::line, (sorted_station_pair))
    # 값: [{length, geometry}]
    line_track_sections: Dict[str, List[dict]] = defaultdict(list)
    line_station_sections: Dict[str, List[dict]] = defaultdict(list)
    # 노선별 모든 section geometry (역내 포함) - 지도 렌더링용
    line_all_geometries: Dict[str, List[List]] = defaultdict(list)
    # 복선 중복 제거용: (line_key, sorted(start,end)) -> 이미 추가됨 여부
    seen_pairs_for_geom: Dict[str, set] = defaultdict(set)
    
    for feat in enriched['features']:
        p = feat['properties']
        company = p['N02_004']
        line = p['N02_003']
        line_key = f"{company}::{line}"
        start = p.get('start_station', '')
        end = p.get('end_station', '')
        length = p.get('length_km', 0)
        geom = feat['geometry']['coordinates']
        
        # 복선 중복 geometry 제거 (지도 렌더링용)
        # - 역 내부 section(start==end): 선로 연속성에 필수이므로 전부 유지
        # - 역간 track(start!=end): 복선 구간 중 첫 번째 geometry만 유지
        if start and end and start != end:
            pair_key = tuple(sorted([start, end]))
            if pair_key not in seen_pairs_for_geom[line_key]:
                seen_pairs_for_geom[line_key].add(pair_key)
                line_all_geometries[line_key].append(geom)
        else:
            # 역 내부 section 또는 ? 포함 구간: 전부 유지
            line_all_geometries[line_key].append(geom)
        
        if start and end and start != '?' and end != '?':
            if start != end:
                # 역간 트랙 구간
                line_track_sections[line_key].append({
                    'start': start,
                    'end': end,
                    'length': length,
                    'geometry': geom
                })
            else:
                # 역 내부 구간
                line_station_sections[line_key].append({
                    'station': start,
                    'length': length,
                    'geometry': geom
                })
    
    # 2. 역쌍별 거리/geometry 집계
    line_edges: Dict[str, Dict[Tuple[str,str], dict]] = {}
    
    for line_key, sections in line_track_sections.items():
        pair_data: Dict[Tuple[str,str], dict] = {}
        
        for sec in sections:
            # 방향 무관 정렬 (복선 구간 합산용)
            pair = tuple(sorted([sec['start'], sec['end']]))
            
            if pair not in pair_data:
                pair_data[pair] = {
                    'lengths': [],
                    'geometries': [],
                    'original_directions': []
                }
            
            pair_data[pair]['lengths'].append(sec['length'])
            pair_data[pair]['geometries'].append(sec['geometry'])
            # 원래 방향 기록
            pair_data[pair]['original_directions'].append(
                (sec['start'], sec['end'])
            )
        
        line_edges[line_key] = pair_data
    
    # 3. section_geo에서 역이 없는 구간의 geometry도 수집 (보충용)
    line_raw_sections: Dict[str, List] = defaultdict(list)
    for feat in section_geo['features']:
        p = feat['properties']
        company = p['N02_004']
        line = p['N02_003']
        line_key = f"{company}::{line}"
        line_raw_sections[line_key].append(feat['geometry']['coordinates'])
    
    stats = {
        'total_lines': len(line_edges),
        'total_edges': sum(len(v) for v in line_edges.values()),
        'multi_track': sum(
            1 for pairs in line_edges.values()
            for data in pairs.values()
            if len(data['lengths']) > 1
        )
    }
    print(f"  노선 수: {stats['total_lines']}")
    print(f"  역쌍 수: {stats['total_edges']}")
    print(f"  복선 구간: {stats['multi_track']}")
    
    return line_edges, line_station_sections, line_raw_sections, line_all_geometries


# ─── 그래프를 노선 순서로 정렬 ────────────────────────────────────

def order_edges_for_line(edges_data: Dict[Tuple[str,str], dict], code_info: dict) -> List[dict]:
    """
    한 노선의 edge들을 위상 정렬(topological order)하여
    실제 노선 순서(종점→종점)로 정렬된 edge 리스트를 반환합니다.
    
    알고리즘:
    1. 인접 리스트 구축
    2. 차수 1인 노드(종점)에서 출발
    3. DFS/BFS로 순서 결정
    """
    if len(edges_data) == 0:
        return []
    
    # 인접 리스트 구축
    adj: Dict[str, List[Tuple[str, dict]]] = defaultdict(list)
    
    for (s1, s2), data in edges_data.items():
        avg_length = sum(data['lengths']) / len(data['lengths'])
        # 더 좋은 geometry 선택 (첫 번째 사용)
        geometry = data['geometries'][0]
        
        edge_info = {
            'distance': avg_length,
            'geometry': geometry
        }
        adj[s1].append((s2, edge_info))
        adj[s2].append((s1, edge_info))
    
    # 차수 1인 노드(종점) 찾기
    degree_1 = [n for n in adj if len(adj[n]) == 1]
    
    # 시작점: 차수 1인 노드(종점) 중 첫 번째, 없으면 아무 노드
    start_node = degree_1[0] if degree_1 else next(iter(adj))
    
    # BFS로 순서 결정
    ordered_edges = []
    visited_edges: Set[Tuple[str,str]] = set()
    visited_nodes: Set[str] = set()
    
    def dfs(node: str):
        visited_nodes.add(node)
        for neighbor, edge_info in adj[node]:
            edge_key = tuple(sorted([node, neighbor]))
            if edge_key in visited_edges:
                continue
            visited_edges.add(edge_key)
            
            # geometry 방향 결정
            geom = edge_info['geometry']
            # 원래 방향이 node->neighbor인지 확인
            # enriched_railroads에서 geometry는 start->end 방향
            # 원래 방향 정보를 활용
            original_pair = tuple(sorted([node, neighbor]))
            orig_data = edges_data.get(original_pair, edges_data.get((node, neighbor), None))
            
            if orig_data:
                orig_dirs = orig_data['original_directions']
                # 첫 번째 방향이 node->neighbor와 일치하는지 확인
                if orig_dirs[0][0] == node:
                    final_geom = geom
                else:
                    final_geom = list(reversed(geom))
            else:
                final_geom = geom
            
            ordered_edges.append({
                'from_code': node,
                'to_code': neighbor,
                'distance': edge_info['distance'],
                'geometry': final_geom
            })
            
            dfs(neighbor)
    
    dfs(start_node)
    
    # 방문하지 못한 edge가 있을 수 있음 (연결이 끊긴 분기)
    remaining_starts = [n for n in adj if n not in visited_nodes]
    for s in remaining_starts:
        if s not in visited_nodes:
            dfs(s)
    
    return ordered_edges


# ─── 최종 네트워크 생성 ──────────────────────────────────────────

def build_network(line_edges, line_station_sections, registry, code_info, code_to_group, code_to_detail, line_all_geometries):
    """
    정제된 데이터로 최종 systematic_railroad_network.json 생성
    
    출력 포맷:
    {
        "routes": [{
            "id": "company::line",
            "company": "...",
            "line": "...",
            "edges": [{
                "from": "company::line::stationName",
                "to": "company::line::stationName",
                "distance": 1.234,
                "geometry": [[lon, lat], ...]
            }]
        }],
        "stations": {
            "company::line::stationName": {
                "name": "...",
                "code": "012345",
                "group": "012345",
                "coords": [lon, lat],
                "platforms": [[[lon,lat], ...]]
            }
        },
        "transfers": [{
            "from": "company1::line1::stationName",
            "to": "company2::line2::stationName",
            "distance": 0.05,
            "type": "logical"
        }]
    }
    """
    print("\n📊 최종 네트워크 생성 중...")
    
    result = {
        'routes': [],
        'stations': {},
        'transfers': []
    }
    
    # code -> fullStationId 매핑 (company::line::name 형식)
    code_to_full_id: Dict[str, str] = {}
    
    # 1. 각 노선의 역 정보 수집 및 edge 생성
    processed_lines = 0
    skipped_lines = 0
    
    all_line_keys = set(line_edges.keys())
    
    for line_key, pair_data in sorted(line_edges.items()):
        parts = line_key.split('::', 1)
        if len(parts) != 2:
            continue
        company, line_name = parts
        
        # 이 노선에 관련된 모든 역 코드 수집
        station_codes: Set[str] = set()
        for (s1, s2) in pair_data.keys():
            station_codes.add(s1)
            station_codes.add(s2)
        
        if len(station_codes) < 2:
            skipped_lines += 1
            continue
        
        # 각 역 코드에 대해 fullId 생성 및 역 정보 등록
        for code in station_codes:
            info = code_info.get(code, {})
            name = info.get('name', f'Unknown_{code}')
            full_id = f"{company}::{line_name}::{name}"
            code_to_full_id[code] = full_id
            
            if full_id not in result['stations']:
                group = code_to_group.get(code, code)
                detail = code_to_detail.get(code, {})
                
                # 좌표: code_to_detail에서 직접 참조 (station_master_list 기반)
                if detail:
                    coords = [detail['lon'], detail['lat']]
                    platforms = detail.get('platforms', [])
                elif group in registry:
                    reg = registry[group]
                    coords = [reg['lon'], reg['lat']]
                    platforms = []
                else:
                    coords = [0, 0]
                    platforms = []
                
                result['stations'][full_id] = {
                    'name': name,
                    'code': code,
                    'group': group,
                    'coords': round_coords(coords),
                    'platforms': round_coords(platforms) if platforms else []
                }
        
        # Edge 정렬 및 생성
        ordered = order_edges_for_line(pair_data, code_info)
        
        route_edges = []
        for edge in ordered:
            from_id = code_to_full_id.get(edge['from_code'], '')
            to_id = code_to_full_id.get(edge['to_code'], '')
            
            if not from_id or not to_id:
                continue
            
            route_edges.append({
                'from': from_id,
                'to': to_id,
                'distance': round(edge['distance'], 6),
                'geometry': round_coords(edge['geometry'])
            })
        
        if route_edges:
            result['routes'].append({
                'id': line_key,
                'company': company,
                'line': line_name,
                'edges': route_edges,
                'routeGeometry': round_coords(line_all_geometries.get(line_key, []))
            })
            processed_lines += 1
        else:
            skipped_lines += 1
    
    print(f"  처리된 노선: {processed_lines}")
    print(f"  스킵된 노선: {skipped_lines}")
    print(f"  총 역: {len(result['stations'])}")
    print(f"  총 edge: {sum(len(r['edges']) for r in result['routes'])}")
    
    # 2. 환승 연결 생성 (같은 group 내 다른 노선의 역들)
    print("\n🔗 환승 연결 생성 중...")
    
    # group -> [fullId] 매핑
    group_to_full_ids: Dict[str, List[str]] = defaultdict(list)
    for full_id, stn_data in result['stations'].items():
        group = stn_data.get('group', '')
        if group:
            group_to_full_ids[group].append(full_id)
    
    transfer_count = 0
    seen_transfers: Set[str] = set()
    
    for group, full_ids in group_to_full_ids.items():
        if len(full_ids) < 2:
            continue
        
        for i in range(len(full_ids)):
            for j in range(i + 1, len(full_ids)):
                id1, id2 = full_ids[i], full_ids[j]
                
                # 같은 노선 내 환승은 불필요
                line1 = '::'.join(id1.split('::')[:2])
                line2 = '::'.join(id2.split('::')[:2])
                if line1 == line2:
                    continue
                
                transfer_key = '|'.join(sorted([id1, id2]))
                if transfer_key in seen_transfers:
                    continue
                seen_transfers.add(transfer_key)
                
                # 실제 거리 계산
                s1 = result['stations'][id1]
                s2 = result['stations'][id2]
                dist = haversine(s1['coords'], s2['coords'])
                
                # 1km 이내만 환승으로 인정
                if dist < 1.0:
                    result['transfers'].append({
                        'from': id1,
                        'to': id2,
                        'distance': round(max(0.01, dist), 6),
                        'type': 'logical'
                    })
                    transfer_count += 1
    
    print(f"  환승 연결: {transfer_count}")
    
    return result


# ─── 검증 ────────────────────────────────────────────────────────

def validate_network(result):
    """생성된 네트워크의 품질 검증"""
    print("\n✅ 네트워크 검증 중...")
    
    issues = []
    
    # 1. 연결되지 않은 역 확인
    connected_stations: Set[str] = set()
    for route in result['routes']:
        for edge in route['edges']:
            connected_stations.add(edge['from'])
            connected_stations.add(edge['to'])
    
    for transfer in result['transfers']:
        connected_stations.add(transfer['from'])
        connected_stations.add(transfer['to'])
    
    isolated = [s for s in result['stations'] if s not in connected_stations]
    if isolated:
        issues.append(f"고립된 역: {len(isolated)}개")
    
    # 2. 비정상 거리 확인
    abnormal_edges = 0
    for route in result['routes']:
        for edge in route['edges']:
            if edge['distance'] <= 0:
                abnormal_edges += 1
            elif edge['distance'] > 100:
                abnormal_edges += 1
    
    if abnormal_edges:
        issues.append(f"비정상 거리 edge: {abnormal_edges}개")
    
    # 3. 노선별 총 거리 샘플
    print("\n  📏 노선별 총 거리 (샘플):")
    for route in result['routes'][:10]:
        total = sum(e['distance'] for e in route['edges'])
        stn_count = len(set(
            s for e in route['edges'] for s in [e['from'], e['to']]
        ))
        print(f"    {route['id']}: {total:.2f} km ({stn_count}역, {len(route['edges'])} edge)")
    
    # 4. 이전 데이터와 비교
    old_path = OUTPUT_PATH
    if os.path.exists(old_path):
        try:
            with open(old_path, 'r', encoding='utf-8') as f:
                old = json.load(f)
            print(f"\n  📊 이전 데이터와 비교:")
            print(f"    이전: {len(old['routes'])} 노선, {len(old['stations'])} 역")
            print(f"    신규: {len(result['routes'])} 노선, {len(result['stations'])} 역")
            
            old_total = sum(sum(e['distance'] for e in r['edges']) for r in old['routes'])
            new_total = sum(sum(e['distance'] for e in r['edges']) for r in result['routes'])
            print(f"    이전 총 거리: {old_total:.2f} km")
            print(f"    신규 총 거리: {new_total:.2f} km")
            print(f"    차이: {new_total - old_total:+.2f} km ({(new_total/old_total - 1)*100:+.1f}%)")
            
            # 노선별 비교 (공통 노선)
            old_routes = {r['id']: r for r in old['routes']}
            new_routes = {r['id']: r for r in result['routes']}
            common = set(old_routes.keys()) & set(new_routes.keys())
            
            # 가장 큰 차이를 보이는 노선 Top 5
            diffs = []
            for route_id in common:
                old_dist = sum(e['distance'] for e in old_routes[route_id]['edges'])
                new_dist = sum(e['distance'] for e in new_routes[route_id]['edges'])
                if old_dist > 0:
                    diffs.append((route_id, old_dist, new_dist, abs(new_dist - old_dist)))
            
            diffs.sort(key=lambda x: x[3], reverse=True)
            print(f"\n  🔍 거리 차이 Top 10:")
            for route_id, old_d, new_d, diff in diffs[:10]:
                pct = ((new_d / old_d) - 1) * 100 if old_d > 0 else 0
                print(f"    {route_id}: {old_d:.2f} → {new_d:.2f} km ({pct:+.1f}%)")
        except Exception as e:
            print(f"  ⚠️ 이전 데이터 비교 실패: {e}")
    
    if issues:
        print(f"\n  ⚠️ 발견된 문제:")
        for issue in issues:
            print(f"    - {issue}")
    else:
        print(f"\n  ✅ 문제 없음!")
    
    return issues


# ─── 저장 ────────────────────────────────────────────────────────

def save_network(result):
    """최종 결과를 JSON으로 저장"""
    print(f"\n💾 저장 중: {OUTPUT_PATH}")
    
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, separators=(',', ':'))
    
    file_size = os.path.getsize(OUTPUT_PATH)
    print(f"  파일 크기: {file_size / 1024 / 1024:.1f} MB")


# ─── 메인 ────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("🚆 Railroad Data Accuracy Improvement Script")
    print("=" * 60)
    
    # 1. 데이터 로드
    station_geo, section_geo, station_master, enriched = load_data()
    
    # 2. 역 레지스트리 구축
    registry, code_info, code_to_group, code_to_detail = build_station_registry(station_geo, station_master)
    
    # 3. 노선별 그래프 구축
    line_edges, line_station_sections, line_raw_sections, line_all_geometries = build_line_graphs(
        enriched, code_info, code_to_group, section_geo
    )
    
    # 4. 최종 네트워크 생성
    result = build_network(
        line_edges, line_station_sections, registry, code_info, code_to_group, code_to_detail, line_all_geometries
    )
    
    # 5. 검증
    issues = validate_network(result)
    
    # 6. 저장
    if '--dry-run' in sys.argv:
        print("\n⏭️  드라이런 모드: 저장하지 않음")
    else:
        save_network(result)
    
    print("\n" + "=" * 60)
    print("✅ 완료!")
    print("=" * 60)
    
    return 0 if not issues else 1


if __name__ == '__main__':
    sys.exit(main())
