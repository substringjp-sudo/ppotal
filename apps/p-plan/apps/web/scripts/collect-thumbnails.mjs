import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TREE_PATH = path.join(__dirname, '../public/data/region/tree.json');
const THUMBNAILS_PATH = path.join(__dirname, '../public/data/region/thumbnails.json');

// Unsplash API Key - User should set this in .env or provide it as an argument
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

if (!UNSPLASH_ACCESS_KEY) {
  console.error('Error: UNSPLASH_ACCESS_KEY environment variable is not set.');
  console.log('Please get one from https://unsplash.com/developers and run:');
  console.log('UNSPLASH_ACCESS_KEY=your_key node scripts/collect-thumbnails.mjs');
  process.exit(1);
}

async function fetchUnsplashImage(query) {
  return new Promise((resolve, reject) => {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
    
    const options = {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          const json = JSON.parse(data);
          if (json.results && json.results.length > 0) {
            resolve(json.results[0].urls.regular);
          } else {
            resolve(null);
          }
        } else {
          console.error(`API Error: ${res.statusCode} for ${query}`);
          resolve(null);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  const tree = JSON.parse(fs.readFileSync(TREE_PATH, 'utf8'));
  
  let thumbnails = {};
  if (fs.existsSync(THUMBNAILS_PATH)) {
    thumbnails = JSON.parse(fs.readFileSync(THUMBNAILS_PATH, 'utf8'));
  }

  console.log(`Loaded tree.json with ${tree.length} countries.`);
  console.log(`Current thumbnails.json has ${Object.keys(thumbnails).length} entries.`);

  let count = 0;
  const LIMIT = 45; // Stay under standard 50/hour rate limit

  // 1. Collect Countries first
  for (const country of tree) {
    const key = `country-${country.id}`;
    if (thumbnails[key]) continue;

    const query = `${country.name} landmark`;
    console.log(`Fetching image for: ${query} (Key: ${key})...`);
    
    try {
      const url = await fetchUnsplashImage(query);
      if (url) {
        thumbnails[key] = url;
        count++;
        console.log(`  Success: ${url.substring(0, 50)}...`);
      } else {
        thumbnails[key] = null;
      }
      fs.writeFileSync(THUMBNAILS_PATH, JSON.stringify(thumbnails, null, 2));

      if (count >= LIMIT) {
        console.log('Reached limit for this run.');
        return;
      }
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  Error fetching ${query}:`, err.message);
    }
  }

  // 2. Collect Prefectures
  for (const country of tree) {
    for (const pref of country.prefectures) {
      const key = `prefecture-${pref.id}`;
      
      if (thumbnails[key]) continue;

      const query = `${pref.name}, ${country.name} landmark`;
      console.log(`Fetching image for: ${query} (Key: ${key})...`);
      
      try {
        const url = await fetchUnsplashImage(query);
        if (url) {
          thumbnails[key] = url;
          count++;
          console.log(`  Success: ${url.substring(0, 50)}...`);
        } else {
          console.log(`  No results found for ${query}`);
          thumbnails[key] = null;
        }

        fs.writeFileSync(THUMBNAILS_PATH, JSON.stringify(thumbnails, null, 2));

        if (count >= LIMIT) {
          console.log('Reached limit for this run.');
          return;
        }
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        console.error(`  Error fetching ${query}:`, err.message);
      }
    }
  }

  console.log('Finished processing all regions (or no more new regions to fetch).');
}

main().catch(console.error);
