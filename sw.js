const CACHE = 'feira-em-dia-v7';
const ASSETS = ['./', './index.html', './styles.css?v=7', './app.js?v=7', './core.js?v=7', './catalog.js?v=7', './catalog-core.js?v=7', './catalog-store.js?v=7', './crop.js?v=7', './crop-core.js?v=7', './recognition-core.js?v=7', './assets/demo-sources.json', ...['banana-prata','maca','laranja','mamao','tomate','cebola','batata','cenoura','alface','alho','arroz-branco','feijao-carioca'].map(name => `./assets/demo/${name}.jpg`), './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('feira-em-dia-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith(new URL('./vendor/v7/', self.location.href).pathname)) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => { if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy))); } return response; }))); return;
  }
  if (!ASSETS.some(asset => new URL(asset, self.location.href).href === url.href)) return;
  event.respondWith(fetch(event.request, { cache: 'no-cache' }).then(response => { if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy))); } return response; }).catch(() => caches.match(event.request)));
});
