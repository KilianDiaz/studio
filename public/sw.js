
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
});


self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';
  const action = event.action;

  if (action === 'skip') {
    console.log('User skipped the break.');
    return;
  }
  
  // This logic handles focusing an existing window or opening a new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's a window for this URL open already.
      for (const client of clientList) {
        if (client.url === self.location.origin + urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new one.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log("Push event has no data.");
    return;
  }

  try {
    const data = event.data.json();
    const { title, options } = data;
    
    event.waitUntil(
      self.registration.showNotification(title, {
        ...options,
        silent: false, // Ensure sound is played on desktop
      })
    );
  } catch(e) {
    console.error("Error processing push event data: ", e);
  }
});
