// Lo que tienen en común Google y Microsoft: la misma forma para que el resto del panel no distinga.
import type { Conexion, Correo, Evento } from './tipos';

export type Mensaje = { para: string; asunto: string; texto: string };
export type NuevoEvento = { titulo: string; inicio: string; fin: string; descripcion?: string };

export type Cuenta = {
  /** El nombre de la variable de entorno que falta, o nada si está todo. */
  falta(): string | undefined;
  urlInicio(redirect: string, estado: string): string;
  canjear(code: string, redirect: string): Promise<{ correo: string; refreshToken: string }>;
  leerCorreos(c: Conexion): Promise<Omit<Correo, 'id'>[]>;
  leerEventos(c: Conexion, desde: Date, hasta: Date): Promise<Omit<Evento, 'id'>[]>;
  enviarCorreo(c: Conexion, m: Mensaje): Promise<void>;
  crearEvento(c: Conexion, e: NuevoEvento): Promise<void>;
};

/** Zona horaria para los eventos de todo el día (que vienen sin hora). */
export const ZONA = process.env.ZONA_HORARIA || 'America/Mexico_City';

/** "2026-10-13T09:00:00" leído como hora de pared en la zona dada → ISO en UTC. */
export function isoEnZona(local: string, zona: string): string {
  const comoUtc = new Date(`${local}Z`);
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: zona, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(comoUtc);
  const n = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);
  const enZona = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second'));
  return new Date(comoUtc.getTime() - (enZona - comoUtc.getTime())).toISOString();
}
