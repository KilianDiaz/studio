"use client";

import { useEffect, useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import useLocalStorage from '@/hooks/useLocalStorage';
import type { Pausa } from '@/lib/types';
import { syncAllNotifications } from '@/lib/notifications';

const requestNotificationPermission = async (toast: (options: any) => void): Promise<boolean> => {
  if (!('Notification' in window)) {
    toast({
        variant: "destructive",
        title: "Navegador no compatible",
        description: "Este navegador no soporta notificaciones de escritorio.",
    });
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
       console.log('Permiso de notificaciones concedido.');
       return true;
    } else {
      console.log('Permiso de notificaciones denegado.');
      toast({
        title: "Permiso denegado",
        description: "No podremos notificarte sobre tus pausas.",
      });
      return false;
    }
  } catch(error) {
    console.error("Error pidiendo permiso de notificación", error);
    return false;
  }
};


const NotificationManager = () => {
  const { toast } = useToast();
  const [breaks] = useLocalStorage<Pausa[]>('breaks', []);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted && 'Notification' in window && 'serviceWorker' in navigator) {
      if (Notification.permission === 'default') {
        const timer = setTimeout(() => {
            requestNotificationPermission(toast).then(granted => {
              if (granted) {
                navigator.serviceWorker.ready.then(() => {
                    syncAllNotifications(breaks);
                });
              }
            });
        }, 3000); 
        return () => clearTimeout(timer);
      } else if (Notification.permission === 'granted') {
          navigator.serviceWorker.ready.then(() => {
              syncAllNotifications(breaks);
          });
      }
    }
  }, [hasMounted, toast, breaks]);
  
  return null;
};

export default NotificationManager;
