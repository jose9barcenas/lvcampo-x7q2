const V = 'campo-v1';
const SHELL = ['./','index.html','style.css','app.js','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png',
  'leaflet.js','leaflet.css','proj4.js','xlsx.full.min.js','jszip.min.js',
  'marker-icon.png','marker-icon-2x.png','marker-shadow.png','layers.png','layers-2x.png'];
const TILES = 'campo-tiles-v1';
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== TILES).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.origin === location.origin) {
    e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(r => r || fetch(e.request)));
    return;
  }
  // Teselas del mapa: red primero, y se guardan las que se hayan visto para reusarlas sin señal
  if (/arcgisonline\.com|openstreetmap\.org/.test(u.hostname)) {
    e.respondWith(fetch(e.request).then(res => {
      if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(TILES).then(c => c.put(e.request, cp)); }
      return res;
    }).catch(() => caches.match(e.request)));
  }
});
