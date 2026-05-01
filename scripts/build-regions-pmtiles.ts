import { createReadStream, createWriteStream } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { parser } from "stream-json";
import StreamObject from "stream-json/streamers/StreamObject.js";
import { unlink } from "fs/promises";

const dataDir = join(process.cwd(), "data/meta");
const outDir = join(process.cwd(), "public/tiles");

async function convertToGeoJSONL(inputFile: string, outputFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Converting ${inputFile} to ${outputFile}...`);
    const readStream = createReadStream(inputFile);
    const writeStream = createWriteStream(outputFile);

    const pipeline = readStream
      .pipe(parser())
      .pipe(streamObject());

    let count = 0;
    pipeline.on("data", (data) => {
      const shapeID = data.key;
      const geometry = data.value;

      const feature = {
        type: "Feature",
        properties: { shapeID },
        geometry,
      };

      writeStream.write(JSON.stringify(feature) + "\n");
      count++;
      if (count % 10000 === 0) {
        console.log(`  Processed ${count} features...`);
      }
    });

    pipeline.on("end", () => {
      console.log(`Finished writing ${count} features to ${outputFile}`);
      writeStream.end();
      resolve();
    });

    pipeline.on("error", (err) => {
      console.error(`Error parsing ${inputFile}:`, err);
      reject(err);
    });
  });
}

async function main() {
  const files = [
    { name: "countries", input: join(dataDir, "country_geom.json"), output: join(dataDir, "country.geojsonl") },
    { name: "prefectures", input: join(dataDir, "prefecture_geom.json"), output: join(dataDir, "prefecture.geojsonl") },
    { name: "cities", input: join(dataDir, "city_geom.json"), output: join(dataDir, "city.geojsonl") },
  ];

  try {
    for (const file of files) {
      await convertToGeoJSONL(file.input, file.output);
    }

    const pmtilesOutput = join(outDir, "regions.pmtiles");
    console.log(`\nGenerating PMTiles using tippecanoe at ${pmtilesOutput}...`);
    
    // Create output directory if it doesn't exist
    execSync(`mkdir -p ${outDir}`);
    // Remove existing file to overwrite
    execSync(`rm -f ${pmtilesOutput}`);

    // Build tippecanoe command
    // -Z 0 : minzoom 0
    // -z 10: maxzoom 10 (adjust if needed)
    // -r1 : Drop fraction of points. 
    // -pf: Don't compress features (for PMTiles it handles compression natively well, but let tippecanoe default)
    // --force : overwrite
    const cmd = [
      "tippecanoe",
      `-o ${pmtilesOutput}`,
      "--force",
      "-Z 0",
      "-z 10",
      "--drop-densest-as-needed",
      ...files.map(f => `-l ${f.name} ${f.output}`)
    ].join(" ");

    console.log(`Running: ${cmd}`);
    execSync(cmd, { stdio: "inherit" });

    console.log("\nCleanup temporary GeoJSONL files...");
    for (const file of files) {
      await unlink(file.output);
    }

    console.log(`\nSuccess! Vector tiles generated at ${pmtilesOutput}`);
  } catch (err) {
    console.error("Build failed:", err);
    process.exit(1);
  }
}

main();
