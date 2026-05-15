import json
import urllib.request
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, 'data', 'routes.json')
SOURCE_URL = "https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat"

def fetch_routes():
    print(f"Fetching from {SOURCE_URL}...")
    try:
        with urllib.request.urlopen(SOURCE_URL) as response:
            content = response.read().decode('utf-8')
    except Exception as e:
        print(f"Error fetching source: {e}")
        return

    lines = content.strip().split('\n')
    processed_data = []
    
    # Format: Airline, Airline ID, Source airport, Source airport ID, 
    # Destination airport, Destination airport ID, Codeshare, Stops, Equipment
    for line in lines:
        parts = line.split(',')
        if len(parts) < 6:
            continue
            
        airline = parts[0].strip()
        src = parts[2].strip()
        dst = parts[4].strip()
        stops = parts[7].strip()
        
        # Only include routes with valid IATA codes (typically 2-3 characters)
        if len(airline) > 3 or len(src) != 3 or len(dst) != 3:
            continue
            
        # We only care about direct flights (stops == '0') for the route map
        if stops != '0':
            continue

        processed_data.append({
            "airline": airline,
            "src": src,
            "dst": dst
        })

    # Save to data/routes.json
    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    with open(DATA_PATH, 'w', encoding='utf-8') as f:
        json.dump(processed_data, f, ensure_ascii=False, indent=2)
    
    print(f"Successfully saved {len(processed_data)} routes to {DATA_PATH}")

if __name__ == "__main__":
    fetch_routes()
