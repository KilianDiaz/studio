self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data.payload;
    
    event.waitUntil(
      self.registration.showNotification(title, {
        ...options,
        silent: false, // Forzar sonido
        requireInteraction: true, // Notificación persistente en escritorio
      }).catch(e => console.error("Error showing notification: ", e))
    );
  }
});


self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const urlToOpen = notification.data?.url || '/';
  
  // Cerrar la notificación
  notification.close();

  if (event.action === 'skip') {
    // No hacer nada, solo cerrar la notificación
    console.log("Notificación saltada.");
    return;
  }
  
  // Lógica para enfocar o abrir la ventana
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si la ventana/PWA ya está abierta, la enfoca.
      for (const client of clientList) {
        if (client.url === self.location.origin + urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no está abierta, abre una nueva ventana.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
