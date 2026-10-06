// ==============================================================================
// Service Worker — بوابة معاينة رمزية
// يعمل محلياً بالكامل لتخزين ملفات البوابة، والمجسمات والرندرات للتشغيل بدون إنترنت
// ==============================================================================

const CACHE_NAME = 'allam-portal-v4.6-native-eight-tree';
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './js/firebase-auth-gate.js',
  './js/tree-engine.js',
  './js/tree-visual-adapter.js',
  './js/member-layout-engine.js',
  './js/camera-navigation-controller.js',
  './js/member-node-renderer.js',
  './js/genealogy-graph.js',
  './js/tree-leaf-label-overlay.js',
  './manifest.json',
  './assets/icon.svg',
  './assets/model-viewer.min.js',
  './assets/vendor/utils/BufferGeometryUtils.js',
  './assets/models/allam-tree-native-eight.glb',
  './assets/renders/render_01_front.png',
  './assets/renders/render_02_three_quarter_left.png',
  './assets/renders/render_03_three_quarter_right.png',
  './assets/renders/render_04_closeup_bark.png',
  './assets/renders/render_05_closeup_leaves.png',
  './assets/renders/render_06_roots_base.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[ServiceWorker] Caching static offline assets...');
      return Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url)));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          // Remove only caches owned by this app; another app may share origin storage.
          if (key.startsWith('allam-portal-v') && key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Network-first strategy for scripts, styles, and markup to prevent stale code caching
  const url = event.request.url;
  const pathname = new URL(url).pathname;
  const isPrivateDataBundle = /(?:^|\/)(?:private|records|bundles|member-data)(?:\/|\.|$)/i.test(pathname);

  // Never place private records in a shared offline cache.
  if (isPrivateDataBundle) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }
  const isApiRequest = /\/api(?:\/|$)/i.test(pathname) ||
    event.request.headers.get('accept')?.includes('application/json');
  if (isApiRequest) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  const isCodeOrMarkup = event.request.mode === 'navigate' ||
    url.endsWith('.html') ||
    url.includes('.js') ||
    url.includes('.css') ||
    pathname.endsWith('/manifest.json');

  if (isCodeOrMarkup) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first strategy for heavy 3D assets & images
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return networkResponse;
      });
    })
  );
});
