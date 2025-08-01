'use strict';

const CACHE_NAME = 'activa-ahora-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/logo192.svg',
  '/logo512.svg',
  '/logo-mono.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});

const openPausaPage = (url) => {
    return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        const fullUrl = new URL(url, self.location.origin).href;
        
        for (let client of clients) {
            if (new URL(client.url, self.location.origin).href === fullUrl) {
                return client.focus();
            }
        }
        
        const anyClient = clients.find(c => c.url.startsWith(self.location.origin));
        if (anyClient) {
            return anyClient.navigate(fullUrl).then(client => client.focus());
        }

        return self.clients.openWindow(fullUrl);
    });
};

const showNotification = (title, options) => {
    const finalOptions = {
        icon: '/logo192.svg',
        badge: '/logo-mono.svg',
        vibrate: [200, 100, 200],
        silent: false,
        requireInteraction: true,
        ...options,
    };
    return self.registration.showNotification(title, finalOptions);
};

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  if (event.action === 'postpone') {
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        if (clients && clients.length > 0) {
            clients[0].postMessage({
                type: 'postpone-break',
                breakId: event.notification.tag,
            });
        }
    });
  } else {
     event.waitUntil(openPausaPage(urlToOpen));
  }
});


self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, options } = event.data.payload;
        event.waitUntil(showNotification(title, options));
    }
});
