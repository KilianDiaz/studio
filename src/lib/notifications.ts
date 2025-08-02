"use client";
import type { Pausa } from './types';

function postMessageToSW(message: any) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
  } else if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.active?.postMessage(message);
    });
  }
}

/**
 * Sends the latest list of active breaks to the service worker.
 * The service worker will then handle all scheduling and display of notifications.
 */
export function syncNotificationsWithServiceWorker(breaks: Pausa[]) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || Notification.permission !== 'granted') {
    return;
  }
  
  const activeBreaks = breaks.filter(b => b.activa);
  
  postMessageToSW({
    type: 'SYNC_SCHEDULE',
    payload: {
      breaks: activeBreaks,
    }
  });
}

/**
 * Tells the service worker to cancel a specific notification.
 */
export function cancelNotification(breakId: string) {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    postMessageToSW({ type: 'CANCEL_NOTIFICATION', payload: { breakId } });
}

/**
 * Schedules a one-time postponed notification via the service worker.
 */
export function schedulePostponedNotification(breakItem: Pausa, minutes: number) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || Notification.permission !== 'granted') {
    return;
  }

  const notificationTime = Date.now() + minutes * 60 * 1000;
  
  postMessageToSW({
    type: 'SCHEDULE_POSTPONED_NOTIFICATION',
    payload: {
      breakItem: breakItem,
      notificationTime: notificationTime,
    }
  });
}

/**
 * A utility function to be called from the UI when a break is manually started.
 * This tells the service worker to re-calculate the schedule, effectively skipping
 * the notification for the current day.
 */
export function handleManualStart(breaks: Pausa[]) {
    syncNotificationsWithServiceWorker(breaks);
}
