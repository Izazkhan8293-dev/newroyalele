// New Royal Electricals & Hardware — Service Worker
// Bumping CACHE_NAME forces all clients to fetch fresh assets on next load.
const CACHE_NAME = 'nre-store-v1';
const OFFLINE_URL = '/';

// App-shell assets cached on install so the site opens instantly (and offline)
// once installed. Keep this list short — it's the shell, not the catalogue.
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Strategy:
// - Navigation requests (HTML): network-first, falling back to cached shell
//   when offline, so customers always see fresh prices/stock when online.
// - Same-origin static assets (icons, manifest): cache-first for speed.
// - API calls (/api/...) and cross-origin requests: always go to network,
//   never cached — orders, stock, and product data must stay live.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;

  // Never intercept API calls — let them hit the network directly.
  if (url.pathname.startsWith('/api/')) return;

  // Cross-origin (fonts, CDN scripts, product image hosts) — network only,
  // browser HTTP cache already handles repeat-visit speed for these.
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
