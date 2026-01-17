const CACHE_NAME = 'fintrack-v2.0';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/login.html',
    '/analysis.html',
    '/calendar.html',
    '/accounts.html',
    '/recurring.html',
    '/categories.html',
    '/goals.html',
    '/debt.html',
    '/split-bill.html',
    '/history.html',
    '/profile.html',
    '/settings.html',
    '/manifest.json',
    '/assets/css/style.css',
    '/assets/js/main.js',
    '/assets/js/auth.js',
    '/assets/js/firebase.js',
    '/assets/js/expense.js',
    '/assets/js/charts.js',
    '/assets/js/analysis.js',
    '/assets/js/calendar.js',
    '/assets/js/accounts.js',
    '/assets/js/recurring.js',
    '/assets/js/categories.js',
    '/assets/js/goals.js',
    '/assets/js/debt.js',
    '/assets/js/split.js',
    '/assets/js/export.js',
    '/assets/js/profile.js',
    '/assets/js/settings.js',
    '/assets/js/theme.js',
    '/assets/js/ai.js',
    '/assets/js/voice.js',
    '/assets/js/scan.js',
    '/assets/js/notifications.js',
    '/assets/js/security.js',
    '/assets/img/icon-192.png',
    '/assets/img/icon-512.png',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js'
];

// 1. INSTALL EVENT (Cache Assets)
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching app shell');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// 2. ACTIVATE EVENT (Cleanup Old Caches)
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
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
    self.clients.claim();
});

// 3. FETCH EVENT (Serve from Cache, Fallback to Network)
self.addEventListener('fetch', (event) => {
    // Ignore non-GET requests (like POST to Firebase)
    if (event.request.method !== 'GET') return;

    // Handle Firestore/API requests via Network First strategy
    if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('firebase')) {
        return; 
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            // Cache Hit - Return response
            if (response) {
                return response;
            }

            // Clone request for fetching
            const fetchRequest = event.request.clone();

            return fetch(fetchRequest).then((response) => {
                // Check if valid response
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                // Cache new assets dynamically
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return response;
            });
        })
    );
});