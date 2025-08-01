"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { Pausa, Ejercicio } from '@/lib/types';
import { ejercicios as exerciseList } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import * as LucideIcons from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BreakSessionProps {
  breakId: string;
}

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const BreakSession: React.FC<BreakSessionProps> = ({ breakId }) => {
  const router = useRouter();
  const { toast } = useToast();
  const [breaks] = useLocalStorage<Pausa[]>('breaks', []);
  const [breakData, setBreakData] = useState<Pausa | null>(null);

  const [exercises, setExercises] = useState<Ejercicio[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(0);
  const [exerciseTimeLeft, setExerciseTimeLeft] = useState(0);
  const [hasFinished, setHasFinished] = useState(false);

  useEffect(() => {
    const foundBreak = breaks.find(b => b.id === breakId);
    if (foundBreak) {
      setBreakData(foundBreak);
      const totalDurationSeconds = foundBreak.duracion * 60;
      setSessionTimeLeft(totalDurationSeconds);

      let selectedExercises: Ejercicio[] = [];
      let accumulatedTime = 0;
      const shuffled = shuffleArray(exerciseList);
      
      let i = 0;
      while(accumulatedTime < totalDurationSeconds && i < shuffled.length) {
          const exercise = shuffled[i];
          if (accumulatedTime + exercise.duracion <= totalDurationSeconds) {
              selectedExercises.push(exercise);
              accumulatedTime += exercise.duracion;
          }
          i++;
      }

      setExercises(selectedExercises);
      if (selectedExercises.length > 0) {
        setExerciseTimeLeft(selectedExercises[0].duracion);
      }
    } else {
      router.push('/');
    }
  }, [breakId, breaks, router]);
  
  // Effect for timers
  useEffect(() => {
    if (isPaused || hasFinished) return;

    if (sessionTimeLeft <= 0) {
      if (!hasFinished && breakData) {
        setHasFinished(true);
        toast({
          title: "¡Pausa completada!",
          description: `¡Buen trabajo! Has completado tu pausa de ${breakData.nombre}.`,
        });
        setTimeout(() => router.push('/'), 3000);
      }
      return;
    }

    const timer = setInterval(() => {
      setSessionTimeLeft(prev => prev - 1);
      setExerciseTimeLeft(prev => {
        if (prev > 1) {
          return prev - 1;
        }

        if (currentExerciseIndex < exercises.length - 1) {
          setCurrentExerciseIndex(i => i + 1);
          return exercises[currentExerciseIndex + 1].duracion;
        }
        
        // Last exercise finished, let session timer run out
        return 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, sessionTimeLeft, hasFinished, breakData, exercises, currentExerciseIndex, router, toast]);


  const currentExercise = useMemo(() => exercises[currentExerciseIndex], [exercises, currentExerciseIndex]);

  const postpone = (minutes: number) => {
    toast({
      title: 'Pausa pospuesta',
      description: `La pausa se ha pospuesto por ${minutes} minutos. Recibirás una notificación (simulado).`,
    });
    router.push('/');
  };

  const postponeToNext = () => {
    toast({
      title: 'Pausa pospuesta',
      description: 'La pausa se ha pospuesto a la siguiente sesión programada (simulado).',
    });
    router.push('/');
  };

  if (!breakData) {
    return (
      <Card className="w-full max-w-md text-center p-8">
        <CardTitle>Cargando pausa...</CardTitle>
      </Card>
    );
  }

  if (hasFinished) {
    return (
       <Card className="w-full max-w-md mx-auto shadow-2xl">
         <CardHeader className="text-center">
            <CardTitle className="text-2xl font-headline">¡Felicidades!</CardTitle>
         </CardHeader>
         <CardContent className="flex flex-col items-center text-center space-y-4">
            <LucideIcons.PartyPopper className="h-20 w-20 text-primary" />
            <p className="text-lg">Completaste tu pausa activa.</p>
            <p className="text-muted-foreground">Serás redirigido en unos segundos...</p>
         </CardContent>
       </Card>
    )
  }

  if (!currentExercise) {
     return (
       <Card className="w-full max-w-md text-center p-8">
         <CardTitle>No hay ejercicios para esta pausa.</CardTitle>
         <Button onClick={() => router.push('/')} className="mt-4">Volver al inicio</Button>
       </Card>
     );
  }

  const sessionProgress = (breakData.duracion * 60 - sessionTimeLeft) / (breakData.duracion * 60) * 100;
  const exerciseProgress = currentExercise.duracion > 0 ? (currentExercise.duracion - exerciseTimeLeft) / currentExercise.duracion * 100 : 0;
  
  const IconComponent = (LucideIcons as any)[currentExercise.icon] || LucideIcons.Zap;

  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline">{breakData.nombre}</CardTitle>
        <p className="text-muted-foreground">
          {`Ejercicio ${currentExerciseIndex + 1} de ${exercises.length}`}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col items-center text-center space-y-6">
        <div className="p-6 bg-primary/10 rounded-full">
            <IconComponent className="h-20 w-20 text-primary" />
        </div>
        <h3 className="text-xl font-semibold">{currentExercise.nombre}</h3>
        <p className="text-muted-foreground min-h-[40px]">{currentExercise.descripcion}</p>
        
        <div>
          <p className="text-sm text-muted-foreground mb-1">Tiempo del ejercicio</p>
          <Progress value={exerciseTimeLeft > 0 ? exerciseProgress : 100} className="w-48 h-2" />
          <p className="font-mono text-lg mt-1">{exerciseTimeLeft > 0 ? `${exerciseTimeLeft}s` : '¡Hecho!'}</p>
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground mb-1">Tiempo total de la pausa</p>
          <Progress value={sessionProgress} className="w-64" />
          <p className="font-mono text-lg mt-1">{Math.floor(sessionTimeLeft / 60)}:{('0' + (sessionTimeLeft % 60)).slice(-2)}</p>
        </div>

      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-center gap-4">
        <Button onClick={() => setIsPaused(!isPaused)} className="w-full sm:w-auto">
          {isPaused ? <LucideIcons.Play className="mr-2 h-4 w-4" /> : <LucideIcons.Pause className="mr-2 h-4 w-4" />}
          {isPaused ? 'Reanudar' : 'Pausar'}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <LucideIcons.Clock className="mr-2 h-4 w-4" /> Posponer
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => postpone(10)}>10 minutos</DropdownMenuItem>
            <DropdownMenuItem onClick={() => postpone(30)}>30 minutos</DropdownMenuItem>
            <DropdownMenuItem onClick={() => postpone(60)}>1 hora</DropdownMenuItem>
            <DropdownMenuItem onClick={postponeToNext}>Próxima sesión</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
};

export default BreakSession;