import json
import os
import urllib.request
import sys

# Base configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data', 'region') # Fixed path
RAW_DIR = os.path.join(BASE_DIR, 'raw')

# External Data Sources
COUNTRY_SOURCE = "https://raw.githubusercontent.com/mledoze/countries/master/dist/countries.json"
SUBDIVISION_SOURCE = "https://raw.githubusercontent.com/olahol/iso-3166-2.json/master/iso-3166-2.json"
# GADM South Korea Municipalities (ADM2) mapping source
KOR_ADM2_SOURCE = "https://raw.githubusercontent.com/southkorea/southkorea-maps/master/gadm/json/skorea-municipalities-geo.json"

def fetch_json(url):
    print(f"Fetching from {url}...")
    try:
        with urllib.request.urlopen(url) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def load_json(path):
    if not os.path.exists(path):
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Saved {path}")

def map_countries():
    print("Mapping Countries (ADM0)...")
    remote_countries = fetch_json(COUNTRY_SOURCE)
    if not remote_countries:
        return
    
    country_map = {}
    for rc in remote_countries:
        cca3 = rc.get('cca3')
        native = rc.get('name', {}).get('native', {})
        local_name = None
        if 'kor' in native:
            local_name = native['kor'].get('common')
        elif native:
            first_lang = list(native.values())[0]
            local_name = first_lang.get('common')
        
        if local_name:
            country_map[cca3] = local_name

    local_countries_path = os.path.join(DATA_DIR, 'countries.json')
    local_countries = load_json(local_countries_path)
    if local_countries:
        for c in local_countries:
            code = c.get('code')
            if code in country_map:
                c['name_local'] = country_map[code]
        save_json(local_countries_path, local_countries)

    adm0_path = os.path.join(RAW_DIR, 'adm0.geojson')
    adm0 = load_json(adm0_path)
    if adm0:
        for feature in adm0.get('features', []):
            code = feature['properties'].get('shapeGroup')
            if code in country_map:
                feature['properties']['name_local'] = country_map[code]
        save_json(adm0_path, adm0)

def map_prefectures():
    print("Mapping Prefectures (ADM1)...")
    pref_path = os.path.join(DATA_DIR, 'prefectures.json')
    prefectures = load_json(pref_path)
    
    adm1_path = os.path.join(RAW_DIR, 'adm1.geojson')
    adm1 = load_json(adm1_path)
    
    kr_map = {
        "Seoul": "서울", "Busan": "부산", "Daegu": "대구", "Incheon": "인천",
        "Gwangju": "광주", "Daejeon": "대전", "Ulsan": "울산", "Sejong": "세종",
        "Gyeonggi-do": "경기도", "Gangwon-do": "강원도", "Chungcheongbuk-do": "충청북도",
        "Chungcheongnam-do": "충청남도", "Jeollabuk-do": "전라북도", "Jeollanam-do": "전라남도",
        "Gyeongsangbuk-do": "경상북도", "Gyeongsangnam-do": "경상남도", "Jeju-do": "제주도"
    }

    if prefectures:
        for p in prefectures:
            name_en = p.get('name')
            if name_en in kr_map:
                p['name_local'] = kr_map[name_en]
            else:
                p['name_local'] = name_en
        save_json(pref_path, prefectures)

    if adm1:
        for feature in adm1.get('features', []):
            name_en = feature['properties'].get('shapeName')
            if name_en in kr_map:
                feature['properties']['name_local'] = kr_map[name_en]
            else:
                feature['properties']['name_local'] = name_en
        save_json(adm1_path, adm1)

def to_kr_city(name_en, kor_city_map=None):
    if not name_en: return ""
    
    # Comprehensive Static Mapping for Korea ADM2
    KOR_STATIC_MAP = {
        "Gangnam-gu": "강남구", "Gangdong-gu": "강동구", "Gangbuk-gu": "강북구", "Gangseo-gu": "강서구",
        "Gwanak-gu": "관악구", "Gwangjin-gu": "광진구", "Guro-gu": "구로구", "Geumcheon-gu": "금천구",
        "Nowon-gu": "노원구", "Dobong-gu": "도봉구", "Dongdaemun-gu": "동대문구", "Dongjak-gu": "동작구",
        "Mapo-gu": "마포구", "Seodaemun-gu": "서대문구", "Seocho-gu": "서초구", "Seongdong-gu": "성동구",
        "Seongbuk-gu": "성북구", "Songpa-gu": "송파구", "Yangcheon-gu": "양천구", "Yeongdeungpo-gu": "영등포구",
        "Yongsan-gu": "용산구", "Eunpyeong-gu": "은평구", "Jongno-gu": "종로구", "Jung-gu": "중구", "Jungnang-gu": "중랑구",
        "Suwon": "수원시", "Seongnam": "성남시", "Anyang": "안양시", "Yongin": "용인시", "Ansan": "안산시",
        "Goyang": "고양시", "Bucheon": "부천시", "Pyeongtaek": "평택시", "Uijeongbu": "의정부시", "Paju": "파주시",
        "Gumi": "구미시", "Pohang": "포항시", "Gyeongju": "경주시", "Gimcheon": "김천시", "Andong": "안동시"
    }
    
    # 1. Static Map check first
    if name_en in KOR_STATIC_MAP:
        return KOR_STATIC_MAP[name_en]

    # 2. Rule-based fallback for other Korean cities (improved)
    mapping = {"-gu": "구", "-si": "시", "-gun": "군"}
    for en, kr in mapping.items():
        if name_en.endswith(en):
            # Try to transliterate base if known or just keep English + suffix
            return name_en.replace(en, kr)
            
    return name_en

def map_cities():
    print("Mapping Cities (ADM2)...")
    # We no longer rely on external KOR_ADM2_SOURCE for base names due to encoding issues
    
    city_path = os.path.join(DATA_DIR, 'cities.json')
    cities = load_json(city_path)
    if cities:
        for c in cities:
            c['name_local'] = to_kr_city(c.get('name', ''))
        save_json(city_path, cities)

    city_dir = os.path.join(DATA_DIR, 'cities')
    if os.path.exists(city_dir):
        for filename in os.listdir(city_dir):
            if filename.endswith('.json'):
                path = os.path.join(city_dir, filename)
                data = load_json(path)
                if data:
                    for c in data:
                        c['name_local'] = to_kr_city(c.get('name', ''))
                    save_json(path, data)

    adm2_path = os.path.join(RAW_DIR, 'adm2.geojson')
    adm2 = load_json(adm2_path)
    if adm2:
        for feature in adm2.get('features', []):
            name_en = feature['properties'].get('shapeName', '')
            feature['properties']['name_local'] = to_kr_city(name_en)
        save_json(adm2_path, adm2)

if __name__ == "__main__":
    map_countries()
    map_prefectures()
    map_cities()
    print("Done.")
