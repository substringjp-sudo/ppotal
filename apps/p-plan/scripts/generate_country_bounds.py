import json
import os
import glob

def get_bbox(coords):
    """지수적인 재귀를 통해 중첩된 좌표 리스트에서 bbox를 계산합니다."""
    min_lng, min_lat = float('inf'), float('inf')
    max_lng, max_lat = float('-inf'), float('-inf')

    def process(c):
        nonlocal min_lng, min_lat, max_lng, max_lat
        if isinstance(c[0], (int, float)):
            ln, lt = c
            min_lng = min(min_lng, ln)
            min_lat = min(min_lat, lt)
            max_lng = max(max_lng, ln)
            max_lat = max(max_lat, lt)
        else:
            for sub in c:
                process(sub)

    process(coords)
    return [[min_lng, min_lat], [max_lng, max_lat]]

def generate_bounds():
    base_path = "web/public/data/region/geoms/country"
    output_file = "web/public/data/region/geoms/country_bounds.json"
    
    bounds_map = {}
    
    files = glob.glob(os.path.join(base_path, "*.json"))
    print(f"Found {len(files)} country files.")

    for file_path in files:
        country_id = os.path.basename(file_path).split('.')[0]
        # Skip if not a number
        if not country_id.isdigit():
            continue
            
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
                # GeoJSON structure check
                geom = data.get('geometry') or data
                coords = geom.get('coordinates')
                
                if coords:
                    bbox = get_bbox(coords)
                    bounds_map[country_id] = bbox
        except Exception as e:
            print(f"Error processing {file_path}: {e}")

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(bounds_map, f)
    
    print(f"Successfully generated bounds for {len(bounds_map)} countries at {output_file}")

if __name__ == "__main__":
    generate_bounds()
