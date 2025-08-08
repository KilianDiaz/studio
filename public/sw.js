// self.skipWaiting();

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const breakId = event.notification.tag;
  const action = event.action;

  if (action === 'skip') {
    // User chose to skip, just close the notification.
    console.log('Break skipped.');
  } else {
    // Default action (or 'view' action) is to open/focus the app
    const urlToOpen = new URL(`/break/${breakId}`, self.location.origin).href;

    const promise = clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(windowClients) {
      let matchingClient = null;

      for (let i = 0; i < windowClients.length; i++) {
        const wc = windowClients[i];
        if (wc.url === urlToOpen) {
          matchingClient = wc;
          break;
        }
      }

      if (matchingClient) {
        return matchingClient.focus();
      } else {
        return clients.openWindow(urlToOpen);
      }
    });
    
    event.waitUntil(promise);
  }
});
