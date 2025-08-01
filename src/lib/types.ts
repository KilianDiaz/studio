export type Day = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';

export interface Pausa {
  id: string;
  nombre: string;
  dias: Day[];
  hora: string; // "HH:mm"
  duracion: 5 | 10 | 15;
  recordatorio?: string;
  activa: boolean;
}

export interface Ejercicio {
  nombre: string;
  descripcion: string;
  duracion: number; // in seconds
  icon: string; // Lucide icon name
}
