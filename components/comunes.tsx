'use client';
import { useEffect, type ReactNode } from 'react';

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
};

export function Icono({ nombre, lado = 18 }: { nombre: string; lado?: number }) {
  return (
    <svg width={lado} height={lado} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={nombre === 'Más' ? 2.6 : 1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONOS[nombre]} />
    </svg>
  );
}

/* Tu agente no tiene cara aquí (vive en su propia app): una chispa del color de acento. */
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

/* ── el clic ──
   Un sonido grabado (public/sonidos/clic.mp3, 45 ms) y no un oscilador: en iPhone y iPad el oscilador no se oía.
   Se descifra a un AudioBuffer y se toca con Web Audio (sin retraso); si todavía no está listo, se toca con <audio>.
   iOS solo deja arrancar el audio DENTRO de un toque (pointerdown/touchstart, no click): ahí se despierta. */
const RUTA_CLIC = '/sonidos/clic.mp3';
// Un WAV de un cuadro en silencio. En iPhone, reproducir un <audio> dentro del toque pasa el sonido
// a la categoría «reproducción»: así el clic se oye aunque el interruptor de silencio esté puesto.
const SILENCIO = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';

let ctx: AudioContext | null = null;
let muestra: AudioBuffer | null = null;
let cargando = false;
let elementos: HTMLAudioElement[] = [];
let cualElemento = 0;
let desbloqueado = false;

function contexto(): AudioContext | null {
  if (ctx) return ctx;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  ctx = new Ctx();
  return ctx;
}

/** Baja y descifra la muestra una sola vez. */
function cargarMuestra() {
  const c = contexto();
  if (!c || muestra || cargando) return;
  cargando = true;
  fetch(RUTA_CLIC)
    .then((r) => r.arrayBuffer())
    .then((bytes) => new Promise<AudioBuffer>((listo, falla) => c.decodeAudioData(bytes, listo, falla)))
    .then((b) => { muestra = b; })
    .catch(() => undefined)
    .finally(() => { cargando = false; });
}

/** Despierta el audio. Hay que llamarla dentro del primer toque (pointerdown), si no iOS lo deja mudo. */
export function despertarAudio() {
  try {
    if (elementos.length === 0) elementos = [0, 1, 2].map(() => { const a = new Audio(RUTA_CLIC); a.preload = 'auto'; return a; });
    cargarMuestra();
    const c = contexto();
    if (c) {
      if (c.state !== 'running') c.resume().catch(() => undefined);
      if (!desbloqueado) {
        // Un cuadro en silencio por Web Audio: con esto iOS destraba el contexto dentro del toque.
        const s = c.createBufferSource();
        s.buffer = c.createBuffer(1, 1, 22050);
        s.connect(c.destination);
        s.start(0);
      }
    }
    if (!desbloqueado) {
      desbloqueado = true;
      const a = new Audio(SILENCIO);
      a.play().catch(() => undefined);
    }
  } catch {
    /* sin audio: no pasa nada */
  }
}

/* Clic corto. */
export function clic() {
  try {
    despertarAudio();
    const c = contexto();
    if (c && muestra && c.state === 'running') {
      const s = c.createBufferSource();
      s.buffer = muestra;
      s.connect(c.destination);
      s.start(0);
      return;
    }
    // Todavía no está descifrada (o no hay Web Audio): se toca con <audio>.
    const a = elementos[cualElemento++ % elementos.length];
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => undefined);
  } catch {
    /* sin audio: no pasa nada */
  }
}

/** Qué cuenta como «algo que se toca»: botones, ligas, etiquetas de archivo y pestañas. */
const TOCABLE = 'button, a, label, [role="button"], [role="tab"], summary';

/* Hace sonar cada botón, pestaña y liga mientras `activo` sea true. Va en el documento, con captura,
   así suena también lo que se abre encima (la puerta, Ajustes, el agente). Suena al bajar el dedo (pointerdown,
   que es cuando iOS deja sonar) y, si se activó sin tocar (teclado), al click. */
export function usarClics(activo: boolean) {
  useEffect(() => {
    if (!activo) return;
    let ultimoToque = 0;
    const alBajar = (e: Event) => {
      if (!(e.target as HTMLElement | null)?.closest?.(TOCABLE)) return despertarAudio();
      ultimoToque = Date.now();
      clic();
    };
    const alClic = (e: Event) => {
      if (!(e.target as HTMLElement | null)?.closest?.(TOCABLE)) return;
      if (Date.now() - ultimoToque < 500) return; // ya sonó al bajar el dedo
      clic();
    };
    document.addEventListener('pointerdown', alBajar, true);
    document.addEventListener('click', alClic, true);
    return () => {
      document.removeEventListener('pointerdown', alBajar, true);
      document.removeEventListener('click', alClic, true);
    };
  }, [activo]);
}
