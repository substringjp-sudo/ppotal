import json
import os
import re
import sys

BASE_DIR = "/Users/yunhyeongseob/dev/p-plan"
MIGRATION_FILE = os.path.join(BASE_DIR, "web/public/data/region/id-migration.json")

# 1. Load Migration Data
print(f"Loading migration data from {MIGRATION_FILE}...")
with open(MIGRATION_FILE, 'r', encoding='utf-8') as f:
    migration = json.load(f)

# The keys in the migration file are strings, but our IDs in data files can be ints
country_map = {int(k): v for k, v in migration['country'].items()}
prefecture_map = {int(k): v for k, v in migration['prefecture'].items()}
city_map = {int(k): v for k, v in migration['city'].items()}

print(f"Loaded {len(country_map)} countries, {len(prefecture_map)} prefectures, {len(city_map)} cities.")

# 2. Helper Functions
def replace_ids_in_file(file_path, id_type):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    print(f"Processing content: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    def migrate_node(node, level=None):
        """Recursively migrate IDs in tree or lists"""
        if isinstance(node, list):
            for item in node: migrate_node(item, level)
        elif isinstance(node, dict):
            # Special logic for tree where level counts
            if id_type == 'tree' and 'id' in node:
                oid = node['id']
                if level == 0: node['id'] = country_map.get(oid, oid)
                elif level == 1: node['id'] = prefecture_map.get(oid, oid)
                elif level == 2: node['id'] = city_map.get(oid, oid)
                
                if 'prefectures' in node: migrate_node(node['prefectures'], 1)
                if 'cities' in node: migrate_node(node['cities'], 2)
            else:
                # Regular flat list migration
                for key in ['id', 'country', 'prefecture', 'city']:
                    if key in node:
                        val = node[key]
                        if not isinstance(val, (int, float)): continue # Already string or something else
                        
                        if key == 'id':
                            if id_type == 'country': node[key] = country_map.get(val, val)
                            elif id_type == 'prefecture': node[key] = prefecture_map.get(val, val)
                            elif id_type == 'city': node[key] = city_map.get(val, val)
                        elif key == 'country': node[key] = country_map.get(val, val)
                        elif key == 'prefecture': node[key] = prefecture_map.get(val, val)
                        elif key == 'city': node[key] = city_map.get(val, val)

    if id_type == 'tree': migrate_node(data, 0)
    else: migrate_node(data)

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, separators=(',', ':'), ensure_ascii=False)

def migrate_geom_array_to_map(file_path, target_map):
    if not os.path.exists(file_path): return
    print(f"Converting large geom array to map: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if not isinstance(data, list):
        print(f"Skipping {file_path} as it's not an array.")
        return

    new_data = {}
    for idx, geom in enumerate(data):
        if idx in target_map:
            new_data[target_map[idx]] = geom
        else:
            # Keep as original index if not in map (e.g. invalid IDs)
            new_data[str(idx)] = geom
            
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(new_data, f, separators=(',', ':'), ensure_ascii=False)

def migrate_filenames(dir_path, target_map, recursive=False):
    if not os.path.exists(dir_path):
        return
    
    print(f"Migrating filenames in: {dir_path}")
    for root, dirs, files in os.walk(dir_path, topdown=False):
        for name in files:
            match = re.match(r'^([0-9]+)\.json$', name)
            if match:
                old_id = int(match.group(1))
                if old_id in target_map:
                    new_name = f"{target_map[old_id]}.json"
                    os.rename(os.path.join(root, name), os.path.join(root, new_name))
        
        if recursive:
            for dname in dirs:
                if dname.isdigit():
                    old_id = int(dname)
                    if old_id in target_map:
                        new_name = target_map[old_id]
                        os.rename(os.path.join(root, dname), os.path.join(root, new_name))

# 3. Execution
region_dirs = [
    os.path.join(BASE_DIR, 'data/region'),
    os.path.join(BASE_DIR, 'web/public/data/region')
]

for d in region_dirs:
    replace_ids_in_file(os.path.join(d, 'countries.json'), 'country')
    replace_ids_in_file(os.path.join(d, 'prefectures.json'), 'prefecture')
    replace_ids_in_file(os.path.join(d, 'cities.json'), 'city')
    replace_ids_in_file(os.path.join(d, 'tree.json'), 'tree')

print("Metadata content migration done.")

# Airport
replace_ids_in_file(os.path.join(BASE_DIR, 'data/airport/airports.json'), 'airport')
print("Airport content migration done.")

# Large Geom Conversion
migrate_geom_array_to_map(os.path.join(BASE_DIR, 'data/region/country_geom.json'), country_map)
migrate_geom_array_to_map(os.path.join(BASE_DIR, 'data/region/prefecture_geom.json'), prefecture_map)
migrate_geom_array_to_map(os.path.join(BASE_DIR, 'data/region/city_geom.json'), city_map)
print("Large geometry arrays converted to ID maps.")

# Filenames
migrate_filenames(os.path.join(BASE_DIR, 'data/region/geoms/prefecture'), prefecture_map)
# Special walk for city geoms which might be nested
for root, dirs, files in os.walk(os.path.join(BASE_DIR, 'data/region/geoms/city')):
    for f in files:
        if f.endswith('.json') and f[:-5].isdigit():
            oid = int(f[:-5])
            if oid in city_map:
                os.rename(os.path.join(root, f), os.path.join(root, f"{city_map[oid]}.json"))

migrate_filenames(os.path.join(BASE_DIR, 'data/airport/countries'), country_map, recursive=True)

print("Migration completed successfully.")
