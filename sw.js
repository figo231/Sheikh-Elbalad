const CACHE_NAME = 'sheikh-elbalad-v2';
const ASSETS = [
  './',
  './index.html',
  './login.html',
  './admin.html',
  './app.js',
  './admin.js',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap'
];

// تنزيل الملفات عند التثبيت
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.log('[SW] Some assets failed to cache:', err);
        // Continue even if some assets fail (e.g., missing icons)
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// حذف الكاش القديم
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network first for API, stale-while-revalidate for assets
self.addEventListener('fetch', e => {
  // Skip non-GET requests
  if (e.request.method !== 'GET') return;

  // API calls دايماً من النت
  if (e.request.url.includes('script.google.com')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // For assets: try network first, fallback to cache
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache successful responses
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(e.request).then(cached => {
          if (cached) return cached;
          // For navigation requests, fallback to index.html
          if (e.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
