import json
import urllib.request
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, 'data', 'airlines.json')
SOURCE_URL = "https://raw.githubusercontent.com/BesrourMS/Airlines/master/airlines.json"

# Detailed Korean mapping for major airlines
KOR_AIRLINE_MAP = {
    # South Korea
    "KE": "대한항공", "OZ": "아시아나항공", "7C": "제주항공", "LJ": "진에어",
    "BX": "에어부산", "RS": "에어서울", "TW": "티웨이항공", "ZE": "이스타항공",
    "RF": "에어로케이", "YP": "에어프레미아", "4L": "팔라우 내셔널 에어라인",
    "FG": "아리아나 아프간 항공",
    
    # Japan
    "JL": "일본항공", "NH": "전일본공수", "MM": "피치항공", "BC": "스카이마크 항공",
    "7G": "스타플라이어", "NQ": "에어재팬",
    
    # China / Taiwan / Hong Kong
    "CA": "중국국제항공", "MU": "중국동방항공", "CZ": "중국남방항공", "HU": "하이난항공",
    "CI": "중화항공", "BR": "에바항공", "CX": "캐세이퍼시픽", "UO": "홍콩 익스프레스",
    "HX": "홍콩 항공", "NX": "에어마카오",
    
    # Asia / Middle East
    "SQ": "싱가포르항공", "TG": "타이항공", "VN": "베트남항공", "VJ": "비엣젯항공",
    "MH": "말레이시아항공", "AK": "에어아시아", "GA": "가루다 인도네시아 항공",
    "PR": "필리핀항공", "5J": "세부퍼시픽", "EK": "에미레이트 항공",
    "QR": "카타르항공", "EY": "에티하드 항공", "TK": "터키항공", "AI": "인도항공",
    
    # Europe
    "LH": "루프트한자", "AF": "에어프랑스", "KL": "KLM 네덜란드 항공", "BA": "영국항공",
    "AY": "핀에어", "SK": "루프트한자", "LO": "폴란드항공", "OS": "오스트리아 항공",
    "LX": "스위스 항공", "SU": "아에로플로트", "AZ": "알리탈리아", "IB": "이베리아 항공",
    
    # America / Oceania
    "DL": "델타항공", "UA": "유나이티드 항공", "AA": "아메리칸 항공", "AC": "에어캐나다",
    "AM": "아에로멕시코", "LA": "라탐항공", "QF": "퀀타스 항공", "NZ": "뉴질랜드 항공",
    "HA": "하와이안 항공"
}

def fetch_airlines():
    print(f"Fetching from {SOURCE_URL}...")
    try:
        with urllib.request.urlopen(SOURCE_URL) as response:
            source_data = json.loads(response.read().decode())
    except Exception as e:
        print(f"Error fetching source: {e}")
        return

    processed_data = []
    for item in source_data:
        name_en = item.get('name')
        code = item.get('code')
        if not name_en or not code:
            continue
            
        # Get Korean name from map or use English
        name_ko = KOR_AIRLINE_MAP.get(code, name_en)
        
        processed_data.append({
            "code": code,
            "name_en": name_en,
            "name_ko": name_ko,
            "is_lowcost": item.get('is_lowcost', False),
            "logo_url": item.get('logo')
        })

    # Sort by code
    processed_data.sort(key=lambda x: x['code'])

    # Save to data/airlines.json
    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    with open(DATA_PATH, 'w', encoding='utf-8') as f:
        json.dump(processed_data, f, ensure_ascii=False, indent=2)
    
    print(f"Successfully saved {len(processed_data)} airlines to {DATA_PATH}")

if __name__ == "__main__":
    fetch_airlines()
