/* Service worker بسيط: يخلي اللوحة قابلة للتثبيت كتطبيق
   بدون أي تخزين مؤقت — كل الطلبات بتروح للشبكة زي ما هي. */
'use strict';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/* بدون respondWith: الطلبات بتكمل للشبكة عادي، مفيش نسخ قديمة. */
self.addEventListener('fetch', () => {});
