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
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn("Service Worker not supported or window not available.");
    return;
  };
  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
        registration.active.postMessage(message);
    } else {
        console.warn("Service Worker is not active.");
    }
  } catch(error) {
    console.error("Error sending message to Service Worker:", error);
  }
}

export async function syncAllNotifications(breaks: Pausa[]) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || Notification.permission !== 'granted') {
    console.log('Cannot sync notifications. Conditions not met.');
    return;
  }
  
  const activeBreaks = breaks.filter(b => b.activa);
  
  const notificationsToSchedule = activeBreaks.map(breakItem => {
    const notificationTime = getNextNotificationTime(breakItem);
    if(notificationTime) {
      return {
        timestamp: notificationTime,
        breakData: breakItem
      };
    }
    return null;
  }).filter(Boolean);


  if (notificationsToSchedule.length > 0) {
    console.log(`[Client] Sending ${notificationsToSchedule.length} notifications to SW to schedule.`);
    await sendMessageToServiceWorker({
      type: 'SCHEDULE_NOTIFICATIONS',
      payload: notificationsToSchedule
    });
  } else {
    // If there are no active breaks, clear the schedule in the SW
    console.log('[Client] No active breaks. Clearing schedule in SW.');
    await sendMessageToServiceWorker({ type: 'SCHEDULE_NOTIFICATIONS', payload: [] });
  }
}

export async function handleManualStart(breakId: string, allBreaks: Pausa[]) {
    console.log(`Manual start for ${breakId}. Re-syncing all notifications.`);
    // When a break is started manually, we re-sync all notifications to recalculate the next scheduled one.
    await syncAllNotifications(allBreaks);
}

export async function cancelNotification(breakId: string) {
  // This function might not be necessary if SW handles everything,
  // but it's good practice to keep it for manual cancellation from UI if needed.
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  if (!registration) return;

  const notifications = await registration.getNotifications({ tag: breakId });
  notifications.forEach(notification => notification.close());
  console.log(`[Client] Manually cancelled notification for break ${breakId}`);
}
