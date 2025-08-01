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

function postMessageToSW(message: any) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
  } else {
    navigator.serviceWorker.ready.then(registration => {
      registration.active?.postMessage(message);
    });
  }
}

function showNotificationViaSW(title: string, options: NotificationOptions) {
    postMessageToSW({
        type: 'SHOW_NOTIFICATION',
        payload: { title, options }
    });
}


export async function schedulePostponedNotification(breakItem: Pausa, postponeMinutes: number) {
    const notificationTime = Date.now() + postponeMinutes * 60 * 1000;
    const delay = notificationTime - Date.now();
    
    setTimeout(() => {
        showNotificationViaSW('¡Pausa pospuesta!', {
            tag: `postponed-${breakItem.id}-${Date.now()}`,
            body: `Tu pausa '${breakItem.nombre}' comenzará pronto.`,
            data: { url: `/break/${breakItem.id}` },
            actions: [{ action: 'view', title: 'Ver Pausa' }]
        });
    }, Math.max(0, delay));
    
    await scheduleNotification(breakItem);
}


export async function scheduleNotification(breakItem: Pausa) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || Notification.permission !== 'granted') {
    return;
  }
  
  await cancelNotification(breakItem.id);

  const notificationTime = getNextNotificationTime(breakItem);
  
  if (notificationTime) {
    const delay = notificationTime - Date.now();
    if (delay < 0) return;

    setTimeout(() => {
        showNotificationViaSW('¡Hora de tu pausa activa!', {
            tag: breakItem.id,
            body: breakItem.recordatorio || `Es momento de '${breakItem.nombre}'.`,
            timestamp: notificationTime,
            data: { url: `/break/${breakItem.id}` },
            actions: [
                { action: 'view', title: 'Ver Pausa' },
                { action: 'postpone', title: 'Posponer' }
            ]
        });
    }, delay);
  }
}

export async function cancelNotification(breakId: string) {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || Notification.permission !== 'granted') return;
    const registration = await navigator.serviceWorker.ready;
    const notifications = await registration.getNotifications({ tag: breakId });
    notifications.forEach(notification => notification.close());
}

export async function syncAllNotifications(breaks: Pausa[]) {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || Notification.permission !== 'granted') return;
    
    const registration = await navigator.serviceWorker.ready;
    const currentNotifications = await registration.getNotifications();
    
    for(const notification of currentNotifications) {
        notification.close();
    }

    for (const breakItem of breaks) {
        if(breakItem.activa) {
            await scheduleNotification(breakItem);
        }
    }
}
