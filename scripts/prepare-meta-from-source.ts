import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const SOURCE_DIR = "data/source";
const META_DIR = "data/meta";

mkdirSync(META_DIR, { recursive: true });

function prepare() {
  const adm1 = JSON.parse(readFileSync(join(SOURCE_DIR, "KOR_ADM1.geojson"), "utf-8"));
  const adm2 = JSON.parse(readFileSync(join(SOURCE_DIR, "KOR_ADM2.geojson"), "utf-8"));

  const countries = [
    { id: "KOR", name: "South Korea", code: "KOR" }
  ];

  const countryGeom: Record<string, any> = {
    // We don't have ADM0, so we skip for now or just use KOR as a placeholder if needed
  };

  const prefectures: any[] = [];
  const prefectureGeom: Record<string, any> = {};

  const cities: any[] = [];
  const cityGeom: Record<string, any> = {};

  adm1.features.forEach((f: any) => {
    const id = f.properties.shapeID;
    const name = f.properties.shapeName;
    prefectures.push({ id, name, country: "KOR", code: id });
    prefectureGeom[id] = f.geometry;
  });

  // For cities, we need to know which prefecture they belong to.
  // We'll use the KOR.json we just built or do it on the fly.
  const korMeta = JSON.parse(readFileSync(join(META_DIR, "KOR.json"), "utf-8"));
  
  adm2.features.forEach((f: any) => {
    const id = f.properties.shapeID;
    const name = f.properties.shapeName;
    const meta = korMeta.find((m: any) => m.id === id);
    const prefId = meta?.parentId;
    
    cities.push({ id, name, country: "KOR", prefecture: prefId });
    cityGeom[id] = f.geometry;
  });

  writeFileSync(join(META_DIR, "countries.json"), JSON.stringify(countries, null, 2));
  writeFileSync(join(META_DIR, "prefectures.json"), JSON.stringify(prefectures, null, 2));
  writeFileSync(join(META_DIR, "cities.json"), JSON.stringify(cities, null, 2));
  
  writeFileSync(join(META_DIR, "country_geom.json"), JSON.stringify(countryGeom));
  writeFileSync(join(META_DIR, "prefecture_geom.json"), JSON.stringify(prefectureGeom));
  writeFileSync(join(META_DIR, "city_geom.json"), JSON.stringify(cityGeom));

  console.log("Prepared meta files in data/meta");
}

prepare();
