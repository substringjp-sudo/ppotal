import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data', 'region')

def clean_cities():
    path = os.path.join(DATA_DIR, 'cities.json')
    if not os.path.exists(path): return
    
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Filter out entries with null name and empty name_local
    initial_count = len(data)
    cleaned_data = [c for c in data if c.get('name') is not None]
    final_count = len(cleaned_data)
    
    if initial_count != final_count:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(cleaned_data, f, ensure_ascii=False, indent=2)
        print(f"Cleaned {initial_count - final_count} entries from cities.json")

def clean_tree():
    path = os.path.join(DATA_DIR, 'tree.json')
    if not os.path.exists(path): return
    
    with open(path, 'r', encoding='utf-8') as f:
        tree = json.load(f)
    
    # Tree is a list of countries -> prefectures (divisions) -> cities
    # We need to filter deep in the tree.
    cleaned_count = 0
    
    for country in tree:
        for prefecture in country.get('prefectures', []):
            initial_len = len(prefecture.get('cities', []))
            prefecture['cities'] = [c for c in prefecture.get('cities', []) if c.get('name') is not None]
            cleaned_count += (initial_len - len(prefecture['cities']))
            
    if cleaned_count > 0:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(tree, f, ensure_ascii=False, indent=2)
        print(f"Cleaned {cleaned_count} entries from tree.json")

def clean_individual_cities():
    city_dir = os.path.join(DATA_DIR, 'cities')
    if not os.path.exists(city_dir): return
    
    cleaned_count = 0
    for filename in os.listdir(city_dir):
        if filename.endswith('.json'):
            path = os.path.join(city_dir, filename)
            data = load_json(path)
            if data:
                initial_len = len(data)
                cleaned_data = [c for c in data if c.get('name') is not None]
                if initial_len != len(cleaned_data):
                    save_json(path, cleaned_data)
                    cleaned_count += (initial_len - len(cleaned_data))
    
    if cleaned_count > 0:
        print(f"Cleaned {cleaned_count} entries from individual city files")

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    clean_cities()
    clean_tree()
    clean_individual_cities()
