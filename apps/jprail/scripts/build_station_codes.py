# -*- coding: utf-8 -*-
"""駅ナンバリング(역 번호·노선 기호)을 우리 (역, 노선) 축으로 옮긴다.

    python3 scripts/build_station_codes.py       # 네트워크 필요 (원본을 받아 온다)

출처: piuccio/open-data-jp-railway-stations (MIT)
      ← ekidata.jp + 公共交通オープンデータセンター(ODPT, CC BY)

그쪽 축은 ekidata 노선이고 우리 축은 국토수치정보 N02 **선적(線籍)** 이라 그대로 붙지 않는다.
예를 들어 출처의 京浜東北線 하나가 우리에게는 東北線·東海道線·根岸線 셋으로 쪼개져 있고,
우리 노선 이름에는 사업자가 빠져 있다(`4号線丸ノ内線` · `本線`).

그래서 세 단계로 옮긴다.
  1. 역을 이름+좌표로 맞춘다. 같은 이름이 여럿이면(池袋) **그 노선이 닿는 쪽**을 고른다.
  2. 노선을 이름으로 맞춘다. 사업자 접두사를 떼고 양방향 포함으로 본다.
  3. 남은 자리만, 그 출처 노선이 다른 역에서 함께 나온 우리 노선으로 채운다.
     회사가 같아야 하고, 신칸센 선로에는 재래선 번호를 붙이지 않는다.

**댈 곳이 없으면 버린다 — 번호를 지어내지 않는다.** 순번을 세어 만들면 지선과
번호 건너뜀 때문에 실제 부여된 번호와 어긋난다.

결과는 `public/rail/station_codes.json`. 앱은 `manifest.json` 을 통해 같은 파일을 읽는다.
값이 맞는지는 `npm run verify:station-codes` 와 앱의 `StationCodesTest` 가 본다.
"""
import json, math, re, collections, unicodedata, os, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
RAIL = os.path.join(HERE, '..', 'public', 'rail') + os.sep
CACHE = os.path.join(HERE, '..', '.station-codes-cache')
SRC = {
    'src_stations.json': 'https://raw.githubusercontent.com/piuccio/open-data-jp-railway-stations/master/stations.json',
    'src_lines.json': 'https://raw.githubusercontent.com/piuccio/open-data-jp-railway-lines/master/lines.json',
}


def fetch(name):
    """원본은 저장소에 넣지 않는다(6MB). 받아서 캐시에 둔다."""
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, name)
    if not os.path.isfile(path):
        print(f'  받는 중 {name} …', file=sys.stderr)
        with urllib.request.urlopen(SRC[name], timeout=120) as r, open(path, 'wb') as f:
            f.write(r.read())
    return json.load(open(path, encoding='utf-8'))

ours_st = json.load(open(RAIL + 'stations_master.json'))
ours_ln = json.load(open(RAIL + 'lines.json'))
graph   = json.load(open(RAIL + 'station_graph.json'))
src_st  = fetch('src_stations.json')
src_ln  = fetch('src_lines.json')


def norm(s):
    s = unicodedata.normalize('NFKC', s or '').strip()
    return s.replace(' ', '').replace('　', '')


# 이름 축이 서로 다르다. 우리(N02)는 `4号線丸ノ内線`·`本線` 처럼 사업자를 빼고 호선을 붙이고,
# 출처(ekidata/ODPT)는 `東京メトロ丸ノ内線`·`京急本線` 처럼 사업자를 앞에 붙인다.
# 그래서 한쪽이 다른 쪽을 품고 있는지(양방향 포함)로 본다. 후보는 이미 "그 역에 닿는 노선"으로
# 좁혀져 있어서 이 느슨한 규칙이 엉뚱한 노선을 물지 않는다.
OPERATORS = ['東京メトロ', '都営地下鉄', '東京都交通局', '都電', '都営', 'JR', 'ＪＲ',
             '東武', '西武', '京王', '京成', '京急', '小田急', '東急', '相鉄',
             'ゆりかもめ', '横浜市営地下鉄', '埼玉高速鉄道', '首都圏新都市鉄道']


def line_aliases(name):
    n = norm(name)
    out = {n}
    out.add(re.sub(r'[（(][^）)]*[）)]', '', n))          # JR常磐線(上野～取手) → JR常磐線
    for _ in range(2):                                   # 사업자는 겹쳐 붙기도 한다
        for base in list(out):
            for op in OPERATORS:
                if base.startswith(op) and len(base) > len(op) + 1:
                    out.add(base[len(op):])
    for base in list(out):                               # 東海道本線 ↔ 東海道線
        if base.endswith('本線') and len(base) > 3:
            out.add(base[:-2] + '線')
    for base in list(out):                               # 中央・総武線 → 中央線 · 総武線
        if '・' in base and base.endswith('線'):
            for p in base[:-1].split('・'):
                if p:
                    out.add(p if p.endswith('線') else p + '線')
    return {x for x in out if len(x) >= 2}


