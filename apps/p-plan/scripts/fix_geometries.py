import json
import os
import subprocess

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def run_batch_fix():
    raw_adm1_path = "raw/adm1.geojson"
    tree_path = "web/public/data/region/tree.json"
    countries_path = "web/public/data/region/countries.json"
    output_dir = "web/public/data/region/geoms/country_topo"
    npx_path = "/opt/homebrew/opt/node@22/bin/npx"
    node_bin_dir = "/opt/homebrew/opt/node@22/bin"
    
    # Update PATH
    env = os.environ.copy()
    env["PATH"] = f"{node_bin_dir}:{env.get('PATH', '')}"

    os.makedirs(output_dir, exist_ok=True)

    print("Loading metadata...")
    tree = load_json(tree_path)
    countries = load_json(countries_path)
    
    # Map ISO -> Country Data (from tree)
    iso_to_country = {}
    iso_lookup = {c['code']: c['id'] for c in countries}
    
    for c_data in tree:
        # Find matches in countries.json by ID (padded vs unpadded)
        tid = c_data['id']
        # Try both formats to find ISO
        match = next((c for c in countries if c['id'] == tid or c['id'] == tid.lstrip('0')), None)
        if match:
            c_data['iso'] = match['code']
            c_data['unpadded_id'] = match['id'].lstrip('0') or "0"
            iso_to_country[match['code']] = c_data

    # Group Features by ISO
    print("Grouping ADM1 features from raw file (this may take a minute)...")
    grouped_features = {}
    with open(raw_adm1_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        for feat in data['features']:
            iso = feat['properties'].get('shapeGroup')
            if iso in iso_to_country:
                if iso not in grouped_features:
                    grouped_features[iso] = []
                grouped_features[iso].append(feat)
    
    print(f"Features grouped for {len(grouped_features)} countries.")

    # Process each country
    for iso, features in grouped_features.items():
        country_data = iso_to_country[iso]
        country_id = country_data['unpadded_id']
        
        print(f"Processing {country_data['name']} ({iso}, ID {country_id})...")
        
        pref_map = {p['name'].strip().lower(): p['id'] for p in country_data.get('prefectures', [])}
        
        processed_features = []
        for feat in features:
            name = feat['properties'].get('shapeName', '').strip()
            tid = pref_map.get(name.lower())
            
            # Fallback
            if not tid:
                for tname, t_id in pref_map.items():
                    if name.lower() in tname or tname in name.lower():
                        tid = t_id
                        break
            
            if tid:
                feat['properties'] = {
                    "id": tid,
                    "name": name,
                    "countryId": country_id,
                    "type": "prefecture"
                }
                processed_features.append(feat)

        if not processed_features:
            continue

        # Save Temp & Convert
        temp_geojson = f"scripts/temp_{country_id}.geojson"
        with open(temp_geojson, 'w', encoding='utf-8') as f:
            json.dump({"type": "FeatureCollection", "features": processed_features}, f)
        
        topo_output = os.path.join(output_dir, f"{country_id}.json")
        try:
            cmd = f"{npx_path} --prefix web geo2topo regions={temp_geojson} -o {topo_output}"
            subprocess.run(cmd, shell=True, check=True, capture_output=True, env=env)
        except Exception as e:
            print(f"  Failed to convert {iso}: {e}")
        
        if os.path.exists(temp_geojson):
            os.remove(temp_geojson)

if __name__ == "__main__":
    run_batch_fix()
