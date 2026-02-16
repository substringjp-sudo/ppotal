import json
import os
from collections import defaultdict

def enrich_stations():
    # Paths
    base_dir = '/Users/yunhyeongseob/dev/jprail/public'
    geojson_path = os.path.join(base_dir, 'N02-22_Station.geojson')
    hierarchy_path = os.path.join(base_dir, 'station_hierarchy.json')
    output_hierarchy_path = os.path.join(base_dir, 'station_hierarchy_enriched.json')
    output_master_path = os.path.join(base_dir, 'station_master_list.json')

    # 1. Load GeoJSON
    print(f"Loading {geojson_path}...")
    with open(geojson_path, 'r', encoding='utf-8') as f:
        geojson = json.load(f)

    # 2. Process GeoJSON to map Line+Station -> Codes
    # Key: (LineName, StationName) -> { code, group, company, lat, lon }
    # Also Key: GroupCode -> [ list of station entries ]
    
    station_map = {} # (Line, Name) -> Info
    group_map = defaultdict(list) # GroupCode -> List of station infos
    
    print("Processing stations...")
    for feature in geojson['features']:
        props = feature['properties']
        geom = feature['geometry']
        
        line = props['N02_003']
        company = props['N02_004']
        station_name = props['N02_005']
        station_code = props.get('N02_005c')
        group_code = props.get('N02_005g')
        
        # Calculate centroid if LineString (usually segments)
        coords = geom['coordinates']
        if geom['type'] == 'LineString':
            # Simple average of points
            lats = [p[1] for p in coords]
            lons = [p[0] for p in coords]
            lat = sum(lats) / len(lats)
            lon = sum(lons) / len(lons)
        else:
             # Fallback or CurvePolygon? usually data is LineString
             lat = 0
             lon = 0

        info = {
            "name": station_name,
            "line": line,
            "company": company,
            "code": station_code,
            "group": group_code,
            "lat": lat,
            "lon": lon,
            "geometry": coords # Store raw coordinates
        }

        # Normalize line name if needed? 
        # The hierarchy file seems to use exact names from N02 usually
        key = (line, station_name)
        
        # We need to collect ALL segments for proper platform shape.
        # So we append to station_map list instead of overwriting?
        # But wait, existing logic uses station_map as a lookup for hierarchy matching.
        # Hierarchy matching only needs ONE representative for codes.
        
        if key not in station_map:
            station_map[key] = info
        
        # For the group map (master list), we want all date.
        if group_code:
            group_map[group_code].append(info)

    print(f"Found {len(station_map)} unique line-stations.")
    print(f"Found {len(group_map)} unique transfer groups.")

    # 3. Load Hierarchy and Augment
    print(f"Loading {hierarchy_path}...")
    with open(hierarchy_path, 'r', encoding='utf-8') as f:
        hierarchy = json.load(f)
        
    enriched_hierarchy = {}
    
    match_count = 0
    total_count = 0
    
    for company, lines in hierarchy.items():
        enriched_hierarchy[company] = {}
        for line, stations in lines.items():
            enriched_list = []
            for station in stations:
                total_count += 1
                
                # Handle if station is already an object (from previous run?)
                if isinstance(station, dict):
                    station_name = station['name']
                else:
                    station_name = station
                
                # Try to find in map
                key = (line, station_name)
                
                # Check directly
                info = station_map.get(key)
                
                # Fallback: sometimes names differ slightly? 
                # For now, strict match.
                
                if info:
                    match_count += 1
                    enriched_list.append({
                        "name": station_name,
                        "code": info['code'],
                        "group": info['group'],
                        "lat": info['lat'],
                        "lon": info['lon']
                    })
                else:
                    # Keep as object but without codes if missing
                    # print(f"Missing: {company} - {line} - {station}")
                    enriched_list.append({
                        "name": station_name,
                        "code": None,
                        "group": None
                    })
            enriched_hierarchy[company][line] = enriched_list
            
    print(f"Matched {match_count}/{total_count} stations ({match_count/total_count*100:.1f}%)")
    
    # 4. Save Enriched Hierarchy
    print(f"Saving to {output_hierarchy_path}...")
    with open(output_hierarchy_path, 'w', encoding='utf-8') as f:
        json.dump(enriched_hierarchy, f, ensure_ascii=False, indent=2)

    # 5. Create Master Station Group List (for transfers)
    # Filter group map to unique stations per group
    master_groups = {}
    for gcode, infos in group_map.items():
        # Dedup by (line, name) but AGGREGATE geometries
        seen_map = {} # (line, name) -> station_obj
        
        for info in infos:
            k = (info['line'], info['name'])
            if k not in seen_map:
                # New station entry
                seen_map[k] = {
                    "name": info['name'],
                    "line": info['line'],
                    "company": info['company'],
                    "code": info['code'],
                    "group": info['group'],
                    "lat": info['lat'],
                    "lon": info['lon'],
                    "geometries": [info['geometry']] # Start list of geometries
                }
            else:
                # Existing station entry, just append geometry
                seen_map[k]['geometries'].append(info['geometry'])
                # Optionally average lat/lon? For now keep first.
        
        unique_stations = list(seen_map.values())
        
        # Pick a primary name (e.g. grouped by name freq or just first)
        primary_name = unique_stations[0]['name'] if unique_stations else "Unknown"
        
        # Calculate group centroid
        if unique_stations:
            avg_lat = sum(s['lat'] for s in unique_stations) / len(unique_stations)
            avg_lon = sum(s['lon'] for s in unique_stations) / len(unique_stations)
        else:
            avg_lat = 0
            avg_lon = 0
        
        master_groups[gcode] = {
            "id": gcode,
            "primary_name": primary_name,
            "stations": unique_stations,
            "lat": avg_lat,
            "lon": avg_lon,
        }
        
    print(f"Saving master groups to {output_master_path}...")
    with open(output_master_path, 'w', encoding='utf-8') as f:
        json.dump(master_groups, f, ensure_ascii=False, indent=2)
        
    print("Done.")

if __name__ == "__main__":
    enrich_stations()
