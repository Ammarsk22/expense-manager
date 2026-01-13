const CACHE_NAME = 'expense-manager-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/analysis.html',
  '/history.html',
  '/settings.html',
  '/calendar.html',
  '/recurring.html',
  '/assets/css/style.css',
  '/assets/js/main.js',
  '/assets/js/expense.js',
  '/assets/js/charts.js',
  '/assets/js/theme.js',
  '/assets/js/firebase.js',
  '/assets/js/auth.js',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// 1. Install Event (Cache Files)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching all assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Activate Event (Clean old caches)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// 3. Fetch Event (Network First, Fallback to Cache)
self.addEventListener('fetch', (event) => {
  // Firestore/Firebase requests ko cache mat karo (Realtime data chahiye)
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('firebase')) {
      return; 
  }

  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});