def line_match(aliases, our_name):
    """한쪽이 다른 쪽을 품으면 맞은 것으로 본다. 점수는 겹친 글자 수."""
    best = 0
    for a in aliases:
        if a == our_name:
            best = max(best, len(a) + 10)
        elif our_name in a or a in our_name:
            best = max(best, min(len(a), len(our_name)))
    return best


def hav(a, b, c, d):
    R, p = 6371000.0, math.pi / 180
    return 2 * R * math.asin(math.sqrt(
        math.sin((c - a) * p / 2) ** 2 +
        math.cos(a * p) * math.cos(c * p) * math.sin((d - b) * p / 2) ** 2))


code2name = {l['code']: l['name_kanji'] for l in src_ln if l.get('code') and l.get('name_kanji')}
corp_of = {int(lid): l.get('corp_id') for lid, l in ours_ln.items()}
is_shinkansen = {int(lid): '新幹線' in l['name'] for lid, l in ours_ln.items()}

our_by_name = collections.defaultdict(set)
for lid, l in ours_ln.items():
    our_by_name[norm(l['name'])].add(int(lid))

by_station_name = collections.defaultdict(list)
for sid, s in ours_st.items():
    by_station_name[norm(s['name'])].append((sid, s['lat'], s['lon']))

lines_at = collections.defaultdict(set)
for a, nbrs in graph.items():
    for b, e in nbrs.items():
        for ln_ in e.get('available_lines', []):
            lines_at[a].add(ln_); lines_at[b].add(ln_)

operator = lambda src_line: (src_line or '.').split('.')[0]
NUM = re.compile(r'^([A-Za-z]+)[-\s]?(\d+)$')

# ── 1. 출처를 훑어 (역, 출처 노선, 번호) 를 모은다 ────────────────────────────
stat = collections.Counter()
raw = []
for g in src_st:
    for s in g.get('stations', []):
        sc = (s.get('short_code') or '').strip()
        if not sc:
            continue
        stat['출처에 번호 있음'] += 1
        m = NUM.match(sc)
        if not m:
            stat['번호 형식 모름'] += 1; continue
        lname = code2name.get(s.get('line_code') or '')
        if not lname:
            stat['출처 노선 이름 없음'] += 1; continue

        aliases = line_aliases(lname)
        cands = by_station_name.get(norm(s['name_kanji']), [])
        if not cands:
            stat['우리 역 이름에 없음'] += 1; continue

        # 같은 이름의 역이 여럿이면(池袋 처럼 회사별로 쪼개져 있다) 가장 가까운 것이 아니라
        # **그 노선이 실제로 닿는** 것을 고른다. 없으면 그때 가장 가까운 것을 쓴다.
        scored = []
        for sid, lat, lon in cands:
            d = hav(s['lat'], s['lon'], lat, lon)
            if d > 1500:
                continue
            here = lines_at.get(sid, set())
            best = max((line_match(aliases, norm(ours_ln[str(l)]['name'])) for l in here), default=0)
            scored.append((-best, d, sid))
        if not scored:
            stat['좌표가 1.5km 넘게 어긋남'] += 1; continue
        scored.sort()
        sid = scored[0][2]

        raw.append(dict(station_id=sid, src_line=s['line_code'], src_line_name=lname,
                        code=m.group(1), number=m.group(2), name=s['name_kanji'],
                        aliases=aliases))

# ── 2. 이름으로 우리 노선을 고른다 ────────────────────────────────────────────
for r in raw:
    here = lines_at.get(r['station_id'], set())
    scored = [(line_match(r['aliases'], norm(ours_ln[str(l)]['name'])), l) for l in here]
    scored = [x for x in scored if x[0] > 0]
    if scored:
        top = max(s for s, _ in scored)
        r['line_ids'] = sorted(l for s, l in scored if s == top)
        r['exact'] = True

# ── 3. 남은 자리를 메운다 ────────────────────────────────────────────────────
#
# 京浜東北線 처럼 출처의 한 노선이 우리 선적에서 東北線·東海道線·根岸線 셋으로 쪼개져 있으면
# 이름이 맞물릴 자리가 애초에 없다. 그럴 때만, 그 출처 노선이 지나는 역들에서 자주 함께
# 나오는 우리 노선을 세어 이 역에도 닿는 것을 쓴다. 울타리 셋을 친다.
#   · 회사가 같아야 한다 (東武の TJ 가 東京メトロ有楽町線에 붙지 않도록)
#   · 그 역에서 다른 출처 노선이 이름으로 이미 집어간 노선은 뺀다
#   · 신칸센 선로에는 재래선 번호를 달지 않는다
op_corp_votes = collections.defaultdict(collections.Counter)
for r in raw:
    for lid in r.get('line_ids', []):
        op_corp_votes[operator(r['src_line'])][corp_of.get(lid)] += 1
