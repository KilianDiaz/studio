/// <reference lib="webworker" />

let notificationTimeout = null;

const showNotification = (title, options) => {
  self.registration.showNotification(title, options);
};

const scheduleNotification = (timestamp, title, options) => {
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
  }

  const delay = timestamp - Date.now();
  if (delay > 0) {
    notificationTimeout = setTimeout(() => {
      showNotification(title, options);
    }, delay);
  }
};

self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  if (type === 'SCHEDULE_NOTIFICATION') {
    const { timestamp, breakData } = payload;
    const options = {
      tag: breakData.id,
      body: breakData.recordatorio || `Es momento de '${breakData.nombre}'.`,
      icon: '/logo192.svg',
      badge: '/logo-mono.svg',
      silent: false,
      requireInteraction: true,
      data: {
        url: `/break/${breakData.id}`,
        breakData: breakData, // Pass full break data
      },
      actions: [
        { action: 'view', title: 'Ver Pausa' },
        { action: 'postpone', title: 'Posponer 10 min' },
        { action: 'skip', title: 'Saltar' }
      ]
    };
    scheduleNotification(timestamp, '¡Hora de tu pausa activa!', options);
  } else if (type === 'CLEAR_SCHEDULE') {
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
      notificationTimeout = null;
    }
  }
});


self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

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

  event.waitUntil(promiseChain);
});


self.addEventListener('push', event => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/logo192.svg'
  });
});