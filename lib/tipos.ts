// Todo lo que guarda el panel. Los id son textos cortos al azar y las fechas van en formato ISO.
import { COLOR, NOMBRE } from './marca';

export type Tarea = { id: string; titulo: string; fecha?: string; hecha: boolean; creada: string };

export type Rutina = { id: string; titulo: string; horario: string; descripcion: string; activa: boolean; ultimaCorrida?: string };

export const CANALES = ['Correo', 'WhatsApp', 'Calendario', 'Otro'] as const;
export type Canal = (typeof CANALES)[number];

export const ESTADOS = ['pendiente', 'aprobada', 'rechazada', 'hecha'] as const;
export type Estado = (typeof ESTADOS)[number];

export type Aprobacion = {
  id: string;
  titulo: string;
  canal: Canal;
  /** Qué quiere hacer el agente. */
  detalle: string;
  /** El texto exacto que mandaría. */
  texto: string;
  estado: Estado;
  /** Si lo corregiste antes de aprobar, aquí queda tu versión. */
  textoEditado?: string;
  creada: string;
  resuelta?: string;
};

export type Actividad = { id: string; texto: string; cuando: string };

/** idProveedor: el id que le da Gmail/Outlook/Meta, para no duplicar al sincronizar. */
export type Correo = { id: string; de: string; asunto: string; resumen: string; recibido: string; necesitaRespuesta: boolean; borrador?: string; idProveedor?: string };

export type Evento = { id: string; titulo: string; inicio: string; fin: string; nota?: string; idProveedor?: string };

export const PROVEEDORES = ['google', 'microsoft'] as const;
export type Proveedor = (typeof PROVEEDORES)[number];

/** Una cuenta conectada (Gmail o Outlook). El refreshToken nunca sale del servidor. */
export type Conexion = { id: string; proveedor: Proveedor; correo: string; refreshToken: string; conectada: string; ultimaSync?: string };

/** Un mensaje de WhatsApp que llegó al número de Meta. */
export type Whatsapp = { id: string; idProveedor: string; de: string; nombre?: string; texto: string; recibido: string };

export const FONDOS = ['calido', 'noche', 'aurora', 'grafito'] as const;
export type Fondo = (typeof FONDOS)[number];

export const AGENTES = ['dots', 'grok', 'muse', ''] as const;
export type Agente = (typeof AGENTES)[number];
/** Los agentes con los que se puede hablar por voz; Muse no tiene llamadas. */
export const AGENTES_CON_VOZ: Agente[] = ['dots', 'grok'];
export const NOMBRE_AGENTE: Record<Agente, string> = { dots: 'Dots', grok: 'Grok Bot', muse: 'Muse', '': 'Tu agente' };
/** Las voces de verdad de cada agente (las que trae su app). La voz se oye en la app del agente; el panel solo guarda cuál elegiste.
 *  Dots: las 9 voces del menú Ajustes → Voz de ChatGPT (en el orden en que las muestra). Grok Bot: las 5 voces de Grok Voice que lista x.ai. Muse no tiene voz. */
export const VOCES_AGENTE: Record<Agente, readonly string[]> = {
  dots: ['Cove', 'Spruce', 'Ember', 'Arbor', 'Juniper', 'Vale', 'Maple', 'Breeze', 'Sol'],
  grok: ['Ara', 'Rex', 'Sal', 'Eve', 'Leo'],
  muse: [],
  '': [],
};
/** Dónde se abre la app de cada agente (y, si existe, la pantalla de voz). */
export const APP_AGENTE: Record<Agente, { url: string; voz?: string }> = {
  dots: { url: 'https://chatgpt.com/', voz: 'https://chatgpt.com/settings/voice' },
  grok: { url: 'https://grok.com/', voz: 'https://grok.com/' },
  muse: { url: 'https://www.meta.ai/' },
  '': { url: '' },
};

/** foto e icono: en el servidor, la imagen (data URL o marcador de Blob); en la pantalla, la dirección /api/foto o /api/icono.
 *  icono es tu logo: se ve arriba (si no hay foto), en la pestaña, en la app instalada y en el manifiesto. */
export type Ajustes = { nombreApp: string; tuNombre: string; color: string; fondo: Fondo; sonido: boolean; voz?: string; agente?: Agente; foto?: string; icono?: string };

export type Colecciones = {
  tareas: Tarea;
  rutinas: Rutina;
  aprobaciones: Aprobacion;
  actividad: Actividad;
  correos: Correo;
  eventos: Evento;
  conexiones: Conexion;
  whatsapp: Whatsapp;
};
export type Coleccion = keyof Colecciones;
export const COLECCIONES: Coleccion[] = ['tareas', 'rutinas', 'aprobaciones', 'actividad', 'correos', 'eventos', 'conexiones', 'whatsapp'];

export type Datos = { [C in Coleccion]: Colecciones[C][] } & { ajustes: Ajustes };

/** Con lo que arranca el panel. El nombre y el color salen de lib/marca.ts. */
export const AJUSTES_INICIALES: Ajustes = { nombreApp: NOMBRE, tuNombre: '', color: COLOR, fondo: 'calido', sonido: true };

/** El color del fondo de cada tema, para la barra del navegador y la pantalla de arranque. */
export const COLOR_FONDO: Record<Fondo, string> = { calido: '#0c0a0a', noche: '#05070f', aurora: '#07060c', grafito: '#09090b' };
