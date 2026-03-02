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
            console.log('[SW] Caching static assets');
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
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch: network-first with offline fallback
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip API and WebSocket requests
    const url = new URL(event.request.url);
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/ws')) return;

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
                // Try cache, then offline fallback
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) return cachedResponse;
                    // Return offline page for navigation requests
                    if (event.request.mode === 'navigate') {
                        return caches.match('/offline.html');
                    }
                    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
                });
            })
    );
});

// Background sync for pending emergency requests
self.addEventListener('sync', (event) => {
    if (event.tag === 'emergency-request') {
        event.waitUntil(sendPendingEmergencies());
    }
});

async function sendPendingEmergencies() {
    try {
        const cache = await caches.open('emergency-pending');
        const requests = await cache.keys();
        for (const request of requests) {
            const response = await cache.match(request);
            const data = await response.json();
            try {
                await fetch('/api/emergencies/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${data.token}`,
                    },
                    body: JSON.stringify(data.body),
                });
                await cache.delete(request);
            } catch (err) {
                console.log('[SW] Background sync failed, will retry');
            }
        }
    } catch (err) {
        console.log('[SW] Background sync error:', err);
    }
}
