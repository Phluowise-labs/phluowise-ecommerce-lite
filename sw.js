const CACHE_NAME = 'phluowise-v11';
const urlsToCache = [
  './',
  './index.html',
  './offline.html',
  './css/output.css',
  './css/notifications.css',
  './js/notifications.js',
  './js/page-tracker.js',
  './js/pullToRefresh.js',
  './js/splash-animation.js'
];

// Listen for skipWaiting message
self.addEventListener('message', (event) => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Use addAll with error handling to gracefully handle missing files
        return cache.addAll(urlsToCache).catch((err) => {
          // Continue installation even if some files fail
          return Promise.resolve();
        });
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network-First Strategy 
// Attempts to grab from network first so changes are immediate on refresh,
// falls back to cache only if offline.
self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If valid response, clone and cache it
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        // Network failed (offline). Fallback to cache.
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }

          // Offline fallback - serve offline.html for HTML document requests
          if (event.request.destination === 'document' || event.request.mode === 'navigate') {
            return caches.match('./offline.html')
              .then(offlineResponse => {
                if (offlineResponse) {
                  return offlineResponse;
                }
                return new Response(
                  '<html><body><h1>Offline</h1><p>You are offline and offline.html is not available.</p></body></html>',
                  { headers: { 'Content-Type': 'text/html' } }
                );
              });
          }

          // Return a generic offline response for non-document requests (e.g. images, API calls)
          return new Response('', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});
