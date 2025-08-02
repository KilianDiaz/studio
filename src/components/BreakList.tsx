"use client";

import React, { useState, useEffect } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { Pausa } from '@/lib/types';
import BreakCard from './BreakCard';
import { AnimatePresence, motion } from 'framer-motion';
import { syncNotificationsWithServiceWorker, handleManualStart as notifyManualStart } from '@/lib/notifications';
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
    if (hasMounted && Notification.permission === 'granted') {
      syncNotificationsWithServiceWorker(breaks);
    }
  }, [breaks, hasMounted]);

  const handleDelete = (id: string) => {
    const updatedBreaks = breaks.filter(b => b.id !== id);
    setBreaks(updatedBreaks);
  };
  
  const toggleBreak = (id: string, activa: boolean) => {
    const updatedBreaks = breaks.map(b => b.id === id ? { ...b, activa } : b);
    setBreaks(updatedBreaks);
  };

  const handleManualStart = (id: string) => {
      const targetBreak = breaks.find(b => b.id === id);
      if (targetBreak) {
          // This tells the service worker to recalculate the schedule,
          // effectively skipping today's notification for this break
          // as it's being done manually.
          notifyManualStart(breaks);
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
