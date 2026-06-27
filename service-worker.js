const CACHE_NAME = 'punjabi-speed-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/menu-music.mp3',
  '/manifest.json'
];

// Install: cache core files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch(() => {
        // Silently fail if files not available (offline during first install)
        console.log('Initial cache failed, will cache on first load');
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: network-first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip cross-origin and non-GET requests
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const cache = caches.open(CACHE_NAME);
          cache.then((c) => c.put(request, response.clone()));
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request).then((cached) => {
          return cached || new Response('Offline - no cached version', { status: 503 });
        });
      })
  );
});
