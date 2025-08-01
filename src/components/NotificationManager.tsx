"use client";

import { useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";

const requestNotificationPermission = async (toast: (options: any) => void) => {
  if (!('Notification' in window)) {
    toast({
        variant: "destructive",
        title: "Navegador no compatible",
        description: "Este navegador no soporta notificaciones de escritorio.",
    });
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
     console.log('Permiso de notificaciones concedido.');
  } else {
    console.log('Permiso de notificaciones denegado.');
  }
};


const NotificationManager = () => {
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        // We only ask for permission if it hasn't been granted or denied
        // We might want to trigger this on a user action instead of on load
        const timer = setTimeout(() => {
            requestNotificationPermission(toast);
        }, 3000); // Ask for permission after 3 seconds
        return () => clearTimeout(timer);
      }
    }
  }, [toast]);
  
  return null;
};

export default NotificationManager;
