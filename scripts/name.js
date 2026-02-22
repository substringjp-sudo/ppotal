const fs = require('fs');
const path = require('path');

// 1. 경로 설정
const stationsPath = path.join(__dirname, '../public/rail/stations.json');
const namesTxtPath = path.join(__dirname, 'names.txt');

try {
    // 2. 파일들 읽기
    const stationsRaw = fs.readFileSync(stationsPath, 'utf8');
    const namesTxtRaw = fs.readFileSync(namesTxtPath, 'utf8');

    const stationsData = JSON.parse(stationsRaw);

    // 3. names.txt 파싱하여 매핑 객체 만들기
    // 예: { "000167": "Royce' Town" }
    const nameMap = {};
    const lines = namesTxtRaw.split('\n');

    lines.forEach(line => {
        if (!line.trim()) return; // 빈 줄 건너뛰기

        // "id": "name" 형태에서 따옴표와 공백 제거 후 분리
        // 정규식 설명: 따옴표(")를 제거하고 : 기호로 나눕니다.
        const parts = line.replace(/"/g, '').split(':');
        if (parts.length >= 2) {
            const id = parts[0].trim();
            const englishName = parts[1].trim();
            nameMap[id] = englishName;
        }
    });

    // 4. stationsData 업데이트
    let updateCount = 0;
    Object.keys(stationsData).forEach(id => {
        if (nameMap[id]) {
            // 해당 ID가 txt 파일에 있으면 name_en 항목 추가
            stationsData[id].name_en = nameMap[id];
            updateCount++;
        }
    });

    // 5. 변경된 내용을 다시 stations.json에 저장 (또는 새 파일로 저장)
    // JSON.stringify의 마지막 인자 2는 들여쓰기(readable) 설정입니다.
    fs.writeFileSync(stationsPath, JSON.stringify(stationsData, null, 2), 'utf8');

    console.log(`✅ 업데이트 완료! 총 ${updateCount}개의 역에 영문명이 추가되었습니다.`);

} catch (err) {
    console.error("작업 중 에러 발생:", err);
}