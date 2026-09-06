const CACHE_NAME = 'teledrive-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/login',
  '/drive',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Install Event: Cache static assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('SW Install: Some assets failed to cache', err);
      });
    })
  );
});

// Activate Event: Cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests or chrome-extension schemes
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // API Requests or Navigation (HTML) -> Network First, Fallback to Cache
  if (
    request.mode === 'navigate' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/_next/data/')
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache the successful response
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(async () => {
          // Fallback to cache if offline
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Optional: Return a generic offline page here if navigation fails
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Network error happened', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' },
          });
        })
    );
    return;
  }

  // Static Assets (CSS, JS, Images, Fonts) -> Cache First, Fallback to Network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
        return networkResponse;
      }).catch(() => {
        // Fallback for missing images
        if (request.destination === 'image') {
          return new Response('<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="300" fill="#212121"/><text x="200" y="150" font-family="sans-serif" font-size="20" fill="#fff" text-anchor="middle" dominant-baseline="middle">Offline Image</text></svg>', {
            headers: { 'Content-Type': 'image/svg+xml' },
          });
        }
      });
    })
  );
});
