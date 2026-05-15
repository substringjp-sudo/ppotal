"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIRPORTS = void 0;
exports.getRecommendedAirports = getRecommendedAirports;
exports.isInternationalFlight = isInternationalFlight;
exports.AIRPORTS = [
    {
        code: 'ICN',
        nameKo: '인천국제공항',
        nameEn: 'Incheon International Airport',
        lat: 37.4602,
        lng: 126.4407,
        timezone: 9,
        regionIds: {
            countryId: '093',
            countryName: 'Korea, South',
            prefectureId: 'region_1398093',
            prefectureName: 'Incheon',
            cityName: 'Jung-gu'
        }
    },
    {
        code: 'GMP',
        nameKo: '김포국제공항',
        nameEn: 'Gimpo International Airport',
        lat: 37.5583,
        lng: 126.7906,
        timezone: 9,
        regionIds: {
            countryId: '093',
            countryName: 'Korea, South',
            prefectureId: 'region_1406093',
            prefectureName: 'Seoul',
            cityName: 'Gangseo-gu'
        }
    },
    {
        code: 'PUS',
        nameKo: '김해국제공항',
        nameEn: 'Gimhae International Airport',
        lat: 35.1795,
        lng: 128.9382,
        timezone: 9,
        regionIds: {
            countryId: '093',
            countryName: 'Korea, South',
            prefectureId: 'region_1401093',
            prefectureName: 'South Gyeongsang',
            cityId: 'city_243051401093',
            cityName: 'Gimhae-si'
        }
    },
    {
        code: 'CJU',
        nameKo: '제주국제공항',
        nameEn: 'Jeju International Airport',
        lat: 33.5113,
        lng: 126.493,
        timezone: 9,
        regionIds: {
            countryId: '093',
            countryName: 'Korea, South',
            prefectureId: 'region_1405093',
            prefectureName: 'Jeju',
            cityId: 'city_244021405093',
            cityName: 'Jeju-si'
        }
    },
    {
        code: 'TAE',
        nameKo: '대구국제공항',
        nameEn: 'Daegu International Airport',
        lat: 35.8941,
        lng: 128.659,
        timezone: 9,
        regionIds: {
            countryId: '093',
            countryName: 'Korea, South',
            prefectureId: 'region_1411093',
            prefectureName: 'Daegu'
        }
    },
    {
        code: 'CJJ',
        nameKo: '청주국제공항',
        nameEn: 'Cheongju International Airport',
        lat: 36.7166,
        lng: 127.491,
        timezone: 9,
        regionIds: {
            countryId: '093',
            countryName: 'Korea, South',
            prefectureId: 'region_1409093',
            prefectureName: 'North Chungcheong',
            cityName: 'Cheongju-si'
        }
    },
    {
        code: 'NRT',
        nameKo: '나리타 국제공항',
        nameEn: 'Narita International Airport',
        lat: 35.772,
        lng: 140.3929,
        timezone: 9,
        regionIds: {
            countryId: '101',
            countryName: 'Japan',
            prefectureName: 'Chiba',
            cityName: 'Narita'
        }
    },
    {
        code: 'HND',
        nameKo: '하네다 공항',
        nameEn: 'Haneda Airport',
        lat: 35.5494,
        lng: 139.7798,
        timezone: 9,
        regionIds: {
            countryId: '101',
            countryName: 'Japan',
            prefectureName: 'Tokyo',
            cityName: 'Ota'
        }
    },
    {
        code: 'KIX',
        nameKo: '간사이 국제공항',
        nameEn: 'Kansai International Airport',
        lat: 34.4371,
        lng: 135.2441,
        timezone: 9,
        regionIds: {
            countryId: '101',
            countryName: 'Japan',
            prefectureName: 'Osaka',
            cityName: 'Izumisano'
        }
    },
    {
        code: 'CTS',
        nameKo: '신치토세 공항',
        nameEn: 'New Chitose Airport',
        lat: 42.7752,
        lng: 141.6923,
        timezone: 9,
        regionIds: {
            countryId: '101',
            countryName: 'Japan',
            prefectureName: 'Hokkaido',
            cityName: 'Chitose'
        }
    },
    {
        code: 'FUK',
        nameKo: '후쿠오카 공항',
        nameEn: 'Fukuoka Airport',
        lat: 33.5859,
        lng: 130.4507,
        timezone: 9,
        regionIds: {
            countryId: '101',
            countryName: 'Japan',
            prefectureName: 'Fukuoka',
            cityName: 'Fukuoka'
        }
    },
    {
        code: 'OKA',
        nameKo: '나하 공항',
        nameEn: 'Naha Airport',
        lat: 26.2064,
        lng: 127.6465,
        timezone: 9,
        regionIds: {
            countryId: '101',
            countryName: 'Japan',
            prefectureName: 'Okinawa',
            cityName: 'Naha'
        }
    },
    {
        code: 'HIJ',
        nameKo: '히로시마 공항',
        nameEn: 'Hiroshima Airport',
        lat: 34.4361,
        lng: 132.919,
        timezone: 9,
        regionIds: {
            countryId: '101',
            countryName: 'Japan',
            prefectureId: 'region_1523101',
            prefectureName: 'Hiroshima',
            cityId: 'city_266711523101',
            cityName: 'Hiroshima'
        }
    },
    {
        code: 'NGO',
        nameKo: '주부 국제공항',
        nameEn: 'Chubu Centrair International Airport',
        lat: 34.8584,
        lng: 136.805,
        timezone: 9,
        regionIds: { countryId: '101', countryName: 'Japan', prefectureName: 'Aichi', cityName: 'Tokoname' }
    },
    {
        code: 'SDJ',
        nameKo: '센다이 공항',
        nameEn: 'Sendai Airport',
        lat: 38.1397,
        lng: 140.917,
        timezone: 9,
        regionIds: { countryId: '101', countryName: 'Japan', prefectureName: 'Miyagi', cityName: 'Natori' }
    },
    {
        code: 'KOJ',
        nameKo: '가고시마 공항',
        nameEn: 'Kagoshima Airport',
        lat: 31.8034,
        lng: 130.719,
        timezone: 9,
        regionIds: { countryId: '101', countryName: 'Japan', prefectureName: 'Kagoshima', cityName: 'Kirishima' }
    },
    {
        code: 'KMJ',
        nameKo: '구마모토 공항',
        nameEn: 'Kumamoto Airport',
        lat: 32.8373,
        lng: 130.855,
        timezone: 9,
        regionIds: { countryId: '101', countryName: 'Japan', prefectureName: 'Kumamoto', cityName: 'Kikuyou' }
    },
    {
        code: 'TAK',
        nameKo: '다카마쓰 공항',
        nameEn: 'Takamatsu Airport',
        lat: 34.2142,
        lng: 134.016,
        timezone: 9,
        regionIds: { countryId: '101', countryName: 'Japan', prefectureName: 'Kagawa', cityName: 'Takamatsu' }
    },
    {
        code: 'MYJ',
        nameKo: '마츠야마 공항',
        nameEn: 'Matsuyama Airport',
        lat: 33.8272,
        lng: 132.7,
        timezone: 9,
        regionIds: { countryId: '101', countryName: 'Japan', prefectureName: 'Ehime', cityName: 'Matsuyama' }
    },
    {
        code: 'BKK',
        nameKo: '수완나품 국제공항',
        nameEn: 'Suvarnabhumi Airport',
        lat: 13.6811,
        lng: 100.747,
        timezone: 7,
        regionIds: { countryId: '188', countryName: 'Thailand', cityName: 'Bangkok' }
    },
    {
        code: 'SIN',
        nameKo: '싱가포르 창이 공항',
        nameEn: 'Singapore Changi Airport',
        lat: 1.35019,
        lng: 103.994,
        timezone: 8,
        regionIds: { countryId: '158', countryName: 'Singapore', cityName: 'Singapore' }
    },
    {
        code: 'DAD',
        nameKo: '다낭 국제공항',
        nameEn: 'Da Nang International Airport',
        lat: 16.0439,
        lng: 108.199,
        timezone: 7,
        regionIds: { countryId: '211', countryName: 'Vietnam', cityName: 'Da Nang' }
    },
    {
        code: 'HAN',
        nameKo: '하노이 노이바이 국제공항',
        nameEn: 'Noi Bai International Airport',
        lat: 21.2212,
        lng: 105.807,
        timezone: 7,
        regionIds: { countryId: '211', countryName: 'Vietnam', cityName: 'Hanoi' }
    },
    {
        code: 'SGN',
        nameKo: '호치민 탄손누트 국제공항',
        nameEn: 'Tan Son Nhat International Airport',
        lat: 10.8188,
        lng: 106.652,
        timezone: 7,
        regionIds: { countryId: '211', countryName: 'Vietnam', cityName: 'Ho Chi Minh City' }
    },
    {
        code: 'CEB',
        nameKo: '세부 막탄 국제공항',
        nameEn: 'Mactan-Cebu International Airport',
        lat: 10.3075,
        lng: 123.979,
        timezone: 8,
        regionIds: { countryId: '136', countryName: 'Philippines', cityName: 'Lapu-Lapu' }
    },
    {
        code: 'GUM',
        nameKo: '안토니오 B. 원 팟 국제공항 (괌 공항)',
        nameEn: 'Antonio B. Won Pat International Airport',
        lat: 13.4839,
        lng: 144.796,
        timezone: 10,
        regionIds: { countryId: '004', countryName: 'United States', cityName: 'Guam' }
    },
    {
        code: 'SYD',
        nameKo: '시드니 공항',
        nameEn: 'Sydney Airport',
        lat: -33.9461,
        lng: 151.177,
        timezone: 10,
        regionIds: { countryId: '010', countryName: 'Australia', prefectureName: 'New South Wales', cityName: 'Sydney' }
    },
    {
        code: 'SFO',
        nameKo: '샌프란시스코 국제공항',
        nameEn: 'San Francisco International Airport',
        lat: 37.619,
        lng: -122.375,
        timezone: -8,
        regionIds: { countryId: '004', countryName: 'United States', prefectureName: 'California', cityName: 'San Francisco' }
    },
    {
        code: 'FRA',
        nameKo: '프랑크푸르트 공항',
        nameEn: 'Frankfurt Airport',
        lat: 50.0333,
        lng: 8.5705,
        timezone: 1,
        regionIds: { countryId: '034', countryName: 'Germany', prefectureName: 'Hesse', cityName: 'Frankfurt' }
    },
    {
        code: 'AMS',
        nameKo: '암스테르담 스키폴 공항',
        nameEn: 'Amsterdam Airport Schiphol',
        lat: 52.3086,
        lng: 4.7639,
        timezone: 1,
        regionIds: { countryId: '035', countryName: 'Netherlands', prefectureName: 'North Holland', cityName: 'Haarlemmermeer' }
    },
    {
        code: 'HKG',
        nameKo: '홍콩 국제공항',
        nameEn: 'Hong Kong International Airport',
        lat: 22.308,
        lng: 113.9185,
        timezone: 8,
        regionIds: {
            countryId: '047',
            countryName: 'China',
            cityName: 'Hong Kong'
        }
    },
    {
        code: 'TPE',
        nameKo: '타오위안 국제공항',
        nameEn: 'Taiwan Taoyuan International Airport',
        lat: 25.0797,
        lng: 121.2342,
        timezone: 8,
        regionIds: {
            countryId: '168',
            countryName: 'Taiwan',
            cityName: 'Taoyuan'
        }
    },
    {
        code: 'LHR',
        nameKo: '히드로 공항',
        nameEn: 'Heathrow Airport',
        lat: 51.47,
        lng: -0.4543,
        timezone: 0,
        regionIds: {
            countryId: '001',
            countryName: 'United Kingdom',
            prefectureName: 'England',
            cityName: 'London'
        }
    },
    {
        code: 'CDG',
        nameKo: '샤를 드 골 공항',
        nameEn: 'Charles de Gaulle Airport',
        lat: 49.0097,
        lng: 2.5479,
        timezone: 1,
        regionIds: {
            countryId: '028',
            countryName: 'France',
            prefectureName: 'Île-de-France',
            cityName: 'Paris'
        }
    },
    {
        code: 'LAX',
        nameKo: '로스앤젤레스 국제공항',
        nameEn: 'Los Angeles International Airport',
        lat: 33.9416,
        lng: -118.4085,
        timezone: -8,
        regionIds: {
            countryId: '004',
            countryName: 'United States',
            prefectureName: 'California',
            cityName: 'Los Angeles'
        }
    },
    {
        code: 'JFK',
        nameKo: '존 F. 케네디 국제공항',
        nameEn: 'John F. Kennedy International Airport',
        lat: 40.6413,
        lng: -73.7781,
        timezone: -5,
        regionIds: {
            countryId: '004',
            countryName: 'United States',
            prefectureName: 'New York',
            cityName: 'New York'
        }
    }
];
function getRecommendedAirports(regions, currentLocation, options) {
    const favorites = options?.favorites || [];
    const residence = options?.residence;
    const intent = options?.intent || 'departure';
    // 1. Start with favorites
    const favoriteObjects = exports.AIRPORTS.filter(a => favorites.includes(a.code));
    // 2. Residence matches (ID 기반 최우선)
    let residenceMatches = [];
    if (residence) {
        residenceMatches = exports.AIRPORTS.filter(airport => {
            if (residence.countryId && airport.regionIds.countryId === residence.countryId)
                return true;
            if (residence.cityKo && airport.regionIds.cityName && (airport.regionIds.cityName.includes(residence.cityKo) || residence.cityKo.includes(airport.regionIds.cityName)))
                return true;
            if (residence.regionKo && airport.regionIds.prefectureName && (airport.regionIds.prefectureName.includes(residence.regionKo) || residence.regionKo.includes(airport.regionIds.prefectureName)))
                return true;
            if (residence.countryKo && airport.regionIds.countryName && (airport.regionIds.countryName.includes(residence.countryKo) || residence.countryKo.includes(airport.regionIds.countryName)))
                return true;
            return false;
        });
        residenceMatches.sort((a, b) => {
            const getScore = (air) => {
                if (residence.countryId && air.regionIds.countryId === residence.countryId)
                    return 4;
                if (residence.cityKo && air.regionIds.cityName && air.regionIds.cityName.includes(residence.cityKo))
                    return 3;
                if (residence.regionKo && air.regionIds.prefectureName && air.regionIds.prefectureName.includes(residence.regionKo))
                    return 2;
                if (residence.countryKo && air.regionIds.countryName && air.regionIds.countryName.includes(residence.countryKo))
                    return 1;
                return 0;
            };
            return getScore(b) - getScore(a);
        });
    }
    // 3. Trip regions matches
    let searchMatches = [];
    searchMatches = exports.AIRPORTS.filter(airport => !favorites.includes(airport.code) &&
        !residenceMatches.some(r => r.code === airport.code) &&
        regions.some(tr => {
            if (airport.regionIds.countryId && tr.countryId === airport.regionIds.countryId)
                return true;
            if (airport.regionIds.countryId && tr.type === 'country' && tr.id === airport.regionIds.countryId)
                return true;
            const regionName = tr.name.toLowerCase();
            return airport.nameEn.toLowerCase().includes(regionName) ||
                airport.nameKo.includes(tr.name) ||
                (airport.regionIds.cityName && airport.regionIds.cityName.includes(tr.name)) ||
                (airport.regionIds.countryName && airport.regionIds.countryName.includes(tr.name));
        }));
    // 4. Current location proximity
    let nearBy = [];
    if (currentLocation) {
        const getDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        };
        nearBy = [...exports.AIRPORTS]
            .filter(a => a.lat !== undefined && a.lng !== undefined)
            .filter(a => !favorites.includes(a.code) && !residenceMatches.some(r => r.code === a.code) && !searchMatches.some(s => s.code === a.code))
            .sort((a, b) => {
            const distA = getDistance(currentLocation.lat, currentLocation.lng, a.lat, a.lng);
            const distB = getDistance(currentLocation.lat, currentLocation.lng, b.lat, b.lng);
            return distA - distB;
        });
    }
    let finalResults = [];
    if (intent === 'arrival') {
        finalResults = [...favoriteObjects, ...searchMatches, ...nearBy.slice(0, 5), ...residenceMatches];
    }
    else {
        finalResults = [...favoriteObjects, ...residenceMatches, ...nearBy.slice(0, 5), ...searchMatches];
    }
    return finalResults.filter((v, i, a) => a.findIndex(t => t.code === v.code) === i).slice(0, 5);
}
function isInternationalFlight(depCode, arrCode) {
    if (!depCode || !arrCode)
        return false;
    const dep = exports.AIRPORTS.find(a => a.code === depCode);
    const arr = exports.AIRPORTS.find(a => a.code === arrCode);
    if (!dep || !arr)
        return false;
    return dep.regionIds.countryId !== arr.regionIds.countryId;
}
