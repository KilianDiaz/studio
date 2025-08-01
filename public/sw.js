self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked.');
  event.notification.close();

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Si ya hay una ventana de la app abierta, la enfoca.
      for (const client of clientList) {
        // Compara la URL base, ignorando la ruta específica.
        if (new URL(client.url).origin === new URL(self.location.origin).origin) {
          return client.focus();
        }
      }
      // Si no hay ninguna ventana abierta, abre una nueva.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});