op_corp = {op: c.most_common(1)[0][0] for op, c in op_corp_votes.items() if c}

claimed = collections.defaultdict(set)
for r in raw:
    for lid in r.get('line_ids', []):
        claimed[r['station_id']].add(lid)

co_occur = collections.defaultdict(collections.Counter)
for r in raw:
    for lid in lines_at.get(r['station_id'], set()):
        co_occur[r['src_line']][lid] += 1

for r in raw:
    if r.get('line_ids'):
        continue
    want_corp = op_corp.get(operator(r['src_line']))
    here = lines_at.get(r['station_id'], set()) - claimed[r['station_id']]
    here = {l for l in here if not is_shinkansen[l] or '新幹線' in r['src_line_name']}
    if want_corp is not None:
        here = {l for l in here if corp_of.get(l) == want_corp}
    pick = [l for l, _ in co_occur[r['src_line']].most_common() if l in here]
    if pick:
        r['line_ids'] = pick[:1]
        r['exact'] = False
        stat['같은 노선의 다른 역을 보고 채움'] += 1
    else:
        stat['댈 만한 우리 노선이 없어 버림'] += 1

# ── 4. 한 (역, 노선) 에 두 기호가 붙으면 더 확실한 쪽을 남긴다 ────────────────
#
# 湘南新宿ライン·上野東京ライン 처럼 여러 선적 위를 달리는 **운행계통**은 3단계에서
# 사방으로 번진다. 이름으로 맞춘 것이 먼저고, 둘 다 추정이면 **덜 퍼진 쪽**(선적을 적게
# 걸치는 쪽)이 그 선로의 주인에 가깝다.
spread = collections.Counter()
for r in raw:
    for lid in r.get('line_ids', []):
        spread[r['src_line']] += 0
for src_line, cnt in co_occur.items():
    spread[src_line] = len({l for r in raw if r['src_line'] == src_line for l in r.get('line_ids', [])})

best = {}
for r in raw:
    for lid in r.get('line_ids', []):
        key = (r['station_id'], lid)
        rank = (0 if r.get('exact') else 1, spread[r['src_line']])
        if key not in best or rank < best[key][0]:
            best[key] = (rank, r)

# 출처의 자릿수가 들쭉날쭉하다 — 같은 京王인데 `KO1` 이고 東武는 `TJ-01` 이다.
# 번호를 지어내지는 않되, 같은 기호에 두 자리가 하나라도 있으면 **표기 폭만** 맞춘다.
width = collections.defaultdict(int)
for (_, _), (_, r) in best.items():
    width[r['code']] = max(width[r['code']], len(r['number']))

out = []
for (sid, lid), (_, r) in best.items():
    out.append(dict(station_id=sid, line_id=lid, line_code=r['code'],
                    number=r['number'].rjust(width[r['code']], '0')))
out.sort(key=lambda r: (r['line_code'], int(r['number']), r['station_id']))

print()
for k, v in stat.most_common():
    print(f'  {k}: {v:,}')
print()
print(f'맞물린 (역,노선) 쌍 {len(out):,} · 역 {len({r["station_id"] for r in out}):,} · '
      f'우리 노선 {len({r["line_id"] for r in out}):,} · 기호 {len({r["line_code"] for r in out})}종')
by = collections.defaultdict(list)
for r in out:
    by[r['station_id']].append({'line_id': r['line_id'], 'code': r['line_code'], 'number': r['number']})
for k in by:
    by[k].sort(key=lambda x: (x['code'], x['number']))

doc = {
    '_source': 'piuccio/open-data-jp-railway-stations (MIT) ← ekidata.jp + 公共交通オープンデータセンター(ODPT)',
    '_copyright': 'このデータは、公共交通オープンデータセンターにおいて提供されるデータ等を利用して作成しています。'
                  'データ等の正確性及び完全性等は保証されておらず、また、権利者は利用者による利用に関して一切の責任を負いません。',
    '_note': '駅ナンバリング(노선 기호 + 역 번호). 출처의 ekidata 노선 축을 우리 N02 선적 축으로 옮긴 것이라 '
             '(역, 노선) 쌍이 키다. 출처에 없는 역·노선은 아예 넣지 않았다 — 번호를 지어내지 않는다. '
             '지금 범위는 수도권 22개 사업자. 만드는 법은 scripts/build_station_codes.py.',
    '_stations': len(by),
    '_pairs': len(out),
    '_line_codes': sorted({r['line_code'] for r in out}),
    'codes': dict(sorted(by.items())),
}
dst = os.path.join(RAIL, 'station_codes.json')
with open(dst, 'w', encoding='utf-8') as f:
    json.dump(doc, f, ensure_ascii=False, separators=(',', ':'))
print(dst)
print(f'  역 {len(by):,} · (역,노선) 쌍 {len(out):,} · 기호 {len(doc["_line_codes"])}종')
print('  manifest 를 다시 만드세요: npm run build:rail-manifest')
