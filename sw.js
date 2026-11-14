const CACHE = 'feira-em-dia-v8';
const OCR_CACHE = 'feira-ocr-v7';
const ASSETS = ['./', './index.html', './styles.css?v=8', './app.js?v=8', './core.js?v=8', './household-core.js?v=8', './household-ui.js?v=8', './demo-scenario.js?v=8', './backup-core.js?v=8', './assistant-core.js?v=8', './assistant-ui.js?v=8', './ai-contract.js?v=8', './catalog.js?v=8', './catalog-core.js?v=8', './catalog-store.js?v=8', './crop.js?v=8', './crop-core.js?v=8', './recognition-core.js?v=8', './assets/demo-sources.json', ...['banana-prata','maca','laranja','mamao','tomate','cebola','batata','cenoura','alface','alho','arroz-branco','feijao-carioca'].map(name => `./assets/demo/${name}.jpg`), './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('feira-em-dia-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith(new URL('./vendor/v7/', self.location.href).pathname)) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => { if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(OCR_CACHE).then(cache => cache.put(event.request, copy))); } return response; }))); return;
  }
  if (!ASSETS.some(asset => new URL(asset, self.location.href).href === url.href)) return;
  event.respondWith(fetch(event.request, { cache: 'no-cache' }).then(response => { if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy))); } return response; }).catch(() => caches.match(event.request)));
});
