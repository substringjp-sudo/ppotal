import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "../apps/web/.env.local");
const envContent = readFileSync(envPath, "utf8");
const config: any = {};
envContent.split("\n").forEach(line => {
  const [key, value] = line.split("=");
  if (key && value) {
    const k = key.replace("NEXT_PUBLIC_FIREBASE_", "");
    const mapping: any = {
      API_KEY: "apiKey",
      AUTH_DOMAIN: "authDomain",
      PROJECT_ID: "projectId",
      STORAGE_BUCKET: "storageBucket",
      MESSAGING_SENDER_ID: "messagingSenderId",
      APP_ID: "appId"
    };
    if (mapping[k]) config[mapping[k]] = value.trim();
  }
});

const app = initializeApp(config);
const db = getFirestore(app);

async function check(id: string) {
  try {
    const snap = await getDoc(doc(db, "geometries", id));
    if (snap.exists()) {
      const data = snap.data();
      console.log(`Geometry for ${id} found!`);
      console.log(`Length: ${data.geometry.length}`);
      console.log(`Sample: ${data.geometry.substring(0, 100)}`);
    } else {
      console.log(`Geometry for ${id} NOT found.`);
    }
  } catch (e) {
    console.error(e);
  }
}

// Check a sample city ID (if you know one, otherwise we might need to find one)
check(process.argv[2] || "3600001");
