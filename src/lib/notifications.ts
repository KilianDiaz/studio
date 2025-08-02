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

  for (let i = 0; i < 7; i++) {
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

  if (!notificationTime) {
      const currentDay = now.getDay();
      let nextDay = -1;
      
      for (const day of sortedDays) {
          if (day > currentDay) {
              nextDay = day;
              break;
          }
      }
      
      if (nextDay === -1) {
          nextDay = sortedDays[0];
      }

      const daysUntilNext = (nextDay - currentDay + 7) % 7;
      const daysToAdd = daysUntilNext === 0 ? 7 : daysUntilNext;

      const finalDate = new Date();
      finalDate.setDate(now.getDate() + daysToAdd);
      finalDate.setHours(hours, minutes, 0, 0);
      notificationTime = finalDate;
  }

  return notificationTime.getTime();
}

async function sendMessageToServiceWorker(message: any) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
  } else {
    // Wait for the service worker to be ready.
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(message);
    }
  }
}

async function scheduleViaServiceWorker(delay: number, title: string, options: NotificationOptions) {
  await sendMessageToServiceWorker({
    type: 'SCHEDULE_NOTIFICATION',
    payload: { delay, title, options },
  });
}

export async function scheduleNotification(breakItem: Pausa) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || Notification.permission !== 'granted') {
    return;
  }
  
  await cancelNotification(breakItem.id);

  const notificationTime = getNextNotificationTime(breakItem);
  
  if (notificationTime) {
    const delay = notificationTime - Date.now();
    if(delay < 0) return;

    console.log(`Scheduling notification for '${breakItem.nombre}' via Service Worker in ${delay / 1000}s.`);
    
    const title = '¡Hora de tu pausa activa!';
    const options = {
        tag: breakItem.id,
        body: breakItem.recordatorio || `Es momento de '${breakItem.nombre}'.`,
        data: { url: `/break/${breakItem.id}` },
        actions: [
            { action: 'view', title: 'Ver Pausa' },
            { action: 'skip', title: 'Saltar Pausa' }
        ]
    };
    
    await scheduleViaServiceWorker(delay, title, options);
  }
}

export async function schedulePostponedNotification(breakItem: Pausa, minutes: number) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || Notification.permission !== 'granted') {
    return;
  }
  
  const delay = minutes * 60 * 1000;
  if (delay < 0) return;

  const title = `Pausa pospuesta: ${breakItem.nombre}`;
  const options = {
      tag: breakItem.id + '-postponed', // Use a different tag for postponed
      body: `Es momento de tu pausa '${breakItem.nombre}'.`,
      data: { url: `/break/${breakItem.id}` },
      actions: [
          { action: 'view', title: 'Ver Pausa' },
          { action: 'skip', title: 'Saltar Pausa' }
      ]
  };

  await scheduleViaServiceWorker(delay, title, options);
}

export async function cancelNotification(breakId: string) {
  const registration = await navigator.serviceWorker.ready;
  if (!registration) return;

  const notifications = await registration.getNotifications({ tag: breakId });
  notifications.forEach(notification => notification.close());
  
  const postponedTag = breakId + '-postponed';
  const postponedNotifications = await registration.getNotifications({ tag: postponedTag });
  postponedNotifications.forEach(notification => notification.close());

  console.log(`Cancelled notifications for break ${breakId}`);
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
    console.log("All notifications have been re-synced with the Service Worker.");
}

export function handleManualStart(breaks: Pausa[]) {
  syncAllNotifications(breaks);
}
