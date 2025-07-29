// A simple service worker for basic offline functionality
const CACHE_NAME = 'pharmacy-cache-v1';
const urlsToCache = [
  '/',
  'index.html',
  'login.html',
  'inventory.html',
  'pos.html',
  'customers.html',
  'sales_history.html',
  'settings.html',
  'style.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
