self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const data = event.data.json();
  console.log('Push received.', data);
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      data: data.data,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked.');
  event.notification.close();
  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      // Si la ventana de la app ya está abierta, la enfoca
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus().then(c => c.navigate(urlToOpen));
      }
      // Si no, abre una nueva ventana
      return clients.openWindow(urlToOpen);
    })
  );
});
