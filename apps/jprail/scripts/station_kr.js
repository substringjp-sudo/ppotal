const fs = require('fs');
const path = require('path');

// 파일 경로 설정
const QUERY_FILE = path.join(__dirname, '../public/query.json');
const MASTER_FILE = path.join(__dirname, '../public/rail/stations_master.json');
const OUTPUT_MASTER = path.join(__dirname, '../public/rail/stations_master_updated.json');
const UNMATCHED_FILE = path.join(__dirname, 'untranslated_stations.txt');

// JSON 데이터 읽어오기
const queryData = JSON.parse(fs.readFileSync(QUERY_FILE, 'utf8'));
const masterData = JSON.parse(fs.readFileSync(MASTER_FILE, 'utf8'));

// 1. 빠른 검색을 위해 query.json 데이터를 Map 객체로 변환
const koMap = new Map();

queryData.forEach(item => {
    // 역 이름에서 불필요한 단어 제거
    const ja = item.name_ja ? item.name_ja.replace(/駅$/, '') : '';
    // 영어는 대소문자 구분을 없애고 매칭 확률을 높임
    const en = item.name_en ? item.name_en.replace(/ Station$/i, '').toLowerCase() : '';
    const ko = item.name_ko ? item.name_ko.replace(/역$/, '') : '';

    if (ja) koMap.set(`ja:${ja}`, ko);
    if (en) koMap.set(`en:${en}`, ko);
});

// 2. stations_master 순회하며 한국어 이름 매칭 및 미번역 역 분류
const unmatchedStations = [];
let matchCount = 0;

for (const key in masterData) {
    const station = masterData[key];
    const { id, name, name_en } = station;

    // 일본어 이름으로 먼저 검색, 없으면 영어 이름으로 교차 검색
    let matchedKo = koMap.get(`ja:${name}`);
    if (!matchedKo && name_en) {
        matchedKo = koMap.get(`en:${name_en.toLowerCase()}`);
    }

    if (matchedKo) {
        station.name_kr = matchedKo;
        matchCount++;
    } else {
        // 매칭되지 않은 경우 배열에 추가 (ID, 일본어, 영어)
        unmatchedStations.push(`${id}\t${name}\t${name_en || ''}`);
    }
}

// 3. 결과물 파일로 저장
// 원본 보호를 위해 _updated를 붙여 새 JSON 파일로 저장합니다.
fs.writeFileSync(OUTPUT_MASTER, JSON.stringify(masterData, null, 2), 'utf8');

// 미번역 역 목록을 탭(\t)으로 구분된 텍스트 파일로 저장 (엑셀 복사/붙여넣기 용이)
const unmatchedText = "ID\tName(JA)\tName(EN)\n" + unmatchedStations.join('\n');
fs.writeFileSync(UNMATCHED_FILE, unmatchedText, 'utf8');

// 결과 출력
const total = Object.keys(masterData).length;
console.log(`✅ 업데이트 완료: 총 ${total}개의 역 중 ${matchCount}개 번역 추가됨.`);
console.log(`⚠️ 미번역 역: ${unmatchedStations.length}개 ('untranslated_stations.txt' 파일 생성됨)`);