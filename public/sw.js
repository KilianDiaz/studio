/// <reference lib="webworker" />

// This is a basic service worker that allows the app to be installed and work offline.
// It also handles push notifications.

const CACHE_NAME = 'activa-ahora-cache-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/logo192.svg',
  '/logo512.svg',
  '/logo-mono.svg',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('On notification click: ', event.notification.tag);
  event.notification.close();

  const urlToOpen = event.notification.data.url;

  if (event.action === 'postpone') {
    // This is a simple postpone for 10 minutes from now.
    const postponeTime = Date.now() + 10 * 60 * 1000;
    event.waitUntil(
      self.registration.showNotification('Pausa pospuesta', {
        body: `Tu pausa fue pospuesta. Te recordaremos en 10 minutos.`,
        icon: '/logo192.svg',
        badge: '/logo-mono.svg',
        vibrate: [200, 100, 200],
        silent: false,
        timestamp: postponeTime,
        showTrigger: new self.TimestampTrigger(postponeTime),
        data: {
          url: urlToOpen,
        },
        actions: [
          { action: 'view', title: 'Ver Pausa' },
        ]
      })
    );
  } else {
    // This handles both 'view' action and the general click on the notification
    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      }).then((clientList) => {
        // Check if there's already a window open with the app
        for (const client of clientList) {
          // If a window is found, focus it.
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window is found, open a new one.
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});
