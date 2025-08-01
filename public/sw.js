self.addEventListener('push', event => {
  // Fallback for push notifications, though we are using local notifications
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/logo192.svg'
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(windowClients => {
      // Check if there is already a window/tab open with the target URL
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, check for any other open window/tab of the app
      if (windowClients.length > 0) {
        return windowClients[0].focus().then(client => client.navigate(urlToOpen));
      }
      // If there are no clients open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});
