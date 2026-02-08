const CACHE_NAME = 'homefinance-v2';
const ASSETS = ['index.html', 'styles.css', 'script.js', 'manifest.json', 'icons/icon-192.svg', 'icons/icon-512.svg'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        const clone = res.clone();
        if (res.status === 200 && req.url.startsWith(self.location.origin)) {
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return res;
      }).catch(() => {
        if (req.mode === 'navigate') return caches.match('index.html');
      });
    })
  );
});
