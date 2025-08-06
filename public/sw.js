'use strict';

let notificationTimer = null;
let scheduledNotifications = [];

// Helper function to show a notification
function showNotification(notificationData) {
    const { breakData, postponed } = notificationData;
    console.log(`[SW] Showing notification for: ${breakData.nombre}`);

    const title = postponed ? `Recordatorio: ${breakData.nombre}` : '¡Hora de tu pausa activa!';
    const body = breakData.recordatorio || `Es momento de tomar tu pausa '${breakData.nombre}'.`;

    self.registration.showNotification(title, {
        tag: breakData.id,
        body: body,
        icon: '/logo192.svg',
        badge: '/logo-mono.svg',
        silent: false,
        requireInteraction: true,
        data: {
            url: `/break/${breakData.id}`,
            breakData: breakData,
        },
        actions: [
            { action: 'view', title: 'Ver Pausa' },
            { action: 'postpone-10', title: 'Posponer 10 min' },
            { action: 'skip', title: 'Saltar Pausa' },
        ],
    });
}

// Function to schedule the next notification
function scheduleNextNotification() {
    // Clear any existing timer
    if (notificationTimer) {
        clearTimeout(notificationTimer);
        notificationTimer = null;
    }

    if (scheduledNotifications.length === 0) {
        console.log('[SW] No notifications to schedule.');
        return;
    }

    // Sort notifications by timestamp to find the next one
    scheduledNotifications.sort((a, b) => a.timestamp - b.timestamp);
    const nextNotification = scheduledNotifications[0];

    const now = Date.now();
    const delay = nextNotification.timestamp - now;

    if (delay > 0) {
        console.log(`[SW] Scheduling next notification in ${delay / 1000} seconds.`);
        notificationTimer = setTimeout(() => {
            showNotification(nextNotification);
            // Remove the notification that was just shown and reschedule
            scheduledNotifications = scheduledNotifications.filter(n => n.breakData.id !== nextNotification.breakData.id);
            scheduleNextNotification(); // Schedule the next one in the list
        }, delay);
    } else {
        // If the time is in the past, show it immediately (or handle as needed)
        console.log('[SW] Notification time is in the past, showing immediately.');
        showNotification(nextNotification);
        scheduledNotifications = scheduledNotifications.filter(n => n.breakData.id !== nextNotification.breakData.id);
        scheduleNextNotification();
    }
}


self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SCHEDULE_NOTIFICATIONS') {
        console.log('[SW] Received new schedule from client.', event.data.payload);
        scheduledNotifications = event.data.payload;
        scheduleNextNotification();
    }
});


self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const notificationData = event.notification.data;
    const urlToOpen = new URL(notificationData.url, self.location.origin).href;

    const handleAction = async () => {
        if (event.action === 'skip') {
            console.log('[SW] Skipping break.');
            // The break is skipped, and the next one will be scheduled automatically.
            return;
        }

        if (event.action.startsWith('postpone-')) {
            const minutes = parseInt(event.action.split('-')[1], 10);
            console.log(`[SW] Postponing break for ${minutes} minutes.`);
            const newTimestamp = Date.now() + minutes * 60 * 1000;
            const postponedNotification = {
                timestamp: newTimestamp,
                breakData: notificationData.breakData,
                postponed: true,
            };
            // Add the postponed notification to the schedule and re-evaluate
            scheduledNotifications.push(postponedNotification);
            scheduleNextNotification();
            return;
        }

        // Default action (click on notification body) or 'view' action
        const windowClients = await self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true,
        });

        for (let i = 0; i < windowClients.length; i++) {
            const client = windowClients[i];
            if (client.url === urlToOpen && 'focus' in client) {
                return client.focus();
            }
        }

        if (self.clients.openWindow) {
            return self.clients.openWindow(urlToOpen);
        }
    };

    event.waitUntil(handleAction());
});

self.addEventListener('install', () => {
    self.skipWaiting();
    console.log('[SW] Service Worker installed.');
});

self.addEventListener('activate', () => {
    console.log('[SW] Service Worker activated.');
    return self.clients.claim();
});
