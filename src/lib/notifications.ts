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

  let notificationTime: Date | null = null;

  for (let i = 0; i < 8; i++) {
    const date = new Date();
    date.setDate(now.getDate() + i);
    const dayOfWeek = date.getDay();

    if (sortedDays.includes(dayOfWeek)) {
      const potentialNotificationTime = new Date(date);
      potentialNotificationTime.setHours(hours, minutes, 0, 0);

      if (potentialNotificationTime > now) {
        notificationTime = potentialNotificationTime;
        break; 
      }
    }
  }

  return notificationTime ? notificationTime.getTime() : null;
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
        vibrate: [200, 100, 200],
        silent: false,
        data: {
          url: `/break/${breakItem.id}`,
        },
        actions: [
            { action: 'view', title: 'Ver Pausa' },
            { action: 'postpone', title: 'Posponer' }
        ]
    };
    
    if ('showTrigger' in Notification.prototype) {
        try {
          await registration.showNotification('¡Hora de tu pausa activa!', {
              ...notificationOptions,
              timestamp: notificationTime,
              showTrigger: new (window as any).TimestampTrigger(notificationTime),
          });
          console.log("Scheduled notification with Trigger.");
        } catch(e) {
            console.error("Error scheduling with Trigger: ", e);
        }
    } else {
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
  console.log(`Cancelled notification for break ${breakId}`);
}

export async function syncAllNotifications(breaks: Pausa[]) {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window) || Notification.permission !== 'granted') return;
    
    const registration = await navigator.serviceWorker.ready;
    if (!registration) return;

    const currentNotifications = await registration.getNotifications();
    
    for(const notification of currentNotifications) {
        notification.close();
    }

    for (const breakItem of breaks) {
        if(breakItem.activa) {
            await scheduleNotification(breakItem);
        }
    }
    console.log("All notifications have been re-synced.");
}
