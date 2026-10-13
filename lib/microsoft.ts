// Microsoft 365 (Outlook + Calendario) por Microsoft Graph, con fetch. Misma forma que lib/google.ts.
import { almacen } from './almacen';
import { ErrorDeDatos } from './acciones';
import { ZONA, isoEnZona, type Cuenta, type Mensaje, type NuevoEvento } from './cuentas';
import type { Conexion, Correo, Evento } from './tipos';

const ALCANCES = ['offline_access', 'Mail.Read', 'Mail.Send', 'Calendars.ReadWrite', 'User.Read'];
const GRAPH = 'https://graph.microsoft.com/v1.0/me';
const LOGIN = 'https://login.microsoftonline.com/common/oauth2/v2.0';

const llaves = () => ({ id: process.env.MS_CLIENT_ID, secreto: process.env.MS_CLIENT_SECRET });

async function pedirToken(cuerpo: Record<string, string>) {
  const { id, secreto } = llaves();
  const r = await fetch(`${LOGIN}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: id ?? '', client_secret: secreto ?? '', scope: ALCANCES.join(' '), ...cuerpo }),
    cache: 'no-store',
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErrorDeDatos(`Microsoft no aceptó la conexión: ${j.error_description ?? j.error ?? r.status}. Si la cuenta se desconectó, vuelve a conectarla.`);
  return j as { access_token: string; refresh_token?: string };
}

/** Microsoft entrega un refresh token nuevo cada vez: se guarda para la siguiente. */
async function token(c: Conexion): Promise<string> {
  const t = await pedirToken({ grant_type: 'refresh_token', refresh_token: c.refreshToken });
  if (t.refresh_token && t.refresh_token !== c.refreshToken) await almacen().actualizar('conexiones', c.id, { refreshToken: t.refresh_token });
  return t.access_token;
}

async function api<T = Record<string, any>>(acceso: string, url: string, opciones: RequestInit = {}): Promise<T> {
  const r = await fetch(url, {
    ...opciones,
    headers: { Authorization: `Bearer ${acceso}`, 'Content-Type': 'application/json', Prefer: `outlook.timezone="${ZONA}"`, ...(opciones.headers ?? {}) },
    cache: 'no-store',
  });
  if (r.status === 202 || r.status === 204) return {} as T;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErrorDeDatos(`Microsoft contestó ${r.status}: ${j.error?.message ?? 'error desconocido'}`);
  return j as T;
}

export const microsoft: Cuenta = {
  falta: () => (!llaves().id ? 'MS_CLIENT_ID' : !llaves().secreto ? 'MS_CLIENT_SECRET' : undefined),

  urlInicio(redirect, estado) {
    const p = new URLSearchParams({ client_id: llaves().id!, redirect_uri: redirect, response_type: 'code', response_mode: 'query', scope: ALCANCES.join(' '), prompt: 'consent', state: estado });
    return `${LOGIN}/authorize?${p}`;
  },

  async canjear(code, redirect) {
    const t = await pedirToken({ grant_type: 'authorization_code', code, redirect_uri: redirect });
    if (!t.refresh_token) throw new ErrorDeDatos('Microsoft no entregó el permiso permanente (offline_access). Vuelve a conectar y acepta todos los permisos.');
    const yo = await api(t.access_token, GRAPH);
    return { correo: String(yo.mail || yo.userPrincipalName), refreshToken: t.refresh_token };
  },

  async leerCorreos(c) {
    const p = new URLSearchParams({ $top: '20', $orderby: 'receivedDateTime desc', $select: 'id,conversationId,from,subject,bodyPreview,receivedDateTime' });
    const r = await api(await token(c), `${GRAPH}/mailFolders/inbox/messages?${p}`);
    // Uno por conversación, como los hilos de Gmail.
    const vistos = new Set<string>();
    const correos: Omit<Correo, 'id'>[] = [];
    for (const m of (r.value ?? []) as Record<string, any>[]) {
      const hilo = m.conversationId || m.id;
      if (vistos.has(hilo)) continue;
      vistos.add(hilo);
      const de = m.from?.emailAddress;
      correos.push({
        idProveedor: `microsoft:${hilo}`,
        de: de ? `${de.name ? `${de.name} <${de.address}>` : de.address}` : '(sin remitente)',
        asunto: m.subject || '(sin asunto)',
        resumen: m.bodyPreview || '(sin texto)',
        recibido: new Date(m.receivedDateTime).toISOString(),
        necesitaRespuesta: false,
      });
    }
    return correos;
  },

  async leerEventos(c, desde, hasta) {
    const p = new URLSearchParams({ startDateTime: desde.toISOString(), endDateTime: hasta.toISOString(), $top: '100', $orderby: 'start/dateTime', $select: 'id,subject,start,end,location,bodyPreview,isCancelled' });
    const r = await api(await token(c), `${GRAPH}/calendarView?${p}`);
    // Con el encabezado Prefer, Graph manda la hora en la zona pedida pero sin el desfase: se lo ponemos aquí.
    const fecha = (x: { dateTime: string }) => isoEnZona(x.dateTime.slice(0, 19), ZONA);
    return ((r.value ?? []) as Record<string, any>[])
      .filter((ev) => !ev.isCancelled)
      .map((ev): Omit<Evento, 'id'> => {
        const lugar = ev.location?.displayName;
        return {
          idProveedor: `microsoft:${ev.id}`,
          titulo: ev.subject || '(sin título)',
          inicio: fecha(ev.start),
          fin: fecha(ev.end),
          ...(lugar || ev.bodyPreview ? { nota: [lugar, ev.bodyPreview].filter(Boolean).join('\n') } : {}),
        };
      });
  },

  async enviarCorreo(c, m: Mensaje) {
    await api(await token(c), `${GRAPH}/sendMail`, {
      method: 'POST',
      body: JSON.stringify({ message: { subject: m.asunto, body: { contentType: 'Text', content: m.texto }, toRecipients: [{ emailAddress: { address: m.para } }] } }),
    });
  },

  async crearEvento(c, e: NuevoEvento) {
    await api(await token(c), `${GRAPH}/events`, {
      method: 'POST',
      body: JSON.stringify({ subject: e.titulo, body: { contentType: 'Text', content: e.descripcion ?? '' }, start: { dateTime: e.inicio, timeZone: 'UTC' }, end: { dateTime: e.fin, timeZone: 'UTC' } }),
    });
  },
};
