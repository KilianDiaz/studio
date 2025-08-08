"use client";
import type { Pausa } from './types';

const dayNameToNumber: { [key: string]: number } = {
  'Domingo': 0,
  'Lunes': 1,
  'Martes': 2,
  'Miércoles': 3,
  'Jueves': 4,
  'Viernes': 5,
  'Sábado': 6,
};

function getNextNotificationTime(breakItem: Pausa): number | null {
  const now = new Date();
  const [hours, minutes] = breakItem.hora.split(':').map(Number);
  
  const sortedDays = breakItem.dias.map(day => dayNameToNumber[day]).sort((a,b) => a - b);
  if(sortedDays.length === 0) return null;

  for (let i = 0; i < 8; i++) { // Check up to 8 days to be safe
    const date = new Date();
    date.setDate(now.getDate() + i);
    const dayOfWeek = date.getDay();

    if (sortedDays.includes(dayOfWeek)) {
      const potentialNotificationTime = new Date(date);
      potentialNotificationTime.setHours(hours, minutes, 0, 0);

      if (potentialNotificationTime > now) {
        return potentialNotificationTime.getTime();
      }
    }
  }

  return null;
}


export async function scheduleNotification(breakItem: Pausa) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window) || Notification.permission !== 'granted') {
    console.log('Cannot schedule notification. Conditions not met.');
    return;
  }
  
  const registration = await navigator.serviceWorker.ready;
  if (!registration || !registration.showNotification) {
    console.log('Service Worker not ready or does not support showNotification.');
    return;
  }

  // Cancel any existing notification for this break to avoid duplicates
  await cancelNotification(breakItem.id);

  const notificationTime = getNextNotificationTime(breakItem);
  
  if (notificationTime) {
    const delay = notificationTime - Date.now();
    
    if(delay < 0) return;

    console.log(`Scheduling notification for '${breakItem.nombre}' at ${new Date(notificationTime).toLocaleString()}.`);
    
    const notificationOptions = {
      tag: breakItem.id,
      body: breakItem.recordatorio || `Es momento de '${breakItem.nombre}'.`,
      icon: '/logo192.svg',
      badge: '/logo-mono.svg',
      data: {
        url: `/break/${breakItem.id}`,
      },
      actions: [
          { action: 'view', title: 'Ver Pausa' },
          { action: 'skip', title: 'Saltar Pausa' }
      ],
      silent: false,
      requireInteraction: true,
    };

    // Check for `showTrigger` availability (for scheduled notifications)
    if ('showTrigger' in Notification.prototype) {
        try {
          await registration.showNotification('¡Hora de tu pausa activa!', {
              ...notificationOptions,
              showTrigger: new (window as any).TimestampTrigger(notificationTime),
          });
          console.log("Scheduled notification with Trigger.");
        } catch(e) {
            console.error("Error scheduling with Trigger: ", e, ". Falling back to setTimeout.");
            // Fallback if trigger fails for some reason
            setTimeout(() => {
                registration.showNotification('¡Hora de tu pausa activa!', notificationOptions);
            }, delay);
        }
    } else {
        // Fallback for browsers that don't support showTrigger (e.g., Firefox)
        // This will show the notification immediately after the delay.
        // It requires the service worker to be active.
        setTimeout(() => {
            registration.showNotification('¡Hora de tu pausa activa!', notificationOptions);
            console.log("Scheduled notification with Fallback (setTimeout).");
        }, delay);
    }
  }
}

export async function cancelNotification(breakId: string) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  if (!registration) return;

  const notifications = await registration.getNotifications({ tag: breakId });
  notifications.forEach(notification => notification.close());
}

export async function syncAllNotifications(breaks: Pausa[]) {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window) || Notification.permission !== 'granted') return;
    
    const registration = await navigator.serviceWorker.ready;
    if (!registration) return;

    const currentNotifications = await registration.getNotifications();
    
    // Cancel all existing notifications
    for(const notification of currentNotifications) {
        notification.close();
    }

    // Schedule new notifications for all active breaks
    for (const breakItem of breaks) {
        if(breakItem.activa) {
            await scheduleNotification(breakItem);
        }
    }
    console.log("All notifications have been re-synced.");
}


export async function handleManualStart(breakId: string, allBreaks: Pausa[]) {
    console.log(`Manual start for ${breakId}. Re-syncing all notifications.`);
    await syncAllNotifications(allBreaks);
}
