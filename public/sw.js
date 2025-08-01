self.addEventListener('push', event => {
    const data = event.data.json();
    self.registration.showNotification(data.title, data.options);
});

self.addEventListener('notificationclick', event => {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';
    const action = event.action;

    if (action === 'postpone') {
        const breakId = event.notification.tag;
        const body = event.notification.body;
        const icon = event.notification.icon;
        const badge = event.notification.badge;
        const vibrate = event.notification.vibrate;

        const postponeMinutes = 10;
        const notificationTime = Date.now() + postponeMinutes * 60 * 1000;

        const title = '¡Pausa pospuesta!';
        const options = {
            tag: `postponed-${breakId}-${Date.now()}`,
            body: `Tu pausa ha sido pospuesta por ${postponeMinutes} minutos.`,
            icon: icon,
            badge: badge,
            vibrate: vibrate,
            data: {
                url: urlToOpen
            },
            actions: [
                { action: 'view', title: 'Ver Pausa' },
            ],
            silent: false
        };

        const delay = notificationTime - Date.now();
        
        setTimeout(() => {
            self.registration.showNotification(title, options);
        }, delay);

        event.waitUntil(Promise.resolve());
        return;
    }

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(clientList => {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                // Check if the client's URL is part of the app's scope
                if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                    // Navigate to the correct URL and focus
                    return client.navigate(urlToOpen).then(c => c.focus());
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

self.addEventListener('install', () => {
    self.skipWaiting();
    console.log('Service Worker instalado');
});

self.addEventListener('activate', event => {
    event.waitUntil(clients.claim());
    console.log('Service Worker activado');
});
