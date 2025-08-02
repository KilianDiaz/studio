/// <reference lib="webworker" />

// Simple cache-first strategy
const CACHE_NAME = 'activa-ahora-cache-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/logo192.svg',
  '/logo512.svg',
  '/logo-mono.svg'
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


// --- Notification Logic ---

function showNotification(title, options) {
  self.registration.showNotification(title, {
    ...options,
    badge: '/logo-mono.svg',
    icon: '/logo192.svg',
    // --- FORCE SOUND AND INTERACTION ---
    silent: false,
    requireInteraction: true,
  });
}

self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  if (type === 'SCHEDULE_NOTIFICATION') {
    const { delay, title, options } = payload;
    
    setTimeout(() => {
      showNotification(title, options);
    }, delay);
  }
});


self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;

  notification.close();

  const urlToOpen = new URL(notification.data.url, self.location.origin).href;

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    // Check if there is already a window open with the target URL
    for (let i = 0; i < windowClients.length; i++) {
      const client = windowClients[i];
      // If so, just focus it.
      if (client.url === urlToOpen && 'focus' in client) {
        return client.focus();
      }
    }
    // If not, then open a new window.
    if (clients.openWindow) {
      return clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});
