"use client";

import React, { useState } from 'react';
import { PlusCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import BreakList from '@/components/BreakList';
import BreakForm from '@/components/BreakForm';

export default function Home() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBreakId, setEditingBreakId] = useState<string | null>(null);

  const handleOpenFormForNew = () => {
    setEditingBreakId(null);
    setIsFormOpen(true);
  };

  const handleOpenFormForEdit = (id: string) => {
    setEditingBreakId(id);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingBreakId(null);
  };


  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto p-4 sm:p-6 md:p-8">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-8">
          <div className="flex items-center gap-3 mb-4 sm:mb-0">
            <Zap className="h-8 w-8 text-primary" />
            <h1 className="text-3xl sm:text-4xl font-bold font-headline text-primary-foreground/90">
              Activa Ahora
            </h1>
          </div>
          <Button onClick={handleOpenFormForNew} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <PlusCircle className="mr-2 h-5 w-5" />
            Crear Pausa Activa
          </Button>
        </header>

        <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
          Gestiona tus pausas activas para mantenerte saludable y productivo durante tu jornada. ¡Tu cuerpo te lo agradecerá!
        </p>
        
        <BreakList onEdit={handleOpenFormForEdit} />

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingBreakId ? 'Editar Pausa Activa' : 'Crear Nueva Pausa Activa'}</DialogTitle>
              <DialogDescription>
                {editingBreakId ? 'Modifica los detalles de tu pausa.' : 'Completa los detalles para programar una nueva pausa.'}
              </DialogDescription>
            </DialogHeader>
            <BreakForm breakId={editingBreakId} onFinished={handleCloseForm} />
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
