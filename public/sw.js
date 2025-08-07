/// <reference lib="webworker" />

let notificationTimeout = null;

self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  if (type === 'SCHEDULE_NOTIFICATION') {
    // Clear any previously scheduled notification
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
      notificationTimeout = null;
    }

    const { timestamp, breakData } = payload;
    const delay = timestamp - Date.now();

    if (delay > 0) {
      console.log(`[SW] Notification for '${breakData.nombre}' scheduled in ${delay}ms.`);
      notificationTimeout = setTimeout(() => {
        showNotification(breakData);
        notificationTimeout = null;
        // After showing notification, immediately schedule the next one
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
          if (clients.length > 0) {
             clients[0].postMessage({ type: 'SYNC_NOTIFICATIONS' });
          }
        });
      }, delay);
    }
  } else if (type === 'CLEAR_SCHEDULE') {
      if (notificationTimeout) {
          clearTimeout(notificationTimeout);
          notificationTimeout = null;
          console.log('[SW] Cleared scheduled notification.');
      }
  }
});


function showNotification(breakData) {
  const title = '¡Hora de tu pausa activa!';
  const options = {
    tag: breakData.id,
    body: breakData.recordatorio || `Es momento de '${breakData.nombre}'.`,
    icon: '/logo192.svg',
    badge: '/logo-mono.svg',
    silent: false, // Ensure it makes a sound
    requireInteraction: true, // Keep notification visible on desktop
    data: {
      url: `/break/${breakData.id}`,
    },
    actions: [
      { action: 'view', title: 'Ver Pausa' },
      { action: 'skip', title: 'Saltar Pausa' },
    ],
  };
  self.registration.showNotification(title, options);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  const promiseChain = self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  }).then((clientList) => {
    let client = null;
    for (let i = 0; i < clientList.length; i++) {
      // Use includes to match even if there are query params
      if (clientList[i].url.includes(self.location.origin)) {
        client = clientList[i];
        break;
      }
    }

    if (client) {
      // If a client is found, focus it and navigate
      return client.focus().then(c => c.navigate(urlToOpen));
    } else {
      // If no client is found, open a new one
      return self.clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});


self.addEventListener('install', () => {
  self.skipWaiting();
  console.log('Service Worker installing.');
});

self.addEventListener('activate', () => {
  console.log('Service Worker activating.');
  return self.clients.claim();
});
