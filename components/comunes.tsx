'use client';
import type { ReactNode } from 'react';

export type Seccion = 'Inicio' | 'Calendario' | 'Correos' | 'Tareas' | 'Rutinas' | 'Aprobaciones' | 'Ajustes';
export type Vista = Seccion | 'Más';

export const SECCIONES: Seccion[] = ['Inicio', 'Calendario', 'Correos', 'Tareas', 'Rutinas', 'Aprobaciones', 'Ajustes'];
/* En el teléfono: cinco pestañas abajo; "Más" guarda las otras tres secciones. */
export const PESTANAS: Vista[] = ['Inicio', 'Correos', 'Aprobaciones', 'Tareas', 'Más'];
export const EN_MAS: Seccion[] = ['Calendario', 'Rutinas', 'Ajustes'];

const ICONOS: Record<string, string> = {
  Inicio: 'M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z',
  Calendario: 'M5 6h14a1 1 0 011 1v11a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1zm0 4h14M9 4v4m6-4v4',
  Correos: 'M4 7l8 6 8-6M5 6h14a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1z',
  Tareas: 'M5 12l4 4 10-10',
  Rutinas: 'M12 7v5l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z',
  Aprobaciones: 'M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3zm-3 9l2 2 4-4',
  Ajustes: 'M4 7h9m4 0h3M4 17h3m4 0h9M15 5v4M9 15v4',
  Más: 'M5 12h.01M12 12h.01M19 12h.01',
  Atrás: 'M15 5l-7 7 7 7',
  Adelante: 'M9 5l7 7-7 7',
  Cerrar: 'M6 6l12 12M18 6L6 18',
};

export function Icono({ nombre, lado = 20 }: { nombre: string; lado?: number }) {
  return (
    <svg width={lado} height={lado} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={nombre === 'Más' ? 2.6 : 1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONOS[nombre]} />
    </svg>
  );
}

/* Un renglón de cualquier lista: inicial, título, segunda línea y algo a la derecha. */
export function Fila({ titulo, linea, derecha, punto, elegida, onClick }: { titulo: string; linea?: string; derecha?: ReactNode; punto?: boolean; elegida?: boolean; onClick?: () => void }) {
  return (
    <button type="button" className={`fila ${elegida ? 'on' : ''}`} onClick={onClick}>
      <span className="inicial" aria-hidden>{(titulo.trim()[0] ?? '·').toUpperCase()}</span>
      <span className="fila-texto">
        <span className="fila-titulo">{titulo}</span>
        {linea && <span className="fila-linea">{linea}</span>}
      </span>
      {derecha}
      {punto && <span className="punto" aria-label="Pendiente" />}
    </button>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="vacio">{children}</p>;
}

/* Dos columnas en computadora (lista y detalle); en teléfono, una pantalla a la vez. */
export function DosColumnas({ abierto, lista, detalle, hayLista }: { abierto: boolean; lista: ReactNode; detalle: ReactNode; hayLista: boolean }) {
  return (
    <div className="cuerpo dos" data-abierto={abierto}>
      <div className="lista">{lista}</div>
      <div className="detalle">{detalle ?? (hayLista ? <Vacio>Elige algo de la lista para verlo aquí.</Vacio> : null)}</div>
    </div>
  );
}

let audio: AudioContext | null = null;
/* Clic corto. En el teléfono el audio arranca dormido: hay que despertarlo dentro del toque. */
export function clic() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audio ??= new Ctx();
    const ctx = audio;
    const sonar = () => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t = ctx.currentTime;
      o.type = 'triangle';
      o.frequency.setValueAtTime(880, t);
      o.frequency.exponentialRampToValueAtTime(520, t + 0.07);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.1);
    };
    if (ctx.state === 'suspended') ctx.resume().then(sonar);
    else sonar();
  } catch {
    /* sin audio: no pasa nada */
  }
}
