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
  nextWeekDate.setDate(now.getDate() + 7);
  for(const dayOfWeek of sortedDays) {
     const daysUntilNext = (dayOfWeek - nextWeekDate.getDay() + 7) % 7;
     const nextDate = new Date(nextWeekDate);
     nextDate.setDate(nextWeekDate.getDate() + daysUntilNext);
     nextDate.setHours(hours, minutes, 0, 0);
     if(nextDate > now) {
      return nextDate.getTime();
     }
  }

  return null;
}

export async function scheduleNotification(breakItem: Pausa) {
  if (Notification.permission !== 'granted') {
    console.log('Notification permission not granted.');
    return;
  }
  
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    console.log('Service Worker not found.');
    return;
  }

  // Cancel any existing notification for this break to avoid duplicates
  await cancelNotification(breakItem.id);

  const notificationTime = getNextNotificationTime(breakItem);
  
  if (notificationTime) {
    const delay = notificationTime - Date.now();
    
    if(delay < 0) return;

    console.log(`Scheduling notification for '${breakItem.nombre}' in ${Math.round(delay / 1000 / 60)} minutes.`);
    
    await registration.showNotification('¡Hora de tu pausa activa!', {
      tag: breakItem.id,
      body: breakItem.recordatorio || `Es momento de '${breakItem.nombre}'.`,
      icon: '/logo192.png',
      timestamp: notificationTime,
      showTrigger: new (window as any).TimestampTrigger(notificationTime),
      data: {
        breakId: breakItem.id,
      },
    });
  }
}

export async function cancelNotification(breakId: string) {
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return;

  const notifications = await registration.getNotifications({ tag: breakId });
  notifications.forEach(notification => notification.close());
  console.log(`Cancelled notification for break ${breakId}`);
}

export async function syncNotifications(breaks: Pausa[]) {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) return;
    
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;

    const currentNotifications = await registration.getNotifications();
    const scheduledIds = new Set(currentNotifications.map(n => n.tag));

    // Cancel notifications for breaks that are no longer active or have been deleted
    for(const notification of currentNotifications) {
        const breakExists = breaks.some(b => b.id === notification.tag && b.activa);
        if(!breakExists) {
            notification.close();
        }
    }

    // Schedule notifications for new or re-activated breaks
    for (const breakItem of breaks) {
        if(breakItem.activa && !scheduledIds.has(breakItem.id)) {
            await scheduleNotification(breakItem);
        }
    }
}
