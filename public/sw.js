/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'activa-ahora-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/logo192.svg',
  '/logo512.svg',
  '/logo-mono.svg',
];

// 1. Installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// 2. Activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch (serve from cache)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});


// Notification Logic
let notificationTimer = null;

const showNotification = (title, options) => {
  self.registration.showNotification(title, {
    ...options,
    badge: '/logo-mono.svg',
    icon: '/logo192.svg',
    silent: false,
    requireInteraction: true,
  });
};

const scheduleNotification = (notificationData) => {
  const { timestamp, breakData } = notificationData;
  const now = Date.now();
  const delay = timestamp - now;

  if (delay > 0) {
    if (notificationTimer) {
      clearTimeout(notificationTimer);
    }
    notificationTimer = setTimeout(() => {
      showNotification('¡Hora de tu pausa activa!', {
        tag: breakData.id,
        body: breakData.recordatorio || `Es momento de '${breakData.nombre}'.`,
        data: {
          url: `/break/${breakData.id}`,
          breakData: breakData
        },
        actions: [
          { action: 'view', title: 'Ver Pausa' },
          { action: 'postpone-10', title: 'Posponer 10 min' },
          { action: 'postpone-30', title: 'Posponer 30 min' },
          { action: 'postpone-60', title: 'Posponer 1 hora' },
          { action: 'skip', title: 'Saltar Pausa' }
        ]
      });
    }, delay);
  }
};

self.addEventListener('message', (event) => {
  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    scheduleNotification(event.data.payload);
  } else if (event.data.type === 'CLEAR_SCHEDULE') {
     if (notificationTimer) {
      clearTimeout(notificationTimer);
      notificationTimer = null;
    }
  }
});


self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const breakData = event.notification.data.breakData;
  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  const handleAction = async (action) => {
      switch (action) {
          case 'view':
              // This is the default action if no button is clicked
              break;
          case 'postpone-10':
              scheduleNotification({ timestamp: Date.now() + 10 * 60 * 1000, breakData });
              return; // Don't open window
          case 'postpone-30':
              scheduleNotification({ timestamp: Date.now() + 30 * 60 * 1000, breakData });
              return; // Don't open window
          case 'postpone-60':
              scheduleNotification({ timestamp: Date.now() + 60 * 60 * 1000, breakData });
              return; // Don't open window
          case 'skip':
              // Just close the notification and do nothing else. The main app will schedule the next one.
              return;
          default:
              break;
      }
      
      // This part runs only for 'view' or direct click on notification body
      event.waitUntil(
          self.clients.matchAll({
              type: "window",
              includeUncontrolled: true,
          }).then((clientList) => {
              if (clientList.length > 0) {
                  let client = clientList[0];
                  for (let i = 0; i < clientList.length; i++) {
                      if (clientList[i].focused) {
                          client = clientList[i];
                          break;
                      }
                  }
                  if (client) {
                      client.navigate(urlToOpen);
                      return client.focus();
                  }
              }
              return self.clients.openWindow(urlToOpen);
          })
      );
  };

  handleAction(event.action || 'view');
});
