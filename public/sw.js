self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked.');
  event.notification.close();

  const urlToOpen = event.notification.data.url;

  if (event.action === 'postpone') {
    // This is a placeholder. A real implementation would need
    // to communicate with the app to reschedule the break.
    console.log('Postpone action clicked');
    // For now, we don't do anything, just close the notification.
    return;
  }
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if there's already a window open with the app.
      for (const client of clientList) {
        // Use a simple check if the client URL includes the origin.
        // This is more robust than a strict URL match.
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is found, open a new one.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
