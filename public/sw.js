self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const breakId = notification.tag;

  notification.close();

  // Handle the 'postpone' action separately
  if (action === 'postpone') {
    // In a real app, you might message the client to handle this.
    // For now, we just log it. A more complex implementation
    // would require client-side communication.
    console.log('Postpone action clicked. Implement postponing logic here.');
    // Example: Reschedule for 10 minutes later. This is complex from a SW.
    return; 
  }

  // For both the 'view' action and a general click on the notification body
  const urlToOpen = new URL(`/break/${breakId}`, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      // Check if there's already a window open with the app
      for (const client of clientList) {
        // A more robust check might be needed if your app has complex routing
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // If no window is found, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
