import json
import os
import sys

# Base configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')

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
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        print(f"Error: {path} not found.")
        return None
    print(f"Loading {filename}...")
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def reverse_geocode(lon, lat):
    # 1. Countries
    countries = load_json('countries.json')
    country_geoms = load_json('country_geom.json')
    if not countries or not country_geoms: return None

    found_country = None
    print("Searching for country...")
    for c in countries:
        cid = c['id']
        geom = country_geoms.get(cid)
        if not geom: continue
        bbox = get_bbox(geom)
        if bbox and bbox[0] <= lon <= bbox[2] and bbox[1] <= lat <= bbox[3]:
            if is_point_in_geom(lon, lat, geom):
                found_country = c
                break
    
    if not found_country:
        return {"error": "No country found at these coordinates."}

    cid = found_country['id']
    code = found_country['code']
    print(f"Found Country: {found_country['name']} ({code})")

    # 2. Prefectures
    prefectures = load_json('prefectures.json')
    pref_geoms = load_json('prefecture_geom.json')
    
    found_pref = None
    if prefectures and pref_geoms:
        print(f"Searching for prefecture in {found_country['name']}...")
        # Only check prefectures belonging to this country
        candidates = [p for p in prefectures if p['country'] == cid]
        for p in candidates:
            pid = p['id']
            geom = pref_geoms.get(pid)
            if not geom: continue
            bbox = get_bbox(geom)
            if bbox and bbox[0] <= lon <= bbox[2] and bbox[1] <= lat <= bbox[3]:
                if is_point_in_geom(lon, lat, geom):
                    found_pref = p
                    break

    if found_pref:
        print(f"Found Prefecture: {found_pref['name']}")
    else:
        print("No prefecture found (within boundaries).")

    # 3. Cities
    cities = load_json('cities.json')
    city_geoms = load_json('city_geom.json')
    
    found_city = None
    if cities and city_geoms:
        print(f"Searching for city in {found_country['name']}...")
        # Prioritize cities in same country
        # Filter cities by country
        candidates = [c for c in cities if c['country'] == cid]
        # Further filter by prefecture if found
        if found_pref:
            pref_candidates = [c for c in candidates if c.get('prefecture') == found_pref['id']]
            if pref_candidates: candidates = pref_candidates
            
        for c in candidates:
            city_id = c['id']
            geom = city_geoms.get(city_id)
            if not geom: continue
            bbox = get_bbox(geom)
            if bbox and bbox[0] <= lon <= bbox[2] and bbox[1] <= lat <= bbox[3]:
                if is_point_in_geom(lon, lat, geom):
                    found_city = c
                    break

    if found_city:
        print(f"Found City: {found_city['name']}")

    return {
        "status": "success",
        "coordinates": {"lat": lat, "lon": lon},
        "country": {
            "id": found_country['id'],
            "name": found_country['name'],
            "code": found_country['code']
        },
        "prefecture": {
            "id": found_pref['id'] if found_pref else None,
            "name": found_pref['name'] if found_pref else None
        },
        "city": {
            "id": found_city['id'] if found_city else None,
            "name": found_city['name'] if found_city else None
        }
    }

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python reverse_geocode.py <lon> <lat>")
        print("Example: python reverse_geocode.py 127.0246 37.5326")
        sys.exit(1)

    try:
        lon = float(sys.argv[1])
        lat = float(sys.argv[2])
    except ValueError:
        print("Error: Coordinates must be numbers.")
        sys.exit(1)

    result = reverse_geocode(lon, lat)
    if result:
        print("\n" + "="*40)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        print("="*40)
