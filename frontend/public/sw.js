const STATIC_CACHE = 'safesphere-static-v1';
const DATA_CACHE = 'safesphere-data-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(STATIC_CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => ![STATIC_CACHE, DATA_CACHE].includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isApi = url.pathname.includes('/api/v1/');
  const isRiskData = /\/(alerts|risk|habitations|relocation|weather|evacuation)/.test(url.pathname);

  if (isApi && isRiskData) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(DATA_CACHE).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(cached => cached || new Response(JSON.stringify({ detail: 'Offline and no cached data is available.' }), { status: 503, headers: { 'Content-Type': 'application/json' } })))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(STATIC_CACHE).then(cache => cache.put(req, copy));
        return res;
      }).catch(() => caches.match('/index.html')))
    );
  }
});
