let notificationTimeout = null;

self.addEventListener('message', (event) => {
  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    // Clear any existing timeout to ensure only one is scheduled
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
    }
    
    const { timestamp, breakData } = event.data.payload;
    const delay = timestamp - Date.now();

    if (delay > 0) {
      notificationTimeout = setTimeout(() => {
        const title = '¡Hora de tu pausa activa!';
        const options = {
          tag: breakData.id,
          body: breakData.recordatorio || `Es momento de '${breakData.nombre}'.`,
          icon: '/logo192.svg',
          badge: '/logo-mono.svg',
          silent: false,
          requireInteraction: true,
          data: {
            url: `/break/${breakData.id}`,
            breakId: breakData.id
          },
          actions: [
            { action: 'view', title: 'Ver Pausa' },
            { action: 'skip', title: 'Saltar Pausa' }
          ]
        };
        self.registration.showNotification(title, options);
      }, delay);
    }
  } else if (event.data.type === 'CLEAR_SCHEDULE') {
      if (notificationTimeout) {
        clearTimeout(notificationTimeout);
        notificationTimeout = null;
      }
  }
});


self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;
  
  const promise = self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((clientList) => {
    let client = null;

    for (const c of clientList) {
      if (c.url === urlToOpen) {
        client = c;
        break;
      }
    }

    if (client) {
      return client.focus();
    } else {
      return self.clients.openWindow(urlToOpen);
    }
  });

  if (event.action === 'skip') {
    // User skipped, do nothing further. The notification is already closed.
    console.log('User skipped the break.');
  } else {
    // For 'view' action or a general click, open the app.
    event.waitUntil(promise);
  }
});


self.addEventListener('install', () => {
  self.skipWaiting();
  console.log('Service Worker installing.');
});

self.addEventListener('activate', () => {
  console.log('Service Worker activating.');
  // Force the waiting service worker to become the active service worker.
  return self.clients.claim();
});
