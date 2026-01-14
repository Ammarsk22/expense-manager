const CACHE_NAME = 'fintrack-v2'; // 🔥 CHANGED VERSION as requested
const urlsToCache = [
  './',
  './index.html',
  './analysis.html',
  './history.html',
  './accounts.html',
  './categories.html',
  './settings.html',
  './goals.html',
  './debt.html',
  './split-bill.html',
  './profile.html',
  './calendar.html',
  './recurring.html',
  './manifest.json',
  './assets/css/style.css',
  './assets/js/main.js',
  './assets/js/auth.js',
  './assets/js/firebase.js',
  './assets/js/expense.js',
  './assets/js/charts.js',
  './assets/js/theme.js',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// Install Event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting(); // Force new SW to take over immediately
});

// Activate Event (Cleanup Old Caches)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});