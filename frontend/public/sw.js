const CACHE_NAME = 'jeevan-setu-v1';
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first with offline fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and WebSocket
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/ws')) return;
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Serve from cache or offline page
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // For navigation requests, show offline page
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Background sync for emergency requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'emergency-request') {
    event.waitUntil(replayEmergencyRequests());
  }
});

async function replayEmergencyRequests() {
  // Get queued requests from IndexedDB and replay them
  // This is a simplified version; production would use IndexedDB
  console.log('[SW] Replaying queued emergency requests');
}
