// self is the Service Worker scope
self.addEventListener('push', (event) => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notificationData = event.notification.data || {};
  const urlToOpen = new URL(notificationData.url || '/', self.location.origin).href;

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  }).then((windowClients) => {
    let matchingClient = null;
    for (let i = 0; i < windowClients.length; i++) {
      const client = windowClients[i];
      if (client.url === urlToOpen) {
        matchingClient = client;
        break;
      }
    }

    if (matchingClient) {
      return matchingClient.focus();
    } else {
      return clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});

// Precaching assets to make the app work offline
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('activa-ahora-cache').then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/logo192.svg',
        '/logo-mono.svg',
        // Add other important assets here, e.g., CSS, JS files
        // Be careful not to cache everything, only static assets
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
