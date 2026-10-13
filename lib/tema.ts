// Lo que se puede personalizar desde Ajustes: temas, colores, fondos y voces. Igual que en el demo del taller.
import type { Fondo } from './tipos';

export const COLORES = ['#2f6df6', '#a855f7', '#10b981', '#f97316', '#ec4899', '#14b8a6'];
export const FONDOS: { id: Fondo; nombre: string }[] = [
  { id: 'calido', nombre: 'Cálido' },
  { id: 'noche', nombre: 'Noche' },
  { id: 'aurora', nombre: 'Aurora' },
  { id: 'grafito', nombre: 'Grafito' },
];
export const TEMAS: { nombre: string; color: string; fondo: Fondo }[] = [
  { nombre: 'Clásico', color: '#2f6df6', fondo: 'calido' },
  { nombre: 'Océano', color: '#14b8a6', fondo: 'noche' },
  { nombre: 'Aurora', color: '#a855f7', fondo: 'aurora' },
  { nombre: 'Atardecer', color: '#f97316', fondo: 'calido' },
  { nombre: 'Grafito', color: '#ec4899', fondo: 'grafito' },
];
export const VOCES = ['Sol', 'Río', 'Ámbar', 'Cobalto'] as const;
export type Voz = (typeof VOCES)[number];
