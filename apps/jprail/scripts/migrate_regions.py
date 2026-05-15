import json
import os

def migrate():
    region_names_path = "public/data/region_names.json"
    stations_master_path = "public/rail/stations_master.json"

    print(f"Loading {region_names_path}...")
    with open(region_names_path, 'r', encoding='utf-8') as f:
        regions = json.load(f)

    print(f"Loading {stations_master_path}...")
    with open(stations_master_path, 'r', encoding='utf-8') as f:
        stations = json.load(f)

    pref_map = {}
    city_map = {}

    new_adm1 = {}
    new_adm2 = {}

    # Migrate adm1 (Prefectures)
    print("Migrating adm1...")
    for i, (old_id, data) in enumerate(regions.get("adm1", {}).items(), 1):
        new_id = f"pref_{i}"
        pref_map[old_id] = new_id
        new_adm1[new_id] = {
            "name": data.get("shapeName", ""),
            "name_en": data.get("shapeName_en", ""),
            "name_kr": data.get("shapeName_kr", "")
        }

    # Migrate adm2 (Cities)
    print("Migrating adm2...")
    for i, (old_id, data) in enumerate(regions.get("adm2", {}).items(), 1):
        new_id = f"city_{i}"
        city_map[old_id] = new_id
        new_adm2[new_id] = {
            "name": data.get("shapeName", ""),
            "name_en": data.get("shapeName_en", ""),
            "name_kr": data.get("shapeName_kr", "")
        }

    new_regions = {
        "adm1": new_adm1,
        "adm2": new_adm2
    }

    # Save region_names.json
    print(f"Saving updated {region_names_path}...")
    with open(region_names_path, 'w', encoding='utf-8') as f:
        json.dump(new_regions, f, ensure_ascii=False, separators=(',', ':'))

    # Update stations_master.json
    print("Updating stations_master.json...")
    updated_stations_count = 0
    for s_id, station in stations.items():
        old_pref = station.get("prefecture_id")
        old_city = station.get("city_id")

        if old_pref in pref_map:
            station["prefecture_id"] = pref_map[old_pref]
        if old_city in city_map:
            station["city_id"] = city_map[old_city]
        
        updated_stations_count += 1

    print(f"Saving updated {stations_master_path}...")
    with open(stations_master_path, 'w', encoding='utf-8') as f:
        json.dump(stations, f, ensure_ascii=False, separators=(',', ':'))

    print("Migration complete.")
    print(f"Prefectures: {len(new_adm1)}, Cities: {len(new_adm2)}, Stations: {updated_stations_count}")

if __name__ == "__main__":
    migrate()
