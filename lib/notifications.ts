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

  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() + i);
    
    const dayOfWeek = date.getDay();

    if (sortedDays.includes(dayOfWeek)) {
      const notificationTime = new Date(date);
      notificationTime.setHours(hours, minutes, 0, 0);

      if (notificationTime > now) {
        return notificationTime.getTime();
      }
    }
  }

  // If all days this week are past, check next week
  const nextWeekDate = new Date(now);
  const currentDay = now.getDay();

  // Find the next scheduled day
  let nextDay = -1;
  for(const day of sortedDays) {
      if(day > currentDay) {
          nextDay = day;
          break;
      }
  }
  // If no day found in the rest of the week, take the first day of next week
  if(nextDay === -1) {
      nextDay = sortedDays[0];
  }
  
  const daysUntilNext = (nextDay - currentDay + 7) % 7;
  // If the next day is today, but the time has passed, schedule for next week
  const daysToAdd = daysUntilNext === 0 && new Date().setHours(hours, minutes, 0, 0) < now.getTime() ? 7 : daysUntilNext;


  const finalDate = new Date(now);
  finalDate.setDate(now.getDate() + daysToAdd);
  finalDate.setHours(hours, minutes, 0, 0);

  return finalDate.getTime();
}


export async function scheduleNotification(breakItem: Pausa) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window) || Notification.permission !== 'granted') {
    console.log('Cannot schedule notification. Conditions not met.');
    return;
  }
  
  const registration = await navigator.serviceWorker.ready;
  if (!registration) {
    console.log('Service Worker not ready.');
    return;
  }

  // Cancel any existing notification for this break to avoid duplicates
  await cancelNotification(breakItem.id);

  const notificationTime = getNextNotificationTime(breakItem);
  
  if (notificationTime) {
    const delay = notificationTime - Date.now();
    
    if(delay < 0) return;

    console.log(`Scheduling notification for '${breakItem.nombre}' at ${new Date(notificationTime).toLocaleString()}.`);
    
    // Check for `showTrigger` availability
    if ('showTrigger' in Notification.prototype) {
        await registration.showNotification('¡Hora de tu pausa activa!', {
            tag: breakItem.id,
            body: breakItem.recordatorio || `Es momento de '${breakItem.nombre}'.`,
            icon: '/logo192.svg',
            timestamp: notificationTime,
            showTrigger: new (window as any).TimestampTrigger(notificationTime),
            data: {
              url: `/break/${breakItem.id}`,
            },
        });
    } else {
        // Fallback for browsers that don't support showTrigger (e.g., Firefox)
        // This will show the notification immediately after the delay.
        // It requires the service worker to be active.
        setTimeout(() => {
            registration.showNotification('¡Hora de tu pausa activa!', {
                tag: breakItem.id,
                body: breakItem.recordatorio || `Es momento de '${breakItem.nombre}'.`,
                icon: '/logo192.svg',
                data: {
                  url: `/break/${breakItem.id}`,
                },
            });
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

    