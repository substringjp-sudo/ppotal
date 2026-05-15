import json
import os
import csv
import sys

# Base configuration
BASE_DIR = "/Users/yunhyeongseob/dev/p-plan"
REGION_DIR = os.path.join(BASE_DIR, 'data', 'region')
AIRPORT_DIR = os.path.join(BASE_DIR, 'data', 'airport')
RAW_DIR = os.path.join(BASE_DIR, 'raw')

def is_point_in_polygon(x, y, polygon):
    inside = False
    for ring in polygon:
        n = len(ring)
        if n < 3: continue
        p1x, p1y = ring[0]
        for i in range(1, n + 1):
            p2x, p2y = ring[i % n]
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                            if p1x == p2x or x <= xinters:
                                inside = not inside
            p1x, p1y = p2x, p2y
    return inside

def is_point_in_geom(x, y, geom):
    if geom['type'] == 'Polygon':
        return is_point_in_polygon(x, y, geom['coordinates'])
    elif geom['type'] == 'MultiPolygon':
        for poly in geom['coordinates']:
            if is_point_in_polygon(x, y, poly): return True
    return False

def get_bbox(geom):
    def flatten(coords):
        for x in coords:
            if isinstance(x[0], (int, float)): yield x
            else: yield from flatten(x)
    flat = list(flatten(geom['coordinates']))
    if not flat: return None
    lons = [p[0] for p in flat]
    lats = [p[1] for p in flat]
    return (min(lons), min(lats), max(lons), max(lats))

def load_json(filename):
    path = os.path.join(REGION_DIR, filename)
    if not os.path.exists(path):
        print(f"Error: {path} not found.")
        return None
    print(f"Loading {filename} (this may take a few seconds)...")
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def process_airports():
    countries = load_json('countries.json')
    country_geoms = load_json('country_geom.json')
    prefectures = load_json('prefectures.json')
    pref_geoms = load_json('prefecture_geom.json')
    cities = load_json('cities.json')
    city_geoms = load_json('city_geom.json')

    if not all([countries, country_geoms]):
        print("Required data files missing.")
        return

    print("Pre-calculating bboxes...")
    country_bboxes = {cid: get_bbox(g) for cid, g in country_geoms.items()}
    pref_bboxes = {pid: get_bbox(g) if g else None for pid, g in pref_geoms.items()}
    city_bboxes = {cid: get_bbox(g) if g else None for cid, g in city_geoms.items()}

    print("Indexing geographical data...")
    prefs_by_country = {}
    for p in prefectures:
        cid = p['country']
        if cid not in prefs_by_country: prefs_by_country[cid] = []
        prefs_by_country[cid].append(p)

    cities_by_country = {}
    for c in cities:
        cid = c['country']
        if cid not in cities_by_country: cities_by_country[cid] = []
        cities_by_country[cid].append(c)

    input_path = os.path.join(RAW_DIR, 'airports.csv')
    output_path = os.path.join(AIRPORT_DIR, 'airports.json')

    results = []

    print("Processing airports...")
    last_country_id = None

    with open(input_path, mode='r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        count = 0
        for row in reader:
            try:
                aid = int(row['id'])
                name = row['name']
                atype = row['type']
                lat = float(row['latitude_deg'])
                lon = float(row['longitude_deg'])
                code = row.get('iata_code', '')
                
                country_id = None
                prefecture_id = None
                city_id = None

                # Optimization: check last found country first
                found_cid = None
                if last_country_id is not None:
                    bbox = country_bboxes.get(last_country_id)
                    if bbox and bbox[0] <= lon <= bbox[2] and bbox[1] <= lat <= bbox[3]:
                        if is_point_in_geom(lon, lat, country_geoms[last_country_id]):
                            found_cid = last_country_id
                
                if found_cid is None:
                    for cid, bbox in country_bboxes.items():
                        if bbox and bbox[0] <= lon <= bbox[2] and bbox[1] <= lat <= bbox[3]:
                            if is_point_in_geom(lon, lat, country_geoms[cid]):
                                found_cid = cid
                                last_country_id = cid
                                break
                
                if found_cid is not None:
                    country_id = found_cid
                    
                    # 2. Prefecture
                    candidates = prefs_by_country.get(country_id, [])
                    for p in candidates:
                        pid = p['id']
                        bbox = pref_bboxes.get(pid)
                        if bbox and bbox[0] <= lon <= bbox[2] and bbox[1] <= lat <= bbox[3]:
                            if is_point_in_geom(lon, lat, pref_geoms[pid]):
                                prefecture_id = pid
                                break
                    
                    # 3. City
                    city_candidates = cities_by_country.get(country_id, [])
                    if prefecture_id is not None and prefecture_id != -1:
                        city_candidates = [c for c in city_candidates if c.get('prefecture') == prefecture_id]
                    
                    for c in city_candidates:
                        cid = c['id']
                        bbox = city_bboxes.get(cid)
                        if bbox and bbox[0] <= lon <= bbox[2] and bbox[1] <= lat <= bbox[3]:
                            if is_point_in_geom(lon, lat, city_geoms.get(cid)):
                                city_id = cid
                                break

                results.append({
                    "id": aid,
                    "name": name,
                    "type": atype,
                    "coord": [lat, lon],
                    "code": code,
                    "country": country_id,
                    "prefecture": prefecture_id,
                    "city": city_id
                })
                
                count += 1
                if count % 100 == 0:
                    print(f"Processed {count} airports...")

            except Exception as e:
                print(f"Error processing row {row['id']}: {e}")

    print(f"Saving {len(results)} airports to {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, separators=(',', ':'), ensure_ascii=False)
    print("Done!")

if __name__ == "__main__":
    process_airports()
