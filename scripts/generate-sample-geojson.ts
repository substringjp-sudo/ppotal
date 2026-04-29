#!/usr/bin/env node
/**
 * Generates sample Korean administrative region GeoJSON for development.
 * Replace data/source/ files with real geoBoundaries data for production.
 * Run: npx tsx scripts/generate-sample-geojson.ts
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../data/source");
mkdirSync(outDir, { recursive: true });

type GeoFeature = {
  type: "Feature";
  properties: { shapeID: string; shapeName: string; shapeISO: string; shapeGroup: string };
  geometry: { type: "Polygon"; coordinates: number[][][] };
};

function makeBox(
  id: string,
  name: string,
  iso: string,
  minLon: number,
  minLat: number,
  maxLon: number,
  maxLat: number,
): GeoFeature {
  return {
    type: "Feature",
    properties: { shapeID: id, shapeName: name, shapeISO: iso, shapeGroup: "KOR" },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [minLon, minLat],
        [maxLon, minLat],
        [maxLon, maxLat],
        [minLon, maxLat],
        [minLon, minLat],
      ]],
    },
  };
}

// Korea ADM1: 17 provinces/metropolitan cities (approximate bounding boxes)
const adm1Features: GeoFeature[] = [
  makeBox("KOR-ADM1-01", "서울특별시", "KOR-Seoul",          126.76, 37.43, 127.18, 37.70),
  makeBox("KOR-ADM1-02", "부산광역시", "KOR-Busan",          128.74, 34.88, 129.31, 35.39),
  makeBox("KOR-ADM1-03", "대구광역시", "KOR-Daegu",          128.38, 35.65, 128.75, 36.02),
  makeBox("KOR-ADM1-04", "인천광역시", "KOR-Incheon",        126.37, 37.27, 126.79, 37.59),
  makeBox("KOR-ADM1-05", "광주광역시", "KOR-Gwangju",        126.69, 35.08, 126.97, 35.25),
  makeBox("KOR-ADM1-06", "대전광역시", "KOR-Daejeon",        127.29, 36.23, 127.55, 36.50),
  makeBox("KOR-ADM1-07", "울산광역시", "KOR-Ulsan",          128.96, 35.45, 129.42, 35.73),
  makeBox("KOR-ADM1-08", "세종특별자치시", "KOR-Sejong",     127.13, 36.44, 127.36, 36.65),
  makeBox("KOR-ADM1-09", "경기도", "KOR-Gyeonggi",           126.36, 36.93, 127.85, 38.28),
  makeBox("KOR-ADM1-10", "강원도", "KOR-Gangwon",            127.41, 36.99, 129.31, 38.61),
  makeBox("KOR-ADM1-11", "충청북도", "KOR-Chungbuk",         127.39, 36.11, 128.30, 37.19),
  makeBox("KOR-ADM1-12", "충청남도", "KOR-Chungnam",         126.00, 36.08, 127.29, 36.97),
  makeBox("KOR-ADM1-13", "전라북도", "KOR-Jeonbuk",          126.41, 35.45, 127.74, 36.06),
  makeBox("KOR-ADM1-14", "전라남도", "KOR-Jeonnam",          125.98, 34.18, 127.58, 35.45),
  makeBox("KOR-ADM1-15", "경상북도", "KOR-Gyeongbuk",        127.81, 35.66, 129.56, 37.09),
  makeBox("KOR-ADM1-16", "경상남도", "KOR-Gyeongnam",        127.62, 34.62, 129.16, 35.69),
  makeBox("KOR-ADM1-17", "제주특별자치도", "KOR-Jeju",        126.15, 33.11, 126.98, 33.57),
];

// Korea ADM2: selected districts for Seoul and Gyeonggi (sample subset)
const adm2Features: GeoFeature[] = [
  // Seoul districts
  makeBox("KOR-ADM2-S01", "종로구", "KOR-Seoul-Jongno",    126.95, 37.57, 127.01, 37.61),
  makeBox("KOR-ADM2-S02", "중구", "KOR-Seoul-Jung",         126.97, 37.55, 127.02, 37.58),
  makeBox("KOR-ADM2-S03", "용산구", "KOR-Seoul-Yongsan",    126.97, 37.52, 127.02, 37.55),
  makeBox("KOR-ADM2-S04", "성동구", "KOR-Seoul-Seongdong", 127.02, 37.54, 127.08, 37.58),
  makeBox("KOR-ADM2-S05", "광진구", "KOR-Seoul-Gwangjin",  127.08, 37.54, 127.12, 37.58),
  makeBox("KOR-ADM2-S06", "동대문구", "KOR-Seoul-Dongdaemun", 127.02, 37.57, 127.07, 37.61),
  makeBox("KOR-ADM2-S07", "중랑구", "KOR-Seoul-Jungnang",  127.07, 37.57, 127.12, 37.61),
  makeBox("KOR-ADM2-S08", "성북구", "KOR-Seoul-Seongbuk",  127.00, 37.58, 127.06, 37.62),
  makeBox("KOR-ADM2-S09", "강북구", "KOR-Seoul-Gangbuk",   127.01, 37.62, 127.04, 37.66),
  makeBox("KOR-ADM2-S10", "도봉구", "KOR-Seoul-Dobong",    127.03, 37.66, 127.07, 37.70),
  makeBox("KOR-ADM2-S11", "노원구", "KOR-Seoul-Nowon",     127.06, 37.63, 127.10, 37.69),
  makeBox("KOR-ADM2-S12", "은평구", "KOR-Seoul-Eunpyeong", 126.89, 37.60, 126.96, 37.66),
  makeBox("KOR-ADM2-S13", "서대문구", "KOR-Seoul-Seodaemun", 126.93, 37.57, 126.97, 37.60),
  makeBox("KOR-ADM2-S14", "마포구", "KOR-Seoul-Mapo",       126.89, 37.54, 126.95, 37.57),
  makeBox("KOR-ADM2-S15", "양천구", "KOR-Seoul-Yangcheon", 126.86, 37.51, 126.90, 37.54),
  makeBox("KOR-ADM2-S16", "강서구", "KOR-Seoul-Gangseo",   126.81, 37.53, 126.87, 37.57),
  makeBox("KOR-ADM2-S17", "구로구", "KOR-Seoul-Guro",       126.85, 37.48, 126.90, 37.52),
  makeBox("KOR-ADM2-S18", "금천구", "KOR-Seoul-Geumcheon", 126.89, 37.45, 126.93, 37.48),
  makeBox("KOR-ADM2-S19", "영등포구", "KOR-Seoul-Yeongdeungpo", 126.89, 37.51, 126.93, 37.55),
  makeBox("KOR-ADM2-S20", "동작구", "KOR-Seoul-Dongjak",   126.94, 37.49, 126.99, 37.53),
  makeBox("KOR-ADM2-S21", "관악구", "KOR-Seoul-Gwanak",    126.93, 37.46, 126.98, 37.49),
  makeBox("KOR-ADM2-S22", "서초구", "KOR-Seoul-Seocho",    126.99, 37.48, 127.06, 37.53),
  makeBox("KOR-ADM2-S23", "강남구", "KOR-Seoul-Gangnam",   127.04, 37.49, 127.09, 37.54),
  makeBox("KOR-ADM2-S24", "송파구", "KOR-Seoul-Songpa",    127.10, 37.50, 127.17, 37.54),
  makeBox("KOR-ADM2-S25", "강동구", "KOR-Seoul-Gangdong",  127.13, 37.53, 127.18, 37.57),
  // Gyeonggi sample districts
  makeBox("KOR-ADM2-G01", "수원시", "KOR-Gyeonggi-Suwon",  126.97, 37.22, 127.08, 37.32),
  makeBox("KOR-ADM2-G02", "성남시", "KOR-Gyeonggi-Seongnam", 127.10, 37.40, 127.18, 37.47),
  makeBox("KOR-ADM2-G03", "안양시", "KOR-Gyeonggi-Anyang", 126.93, 37.37, 126.99, 37.43),
  makeBox("KOR-ADM2-G04", "부천시", "KOR-Gyeonggi-Bucheon", 126.77, 37.49, 126.87, 37.55),
  makeBox("KOR-ADM2-G05", "고양시", "KOR-Gyeonggi-Goyang", 126.83, 37.63, 126.97, 37.73),
  makeBox("KOR-ADM2-G06", "용인시", "KOR-Gyeonggi-Yongin", 127.17, 37.20, 127.30, 37.37),
  makeBox("KOR-ADM2-G07", "화성시", "KOR-Gyeonggi-Hwaseong", 126.77, 37.12, 126.97, 37.22),
  makeBox("KOR-ADM2-G08", "평택시", "KOR-Gyeonggi-Pyeongtaek", 126.97, 36.97, 127.12, 37.12),
];

const adm1GeoJSON = { type: "FeatureCollection", features: adm1Features };
const adm2GeoJSON = { type: "FeatureCollection", features: adm2Features };

writeFileSync(join(outDir, "KOR_ADM1.geojson"), JSON.stringify(adm1GeoJSON, null, 2));
writeFileSync(join(outDir, "KOR_ADM2.geojson"), JSON.stringify(adm2GeoJSON, null, 2));

console.log(`Generated ${adm1Features.length} ADM1 regions → data/source/KOR_ADM1.geojson`);
console.log(`Generated ${adm2Features.length} ADM2 regions → data/source/KOR_ADM2.geojson`);
