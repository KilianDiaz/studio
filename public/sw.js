// self.skipWaiting();

const CACHE_NAME = 'activa-ahora-cache-v1';
const urlsToCache = [
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
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

async function findBestClient() {
    const allClients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    // Find the most recently focused client if available
    const focusedClient = allClients.find(client => client.focused);
    if (focusedClient) return focusedClient;
    
    // Otherwise, find any visible client
    const visibleClient = allClients.find(client => client.visibilityState === 'visible');
    if (visibleClient) return visibleClient;

    // Fallback to the first client in the list
    if (allClients.length > 0) return allClients[0];

    return null;
}


self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    const urlToOpen = event.notification.data?.url || '/';

    const promiseChain = clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    }).then(windowClients => {
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

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { title, options, delay } = event.data;
    
    setTimeout(() => {
        self.registration.showNotification(title, {
            ...options,
            silent: false, // Force sound
            vibrate: [200, 100, 200], // Add vibration
            requireInteraction: true, // Keep notification until user interaction
        });
    }, delay);
  }
});
