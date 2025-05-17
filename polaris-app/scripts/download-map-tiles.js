const fs = require('fs');
const path = require('path');
const https = require('https');
const { promisify } = require('util');
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const access = promisify(fs.access);

const MAPTILER_API_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
if (!MAPTILER_API_KEY) {
  console.error('Error: NEXT_PUBLIC_MAPTILER_API_KEY environment variable is not set');
  process.exit(1);
}

const HARVARD_BOUNDS = {
  nw: [42.346177, -71.135884],
  se: [42.392885, -71.109761]
};

// Rate limiting
const RATE_LIMIT = {
  requestsPerSecond: 1,
  lastRequestTime: 0
};

// Convert lat/lng to tile coordinates
function getTileNumber(lat, lng, zoom) {
  const n = Math.pow(2, zoom);
  const latRad = lat * Math.PI / 180;
  const x = Math.floor((lng + 180) / 360 * n);
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

// Rate limiting delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if tile exists
async function tileExists(z, x, y) {
  const filePath = path.join(__dirname, '../public/map-tiles', z.toString(), x.toString(), `${y}.png`);
  try {
    await access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// Download a single tile with rate limiting
async function downloadTile(z, x, y) {
  // Check if tile already exists
  if (await tileExists(z, x, y)) {
    return Promise.resolve(); // Skip if exists
  }

  const url = `https://api.maptiler.com/maps/aquarelle/${z}/${x}/${y}.png?key=${MAPTILER_API_KEY}`;
  const dir = path.join(__dirname, '../public/map-tiles', z.toString(), x.toString());
  const filePath = path.join(dir, `${y}.png`);

  // Create directory if it doesn't exist
  await mkdir(dir, { recursive: true });

  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - RATE_LIMIT.lastRequestTime;
  if (timeSinceLastRequest < (1000 / RATE_LIMIT.requestsPerSecond)) {
    await delay(1000 / RATE_LIMIT.requestsPerSecond - timeSinceLastRequest);
  }
  RATE_LIMIT.lastRequestTime = Date.now();

  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', async () => {
          const buffer = Buffer.concat(chunks);
          await writeFile(filePath, buffer);
          resolve();
        });
      } else if (response.statusCode === 403) {
        console.error(`\nAPI Error: Invalid or expired API key. Status: ${response.statusCode}`);
        process.exit(1);
      } else {
        reject(new Error(`Failed to download tile: ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

// Download tiles for a given zoom level in batches
async function downloadTilesForZoom(zoom) {
  const nwTile = getTileNumber(HARVARD_BOUNDS.nw[0], HARVARD_BOUNDS.nw[1], zoom);
  const seTile = getTileNumber(HARVARD_BOUNDS.se[0], HARVARD_BOUNDS.se[1], zoom);

  console.log(`Downloading tiles for zoom level ${zoom}...`);
  
  const BATCH_SIZE = 2;
  const totalTiles = (seTile.x - nwTile.x + 1) * (nwTile.y - seTile.y + 1);
  let downloadedTiles = 0;
  let skippedTiles = 0;

  for (let x = nwTile.x; x <= seTile.x; x += BATCH_SIZE) {
    for (let y = seTile.y; y <= nwTile.y; y += BATCH_SIZE) {
      const batchPromises = [];
      
      // Create batch of promises
      for (let dx = 0; dx < BATCH_SIZE && x + dx <= seTile.x; dx++) {
        for (let dy = 0; dy < BATCH_SIZE && y + dy <= nwTile.y; dy++) {
          batchPromises.push(
            downloadTile(zoom, x + dx, y + dy)
              .then(() => {
                downloadedTiles++;
                process.stdout.write('.');
                if ((downloadedTiles + skippedTiles) % 10 === 0) {
                  process.stdout.write(` ${Math.round(((downloadedTiles + skippedTiles) / totalTiles) * 100)}%\n`);
                }
              })
              .catch(error => {
                if (error.message.includes('already exists')) {
                  skippedTiles++;
                  process.stdout.write('s'); // 's' for skipped
                } else {
                  console.error(`\nError downloading tile ${zoom}/${x + dx}/${y + dy}:`, error.message);
                }
              })
          );
        }
      }
      
      // Wait for batch to complete
      await Promise.all(batchPromises);
      
      // Add a longer delay between batches
      await delay(500);
    }
  }
  console.log('\n');
  console.log(`Zoom level ${zoom} complete. Downloaded: ${downloadedTiles}, Skipped: ${skippedTiles}`);
}

// Download tiles for all zoom levels
async function downloadAllTiles() {
  // Only download zoom level 19
  const zoomLevels = [19];
  
  for (const zoom of zoomLevels) {
    await downloadTilesForZoom(zoom);
  }
}

// Test API key first
async function testApiKey() {
  console.log('Testing MapTiler API key...');
  try {
    await downloadTile(14, 0, 0);
    console.log('API key is valid!');
  } catch (error) {
    console.error('API key test failed:', error.message);
    process.exit(1);
  }
}

// Main execution
async function main() {
  await testApiKey();
  await downloadAllTiles();
}

main().catch(console.error); 