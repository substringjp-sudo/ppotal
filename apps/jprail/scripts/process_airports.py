import json
import os

def calculate_centroid(geometry):
    if geometry['type'] == 'Polygon':
        # Flatten all rings or just use the exterior ring (index 0)
        # Using all points in all rings for a simple average
        all_points = []
        for ring in geometry['coordinates']:
            all_points.extend(ring)
    elif geometry['type'] == 'MultiPolygon':
        all_points = []
        for polygon in geometry['coordinates']:
            for ring in polygon:
                all_points.extend(ring)
    else:
        return None

    if not all_points:
        return None

    lats = [c[1] for c in all_points]
    lons = [c[0] for c in all_points]
    return [sum(lats) / len(lats), sum(lons) / len(lons)]

# Comprehensive mapping for Japanese airports
AIRPORT_MAPPING = {
    # Major & International
    "東京国際空港": {"en": "Haneda Airport", "kr": "하네다 공항 (도쿄)"},
    "成田国際空港": {"en": "Narita International Airport", "kr": "나리타 국제공항"},
    "関西国際空港": {"en": "Kansai International Airport", "kr": "간사이 국제공항"},
    "中部国際空港": {"en": "Chubu Centrair International Airport", "kr": "주부 센토레아 국제공항"},
    "大阪国際空港": {"en": "Itami Airport", "kr": "이타미 공항 (오사카)"},
    "新千歳空港": {"en": "New Chitose Airport", "kr": "신치토세 공항"},
    "福岡空港": {"en": "Fukuoka Airport", "kr": "후쿠오카 공항"},
    "那覇空港": {"en": "Naha Airport", "kr": "나하 공항"},
    
    # Regional Airports
    "鹿児島空港": {"en": "Kagoshima Airport", "kr": "가고시마 공항"},
    "仙台空港": {"en": "Sendai Airport", "kr": "센다이 공항"},
    "広島空港": {"en": "Hiroshima Airport", "kr": "히로시마 공항"},
    "熊本空港": {"en": "Kumamoto Airport", "kr": "구마모토 공항 (아소 구마모토)"},
    "宮崎空港": {"en": "Miyazaki Airport", "kr": "미야자키 공항"},
    "松山空港": {"en": "Matsuyama Airport", "kr": "마쓰야마 공항"},
    "長崎空港": {"en": "Nagasaki Airport", "kr": "나가사키 공항"},
    "小松空港": {"en": "Komatsu Airport", "kr": "고마쓰 공항"},
    "小松飛行場": {"en": "Komatsu Airport", "kr": "고마쓰 공항 (코마츠)"},
    "函館空港": {"en": "Hakodate Airport", "kr": "하코다테 공항"},
    "大分空港": {"en": "Oita Airport", "kr": "오이타 공항"},
    "岡山空港": {"en": "Okayama Airport", "kr": "오카야마 공항"},
    "高松空港": {"en": "Takamatsu Airport", "kr": "다카마쓰 공항"},
    "高知空港": {"en": "Kochi Airport", "kr": "고치 공항"},
    "静岡空港": {"en": "Shizuoka Airport", "kr": "시즈오카 공항 (후지산 시즈오카)"},
    "秋田空港": {"en": "Akita Airport", "kr": "아키타 공항"},
    "青森空港": {"en": "Aomori Airport", "kr": "아오모리 공항"},
    "旭川空港": {"en": "Asahikawa Airport", "kr": "아사히카와 공항"},
    "富山空港": {"en": "Toyama Airport", "kr": "도야마 공항"},
    "徳島空港": {"en": "Tokushima Airport", "kr": "도쿠시마 공항"},
    "徳島飛行場": {"en": "Tokushima Airport", "kr": "도쿠시마 공항"},
    "山口宇部空港": {"en": "Yamaguchi Ube Airport", "kr": "야마구치 우베 공항"},
    "出雲空港": {"en": "Izumo Airport", "kr": "이즈모 공항"},
    "鳥取空港": {"en": "Tottori Airport", "kr": "돗토리 공항"},
    "米子空港": {"en": "Yonago Airport", "kr": "요나고 공항"},
    "美保飛行場": {"en": "Yonago Airport", "kr": "요나고 공항 (미호)"},
    "能登空港": {"en": "Noto Airport", "kr": "노토 공항"},
    "佐賀空港": {"en": "Saga Airport", "kr": "사가 공항"},
    "九州佐賀国際空港": {"en": "Saga Airport", "kr": "사가 공항"},
    "対馬空港": {"en": "Tsushima Airport", "kr": "쓰시마 공항"},
    "八丈島空港": {"en": "Hachijojima Airport", "kr": "하치조지마 공항"},
    "三宅島空港": {"en": "Miyakejima Airport", "kr": "미야케지마 공항"},
    "大島空港": {"en": "Oshima Airport", "kr": "오시마 공항"},
    "隠岐空港": {"en": "Oki Airport", "kr": "오키 공항"},
    "福江空港": {"en": "Fukue Airport", "kr": "후쿠에 공항"},
    "石垣空港": {"en": "New Ishigaki Airport", "kr": "이시가키 공항"},
    "新石垣空港": {"en": "New Ishigaki Airport", "kr": "이시가키 공항"},
    "宮古空港": {"en": "Miyako Airport", "kr": "미야코 공항"},
    "下地島空港": {"en": "Shimojishima Airport", "kr": "시모지섬 공항"},
    "奄美空港": {"en": "Amami Airport", "kr": "아마미 공항"},
    "屋久島空港": {"en": "Yakushima Airport", "kr": "야쿠시마 공항"},
    "稚内空港": {"en": "Wakkanai Airport", "kr": "왓카나이 공항"},
    "釧路空港": {"en": "Kushiro Airport", "kr": "쿠시로 공항"},
    "帯広空港": {"en": "Obihiro Airport", "kr": "오비히로 공항"},
    "女満別空港": {"en": "Memanbetsu Airport", "kr": "메만베쓰 공항"},
    "紋別空港": {"en": "Monbetsu Airport", "kr": "몬베쓰 공항"},
    "中標津空港": {"en": "Nakashibetsu Airport", "kr": "나카시베쓰 공항"},
    "礼文空港": {"en": "Rebun Airport", "kr": "레분 공항"},
    "利尻空港": {"en": "Rishiri Airport", "kr": "리시리 공항"},
    "奥尻空港": {"en": "Okushiri Airport", "kr": "오쿠시리 공항"},
    "三沢飛行場": {"en": "Misawa Airport", "kr": "미사와 공항"},
    "山形空港": {"en": "Yamagata Airport", "kr": "야마가타 공항"},
    "庄内空港": {"en": "Shonai Airport", "kr": "쇼나이 공항"},
    "福島空港": {"en": "Fukushima Airport", "kr": "후쿠시마 공항"},
    "茨城空港": {"en": "Ibaraki Airport", "kr": "이바라키 공항"},
    "百里飛行場": {"en": "Ibaraki Airport", "kr": "이바라키 공항 (햐쿠리)"},
    "調布飛行場": {"en": "Chofu Airport", "kr": "조후 비행장"},
    "名古屋飛行場": {"en": "Nagoya Airport", "kr": "나고야 비행장 (코마키)"},
    "八尾空港": {"en": "Yao Airport", "kr": "야오 공항"},
    "神戸空港": {"en": "Kobe Airport", "kr": "고베 공항"},
    "但馬飛行場": {"en": "Tajima Airport", "kr": "다지마 공항 (코우노토리)"},
    "南紀白浜空港": {"en": "Nanki-Shirahama Airport", "kr": "난키 시라하마 공항"},
    "北九州空港": {"en": "Kitakyushu Airport", "kr": "기타큐슈 공항"},
    "壱岐空港": {"en": "Iki Airport", "kr": "이키 공항"},
    "小値賀空港": {"en": "Ojika Airport", "kr": "오지카 공항"},
    "上五島空港": {"en": "Kamigoto Airport", "kr": "가미고토 공항"},
    "粟国空港": {"en": "Aguni Airport", "kr": "아구니 공항"},
    "慶良間空港": {"en": "Kerama Airport", "kr": "게라마 공항"},
    "伊江島空港": {"en": "Iejima Airport", "kr": "이에지마 공항"},
    "多良間空港": {"en": "Tarama Airport", "kr": "다라마 공항"},
    "波照間空港": {"en": "Hateruma Airport", "kr": "하테루마 공항"},
    "与那国空港": {"en": "Yonaguni Airport", "kr": "요나구니 공항"},
    "神津島空港": {"en": "Kozushima Airport", "kr": "고즈시마 공항"},
    "新島空港": {"en": "Niijima Airport", "kr": "니이지마 공항"},
    "久米島空港": {"en": "Kumejima Airport", "kr": "구메지마 공항"},
    "与論空港": {"en": "Yoron Airport", "kr": "요론 공항"},
    "徳之島空港": {"en": "Tokunoshima Airport", "kr": "도쿠노시마 공항"},
    "沖永良部空港": {"en": "Okinoerabu Airport", "kr": "오키노에라부 공항"},
    "種子島空港": {"en": "Tanegashima Airport", "kr": "다네가시마 공항"},
    "石見空港": {"en": "Iwami Airport", "kr": "이와미 공항 (하기 이와미)"},
    "福井空港": {"en": "Fukui Airport", "kr": "후쿠이 공항"},
    "花巻空港": {"en": "Hanamaki Airport", "kr": "하나마키 공항 (이와테 하나마키)"},
    "福岡空港（奈多地区）": {"en": "Fukuoka Airport (Nata Area)", "kr": "후쿠오카 공항 (나타 지역)"},
    "松本空港": {"en": "Matsumoto Airport", "kr": "마쓰모토 공항 (신슈 마쓰모토)"},
    "新潟空港": {"en": "Niigata Airport", "kr": "니가타 공항"},
    "大館能代空港": {"en": "Odate-Noshiro Airport", "kr": "오다테 노시로 공항"},
    "札幌飛行場": {"en": "Sapporo Okadama Airport", "kr": "삿포로 오카다마 공항"},
    "天草飛行場": {"en": "Amakusa Airport", "kr": "아마쿠사 공항"},
    "岡南飛行場": {"en": "Konan Airport", "kr": "코난 비행장"},
    "岩国飛行場": {"en": "Iwakuni Airport", "kr": "이와쿠니 공항"},
    "佐渡空港": {"en": "Sado Airport", "kr": "사도 공항"},
    "北大東空港": {"en": "Kitadaito Airport", "kr": "기타다이토 공항"},
    "南大東空港": {"en": "Minamidaito Airport", "kr": "미나미다이토 공항"},
    "喜界空港": {"en": "Kikai Airport", "kr": "기카이 공항"},
    "大分県央飛行場": {"en": "Oita Ken-o Airfield", "kr": "오이타현 중앙 비행장"},
}

