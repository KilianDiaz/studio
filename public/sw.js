/// <reference lib="webworker" />

// Simple function to find and focus an existing window/client
async function findAndFocusClient(url) {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  const urlToOpen = new URL(url, self.location.origin).href;

  for (const client of clients) {
    // Check if the client's URL matches, ignoring query params for a broader match
    const clientURL = new URL(client.url, self.location.origin).href;
    if (clientURL.startsWith(urlToOpen.split('?')[0])) {
      return client.focus();
    }
  }

  // If no client was found, open a new one
  return self.clients.openWindow(url);
}


self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  
  notification.close(); // Always close the notification on interaction

  const urlToOpen = notification.data?.url || '/';

  if (action === 'skip') {
    // User chose to skip, so we do nothing further.
    console.log('User skipped the break.');
  } else {
    // Default action (clicking the notification body) or 'view' action
    event.waitUntil(findAndFocusClient(urlToOpen));
  }
});
