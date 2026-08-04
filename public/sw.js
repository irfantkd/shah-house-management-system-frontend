/* ── Shah AHMS Service Worker ─────────────────────────────────────────────── */
const CACHE_NAME = 'shah-ahms-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

/* ── Push event — show OS notification ─────────────────────────────────── */
self.addEventListener('push', (e) => {
  if (!e.data) return;
  let data;
  try { data = e.data.json(); } catch { data = { title: 'Shah AHMS Alert', body: e.data.text() }; }

  const options = {
    body:              data.body || '',
    icon:              data.icon || '/icon-192.png',
    badge:             data.badge || '/icon-192.png',
    tag:               data.tag || 'shah-ahms',
    requireInteraction: data.requireInteraction ?? true,
    vibrate:           [200, 100, 200],
    data:              data.data || {},
    actions: [
      { action: 'view',    title: 'View Details' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  e.waitUntil(self.registration.showNotification(data.title || 'Shah AHMS', options));
});

/* ── Notification click — open/focus the app ───────────────────────────── */
self.addEventListener('notificationclick', (e) => {
  e.notification.close();

  if (e.action === 'dismiss') return;

  const targetUrl = (e.notification.data && e.notification.data.url)
    ? e.notification.data.url
    : '/notifications';

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing tab if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Open new tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});

/* ── Notification close tracking ───────────────────────────────────────── */
self.addEventListener('notificationclose', () => {});
