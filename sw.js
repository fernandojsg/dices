const CACHE_NAME = 'dice-roller-v4';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.png',
  './js/main.js',
  './js/state.js',
  './js/ui.js',
  './js/scene.js',
  './js/physics.js',
  './js/dice-manager.js',
  './js/dice-geometry.js',
  './js/presets.js',
  './vendor/three.module.js',
  './vendor/cannon-es.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== CACHE_NAME)
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
