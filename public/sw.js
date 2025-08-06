// self.skipWaiting();

let notificationTimeout;

const showNotification = (title, options) => {
  self.registration.showNotification(title, options);
};

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { timestamp, breakData } = event.data.payload;
    
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
    }
    
    const delay = timestamp - Date.now();
    
    if (delay > 0) {
      notificationTimeout = setTimeout(() => {
        showNotification('¡Hora de tu pausa activa!', {
            tag: breakData.id,
            body: breakData.recordatorio || `Es momento de '${breakData.nombre}'.`,
            icon: '/logo192.svg',
            badge: '/logo-mono.svg',
            silent: false,
            requireInteraction: true,
            data: {
              url: `/break/${breakData.id}`,
            },
            actions: [
                { action: 'view', title: 'Ver Pausa' },
                { action: 'skip', title: 'Saltar Pausa' }
            ]
        });
      }, delay);
    }
  } else if(event.data && event.data.type === 'CLEAR_SCHEDULE') {
      if (notificationTimeout) {
        clearTimeout(notificationTimeout);
      }
  }
});


self.addEventListener('notificationclick', (event) => {
    const notification = event.notification;
    const urlToOpen = new URL(notification.data.url, self.location.origin).href;

    // Close the notification
    notification.close();

    const promiseChain = clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    }).then((windowClients) => {
        let matchingClient = null;
        for (let i = 0; i < windowClients.length; i++) {
            const windowClient = windowClients[i];
            if (windowClient.url === urlToOpen) {
                matchingClient = windowClient;
                break;
            }
        }

        if (matchingClient) {
            return matchingClient.focus();
        } else {
            return clients.openWindow(urlToOpen);
        }
    });

    if (event.action === 'view') {
        event.waitUntil(promiseChain);
    } else if (event.action === 'skip') {
        // Just close the notification, which is already done above.
        // No further action is needed.
    } else {
        // Default action (clicking the notification body)
        event.waitUntil(promiseChain);
    }
});
