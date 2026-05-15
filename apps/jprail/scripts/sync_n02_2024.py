#!/usr/bin/env python3
"""
N02-2024 데이터 동기화 스크립트
================================
N02-22와 N02-24 GeoJSON/XML을 비교하여,
2024년에 추가/변경된 역・노선・회사 정보를
우리 JSON 파일에 반영합니다.

원칙:
  - 2022년에 있었던 데이터는 삭제하지 않음 (과거 여행기록 유지)
  - 2024년에 추가된 역/노선/회사를 추가
  - 역명/노선명/회사명 변경은 name_2024 필드로 병기 (기존 name 유지, 최신명 추가)
  - 새 역이 속한 노선이 우리 JSON에 없으면 노선/회사도 함께 추가

업데이트 대상:
  - public/rail/companies.json
  - public/rail/lines.json
  - public/rail/stations_master.json
  - public/rail/stations_lod.json
  - public/rail/platforms_meta.json

출력:
  - 위 파일들 in-place 업데이트
  - scripts/sync_n02_2024_report.txt (변경 내역 리포트)
"""

import json
import math
import os
import sys

# ─── 경로 설정 ──────────────────────────────────────────────
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR  = os.path.dirname(SCRIPT_DIR)
DATA_DIR     = os.path.join(PROJECT_DIR, 'data')
PUBLIC_RAIL  = os.path.join(PROJECT_DIR, 'public', 'rail')

STATION_22   = os.path.join(DATA_DIR, 'N02-22_Station.geojson')
STATION_24   = os.path.join(DATA_DIR, 'N02-24_Station.geojson')
SECTION_22   = os.path.join(DATA_DIR, 'N02-22_RailroadSection.geojson')
SECTION_24   = os.path.join(DATA_DIR, 'N02-24_RailroadSection.geojson')

COMPANIES_JSON    = os.path.join(PUBLIC_RAIL, 'companies.json')
LINES_JSON        = os.path.join(PUBLIC_RAIL, 'lines.json')
STATIONS_MASTER   = os.path.join(PUBLIC_RAIL, 'stations_master.json')
STATIONS_LOD      = os.path.join(PUBLIC_RAIL, 'stations_lod.json')
PLATFORMS_META    = os.path.join(PUBLIC_RAIL, 'platforms_meta.json')

REPORT_PATH = os.path.join(SCRIPT_DIR, 'sync_n02_2024_report.txt')

# 철도구분(N02_001) -> 카테고리ID 매핑 (우리 companies.json category_id 기준)
# 1=신칸센, 11~13=재래선(JR/3섹터/지자체), 21=노면/경전철, 22=모노레일, 23=AGT, 24=자기부상 등
N02_001_TO_CATEGORY = {
    '1':  1,   # 신칸센
    '11': 2,   # JR재래선
    '12': 4,   # 사철
    '13': 3,   # 3섹터/제3섹터
    '14': 3,   # 3섹터
    '21': 5,   # 노면/경전철 (LRT)
    '22': 6,   # 모노레일
    '23': 6,   # AGT
    '24': 7,   # 자기부상
    '31': 8,   # 케이블카
    '32': 8,   # 로프웨이
}

# ─── 유틸 ────────────────────────────────────────────────────
def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f'  Saved: {os.path.relpath(path, PROJECT_DIR)}')

def centroid(coords):
    """LineString 좌표 리스트의 중심점 [lon, lat] -> (lat, lon)"""
    lat = sum(c[1] for c in coords) / len(coords)
    lon = sum(c[0] for c in coords) / len(coords)
    return round(lat, 5), round(lon, 5)

def next_int_id(d: dict) -> int:
    """dict의 키(정수형 문자열)에서 다음 사용 가능한 ID 반환"""
    if not d:
        return 0
    return max(int(k) for k in d.keys()) + 1

