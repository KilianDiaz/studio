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
  const title = data.title || 'Activa Ahora';
  const options = {
    body: data.body,
    icon: data.icon || '/logo192.svg',
    badge: data.badge || '/logo-mono.svg',
    vibrate: data.vibrate || [200, 100, 200],
    data: data.data,
    actions: data.actions || [],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});


self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked.');
  event.notification.close();

  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  const openOrFocusClient = async () => {
    const windowClients = await clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    for (let i = 0; i < windowClients.length; i++) {
      const client = windowClients[i];
      if (client.url === urlToOpen && 'focus' in client) {
        return client.focus();
      }
    }

    if (clients.openWindow) {
      return clients.openWindow(urlToOpen);
    }
  };
  
  const handlePostpone = async () => {
    // This is a simplified example. A real implementation would need
    // to communicate with the main app to reschedule the notification.
    console.log('Postpone action clicked. A real app would re-schedule here.');
  };

  if (event.action === 'view') {
     event.waitUntil(openOrFocusClient());
  } else if (event.action === 'postpone') {
    event.waitUntil(handlePostpone());
  } else {
    event.waitUntil(openOrFocusClient());
  }
});