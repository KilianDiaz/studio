"use client";

import React, { useState, useEffect } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { Pausa } from '@/lib/types';
import BreakCard from './BreakCard';
import { AnimatePresence, motion } from 'framer-motion';
import { scheduleNotification, cancelNotification, syncAllNotifications } from '@/lib/notifications';
import { useToast } from '@/hooks/use-toast';

interface BreakListProps {
  onEdit: (id: string) => void;
}

const BreakList: React.FC<BreakListProps> = ({ onEdit }) => {
  const [breaks, setBreaks] = useLocalStorage<Pausa[]>('breaks', []);
  const [hasMounted, setHasMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if(hasMounted && Notification.permission === 'granted') {
      syncAllNotifications(breaks);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breaks, hasMounted]);

  const handleDelete = async (id: string) => {
    await cancelNotification(id);
    setBreaks(breaks.filter(b => b.id !== id));
  };
  
  const toggleBreak = async (id: string, activa: boolean) => {
    const updatedBreaks = breaks.map(b => b.id === id ? { ...b, activa } : b);
    setBreaks(updatedBreaks);

    const targetBreak = updatedBreaks.find(b => b.id === id);
    if (targetBreak) {
      if (activa) {
        await scheduleNotification(targetBreak);
      } else {
        await cancelNotification(targetBreak.id);
      }
    }
  };

  const handleManualStart = async (id: string) => {
      const targetBreak = breaks.find(b => b.id === id);
      if (targetBreak) {
          // Reschedule notification for the next available slot, effectively "skipping" today
          await scheduleNotification(targetBreak);
          toast({
              title: "Pausa iniciada",
              description: `Has iniciado '${targetBreak.nombre}'. La próxima notificación está programada.`,
          });
      }
  };

  if (!hasMounted) {
    return (
      <div className="text-center py-16 px-6 border-2 border-dashed rounded-lg">
        <h2 className="text-xl font-semibold text-muted-foreground">Cargando pausas...</h2>
        <p className="text-muted-foreground mt-2">Por favor, espera.</p>
      </div>
    );
  }

  if (breaks.length === 0) {
    return (
      <div className="text-center py-16 px-6 border-2 border-dashed rounded-lg">
        <h2 className="text-xl font-semibold text-muted-foreground">No tienes pausas activas programadas.</h2>
        <p className="text-muted-foreground mt-2">¡Crea una para empezar a cuidarte!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <AnimatePresence>
        {breaks.map(b => (
          <motion.div
            key={b.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <BreakCard 
              breakData={b} 
              onDelete={() => handleDelete(b.id)} 
              onEdit={() => onEdit(b.id)}
              onToggle={(activa) => toggleBreak(b.id, activa)}
              onManualStart={() => handleManualStart(b.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default BreakList;
