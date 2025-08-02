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

async function sendMessageToServiceWorker(message: any) {
  if (!('serviceWorker' in navigator)) {
    console.warn("Service Worker not supported.");
    return;
  };
  const registration = await navigator.serviceWorker.ready;
  if (registration.active) {
      registration.active.postMessage(message);
  }
}


export async function syncAllNotifications(breaks: Pausa[]) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || Notification.permission !== 'granted') {
    return;
  }
  
  const activeBreaks = breaks.filter(b => b.activa);

  // Clear any previously scheduled notifications in the SW
  await sendMessageToServiceWorker({ type: 'CLEAR_SCHEDULE' });

  // Find the next overall notification to schedule
  let nextNotification = null;

  for (const breakItem of activeBreaks) {
    const notificationTime = getNextNotificationTime(breakItem);
    if (notificationTime) {
      const notificationDetails = {
        timestamp: notificationTime,
        breakData: breakItem
      };
      if (!nextNotification || notificationTime < nextNotification.timestamp) {
        nextNotification = notificationDetails;
      }
    }
  }

  // Schedule only the very next notification
  if (nextNotification) {
    console.log(`Scheduling next notification for '${nextNotification.breakData.nombre}' at ${new Date(nextNotification.timestamp).toLocaleString()}.`);
    await sendMessageToServiceWorker({
      type: 'SCHEDULE_NOTIFICATION',
      payload: nextNotification
    });
  }
}

export async function handleManualStart(breakId: string) {
    // This function can be used to manually trigger a break if needed,
    // but the main logic is now handled by re-syncing.
    console.log(`Manual start requested for ${breakId}. Re-syncing notifications.`);
    // A full sync will correctly schedule the next notification after this manual one.
}
