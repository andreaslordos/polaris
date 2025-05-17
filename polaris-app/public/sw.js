const CACHE_NAME = 'polaris-map-cache-v1';
const TILE_CACHE_NAME = 'polaris-map-tiles-v1';

// Cache map tiles from local storage
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(TILE_CACHE_NAME).then((cache) => {
      // Pre-cache all tiles for our bounded area
      const zoomLevels = Array.from({ length: 6 }, (_, i) => i + 14); // Zoom levels 14-19
      const cachePromises = zoomLevels.flatMap(zoom => {
        // Calculate tile range for Harvard Yard
        const nwTile = getTileNumber(42.346177, -71.135884, zoom);
        const seTile = getTileNumber(42.392885, -71.109761, zoom);
        
        const promises = [];
        for (let x = nwTile.x; x <= seTile.x; x++) {
          for (let y = seTile.y; y <= nwTile.y; y++) {
            const url = `/map-tiles/${zoom}/${x}/${y}.png`;
            promises.push(
              fetch(url)
                .then(response => {
                  if (response.ok) {
                    return cache.put(url, response);
                  }
                })
                .catch(error => console.error(`Failed to cache tile ${url}:`, error))
            );
          }
        }
        return promises;
      });
      
      return Promise.all(cachePromises);
    })
  );
});

// Helper function to convert lat/lng to tile coordinates
function getTileNumber(lat, lng, zoom) {
  const n = Math.pow(2, zoom);
  const latRad = lat * Math.PI / 180;
  const x = Math.floor((lng + 180) / 360 * n);
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

// Cache-first strategy for map tiles
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Check if the request is for a map tile
  if (url.pathname.startsWith('/map-tiles/')) {
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          
          // If not in cache, fetch from network
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // If network fails, return a fallback tile
            return cache.match('/images/error-tile.png');
          });
        });
      })
    );
  }
});

// Clear old caches during activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== TILE_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
}); 