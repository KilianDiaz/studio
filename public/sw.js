self.addEventListener('push', event => {
  console.log('[Service Worker] Push Received.');
  console.log(`[Service Worker] Push had this data: "${event.data.text()}"`);

  const title = '¡Hora de tu pausa activa!';
  const options = {
    body: event.data.text(),
    icon: 'logo192.svg',
    badge: 'logo-mono.svg',
    vibrate: [200, 100, 200],
    silent: false,
    data: {
      url: self.location.origin,
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click Received.');

  event.notification.close();

  const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then(clientList => {
      if (clientList.length > 0) {
        let client = clientList.find(c => c.url === urlToOpen && 'focus' in c);
        if (client) {
            return client.focus();
        }
        if (clientList[0].navigate && clientList[0].focus) {
            clientList[0].navigate(urlToOpen);
            return clientList[0].focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service worker activating...');
});