# ─── 메인 ────────────────────────────────────────────────────
def main():
    report_lines = []

    def log(msg):
        print(msg)
        report_lines.append(msg)

    log('=' * 60)
    log('N02-2024 동기화 스크립트')
    log('=' * 60)

    # ── 1. 데이터 로드 ──────────────────────────────────────────
    log('\n[1] 데이터 로드 중...')
    s22_features = load_json(STATION_22)['features']
    s24_features = load_json(STATION_24)['features']
    r22_features = load_json(SECTION_22)['features']
    r24_features = load_json(SECTION_24)['features']

    companies  = load_json(COMPANIES_JSON)
    lines      = load_json(LINES_JSON)
    sm         = load_json(STATIONS_MASTER)
    lod_list   = load_json(STATIONS_LOD)
    pm         = load_json(PLATFORMS_META)

    log(f'  22년 역 {len(s22_features)}개 / 24년 역 {len(s24_features)}개')
    log(f'  22년 구간 {len(r22_features)}개 / 24년 구간 {len(r24_features)}개')
    log(f'  현재 stations_master: {len(sm)}개 / stations_lod: {len(lod_list)}개')
    log(f'  현재 lines: {len(lines)}개 / companies: {len(companies)}개')

    # ── 2. N02 비교용 인덱스 구축 ──────────────────────────────
    codes22 = {f['properties']['N02_005c']: f for f in s22_features}
    codes24 = {f['properties']['N02_005c']: f for f in s24_features}

    # 24년 노선 조합 인덱스: (corp_name, line_name) -> [feature, ...]
    r24_by_key: dict[tuple, list] = {}
    for f in r24_features:
        p = f['properties']
        key = (p['N02_004'], p['N02_003'])  # (회사명, 노선명)
        r24_by_key.setdefault(key, []).append(f)

    r22_line_keys = set(
        (f['properties']['N02_004'], f['properties']['N02_003'])
        for f in r22_features
    )

    # ── 3. 역명 변경 감지 (역코드 기준) ─────────────────────────
    log('\n[2] 역명/노선명/회사명 변경 감지...')

    station_name_renames: dict[str, dict] = {}   # code -> {old, new}

    for code in codes22:
        if code not in codes24:
            continue
        p22 = codes22[code]['properties']
        p24 = codes24[code]['properties']

        # 역명 변경
        if p22['N02_005'] != p24['N02_005']:
            station_name_renames[code] = {
                'old': p22['N02_005'],
                'new': p24['N02_005']
            }

    log(f'  역명 변경: {len(station_name_renames)}건')
    for code, r in station_name_renames.items():
        log(f'    [{code}] {r["old"]} -> {r["new"]}')

    # ── 노선/회사명 변경 감지 (구간GeoJSON 기준) ─────────────────
    # 로직: 22년 노선조합과 24년 노선조합을 비교할 때,
    #       역(N02_005c)이 22년->24년 동안 같은 구간에 속해 있고
    #       회사+노선명만 바뀐 경우만 "이름 변경"으로 처리.
    #       역이 완전히 다른 사업자 노선으로 이동한 경우(사업자 재편)는 제외.

    # 22/24 노선조합별 역코드 집합 구축
    def build_line_to_stations(features):
        result: dict[tuple, set] = {}  # (corp, line) -> {station_code}
        for f in features:
            p = f['properties']
            corp = p['N02_004']
            line = p['N02_003']
            code = p['N02_005c']
            key = (corp, line)
            result.setdefault(key, set()).add(code)
        return result

    line_to_stn22 = build_line_to_stations(s22_features)
    line_to_stn24 = build_line_to_stations(s24_features)

    # 역코드 기준 반전 인덱스: code -> {(corp, line), ...}
    stn_to_lines22: dict[str, set] = {}
    for key, codes in line_to_stn22.items():
        for c in codes:
            stn_to_lines22.setdefault(c, set()).add(key)

    # 진정한 노선명 변경:
    # 22년 노선A에 속한 역들의 과반수가 24년에 노선B에 있고,
    # 노선A 자체가 24년에 사라진 경우 + 두 노선의 회사도 같거나 회사명만 변경인 경우
    line_name_renames: list[dict] = []
    corp_name_renames: list[dict] = []
    line_rename_map: dict[str, str] = {}  # old_line_name -> new_line_name (검증용)

    # 22년에는 있었는데 24년에 없어진 노선 조합
    vanished_lines = {k for k in line_to_stn22 if k not in line_to_stn24}

    for old_key in vanished_lines:
        old_corp, old_line = old_key
        old_stations = line_to_stn22[old_key]

        # 24년에 이 역들이 어느 노선에 속하는지 집계
        new_key_votes: dict[tuple, int] = {}
        for code in old_stations:
            for new_key in [k for k, s in line_to_stn24.items() if code in s]:
                new_key_votes[new_key] = new_key_votes.get(new_key, 0) + 1

        if not new_key_votes:
            continue  # 24년에 아무데도 없음 = 완전 폐선

        # 가장 많은 표를 받은 24년 노선 조합
        best_new_key, best_votes = max(new_key_votes.items(), key=lambda x: x[1])
        match_ratio = best_votes / len(old_stations)

        # 60% 이상이 같은 노선으로 이동했을 때만 이름 변경으로 간주
        if match_ratio < 0.6:
            log(f'  [SKIP 사업자재편] {old_corp}/{old_line} -> 역들이 여러 노선에 분산 (best_ratio={match_ratio:.0%})')
            continue

        new_corp, new_line = best_new_key

        # 노선명 변경 기록
        if old_line != new_line:
            rename_entry = {
                'old_corp': old_corp,
                'old_line': old_line,
                'new_corp': new_corp,
                'new_line': new_line,
                'match_ratio': match_ratio
            }
            line_name_renames.append(rename_entry)
            line_rename_map[old_line] = new_line
            log(f'  [RENAME LINE] {old_corp}/{old_line} -> {new_corp}/{new_line} ({match_ratio:.0%})')

        # 회사명 변경 기록
        if old_corp != new_corp and old_corp not in [r['old'] for r in corp_name_renames]:
            # 단, 이게 진짜 이름 변경인지 아니면 다른 회사로 편입인지 확인:
            # 편입의 경우 새 회사는 이미 다른 노선을 24년에도 갖고 있음
            new_corp_had_other_lines_in_22 = any(
                corp == new_corp for corp, _ in line_to_stn22
            )
            if not new_corp_had_other_lines_in_22:
                # 새 회사가 22년에 없던 회사 = 사명 변경 가능성
                corp_name_renames.append({'old': old_corp, 'new': new_corp})
                log(f'  [RENAME CORP] {old_corp} -> {new_corp}')
            else:
                log(f'  [SKIP 흡수편입] {old_corp} -> {new_corp} (편입으로 판단)')

    log(f'  노선명 변경 최종: {len(line_name_renames)}건')
    log(f'  회사명 변경 최종: {len(corp_name_renames)}건')


    # ── 4. 신규 노선/회사 추가 ─────────────────────────────────
    log('\n[3] 신규 노선/회사 추가...')

    new_r24_line_keys = {k for k in r24_by_key if k not in r22_line_keys}
    log(f'  N02-24에만 있는 노선 조합: {len(new_r24_line_keys)}건')

    # 현재 우리 JSON의 회사/노선명 인덱스
    corp_name_to_id = {v['name']: k for k, v in companies.items()}
    line_name_to_id = {v['name']: k for k, v in lines.items()}

    added_companies: list[dict] = []
    added_lines: list[dict] = []

    # (N02 회사명, N02 노선명) -> 우리 line_id 매핑 (신규 포함)
    n02_to_line_id: dict[tuple, str] = {}

    for (corp_name, line_name) in sorted(new_r24_line_keys):
        # 회사 처리
        our_corp_id = corp_name_to_id.get(corp_name)
        if our_corp_id is None:
            # 신규 회사
            new_corp_id = next_int_id(companies)
            # N02_001은 노선구간에서 가져옴
            n02_001 = r24_by_key[(corp_name, line_name)][0]['properties'].get('N02_001', '12')
            cat_id = N02_001_TO_CATEGORY.get(str(n02_001), 4)
            new_corp: dict = {
                'id': new_corp_id,
                'name': corp_name,
                'name_en': '',
                'category_id': cat_id,
                'name_kr': '',
                'source': 'N02-24'
            }
            companies[str(new_corp_id)] = new_corp
            corp_name_to_id[corp_name] = str(new_corp_id)
            our_corp_id = str(new_corp_id)
            added_companies.append(new_corp)
            log(f'    [NEW COMPANY] id={new_corp_id} {corp_name}')

        # 노선 처리
        our_line_id = line_name_to_id.get(line_name)
        if our_line_id is None:
            new_line_id = next_int_id(lines)
            new_line: dict = {
                'id': new_line_id,
                'name': line_name,
                'name_en': '',
                'corp_id': int(our_corp_id),
                'total_length': 0,
                'name_kr': '',
                'source': 'N02-24'
            }
            lines[str(new_line_id)] = new_line
            line_name_to_id[line_name] = str(new_line_id)
            our_line_id = str(new_line_id)
            added_lines.append(new_line)
            log(f'    [NEW LINE]    id={new_line_id} {corp_name}/{line_name}  (corp_id={our_corp_id})')
        else:
            log(f'    [LINE EXISTS] {corp_name}/{line_name} -> line_id={our_line_id}')

        n02_to_line_id[(corp_name, line_name)] = our_line_id

    log(f'  추가된 회사: {len(added_companies)}개 / 추가된 노선: {len(added_lines)}개')

    # ── 5. 신규 역 추가 ────────────────────────────────────────
    log('\n[4] 신규 역 추가...')

    genuinely_new = {code: feat for code, feat in codes24.items()
                     if code not in codes22 and code not in sm}

    log(f'  신규 역(master 미존재): {len(genuinely_new)}건')

    lod_by_id = {e['id']: e for e in lod_list}
    added_stations: list[str] = []

    for code, feat in sorted(genuinely_new.items()):
        props = feat['properties']
        coords = feat['geometry']['coordinates']  # [[lon,lat], [lon,lat]]
        lat, lon = centroid(coords)

        corp_name = props['N02_004']
        line_name = props['N02_003']
        stn_name  = props['N02_005']
        n02_001   = props.get('N02_001', '12')

        # 이 역이 속한 노선의 우리 line_id, corp_id
        our_corp_id = corp_name_to_id.get(corp_name)
        our_line_id = line_name_to_id.get(line_name)

        # 노선이 없으면 즉석 생성 (신규 역이지만 노선은 기존 노선인 경우도 있음)
        if our_corp_id is None:
            new_cid = next_int_id(companies)
            cat_id = N02_001_TO_CATEGORY.get(str(n02_001), 4)
            companies[str(new_cid)] = {
                'id': new_cid, 'name': corp_name,
                'name_en': '', 'category_id': cat_id,
                'name_kr': '', 'source': 'N02-24'
            }
            corp_name_to_id[corp_name] = str(new_cid)
            our_corp_id = str(new_cid)

        if our_line_id is None:
            new_lid = next_int_id(lines)
            lines[str(new_lid)] = {
                'id': new_lid, 'name': line_name, 'name_en': '',
                'corp_id': int(our_corp_id), 'total_length': 0,
                'name_kr': '', 'source': 'N02-24'
            }
            line_name_to_id[line_name] = str(new_lid)
            our_line_id = str(new_lid)

        line_key = f'{our_corp_id}::{our_line_id}'

        # stations_master에 추가
        sm[code] = {
            'id': code,
            'name': stn_name,
            'name_en': '',
            'lat': lat,
            'lon': lon,
            'prefecture_id': '',
            'city_id': '',
            'platform_ids': [code],
            'name_kr': '',
            'source': 'N02-24'
        }

        # platforms_meta에 추가
        pm[code] = {
            'code': code,
            'name': stn_name,
            'isMatched': True,
            'company': int(our_corp_id),
            'line': int(our_line_id),
            'lat': lat,
            'lon': lon,
            'length': 0,
            'name_kr': '',
            'source': 'N02-24'
        }

        # stations_lod에 추가
        if code not in lod_by_id:
            new_lod_entry = {
                'id': code,
                'name': stn_name,
                'name_en': '',
                'z': 11,   # 기본 LOD zoom level
                'lines': [line_key],
                'nodes': [{'id': code, 'c': [lat, lon]}],
                'c': [lat, lon],
                'name_kr': '',
                'source': 'N02-24'
            }
            lod_list.append(new_lod_entry)
            lod_by_id[code] = new_lod_entry

        added_stations.append(code)
        log(f'    [{code}] {stn_name}  ({corp_name}/{line_name})  ({lat},{lon})')

    log(f'  추가된 역: {len(added_stations)}개')

    # ── 6. 역명 변경 반영 (name_2024 필드 병기) ───────────────
    log('\n[5] 역명 변경 반영...')
    renamed_stations_count = 0

    for code, rename in station_name_renames.items():
        old_name = rename['old']
        new_name = rename['new']

        # stations_master 업데이트
        if code in sm:
            sm[code]['name_2024'] = new_name
            renamed_stations_count += 1

        # platforms_meta 업데이트
        if code in pm:
            pm[code]['name_2024'] = new_name

        # stations_lod 업데이트
        if code in lod_by_id:
            lod_by_id[code]['name_2024'] = new_name

    log(f'  name_2024 필드 추가: {renamed_stations_count}건')

    # ── 7. 노선명 변경 반영 ────────────────────────────────────
    log('\n[6] 노선명/회사명 변경 반영...')
    renamed_lines_count = 0
    renamed_corps_count = 0

    for rename in line_name_renames:
        old_corp = rename['old_corp']
        old_line = rename['old_line']
        new_line = rename['new_line']
        new_corp = rename['new_corp']

        # lines.json에서 노선명+회사명으로 매칭
        for lid, lv in lines.items():
            comp_corp_id = lv.get('corp_id')
            our_corp_name = companies.get(str(comp_corp_id), {}).get('name', '')
            if lv['name'] == old_line and our_corp_name == old_corp:
                if old_line != new_line:
                    lv['name_2024'] = new_line
                    renamed_lines_count += 1
                    log(f'    [LINE] lines[{lid}] "{old_line}" -> name_2024="{new_line}"')
                break

    for rename in corp_name_renames:
        old_corp = rename['old']
        new_corp = rename['new']
        for cid, cv in companies.items():
            if cv['name'] == old_corp:
                cv['name_2024'] = new_corp
                renamed_corps_count += 1
                log(f'    [CORP] companies[{cid}] "{old_corp}" -> name_2024="{new_corp}"')
                break

    log(f'  노선명 변경(name_2024): {renamed_lines_count}건')
    log(f'  회사명 변경(name_2024): {renamed_corps_count}건')


    # ── 8. 노선명 변경된 역들의 platforms_meta 보정 ──────────────
    log('\n[7] 노선명 변경된 역들의 platforms_meta 업데이트...')
    line_renamed_station_count = 0
    for rename in line_name_renames:
        old_corp = rename['old_corp']
        old_line = rename['old_line']
        new_line = rename['new_line']
        old_key = (old_corp, old_line)
        # 22년에 이 노선에 속했던 역들
        old_stations_for_line = line_to_stn22.get(old_key, set())
        for code in old_stations_for_line:
            if code in pm and pm[code].get('line_name_2024') is None:
                pm[code]['line_name_2024'] = new_line
                line_renamed_station_count += 1

    log(f'  노선명 변경 역 platforms_meta 업데이트: {line_renamed_station_count}건')

    # ── 10. 저장 ───────────────────────────────────────────────
    log('\n[9] 파일 저장...')
    save_json(COMPANIES_JSON,  companies)
    save_json(LINES_JSON,      lines)
    save_json(STATIONS_MASTER, sm)
    save_json(STATIONS_LOD,    lod_list)
    save_json(PLATFORMS_META,  pm)

    # ── 11. 리포트 저장 ────────────────────────────────────────
    log('\n' + '=' * 60)
    log('완료 요약:')
    log(f'  신규 회사 추가:   {len(added_companies)}개')
    log(f'  신규 노선 추가:   {len(added_lines)}개')
    log(f'  신규 역 추가:     {len(added_stations)}개')
    log(f'  역명 변경 기록:   {renamed_stations_count}개 (name_2024 필드)')
    log(f'  노선명 변경 기록: {renamed_lines_count}개 (name_2024 필드)')
    log(f'  회사명 변경 기록: {renamed_corps_count}개 (name_2024 필드)')
    log('=' * 60)

    with open(REPORT_PATH, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report_lines))
    print(f'\n리포트 저장: {REPORT_PATH}')


if __name__ == '__main__':
    main()
