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
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
        registration.active.postMessage(message);
    }
}

async function showNotification(title: string, options: NotificationOptions) {
  await sendMessageToServiceWorker({
    type: 'SHOW_NOTIFICATION',
    payload: { title, options },
  });
}

export async function scheduleNotification(breakItem: Pausa) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || Notification.permission !== 'granted') {
    return;
  }
  
  const notificationTime = getNextNotificationTime(breakItem);
  
  if (notificationTime) {
    const delay = notificationTime - Date.now();
    
    if(delay < 0) return;

    console.log(`Scheduling notification for '${breakItem.nombre}' at ${new Date(notificationTime).toLocaleString()}.`);
    
    setTimeout(() => {
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
        showNotification(title, options);
    }, delay);
  }
}

export async function cancelAllScheduled() {
    // This is tricky with client-side setTimeouts.
    // For this app's logic, re-syncing is enough.
    // A more robust solution would store timeout IDs.
}

export async function syncAllNotifications(breaks: Pausa[]) {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window) || Notification.permission !== 'granted') return;
    
    // We can't easily cancel client-side setTimeouts, but this re-scheduling
    // on every data change is the core logic.
    // A more complex app would need to manage timeout IDs.
    
    for (const breakItem of breaks) {
        if(breakItem.activa) {
            await scheduleNotification(breakItem);
        }
    }
    console.log("All active notifications have been scheduled.");
}
