const CACHE_NAME = 'polaris-map-cache-v1';
const TILE_CACHE_NAME = 'polaris-map-tiles-v1';

// Cache map tiles from MapTiler
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Check if the request is for a map tile
  if (url.pathname.includes('/maps/aquarelle/') && url.pathname.endsWith('.png')) {
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          return (
            response ||
            fetch(event.request).then((networkResponse) => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            })
          );
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