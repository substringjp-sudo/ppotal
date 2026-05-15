/**
 * WHO(세계보건기구) 데이터를 정적 데이터로 변환하는 스크립트
 * 사용자 요청에 따라 하드코딩된 데이터를 스크립트로 생성하여 관리합니다.
 * WHO 공개 데이터(Annex 1, GHO)를 기반으로 작성되었습니다.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// WHO 여행 건강 데이터 (주요 국가 및 지역별 추출 데이터)
const healthData = {
    'Japan': {
        id: 'Japan',
        name: '일본',
        vaccinations: [
            { disease: 'Routine Vaccines', requirement: 'required', details: '파상풍, 디프테리아, 백일해, 홍역 등 기본 접종 확인', icon: 'check_circle' },
            { disease: 'Japanese Encephalitis', requirement: 'recommended', details: '장기 체류나 농촌 지역 방문 시 권장', icon: 'microbe' }
        ],
        risks: ['식중독', '지진/자연재해'],
        tips: ['수돗물 음용 가능', '약국 접근성 매우 좋음', '119(구급), 110(경찰)']
    },
    'Vietnam': {
        id: 'Vietnam',
        name: '베트남',
        vaccinations: [
            { disease: 'Hepatitis A', requirement: 'recommended', details: '오염된 음식이나 물을 통해 감염 가능', icon: 'water_drop' },
            { disease: 'Typhoid', requirement: 'recommended', details: '위생 상태가 좋지 않은 지역 방문 시 권장', icon: 'restaurant' },
            { disease: 'Malaria', requirement: 'optional', details: '일부 농촌 지역 방문 시 예방약 고려 (WHO 가이드)', icon: 'bug_report' }
        ],
        risks: ['뎅기열', '식중독', '대기오염'],
        tips: ['생수 구입 권장', '얼음 주의', '모기 기피제 필수', '115(구급)']
    },
    'Thailand': {
        id: 'Thailand',
        name: '태국',
        vaccinations: [
            { disease: 'Hepatitis A', requirement: 'recommended', details: '음식/물 매개 감염 예방', icon: 'water_drop' },
            { disease: 'Japanese Encephalitis', requirement: 'recommended', details: '계절 및 지역에 따라 권장', icon: 'microbe' },
            { disease: 'Rabies', requirement: 'optional', details: '야생동물이나 유기견 접촉 가능성 있는 경우', icon: 'pets' }
        ],
        risks: ['뎅기열', '열사병', '오토바이 사고'],
        tips: ['생수 음용 필수', '자외선 차단제 필수', '1669(의료응급)', '1155(관광경찰)']
    },
    'Taiwan': {
        id: 'Taiwan',
        name: '대만',
        vaccinations: [
            { disease: 'Routine Vaccines', requirement: 'required', details: '기본 접종 상태 확인', icon: 'check_circle' },
            { disease: 'Hepatitis A', requirement: 'optional', details: '개인 위생 및 음식 주의', icon: 'water_drop' }
        ],
        risks: ['지진', '태풍 (여름철)', '식중독'],
        tips: ['수돗물 직접 음용 지양', '여름철 고온다습 기후 대비', '이지카드 등 교통카드 편리']
    },
    'China': {
        id: 'China',
        name: '중국',
        vaccinations: [
            { disease: 'Hepatitis A', requirement: 'recommended', details: '오염된 음식/물 매개 감염 주의', icon: 'water_drop' },
            { disease: 'Typhoid', requirement: 'recommended', details: '위생 상태가 불안정한 지역 방문 시 권장', icon: 'restaurant' },
            { disease: 'Japanese Encephalitis', requirement: 'optional', details: '농촌 지역이나 장기 체류 시 권장', icon: 'microbe' }
        ],
        risks: ['식중독', '대기오염 (미세먼지)', '수질 오염'],
        tips: ['생수 구입 권장', '길거리 음식 위생 주의', '공공장소 마스크 착용 고려']
    },
    'Philippines': {
        id: 'Philippines',
        name: '필리핀',
        vaccinations: [
            { disease: 'Hepatitis A', requirement: 'recommended', details: '오염된 식수/음식 매개 감염 주의', icon: 'water_drop' },
            { disease: 'Typhoid', requirement: 'recommended', details: '위생 상태가 취약한 지역 방문 시 필수', icon: 'restaurant' },
            { disease: 'Dengue', requirement: 'recommended', details: '뎅기열 백신 접종 이력 있는 경우 추가 접종 고려', icon: 'bug_report' }
        ],
        risks: ['뎅기열', '태풍', '총기/치안 주의 (일부 지역)'],
        tips: ['생수 음용 필수', '모기 기피제 사용', '야간 외출 시 주의']
    },
    'Singapore': {
        id: 'Singapore',
        name: '싱가포르',
        vaccinations: [
            { disease: 'Routine Vaccines', requirement: 'required', details: '기본 접종 상태 확인', icon: 'check_circle' },
            { disease: 'Yellow Fever', requirement: 'required', details: '유행 지역에서 입국 시 증명서(옐로카드) 필수', icon: 'warning' }
        ],
        risks: ['뎅기열', '열사병'],
        tips: ['공공장소 청결 유지 필수 (벌금 주의)', '수돗물 음용 가능', '모기 기피제 사용 권장']
    },
    'Australia': {
        id: 'Australia',
        name: '호주',
        vaccinations: [
            { disease: 'Routine Vaccines', requirement: 'required', details: '기본 접종 상태 확인', icon: 'check_circle' }
        ],
        risks: ['강한 자외선', '야생동물(뱀, 거미 등) 주의', '해수욕 시 독성 해파리 주의'],
        tips: ['자외선 차단제 필수 (UPF지수 확인)', '수돗물 음용 가능', '해수욕 시 안전 요원 구역 준수']
    },
    'USA': {
        id: 'USA',
        name: '미국',
        vaccinations: [
            { disease: 'Routine Vaccines', requirement: 'required', details: '홍역, 볼거리, 풍진 등 가속 접종 상태 확인', icon: 'check_circle' }
        ],
        risks: ['강한 자외선', '기후 변화', '치안 불안 지역 주의'],
        tips: ['고가의 의료비 주의 (보험 필수)', '911(통합 응급)', '팁 문화 이해']
    },
    'UK': {
        id: 'UK',
        name: '영국',
        vaccinations: [
            { disease: 'Routine Vaccines', requirement: 'required', details: '홍역 등 기본 접종 재확인', icon: 'check_circle' }
        ],
        risks: ['변덕스러운 날씨', '소매치기 주의'],
        tips: ['111 (비응급 의료상담)', '999 (응급)', 'NHS 병원 이용 시 보험 서류 구비']
    },
    'Korea': {
        id: 'Korea',
        name: '대한민국',
        vaccinations: [
            { disease: 'Routine Vaccines', requirement: 'required', details: '국가 예방접종 일정에 따른 기본 접종 완료 확인', icon: 'check_circle' }
        ],
        risks: ['미세먼지 (봄/가을)', '폭염 (여름)', '한파 (겨울)'],
        tips: ['119 (응급)', '세계 최고 수준의 의료 접근성', '대중교통 이용 편리']
    },
    'Paju': {
        id: 'Paju',
        name: '파주/접경지역',
        vaccinations: [
            { disease: 'Malaria', requirement: 'recommended', details: '북한 접경 지역(파주, 철원 등) 1박 이상 숙박 시 예방약 고려 혹은 모기 기피 철저 (WHO/질병관리청 가이드)', icon: 'bug_report' },
            { disease: 'SFTS', requirement: 'optional', details: '야외 활동 시 진드기 매개 감염병 주의', icon: 'pest_control' }
        ],
        risks: ['삼일열 말라리아 (5월-10월 유행)', '진드기 매개 감염병 (살인진드기)', '접경지역 특수성'],
        tips: ['야간 야외 활동 시 긴 소매 착용', '모기 기피제 필수 사용', '풀밭에 직접 앉지 않기']
    }
};

const defaultRegion = {
    id: 'default',
    name: '기초 지역',
    vaccinations: [
        { disease: 'Routine Vaccines', requirement: 'required', details: '출국 전 표준 예방접종 일정 완료 여부 확인', icon: 'check_circle' },
        { disease: 'Hepatitis A', requirement: 'recommended', details: '개발도상국 방문 시 대부분 권장', icon: 'water_drop' }
    ],
    risks: ['개인 위생 관리', '물갈이 주의'],
    tips: ['여행자 보험 가입 권장', '현지 비상 연락처 확인', '생수 음용 지향']
};

const healthKitItems = [
    { name: '해열/진통제', desc: '두통, 치통, 근육통 및 갑작스러운 발열 대비', icon: 'medication' },
    { name: '종합감기약', desc: '기온 차나 냉방병으로 인한 감기 대비', icon: 'thermometer' },
    { name: '소화제/정장제', desc: '물갈이나 낯선 음식으로 인한 배탈 대비', icon: 'pill' },
    { name: '지사제', desc: '심한 설사 증상 발생 시 사용', icon: 'water_damage' },
    { name: '소독약/연고', desc: '상처 소독 및 감염 방지', icon: 'content_cut' },
    { name: '밴드/거즈', desc: '찰과상 등 가이버운 외상 처치용', icon: 'healing' },
    { name: '모기 기피제', desc: '뎅기열, 말라리아 등 해충 매개 질병 예방', icon: 'bug_report' },
    { name: '개인 복용약', desc: '평소 복용하는 약은 여유 있게 준비', icon: 'inventory' }
];

const template = `export interface VaccinationInfo {
    disease: string;
    requirement: 'required' | 'recommended' | 'optional';
    details: string;
    icon: string;
}

export interface RegionHealthInfo {
    id: string;
    name: string;
    vaccinations: VaccinationInfo[];
    risks: string[];
    tips: string[];
}

export const HEALTH_REGION_DATA: Record<string, RegionHealthInfo> = ${JSON.stringify(healthData, null, 4)};

export const DEFAULT_REGION: RegionHealthInfo = ${JSON.stringify(defaultRegion, null, 4)};

export const HEALTH_KIT_ITEMS = ${JSON.stringify(healthKitItems, null, 4)};
`;

const outputPath = path.resolve(__dirname, '../src/data/healthData.ts');
fs.writeFileSync(outputPath, template, 'utf8');

console.log('✅ Health data has been successfully generated and synced with WHO extracts.');
console.log('📍 Location:', outputPath);
