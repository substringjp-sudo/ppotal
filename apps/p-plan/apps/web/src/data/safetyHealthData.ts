export interface VaccinationInfo {
    disease: string;
    requirement: 'required' | 'recommended' | 'optional';
    details: string;
    icon: string;
}

export interface EmergencyContact {
    label: string;
    number: string;
    icon: string;
}

export interface RiskCategory {
    type: 'safety' | 'health' | 'disaster' | 'conflict';
    level: 'low' | 'moderate' | 'high' | 'critical';
    title: string;
    description: string;
    source: string;
    sourceUrl?: string;
}

export interface RegionSafetyHealthInfo {
    id: string;
    name: string;
    keywords: string[]; // For better matching (e.g. ["Tokyo", "Osaka", "Narita"])
    primaryLanguage: string;
    timezone: number; // UTC offset
    mofaLevel: 0 | 1 | 2 | 3 | 4;
    risks: RiskCategory[];
    vaccinations: VaccinationInfo[];
    emergencyContacts: EmergencyContact[];
    tips: string[];
    foodCautions?: Record<string, string>; // Allergy-specific warnings in local language
}

export const REGION_DATA: Record<string, RegionSafetyHealthInfo> = {
    "101": {
        id: "101",
        name: "일본",
        keywords: ["일본", "Japan", "도쿄", "Tokyo", "오사카", "Osaka", "후쿠오카", "Fukuoka", "홋카이도", "Hokkaido", "나리타", "Narita", "하네다", "Haneda"],
        primaryLanguage: "Japanese",
        timezone: 9,
        mofaLevel: 0,
        risks: [
            { type: 'safety', level: 'low', title: '강력 범죄 발생률 저조', description: '전반적으로 매우 안전하나 번화가 소매치기 주의', source: 'Riskline' },
            { type: 'health', level: 'low', title: '공중 보건 양호', description: '상수도 음용 가능, 의료 서비스 접근성 우수', source: 'WHO' },
            { type: 'disaster', level: 'moderate', title: '지진 및 화산 활동', description: '환태평양 조산대 위치로 지진 대비 상시 필요', source: 'GDACS' },
            { type: 'conflict', level: 'low', title: '정치적 안정', description: '대규모 시위나 분쟁 가능성 매우 낮음', source: 'ACLED' }
        ],
        vaccinations: [
            { disease: "Routine Vaccines", requirement: "required", details: "파상풍, 디프테리아, 백일해 등", icon: "check_circle" },
            { disease: "Japanese Encephalitis", requirement: "recommended", details: "장기 체류나 농촌 지역 방문 시", icon: "microbe" }
        ],
        emergencyContacts: [
            { label: '경찰', number: '110', icon: 'local_police' },
            { label: '구급/소방', number: '119', icon: 'ambulance' },
            { label: '영사콜센터', number: '+82-2-3210-0404', icon: 'call' }
        ],
        tips: [
            "수돗물 음용 가능",
            "지진 발생 시 '오즈키(기다리고, 가리고, 잡기)' 수칙 준수",
            "110(경찰), 119(소방)"
        ],
        foodCautions: {
            "peanuts": "落花生(ピーナッツ)アレルギーがあります。",
            "seafood": "魚介類アレルギーがあります。",
            "eggs": "卵アレルギーがあります。",
            "milk": "乳製品アレルギーがあります。"
        }
    },
    "181": {
        id: "181",
        name: "베트남",
        keywords: ["베트남", "Vietnam", "하노이", "Hanoi", "호치민", "Ho Chi Minh", "다낭", "Da Nang", "나트랑", "Nha Trang", "푸꾸옥", "Phu Quoc"],
        primaryLanguage: "Vietnamese",
        timezone: 7,
        mofaLevel: 1,
        risks: [
            { type: 'safety', level: 'moderate', title: '오토바이 소매치기', description: '대도시 위주 스마트폰 및 가방 탈취 주의', source: 'Riskline' },
            { type: 'health', level: 'moderate', title: '수인성 전염병 및 식중독', description: '길거리 음식 위생 및 식수 오염 주의', source: 'WHO' },
            { type: 'disaster', level: 'moderate', title: '태풍 및 홍수', description: '우기(5월~10월) 시 중부 지역 중심 홍수 잦음', source: 'GDACS' },
            { type: 'conflict', level: 'low', title: '안정적 정치 상황', description: '반정부 활동 적으나 공공장소 시위 주의', source: 'ACLED' }
        ],
        vaccinations: [
            { disease: "Hepatitis A", requirement: "recommended", details: "오염된 음식/물 감염 주의", icon: "water_drop" },
            { disease: "Typhoid", requirement: "recommended", details: "위생 취약 지역 방문 시", icon: "restaurant" }
        ],
        emergencyContacts: [
            { label: '경찰', number: '113', icon: 'local_police' },
            { label: '구급', number: '115', icon: 'ambulance' },
            { label: '소방', number: '114', icon: 'fire_truck' }
        ],
        tips: [
            "생수 음용 필수",
            "모기 기피제 필수 사용",
            "야간 이동 시 가급적 Grab 등 플랫폼 이용"
        ],
        foodCautions: {
            "peanuts": "Tôi bị dị ứng lạc (đậu phộng).",
            "seafood": "Tôi bị dị ứng hải sản.",
            "cilantro": "Không cho rau mùi (ngò rí)."
        }
    },
    "004": {
        id: "004",
        name: "미국",
        keywords: ["미국", "USA", "United States", "뉴욕", "New York", "LA", "Los Angeles", "샌프란시스코", "San Francisco", "시카고", "Chicago", "하와이", "Hawaii"],
        primaryLanguage: "English",
        timezone: -5,
        mofaLevel: 0,
        risks: [
            { type: 'safety', level: 'moderate', title: '총기 범죄 및 증오 범죄', description: '특정 대도시 우범 지역 야간 통행 주의', source: 'Riskline' },
            { type: 'health', level: 'low', title: '우수한 의료 환경', description: '보험 미가입 시 고가의 의료비 발생 주의', source: 'CDC' },
            { type: 'disaster', level: 'moderate', title: '기상 이변 (허리케인/산불)', description: '서부 산불 및 동남부 허리케인 시즌 주의', source: 'GDACS' },
            { type: 'conflict', level: 'moderate', title: '정치적 시위 발생', description: '대선 및 사회적 이슈 관련 집회 잦음', source: 'ACLED' }
        ],
        vaccinations: [
            { disease: "Routine Vaccines", requirement: "required", details: "홍역 등 가속 접종 확인", icon: "check_circle" }
        ],
        emergencyContacts: [
            { label: '통합 응급', number: '911', icon: 'emergency' },
            { label: '비응급 신고', number: '311', icon: 'info' }
        ],
        tips: [
            "고가의 의료비 대비 여행자 보험 필수",
            "팁 문화 기본 매너 숙지 (15~20%)",
            "야간 우범 지역 절대 출입 금지"
        ],
        foodCautions: {
            "peanuts": "I have a severe peanut allergy.",
            "seafood": "I am allergic to seafood.",
            "gluten": "I need gluten-free food."
        }
    },
    "171": {
        id: "171",
        name: "태국",
        keywords: ["태국", "Thailand", "방콕", "Bangkok", "푸켓", "Phuket", "치앙마이", "Chiang Mai", "파타야", "Pattaya"],
        primaryLanguage: "Thai",
        timezone: 7,
        mofaLevel: 1,
        risks: [
            { type: 'safety', level: 'moderate', title: '관광지 소매치기 및 사기', description: '방콕, 파타야 등 주요 관광지 호객 행위 및 소매치기 주의', source: 'Riskline' },
            { type: 'health', level: 'moderate', title: '뎅기열 및 수인성 전염병', description: '모기 매개 질병 및 길거리 음식 위생 관리 필요', source: 'WHO' },
            { type: 'disaster', level: 'low', title: '계절성 홍수', description: '우기(6~10월) 시 북부 지역 중심 국지성 호우 주의', source: 'GDACS' },
            { type: 'conflict', level: 'moderate', title: '남부 국경 지역 불안', description: '말레이시아 접경 4개 주 방문 자제 권고', source: 'MOFA' }
        ],
        vaccinations: [
            { disease: "Hepatitis A", requirement: "recommended", details: "오염된 음식/물 감염 주의", icon: "water_drop" },
            { disease: "Typhoid", requirement: "recommended", details: "장기 체류 시 권장", icon: "restaurant" }
        ],
        emergencyContacts: [
            { label: '관광경찰', number: '1155', icon: 'local_police' },
            { label: '통합응급', number: '191', icon: 'emergency' },
            { label: '한국대사관', number: '+66-2-247-7525', icon: 'call' }
        ],
        tips: [
            "왕실 비상 업무 시 경의 표시 필수",
            "전자담배 반입 및 흡연 엄격 금지",
            "생수 음용 필수"
        ],
        foodCautions: {
            "peanuts": "ฉันแพ้ถั่วลิสง (Chan pae thua-li-song)",
            "shrimp": "ฉันแพ้กุ้ง (Chan pae kung)",
            "spicy": "ไม่เผ็ด (Mai phed) - Not spicy"
        }
    },
    "168": {
        id: "168",
        name: "대만",
        keywords: ["대만", "Taiwan", "타이베이", "Taipei", "가오슝", "Kaohsiung", "타이중", "Taichung"],
        primaryLanguage: "Chinese (Traditional)",
        timezone: 8,
        mofaLevel: 0,
        risks: [
            { type: 'safety', level: 'low', title: '우수한 치안 상태', description: '강력 범죄율이 매우 낮아 야간 통행에도 안전함', source: 'Riskline' },
            { type: 'health', level: 'low', title: '높은 의료 수준', description: '상수도 품질 양호하나 가급적 끓여 마시기 권장', source: 'WHO' },
            { type: 'disaster', level: 'moderate', title: '지진 및 태풍', description: '여름철 태풍 영향 및 연중 잦은 미세 지진 발생', source: 'GDACS' },
            { type: 'conflict', level: 'low', title: '안정적 정세', description: '시위 및 분쟁 가능성 낮음', source: 'ACLED' }
        ],
        vaccinations: [
            { disease: "Routine Vaccines", requirement: "required", details: "기본 접종 여부 확인", icon: "check_circle" }
        ],
        emergencyContacts: [
            { label: '경찰', number: '110', icon: 'local_police' },
            { label: '구급/소방', number: '119', icon: 'ambulance' },
            { label: '대표부', number: '+886-2-2758-8320', icon: 'call' }
        ],
        tips: [
            "지하철(MRT) 내 껌/음료 포함 취식 엄격 금지",
            "이지카드(EasyCard) 하나로 대부분의 결제 가능",
            "이지카드 잔액 확인 수시 필요"
        ],
        foodCautions: {
            "peanuts": "我對花生過敏 (Wǒ duì huāshēng guòmǐn)",
            "seafood": "我對海鮮過敏 (Wǒ duì hǎixiān guòmǐn)"
        }
    },
    "028": {
        id: "028",
        name: "프랑스",
        keywords: ["프랑스", "France", "파리", "Paris", "니스", "Nice", "리옹", "Lyon", "마르세유", "Marseille"],
        primaryLanguage: "French",
        timezone: 1,
        mofaLevel: 1,
        risks: [
            { type: 'safety', level: 'moderate', title: '대도시 소매치기', description: '파리 주요 명소 근처 사인단, 팔찌단 등 주의', source: 'Riskline' },
            { type: 'health', level: 'low', title: '선진 의료 체계', description: '약국 접근성 우수, 공중 위생 양호', source: 'WHO' },
            { type: 'disaster', level: 'low', title: '여름철 폭염', description: '최근 유럽 전역 폭염(Heatwave) 발생 주기 짧아짐', source: 'GDACS' },
            { type: 'conflict', level: 'moderate', title: '파업 및 사회적 시위', description: '대중교통 파업 및 연금 개혁 관련 집회 수시 발생', source: 'ACLED' }
        ],
        vaccinations: [
            { disease: "Routine Vaccines", requirement: "required", details: "파상풍 및 홍역 확인", icon: "check_circle" }
        ],
        emergencyContacts: [
            { label: '유럽 통합 응급', number: '112', icon: 'emergency' },
            { label: '경찰', number: '17', icon: 'local_police' },
            { label: '구급', number: '15', icon: 'ambulance' }
        ],
        tips: [
            "테러 경보 단계 수시 확인",
            "박물관 및 미술관 사전 예약 권장",
            "식당 이용 시 '봉쥬르' 인사 필수 에티켓"
        ],
        foodCautions: {
            "peanuts": "Je suis allergique aux arachides.",
            "nuts": "Je suis allergique aux noix.",
            "dairy": "Je ne peux pas manger de produits laitiers."
        }
    },
    "098": {
        id: "098",
        name: "싱가포르",
        keywords: ["싱가포르", "Singapore", "창이", "Changi", "센토사", "Sentosa", "마리나베이", "Marina Bay"],
        primaryLanguage: "English/Malay/Mandarin/Tamil",
        timezone: 8,
        mofaLevel: 0,
        risks: [
            { type: 'safety', level: 'low', title: '매우 안전한 치안', description: '엄격한 법 집행으로 범죄 발생률이 매우 낮음', source: 'Riskline' },
            { type: 'health', level: 'low', title: '우수한 공중 보건', description: '의료 서비스 수준이 매우 높고 깨끗함', source: 'WHO' },
            { type: 'disaster', level: 'low', title: '자연재해 드묾', description: '지진, 태풍 등으로부터 비교적 안전함', source: 'GDACS' },
            { type: 'conflict', level: 'low', title: '정치적 안정', description: '사회적 갈등이나 폭력 사태 가능성 거의 없음', source: 'ACLED' }
        ],
        vaccinations: [
            { disease: "Routine Vaccines", requirement: "required", details: "기본 접종 상태 확인", icon: "check_circle" },
            { disease: "Yellow Fever", requirement: "required", details: "유행 지역에서 입국 시 증명서 필수", icon: "warning" }
        ],
        emergencyContacts: [
            { label: '통합 응급(경찰)', number: '999', icon: 'local_police' },
            { label: '구급/소방', number: '995', icon: 'ambulance' },
            { label: '대사관', number: '+65-6256-1188', icon: 'call' }
        ],
        tips: [
            "공공장소 청결 유지 (껌 반입 금지 등 벌금 주의)",
            "수돗물 음용 가능",
            "실내 냉방이 강하므로 얇은 겉옷 준비"
        ],
        foodCautions: {
            "peanuts": "I am allergic to peanuts. (花生過敏)",
            "seafood": "I am allergic to seafood. (海鮮過敏)",
            "spicy": "Not spicy, please."
        }
    },
    "012": {
        id: "012",
        name: "호주",
        keywords: ["호주", "Australia", "시드니", "Sydney", "멜버른", "Melbourne", "브리즈번", "Brisbane", "퍼스", "Perth", "골드코스트", "Gold Coast"],
        primaryLanguage: "English",
        timezone: 10,
        mofaLevel: 0,
        risks: [
            { type: 'safety', level: 'low', title: '전반적으로 안전함', description: '여행객 대상 소매치기 등 일반적 주의 필요', source: 'Riskline' },
            { type: 'health', level: 'low', title: '고수준 의료 인프라', description: '공립 및 사립 병원 모두 수준 높으나 비용 고가', source: 'WHO' },
            { type: 'disaster', level: 'moderate', title: '산불 및 강한 자외선', description: '여름철 산불 주의 및 세계 최고 수준의 자외선 지수', source: 'GDACS' },
            { type: 'conflict', level: 'low', title: '안정적 민주주의', description: '평화로운 정세 유지', source: 'ACLED' }
        ],
        vaccinations: [
            { disease: "Routine Vaccines", requirement: "required", details: "기본 접종 여부 확인", icon: "check_circle" }
        ],
        emergencyContacts: [
            { label: '통합 응급', number: '000', icon: 'emergency' },
            { label: '해상 구조', number: '1622', icon: 'sailing' },
            { label: '영사콜센터', number: '+82-2-3210-0404', icon: 'call' }
        ],
        tips: [
            "자외선 차단제(SPF 50+) 필수",
            "수돗물 음용 가능",
            "해변에서 안전 요원 구역(빨강/노랑 깃발) 안에서 수영"
        ],
        foodCautions: {
            "peanuts": "I have a severe peanut allergy.",
            "seafood": "I am allergic to seafood.",
            "nuts": "I am allergic to all nuts."
        }
    },
    "047": {
        id: "047",
        name: "중국",
        keywords: ["중국", "China", "베이징", "Beijing", "상하이", "Shanghai", "청두", "Chengdu", "광저우", "Guangzhou"],
        primaryLanguage: "Chinese",
        timezone: 8,
        mofaLevel: 1,
        risks: [
            { type: 'safety', level: 'moderate', title: '소매치기 및 사기 주의', description: '대도시 및 관광지 내 호객 행위 및 소매치기 빈번', source: 'Riskline' },
            { type: 'health', level: 'moderate', title: '대기 오염 및 미세먼지', description: '동부 대도시 중심 심각한 대기 오염 발생 잦음', source: 'WHO' },
            { type: 'disaster', level: 'low', title: '지질학적 불안정성', description: '남서부 지역 지진 활동 및 여름철 홍수 주의', source: 'GDACS' },
            { type: 'conflict', level: 'low', title: '경찰 통제 강화', description: '공공장소 감시 카메라 및 검문 잦음', source: 'ACLED' }
        ],
        vaccinations: [
            { disease: "Hepatitis A", requirement: "recommended", details: "오염된 음식/물 감염 주의", icon: "water_drop" },
            { disease: "Typhoid", requirement: "recommended", details: "장기 체류 시 권장", icon: "restaurant" }
        ],
        emergencyContacts: [
            { label: '경찰', number: '110', icon: 'local_police' },
            { label: '구급', number: '120', icon: 'ambulance' },
            { label: '대사관', number: '+86-10-8531-0700', icon: 'call' }
        ],
        tips: [
            "생수 음용 권장 (수돗물 직접 음용 금지)",
            "알리페이/위챗페이 등 전자 결제 수단 필수",
            "주요 웹사이트 차단 대비 VPN 준비 필요"
        ],
        foodCautions: {
            "peanuts": "我对花生过敏 (Wǒ duì huāshēng guòmǐn)",
            "spicy": "不要辣 (Búyào là) - No spicy"
        }
    },
    "001": {
        id: "001",
        name: "영국",
        keywords: ["영국", "UK", "United Kingdom", "런던", "London", "에든버러", "Edinburgh", "맨체스터", "Manchester"],
        primaryLanguage: "English",
        timezone: 0,
        mofaLevel: 0,
        risks: [
            { type: 'safety', level: 'moderate', title: '소매치기 및 절도', description: '런던 지하철 및 관광객 밀집 지역 주의', source: 'Riskline' },
            { type: 'health', level: 'low', title: '공공 의료 체계(NHS)', description: '의료 질은 높으나 대기 시간이 길 수 있음', source: 'WHO' },
            { type: 'disaster', level: 'low', title: '기습적 호우', description: '연중 비가 잦고 날씨 변화가 심함', source: 'GDACS' },
            { type: 'conflict', level: 'moderate', title: '테러 위협 및 시위', description: '국가 테러 위보 단계 수시 확인 필요', source: 'ACLED' }
        ],
        vaccinations: [
            { disease: "Routine Vaccines", requirement: "required", details: "홍역 등 가속 접종 확인", icon: "check_circle" }
        ],
        emergencyContacts: [
            { label: '통합 응급', number: '999', icon: 'emergency' },
            { label: '비응급 의료', number: '111', icon: 'health_and_safety' },
            { label: '비응급 경찰', number: '101', icon: 'local_police' }
        ],
        tips: [
            "변덕스러운 날씨 대비 우산/방수 재킷 필수",
            "대중교통(오이스터 카드/컨택리스 결제) 활용",
            "999(응급), 111(의료상담)"
        ],
        foodCautions: {
            "peanuts": "I have a severe peanut allergy.",
            "seafood": "I am allergic to seafood.",
            "nuts": "I am allergic to all tree nuts."
        }
    },
    "093": {
        id: "093",
        name: "대한민국",
        keywords: ["한국", "Korea", "South Korea", "서울", "Seoul", "부산", "Busan", "제주", "Jeju", "인천", "Incheon", "파주", "Paju"],
        primaryLanguage: "Korean",
        timezone: 9,
        mofaLevel: 0,
        risks: [
            { type: 'safety', level: 'low', title: '최고 수준의 치안', description: '야간 통행이 매우 안전하며 강력 범죄율 매우 낮음', source: 'Riskline' },
            { type: 'health', level: 'low', title: '세계적 수준의 의료 서비스', description: '전국 어디서나 신속하고 우수한 의료 이용 가능', source: 'WHO' },
            { type: 'disaster', level: 'low', title: '계절성 미세먼지', description: '봄/가을 미세먼지 및 겨울철 한파 주의', source: 'GDACS' },
            { type: 'conflict', level: 'low', title: '남북 관계 특수성', description: '군사적 긴장 상태이나 일상생활은 매우 안정적', source: 'ACLED' }
        ],
        vaccinations: [
            { disease: "Routine Vaccines", requirement: "required", details: "국가 표준 접종 확인", icon: "check_circle" }
        ],
        emergencyContacts: [
            { label: '범죄 신고', number: '112', icon: 'local_police' },
            { label: '구급/소방', number: '119', icon: 'ambulance' },
            { label: '질병관리청', number: '1339', icon: 'medical_services' }
        ],
        tips: [
            "수돗물 음용 가능 (보통 끓여 마심)",
            "대중교통 환승 시스템 및 와이파이 인프라 우수",
            "112(경찰), 119(소방)"
        ],
        foodCautions: {
            "peanuts": "땅콩 알레르기가 있습니다.",
            "seafood": "해산물 알레르기가 있습니다.",
            "spicy": "덜 맵게 해주세요."
        }
    }
};

export const HEALTH_KIT_ITEMS = [
    {
        id: "fever",
        name: "해열/진통제",
        desc: "두통, 치통, 근육통 및 발열 대비",
        icon: "medication"
    },
    {
        id: "cold",
        name: "종합감기약",
        desc: "기온 차나 냉방병 대비",
        icon: "thermometer"
    },
    {
        id: "digestive",
        name: "소화제/정장제",
        desc: "물갈이나 식중독 대비",
        icon: "pill"
    },
    {
        id: "diarrhea",
        name: "지사제",
        desc: "심한 설사 증상 대비",
        icon: "water_damage"
    },
    {
        id: "ointment",
        name: "소독약/연고",
        desc: "상처 소독 및 감염 방지",
        icon: "content_cut"
    },
    {
        id: "band",
        name: "밴드/거즈",
        desc: "가벼운 외상 처치용",
        icon: "healing"
    },
    {
        id: "mosquito",
        name: "모기 기피제",
        desc: "매개 질병(뎅기/말라리아) 예방",
        icon: "bug_report"
    },
    {
        id: "personal",
        name: "개인 복용약",
        desc: "여유 있는 분량의 상시 복용약",
        icon: "inventory"
    }
];
