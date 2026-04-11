const CACHE_NAME = 'stack-arena-v1';

self.addEventListener('install', (event) => {
    // The service worker is installed
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // The service worker is activated
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Basic network-first strategy to ensure it counts as an active fetch handler for PWA installability
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
