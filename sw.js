const CACHE_NAME = 'sheikh-balad-v4';

// ============================================================
// الملفات الأساسية اللي هتتخزّن في الكاش (Off-line support)
// ============================================================
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './login.html',
  './admin.html',
  './style.css',
  './app.js',
  './admin.js',
  './config.js',
  './manifest.json',
  './icon-192x192.png',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap',
];

// ============================================================
// تثبيت (Caching عند التثبيت)
// ============================================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => {/* silent fail */})
  );
});

// ============================================================
// تنشيط (حذف الكاشات القديمة)
// ============================================================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ============================================================
// استراتيجية الـ Fetching (Cache First, then Network)
// ============================================================
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // التعامل مع Google Apps Script API
  if (url.href.includes('script.google.com')) {
    return; // لا تخزين — اتركهم للشبكة
  }

  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        // في الخلفية حاول تحديث الكاش
        fetch(request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.ok) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, networkResponse.clone());
              });
            }
          })
          .catch(() => { /* silent fail */ });

        return cachedResponse;
      }

      // لو مفيش في الكاش، دور في الشبكة
      return fetch(request)
        .then(networkResponse => {
          // خزّن في الكاش بس لو مش API
          if (networkResponse && networkResponse.ok && request.method === 'GET' && !url.href.includes('script.google.com')) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // لو فشل الاتصال ولو هوا HTML، اعرض رسالة
          if (request.mode === 'navigate') {
            return new Response(
              '<html><body style="text-align:center;font-family:Cairo,sans-serif;padding:40px;color:#0d4a3a;"><h2>أنت غير متصل</h2><p>تحقق من الاتصال وحاول مرة أخرى.</p><button onclick="location.reload()" style="padding:10px 20px;background:#0d4a3a;color:#fff;border:none;border-radius:8px;cursor:pointer;">إعادة المحاولة</button></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          }
        });
    })
  );
});

// ============================================================
// Push Notifications
// ============================================================
self.addEventListener('push', event => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || 'شيخ البلد';
    const options = {
      body: payload.body || 'لديك إشعار جديد',
      icon: './icon-192x192.png',
      badge: './icon-192x192.png',
      tag: payload.tag || 'loyalty-notification',
      requireInteraction: false,
      data: payload.data || {},
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    // silent fail
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('./');
    })
  );
});

// ============================================================
// Background Sync (للـ Queuing)
// ============================================================
self.addEventListener('sync', event => {
  if (event.tag === 'loyalty-sync') {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ type: 'SYNC_COMPLETED' }));
      })
    );
  }
});

// ============================================================
// Message Handling
// ============================================================
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
