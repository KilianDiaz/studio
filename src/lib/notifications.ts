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

  // Check from today for the next 7 days
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

  // If no time was found in the next 7 days, it must be next week
  if (!notificationTime) {
      const currentDay = now.getDay();
      let nextDay = -1;
      
      // Find the first scheduled day after today
      for (const day of sortedDays) {
          if (day > currentDay) {
              nextDay = day;
              break;
          }
      }
      
      // If no day is found later this week, take the first scheduled day of next week
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
  } else if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.active?.postMessage(message);
    });
  }
}

export async function scheduleNotification(breakItem: Pausa) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || Notification.permission !== 'granted') {
    return;
  }
  
  // First, cancel any existing notification for this break to avoid duplicates
  await cancelNotification(breakItem.id);

  const notificationTime = getNextNotificationTime(breakItem);
  
  if (notificationTime) {
    postMessageToSW({
      type: 'SCHEDULE_NOTIFICATION',
      payload: {
        breakItem: breakItem,
        notificationTime: notificationTime,
      }
    });
  }
}

export async function cancelNotification(breakId: string) {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    postMessageToSW({ type: 'CANCEL_NOTIFICATION', payload: { breakId } });
}

export async function syncAllNotifications(breaks: Pausa[]) {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || Notification.permission !== 'granted') return;
    
    // Cancel all existing notifications first
    postMessageToSW({ type: 'CANCEL_ALL_NOTIFICATIONS' });
    
    // Schedule new ones
    for (const breakItem of breaks) {
        if(breakItem.activa) {
            await scheduleNotification(breakItem);
        }
    }
}

    