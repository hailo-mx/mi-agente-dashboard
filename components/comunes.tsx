'use client';
import type { ReactNode } from 'react';

/* Las secciones, en el orden del riel. */
export const NAV = ['Inicio', 'Calendario', 'Correos', 'WhatsApp', 'Tareas', 'Rutinas', 'Aprobaciones', 'Conexiones', 'Ajustes'] as const;
export type Seccion = (typeof NAV)[number];
export type Vista = Seccion | 'Más';
/* En el teléfono: cinco pestañas abajo; "Más" guarda el resto. */
export const PESTANAS = ['Inicio', 'Correos', 'Agente', 'WhatsApp', 'Más'] as const;
export const EN_MAS: Seccion[] = ['Calendario', 'Tareas', 'Rutinas', 'Aprobaciones', 'Conexiones', 'Ajustes'];

const ICONOS: Record<string, string> = {
  Inicio: 'M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z',
  Calendario: 'M5 6h14a1 1 0 011 1v11a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1zm0 4h14M9 4v4m6-4v4',
  Correos: 'M4 7l8 6 8-6M5 6h14a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1z',
  WhatsApp: 'M21 12a8 8 0 01-11.8 7L4 20l1.1-4.6A8 8 0 1121 12z',
  Tareas: 'M5 12l4 4 10-10',
  Rutinas: 'M12 7v5l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z',
  Aprobaciones: 'M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3zm-3 9l2 2 4-4',
  Conexiones: 'M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07L11.5 4.4M14 11a5 5 0 00-7.07 0l-2.83 2.83a5 5 0 007.07 7.07l1.33-1.3',
  Ajustes: 'M4 7h9m4 0h3M4 17h3m4 0h9M15 5v4M9 15v4',
  Más: 'M5 12h.01M12 12h.01M19 12h.01',
  Agente: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  SonidoOn: 'M4 10v4h3l5 4V6L7 10zm12-1a4 4 0 010 6m2.5-9a8 8 0 010 12',
  SonidoOff: 'M4 10v4h3l5 4V6L7 10zm12 0l5 5m0-5l-5 5',
  Enviar: 'M5 12l14-7-5 14-3-6z',
  Llamar: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z',
  Escuchar: 'M8 5v14l11-7z',
};

export function Icono({ nombre, lado = 18 }: { nombre: string; lado?: number }) {
  return (
    <svg width={lado} height={lado} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={nombre === 'Más' ? 2.6 : 1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONOS[nombre]} />
    </svg>
  );
}

/* Tu agente no tiene cara aquí (vive en Dots, Grok Bot o Muse): una chispa del color de acento. */
export function Avatar({ lado = 44 }: { lado?: number }) {
  return (
    <span className="mt-avatar" style={{ width: lado, height: lado }} aria-hidden>
      <Icono nombre="Agente" lado={Math.round(lado * 0.52)} />
    </span>
  );
}

/* Un renglón de cualquier lista: inicial, título, segunda línea y algo a la derecha. */
export function Fila({ a, b, c, on, punto, onClick }: { a: string; b?: string; c?: ReactNode; on?: boolean; punto?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`mt-fila ${on ? 'on' : ''}`}>
      <span className="mt-fila-ini" aria-hidden>{(a.trim()[0] ?? '·').toUpperCase()}</span>
      <span className="mt-fila-texto">
        <span className="mt-fila-a">{a}</span>
        {b && <span className="mt-fila-b">{b}</span>}
      </span>
      {c}
      {punto && <span className="mt-punto" aria-label="Pendiente" />}
    </button>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="mt-vacio">{children}</p>;
}

let audio: AudioContext | null = null;
let desbloqueado = false;
// Un WAV de un cuadro en silencio. En iPhone, reproducir un <audio> dentro del toque pasa el sonido
// a la categoría «reproducción»: así el clic se oye aunque el interruptor de silencio esté puesto.
const SILENCIO = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';

/* Clic corto. En el teléfono el audio arranca dormido: hay que despertarlo dentro del toque. */
export function clic() {
  try {
    if (!desbloqueado) {
      desbloqueado = true;
      const a = new Audio(SILENCIO);
      a.play().catch(() => undefined);
    }
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
      g.gain.exponentialRampToValueAtTime(0.32, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.1);
    };
    // «suspended» al crearlo fuera de un toque; «interrupted» (iOS) al volver de segundo plano o de una llamada.
    if (ctx.state !== 'running') ctx.resume().then(sonar, () => undefined);
    else sonar();
  } catch {
    /* sin audio: no pasa nada */
  }
}
