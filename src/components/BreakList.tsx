"use client";

import React from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { Pausa } from '@/lib/types';
import BreakCard from './BreakCard';
import { AnimatePresence, motion } from 'framer-motion';

interface BreakListProps {
  onEdit: (id: string) => void;
}

const BreakList: React.FC<BreakListProps> = ({ onEdit }) => {
  const [breaks, setBreaks] = useLocalStorage<Pausa[]>('breaks', []);

  const handleDelete = (id: string) => {
    setBreaks(breaks.filter(b => b.id !== id));
  };
  
  const toggleBreak = (id: string, activa: boolean) => {
    setBreaks(breaks.map(b => b.id === id ? { ...b, activa } : b));
  };

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
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default BreakList;
