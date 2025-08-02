// THIS FILE MUST BE IN THE /public FOLDER

let scheduledTimeout = null;
let activeBreaks = [];

const dayNameToNumber = {
  'Domingo': 0,
  'Lunes': 1,
  'Martes': 2,
  'Miércoles': 3,
  'Jueves': 4,
  'Viernes': 5,
  'Sábado': 6,
};

self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SYNC_SCHEDULE':
      activeBreaks = payload.breaks;
      scheduleNextNotification();
      break;
    case 'SCHEDULE_POSTPONED_NOTIFICATION':
      schedulePostponed(payload.breakItem, payload.notificationTime);
      break;
  }
});

function getNextNotification() {
  let nextNotification = null;

  for (const breakItem of activeBreaks) {
    const notificationTime = getNextNotificationTimeForBreak(breakItem);
    if (notificationTime) {
      if (!nextNotification || notificationTime < nextNotification.time) {
        nextNotification = {
          time: notificationTime,
          item: breakItem
        };
      }
    }
  }

  return nextNotification;
}

function getNextNotificationTimeForBreak(breakItem) {
  const now = new Date();
  const [hours, minutes] = breakItem.hora.split(':').map(Number);
  const sortedDays = breakItem.dias.map(day => dayNameToNumber[day]).sort((a,b) => a - b);
  
  if (sortedDays.length === 0) return null;

  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
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

  // If no time this week, find the first day next week
  const nextWeekDay = sortedDays[0];
  const daysUntilNext = (nextWeekDay - now.getDay() + 7) % 7;
  const daysToAdd = daysUntilNext === 0 ? 7 : daysUntilNext;
  
  const finalDate = new Date();
  finalDate.setDate(now.getDate() + daysToAdd);
  finalDate.setHours(hours, minutes, 0, 0);
  
  return finalDate.getTime();
}

function scheduleNextNotification() {
  if (scheduledTimeout) {
    clearTimeout(scheduledTimeout);
  }

  const nextNotification = getNextNotification();

  if (nextNotification) {
    const delay = nextNotification.time - Date.now();
    if (delay < 0) return;

    console.log(`SW: Scheduling notification for '${nextNotification.item.nombre}' in ${delay/1000} seconds.`);

    scheduledTimeout = setTimeout(() => {
      showNotification(nextNotification.item);
      // After showing, schedule the next one
      scheduleNextNotification();
    }, delay);
  } else {
    console.log("SW: No active breaks to schedule.");
  }
}

function schedulePostponed(breakItem, notificationTime) {
  const delay = notificationTime - Date.now();
  if (delay > 0) {
    setTimeout(() => {
      showNotification(breakItem, true); // true indicates it's a postponed notification
    }, delay);
  }
}

function showNotification(breakItem, isPostponed = false) {
  const title = isPostponed ? `Recordatorio de Pausa: ${breakItem.nombre}` : '¡Hora de tu pausa activa!';
  const options = {
    tag: breakItem.id,
    body: breakItem.recordatorio || `Es momento de '${breakItem.nombre}'.`,
    icon: '/logo192.svg',
    badge: '/logo-mono.svg',
    vibrate: [200, 100, 200],
    silent: false,
    requireInteraction: true,
    data: {
      url: `/break/${breakItem.id}`,
      breakId: breakItem.id,
    },
    actions: [
      { action: 'view', title: 'Ver Pausa' },
      { action: 'postpone-10', title: 'Posponer 10 min' }
    ]
  };
  self.registration.showNotification(title, options);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const breakId = event.notification.data.breakId;

  if (event.action.startsWith('postpone-')) {
    const minutes = parseInt(event.action.split('-')[1], 10);
     const postponedBreak = activeBreaks.find(b => b.id === breakId);
     if(postponedBreak) {
        const newTime = Date.now() + minutes * 60 * 1000;
        schedulePostponed(postponedBreak, newTime);
     }
  } else {
    // This handles both 'view' action and clicking the notification body
    const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        let matchingClient = null;
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === urlToOpen) {
            matchingClient = client;
            break;
          }
        }
        if (matchingClient) {
          return matchingClient.focus();
        } else {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});
