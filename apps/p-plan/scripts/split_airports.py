import json
import os

BASE_DIR = "/Users/yunhyeongseob/dev/p-plan"
AIRPORT_DIR = os.path.join(BASE_DIR, 'data', 'airport')
OUTPUT_DIR = os.path.join(AIRPORT_DIR, 'countries')

def load_json(filename):
    path = os.path.join(AIRPORT_DIR, filename)
    if not os.path.exists(path):
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_countries():
    path = os.path.join(BASE_DIR, 'data', 'region', 'countries.json')
    if not os.path.exists(path):
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def split_airports():
    print("Loading airports...")
    airports = load_json('airports.json')
    if not airports:
        print("Required data files missing.")
        return

    countries = load_countries()
    if not countries:
        print("Required countries.json missing.")
        return
        
    country_map = {c['id']: c['code'] for c in countries}

    print("Indexing airports by country...")
    airports_by_country = {}
    for a in airports:
        cid = a['country']
        if cid == -1: continue # Skip unassigned
        if cid not in airports_by_country:
            airports_by_country[cid] = []
        airports_by_country[cid].append(a)

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    for cid, items in airports_by_country.items():
        code = country_map.get(cid, "unk").lower()
        filename = f"airports_{code}_{cid}.json"
        out_path = os.path.join(OUTPUT_DIR, filename)
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(items, f, separators=(',', ':'), ensure_ascii=False)
    
    print(f"Saved {len(airports_by_country)} files to {OUTPUT_DIR}")

if __name__ == "__main__":
    split_airports()
