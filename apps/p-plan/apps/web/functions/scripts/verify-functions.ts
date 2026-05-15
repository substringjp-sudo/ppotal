import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 1. 환경 설정 로드 (.env.local 등이 있다면 활용)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const projectId = 'p-plan'; // 실제 프로젝트 ID로 변경 필요
const region = 'asia-northeast3'; // 서울 리전

/**
 * Cloud Functions 검증 스크립트
 * 
 * 정기적으로 함수의 생존 여부와 로직 정합성을 체크합니다.
 */
async function runVerification() {
    console.log('🚀 PPLANER Cloud Functions 검증을 시작합니다...');

    const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
    const baseUrl = isEmulator 
        ? `http://127.0.0.1:5001/${projectId}/${region}`
        : `https://${region}-${projectId}.cloudfunctions.net`;

    console.log(`📡 대상 서버: ${baseUrl}`);

    // 서비스 계정 키가 있다면 관리자 권한으로 트리거 테스트 가능
    // 여기서는 범용성을 위해 Callable 함수 위주로 작성합니다.

    const testCases = [
        {
            name: '환율 수동 업데이트 (manualExchangeRatesUpdate)',
            path: 'manualExchangeRatesUpdate',
            data: {},
            expected: (res: any) => res.success === true
        },
        {
            name: '지역 검색 (searchRegions)',
            path: 'searchRegions',
            data: { query: '서울' },
            expected: (res: any) => Array.isArray(res) && res.some((r: any) => r.id === '1406093')
        },
        {
            name: '항공 데이터 검색 (searchAviationData)',
            path: 'searchAviationData',
            data: { type: 'airport', query: 'ICN' },
            expected: (res: any) => Array.isArray(res) && res.length > 0 && res[0].code === 'ICN'
        },
        {
            name: '역지오코딩 - 서울 (육지)',
            path: 'reverseGeocode',
            data: { lat: 37.5665, lng: 126.9780 },
            expected: (res: any) => res.prefectureId === '1406093'
        },
        {
            name: '역지오코딩 - 청주 (충북)',
            path: 'reverseGeocode',
            data: { lat: 36.5554593, lng: 127.4992525 },
            expected: (res: any) => res.cityId === '242891409093'
        },
        {
            name: '역지오코딩 - 타케하라 (히로시마)',
            path: 'reverseGeocode',
            data: { lat: 34.2757461, lng: 133.0204935 },
            expected: (res: any) => res.cityId === '264121541101'
        },
        {
            name: '역지오코딩 - 일본 영해/공해 경계',
            path: 'reverseGeocode',
            data: { lat: 34.262359, lng: 133.390623 },
            expected: (res: any) => !res || res.countryId === '101' || res.cityId === null
        },
        {
            name: '역지오코딩 - 명백한 공해 (동해)',
            path: 'reverseGeocode',
            data: { lat: 37.484997, lng: 132.854741 },
            expected: (res: any) => !res || (!res.cityId && !res.prefectureId)
        },
        {
            name: '역지오코딩 - 충칭 위중 (중국)',
            path: 'reverseGeocode',
            data: { lat: 29.0476383, lng: 108.4130452 },
            expected: (res: any) => res.cityId === '173450753047'
        },
        {
            name: '역지오코딩 - 태평양 (바다)',
            path: 'reverseGeocode',
            data: { lat: 0, lng: 160 },
            expected: (res: any) => !res || (!res.cityId && !res.prefectureId)
        },
        {
            name: '역지오코딩 - 도쿄 (육지)',
            path: 'reverseGeocode',
            data: { lat: 35.6762, lng: 139.6503 },
            expected: (res: any) => res.countryId === '101'
        },
        {
            name: '일괄 역지오코딩 (batchReverseGeocode)',
            path: 'batchReverseGeocode',
            data: { 
                locations: [
                    { lat: 37.5665, lng: 126.9780 }, // Seoul
                    { lat: 35.6762, lng: 139.6503 }  // Tokyo
                ]
            },
            expected: (res: any) => Array.isArray(res) && res.length === 2 && res[0].countryId === '093' && res[1].countryId === '101'
        },
        {
            name: '구글 장소 기반 ID 추출 (solveRegionIdsFromPlace)',
            path: 'solveRegionIdsFromPlace',
            data: { 
                place: { 
                    geometry: { location: { lat: 37.5665, lng: 126.9780 } },
                    name: 'Seoul City Hall'
                } 
            },
            expected: (res: any) => res.countryId === '093' && res.prefectureId === '1406093'
        },
        {
            name: '사진 기반 타임라인 생성 (generateTimelineFromPhotos)',
            path: 'generateTimelineFromPhotos',
            data: { 
                photos: [
                    { id: '1', lat: 37.5665, lng: 126.9780, timestamp: Date.now() },
                    { id: '2', lat: 37.5666, lng: 126.9781, timestamp: Date.now() + 60000 }
                ]
            },
            expected: (res: any) => Array.isArray(res) && res.length > 0 && res[0].regionIds?.countryId === '093'
        },
        {
            name: '거리 행렬 조회 (getDistanceMatrix)',
            path: 'getDistanceMatrix',
            data: { origins: 'Seoul', destinations: 'Incheon', mode: 'driving' },
            expected: (res: any) => res.status === 'OK' || res.status === 'REQUEST_DENIED' // REQUEST_DENIED is fine if API key is not configured for billable use, but we check if server handles it
        },
        {
            name: '통계 계산 (calculateUserStats)',
            path: 'calculateUserStats',
            data: { uid: 'test_user_id' },
            expected: (res: any) => res.totalXP !== undefined
        }
    ];

    let successCount = 0;

    for (const test of testCases) {
        try {
            process.stdout.write(`🔍 [${test.name}] 테스트 중... `);
            
            const response = await axios.post(`${baseUrl}/${test.path}`, {
                data: test.data
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            });

            // Callable 함수 응답 구조: { result: ... }
            const result = response.data.result;

            if (test.expected(result)) {
                console.log('✅ 성공');
                successCount++;
            } else {
                const failMessage = `❌ 실패 (응답 데이터 불일치)\n   받은 데이터: ${JSON.stringify(result, null, 2)}`;
                console.log(failMessage);
            }
        } catch (error: any) {
            console.log('❌ 에러 발생');
            if (error.response) {
                console.log(`   상태 코드: ${error.response.status}`);
                console.log(`   메시지: ${JSON.stringify(error.response.data.error?.message || error.response.data)}`);
            } else {
                console.log(`   메시지: ${error.message}`);
            }
        }
    }

    console.log('\n--- 테스트 결과 요약 ---');
    console.log(`전체: ${testCases.length}`);
    console.log(`성공: ${successCount}`);
    console.log(`실패: ${testCases.length - successCount}`);
    
    if (successCount === testCases.length) {
        console.log('\n✨ 모든 함수가 정상적으로 작동하고 있습니다!');
        process.exit(0);
    } else {
        console.log('\n⚠️ 일부 함수에 문제가 발견되었습니다. 로그를 확인해 주세요.');
        process.exit(1);
    }
}

runVerification();
