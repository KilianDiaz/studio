// Escucha por la instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker instalado');
  // Forza al SW a activarse inmediatamente
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activado');
  // Toma el control de la página inmediatamente
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;

  // Cierra la notificación
  notification.close();

  // Si se hace clic en "Saltar Pausa", no hace nada más.
  if (action === 'skip') {
    return;
  }
  
  // Lógica para abrir/enfocar la ventana de la aplicación
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const urlToOpen = new URL(notification.data.url, self.location.origin).href;

      // Revisa si una ventana con la URL ya está abierta
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Si no, busca cualquier ventana de la app para enfocarla y navegar
      if (clientList.length > 0 && 'focus' in clientList[0]) {
          clientList[0].navigate(urlToOpen);
          return clientList[0].focus();
      }

      // Si no hay ninguna ventana abierta, abre una nueva
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});


self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'POSTPONE') {
        const { breakItem, minutes } = event.data.payload;
        const notificationTime = Date.now() + minutes * 60 * 1000;
        
        setTimeout(() => {
            self.registration.showNotification('¡Hora de tu pausa activa! (Pospuesta)', {
                tag: breakItem.id + '-postponed', // Tag diferente para no sobreescribir
                body: breakItem.recordatorio || `Es momento de '${breakItem.nombre}'.`,
                icon: '/logo192.svg',
                badge: '/logo-mono.svg',
                silent: false,
                requireInteraction: true,
                data: {
                  url: `/break/${breakItem.id}`,
                },
                actions: [
                    { action: 'view', title: 'Ver Pausa' },
                    { action: 'skip', title: 'Saltar Pausa' }
                ]
            });
        }, notificationTime - Date.now());
    }
});