# General word mapping for fallback
WORD_MAPPING = {
    "空港": {"en": " Airport", "kr": " 공항"},
    "飛行場": {"en": " Airfield", "kr": " 비행장"},
    "ヘリポート": {"en": " Heliport", "kr": " 헬리포트"},
}

def translate_name(name, lang):
    if name in AIRPORT_MAPPING:
        return AIRPORT_MAPPING[name][lang]
    
    # Fallback logic
    res = name
    for jp, trans in WORD_MAPPING.items():
        if jp in res:
            res = res.replace(jp, trans[lang])
    return res

def process_geojson(input_path, output_path):
    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return

    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    airports = {}

    for feature in data['features']:
        props = feature.get('properties', {})
        name = props.get('C28_005')
        if not name:
            continue

        centroid = calculate_centroid(feature['geometry'])
        if not centroid:
            continue

        # Use C28_003 as a base for type if available, otherwise name
        # 1: International/Hub, 2: Regional, 4: Shared
        is_international = "国際" in name or props.get('C28_003') == 1
        
        if name not in airports:
            airports[name] = {
                "name": name,
                "name_en": translate_name(name, "en"),
                "name_kr": translate_name(name, "kr"),
                "location": centroid,
                "type": "international" if is_international else "domestic"
            }
        else:
            # If entry exists, we could average centroids, but usually the first one is the main polygon
            pass

    # Convert dict to list
    airport_list = list(airports.values())

    # Sort by name for consistency
    airport_list.sort(key=lambda x: x['name'])

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(airport_list, f, ensure_ascii=False, indent=2)
    
    print(f"Processed {len(airport_list)} airports. Saved to {output_path}")

if __name__ == "__main__":
    process_geojson(
        "/Users/yunhyeongseob/dev/jprail/public/data/C28-21_Airport.geojson",
        "/Users/yunhyeongseob/dev/jprail/public/data/airports.json"
    )
