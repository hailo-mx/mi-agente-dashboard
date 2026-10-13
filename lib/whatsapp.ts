// WhatsApp por la API de Meta (WhatsApp Business Cloud API), con fetch.
import { ErrorDeDatos } from './acciones';

const GRAPH = 'https://graph.facebook.com/v21.0';

const llaves = () => ({ token: process.env.WHATSAPP_TOKEN, telefono: process.env.WHATSAPP_PHONE_ID, verificacion: process.env.WHATSAPP_VERIFY_TOKEN });

/** El nombre de la variable que falta, o nada si está todo. */
export function faltaWhatsapp(): string | undefined {
  const { token, telefono, verificacion } = llaves();
  return !token ? 'WHATSAPP_TOKEN' : !telefono ? 'WHATSAPP_PHONE_ID' : !verificacion ? 'WHATSAPP_VERIFY_TOKEN' : undefined;
}

export const tokenVerificacionCorrecto = (intento: string | null) => Boolean(intento) && intento === llaves().verificacion;

async function api(ruta: string, opciones: RequestInit = {}) {
  const r = await fetch(`${GRAPH}/${ruta}`, { ...opciones, headers: { Authorization: `Bearer ${llaves().token}`, 'Content-Type': 'application/json' }, cache: 'no-store' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErrorDeDatos(`Meta contestó ${r.status}: ${j.error?.message ?? 'error desconocido'}`);
  return j as Record<string, any>;
}

/** El número de WhatsApp Business, como lo muestra Meta. Si Meta no contesta, se queda vacío. */
export async function numeroWhatsapp(): Promise<string | undefined> {
  try {
    return (await api(`${llaves().telefono}?fields=display_phone_number`)).display_phone_number;
  } catch {
    return undefined;
  }
}

export async function enviarWhatsapp(para: string, texto: string) {
  await api(`${llaves().telefono}/messages`, { method: 'POST', body: JSON.stringify({ messaging_product: 'whatsapp', to: para, type: 'text', text: { body: texto } }) });
}
