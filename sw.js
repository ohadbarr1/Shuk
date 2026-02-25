/**
 * sw.js — Service Worker for offline caching (cache-first strategy)
 */
const CACHE_NAME = 'cheshbeshbon-v3';
const ASSETS = [
    './',
    './index.html',
    './css/styles.css',
    './js/tax-data.js',
    './js/app.js',
    './js/router.js',
    './js/mortgage.js',
    './js/salary.js',
    './js/rent-vs-buy.js',
    './js/pension.js',
    './js/charts.js',
    './js/insights.js',
    './js/share.js',
    './js/ui-helpers.js',
    './js/scenarios.js',
    './js/premium.js',
    './js/pdf-export.js',
    './js/supabase-client.js',
    './js/auth.js',
    './js/profile.js',
    './api/premiumService.js',
    './assets/favicon.svg',
    './manifest.json',
    './robots.txt',
    './sitemap.xml'
];

// Install: cache all static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch: cache-first, falling back to network
self.addEventListener('fetch', (event) => {
    // Skip non-GET and cross-origin requests
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                // Cache successful responses
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            });
        }).catch(() => {
            // Offline fallback: return cached index for navigation requests
            if (event.request.mode === 'navigate') {
                return caches.match('./index.html');
            }
        })
    );
});
