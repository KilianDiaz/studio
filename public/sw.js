self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const breakId = event.notification.data?.breakId;

  if (breakId) {
    event.waitUntil(
      clients.openWindow(`/break/${breakId}`)
    );
  }
});
