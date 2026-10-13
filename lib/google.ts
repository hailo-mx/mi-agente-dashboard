// Google (Gmail + Google Calendar) con fetch, sin librerías: OAuth 2.0, refresco del token y las llamadas que usa el panel.
import { ErrorDeDatos } from './acciones';
import { ZONA, isoEnZona, type Cuenta, type Mensaje, type NuevoEvento } from './cuentas';
import type { Conexion, Correo, Evento } from './tipos';

const ALCANCES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
];
const GMAIL = 'https://gmail.googleapis.com/gmail/v1/users/me';
const CALENDARIO = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

const llaves = () => ({ id: process.env.GOOGLE_CLIENT_ID, secreto: process.env.GOOGLE_CLIENT_SECRET });

async function pedirToken(cuerpo: Record<string, string>) {
  const { id, secreto } = llaves();
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: id ?? '', client_secret: secreto ?? '', ...cuerpo }),
    cache: 'no-store',
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErrorDeDatos(`Google no aceptó la conexión: ${j.error_description ?? j.error ?? r.status}. Si la cuenta se desconectó, vuelve a conectarla.`);
  return j as { access_token: string; refresh_token?: string };
}

async function token(c: Conexion): Promise<string> {
  return (await pedirToken({ grant_type: 'refresh_token', refresh_token: c.refreshToken })).access_token;
}

async function api<T = Record<string, any>>(acceso: string, url: string, opciones: RequestInit = {}): Promise<T> {
  const r = await fetch(url, { ...opciones, headers: { Authorization: `Bearer ${acceso}`, 'Content-Type': 'application/json', ...(opciones.headers ?? {}) }, cache: 'no-store' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErrorDeDatos(`Google contestó ${r.status}: ${j.error?.message ?? 'error desconocido'}`);
  return j as T;
}

/** Codifica un texto para un encabezado de correo (por si trae acentos). */
const encabezado = (t: string) => (/^[\x20-\x7e]*$/.test(t) ? t : `=?UTF-8?B?${Buffer.from(t, 'utf8').toString('base64')}?=`);

export const google: Cuenta = {
  falta: () => (!llaves().id ? 'GOOGLE_CLIENT_ID' : !llaves().secreto ? 'GOOGLE_CLIENT_SECRET' : undefined),

  urlInicio(redirect, estado) {
    const p = new URLSearchParams({ client_id: llaves().id!, redirect_uri: redirect, response_type: 'code', scope: ALCANCES.join(' '), access_type: 'offline', prompt: 'consent', state: estado });
    return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
  },

  async canjear(code, redirect) {
    const t = await pedirToken({ grant_type: 'authorization_code', code, redirect_uri: redirect });
    if (!t.refresh_token) throw new ErrorDeDatos('Google no entregó el permiso permanente. Quita el acceso de la app en myaccount.google.com/permissions y vuelve a conectar.');
    const perfil = await api(t.access_token, `${GMAIL}/profile`);
    return { correo: String(perfil.emailAddress), refreshToken: t.refresh_token };
  },

  async leerCorreos(c) {
    const acceso = await token(c);
    const lista = await api(acceso, `${GMAIL}/threads?maxResults=20&labelIds=INBOX`);
    const correos: Omit<Correo, 'id'>[] = [];
    for (const { id } of (lista.threads ?? []) as { id: string }[]) {
      const hilo = await api(acceso, `${GMAIL}/threads/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`);
      const ultimo = hilo.messages?.[hilo.messages.length - 1];
      if (!ultimo) continue;
      const h = (nombre: string) => ultimo.payload?.headers?.find((x: { name: string }) => x.name.toLowerCase() === nombre)?.value ?? '';
      correos.push({
        idProveedor: `google:${id}`,
        de: h('from') || '(sin remitente)',
        asunto: h('subject') || '(sin asunto)',
        resumen: ultimo.snippet || '(sin texto)',
        recibido: new Date(Number(ultimo.internalDate)).toISOString(),
        necesitaRespuesta: false,
      });
    }
    return correos;
  },

  async leerEventos(c, desde, hasta) {
    const acceso = await token(c);
    const p = new URLSearchParams({ timeMin: desde.toISOString(), timeMax: hasta.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '100' });
    const r = await api(acceso, `${CALENDARIO}?${p}`);
    const zona: string = r.timeZone || ZONA;
    const fecha = (x: { dateTime?: string; date?: string }) => (x.dateTime ? new Date(x.dateTime).toISOString() : isoEnZona(`${x.date}T00:00:00`, zona));
    return ((r.items ?? []) as Record<string, any>[])
      .filter((ev) => ev.status !== 'cancelled' && ev.start)
      .map((ev): Omit<Evento, 'id'> => ({
        idProveedor: `google:${ev.id}`,
        titulo: ev.summary || '(sin título)',
        inicio: fecha(ev.start),
        fin: fecha(ev.end ?? ev.start),
        ...(ev.location || ev.description ? { nota: [ev.location, ev.description].filter(Boolean).join('\n') } : {}),
      }));
  },

  async enviarCorreo(c, m: Mensaje) {
    const crudo = [`To: ${m.para}`, `Subject: ${encabezado(m.asunto)}`, 'Content-Type: text/plain; charset=utf-8', 'MIME-Version: 1.0', '', m.texto].join('\r\n');
    await api(await token(c), `${GMAIL}/messages/send`, { method: 'POST', body: JSON.stringify({ raw: Buffer.from(crudo, 'utf8').toString('base64url') }) });
  },

  async crearEvento(c, e: NuevoEvento) {
    await api(await token(c), CALENDARIO, {
      method: 'POST',
      body: JSON.stringify({ summary: e.titulo, description: e.descripcion, start: { dateTime: e.inicio }, end: { dateTime: e.fin } }),
    });
  },
};
