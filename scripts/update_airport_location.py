import json
import os
from shapely.geometry import shape, Point

def update_airports():
    airports_path = '/Users/yunhyeongseob/dev/jprail/public/data/airports.json'
    adm1_path = '/Users/yunhyeongseob/dev/jprail/public/data/geoBoundaries-JPN-ADM1_simplified.geojson'
    adm2_path = '/Users/yunhyeongseob/dev/jprail/public/data/geoBoundaries-JPN-ADM2_simplified.geojson'
    names_path = '/Users/yunhyeongseob/dev/jprail/public/data/region_names.json'

    # Load data
    with open(airports_path, 'r', encoding='utf-8') as f:
        airports = json.load(f)
    
    with open(adm1_path, 'r', encoding='utf-8') as f:
        adm1_geo = json.load(f)
    
    with open(adm2_path, 'r', encoding='utf-8') as f:
        adm2_geo = json.load(f)
    
    with open(names_path, 'r', encoding='utf-8') as f:
        names_data = json.load(f)

    # Convert GeoJSON features to shapely objects for fast point-in-polygon
    print("Preparing GeoJSON geometries...")
    adm1_features = []
    for i, feature in enumerate(adm1_geo['features']):
        region_id = f'p{i+1}'
        adm1_features.append({
            'geometry': shape(feature['geometry']),
            'id': region_id
        })

    adm2_features = []
    for i, feature in enumerate(adm2_geo['features']):
        region_id = f'c{i+1}'
        adm2_features.append({
            'geometry': shape(feature['geometry']),
            'id': region_id
        })

    def find_location(lat, lon):
        point = Point(lon, lat) # shapely uses (x, y) = (lon, lat)
        
        adm1_id = None
        adm2_id = None

        # Try exact Match for Prefecture (ADM1)
        for feat in adm1_features:
            if feat['geometry'].contains(point):
                adm1_id = feat['id']
                break
        
        # Fallback for Prefecture: Nearest
        if not adm1_id:
            min_dist = float('inf')
            for feat in adm1_features:
                dist = feat['geometry'].distance(point)
                if dist < min_dist:
                    min_dist = dist
                    adm1_id = feat['id']

        # Try exact Match for City (ADM2)
        for feat in adm2_features:
            if feat['geometry'].contains(point):
                adm2_id = feat['id']
                break
        
        # Fallback for City: Nearest
        if not adm2_id:
            min_dist = float('inf')
            for feat in adm2_features:
                dist = feat['geometry'].distance(point)
                if dist < min_dist:
                    min_dist = dist
                    adm2_id = feat['id']
        
        return adm1_id, adm2_id

    print(f"Updating {len(airports)} airports...")
    for airport in airports:
        lat, lon = airport['location']
        adm1_id, adm2_id = find_location(lat, lon)
        
        # Remove old fields if they exist from previous run
        for field in ['prefecture', 'prefecture_en', 'prefecture_kr', 'city', 'city_en', 'city_kr']:
            airport.pop(field, None)

        if adm1_id:
            airport['adm1'] = adm1_id
        if adm2_id:
            airport['adm2'] = adm2_id

    with open(airports_path, 'w', encoding='utf-8') as f:
        json.dump(airports, f, ensure_ascii=False, indent=2)
    
    print("Successfully updated airports.json with standardized region IDs (adm1, adm2).")

if __name__ == "__main__":
    update_airports()
