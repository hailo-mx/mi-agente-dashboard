// El webhook de Meta para WhatsApp. No lleva clave: Meta lo llama directo.
//  GET  → Meta verifica que el webhook es nuestro (hub.verify_token debe ser WHATSAPP_VERIFY_TOKEN).
//  POST → llegan los mensajes; se guardan en la colección "whatsapp".
import { guardarMensajesWhatsapp } from '@/lib/conexiones';
import { tokenVerificacionCorrecto } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export function GET(peticion: Request) {
  const q = new URL(peticion.url).searchParams;
  if (q.get('hub.mode') === 'subscribe' && tokenVerificacionCorrecto(q.get('hub.verify_token'))) {
    return new Response(q.get('hub.challenge') ?? '', { headers: { 'Content-Type': 'text/plain' } });
  }
  return Response.json({ error: 'El token de verificación no coincide con WHATSAPP_VERIFY_TOKEN.' }, { status: 403 });
}

export async function POST(peticion: Request) {
  try {
    const guardados = await guardarMensajesWhatsapp(await peticion.json());
    return Response.json({ ok: true, guardados });
  } catch (e) {
    console.error('[whatsapp]', e);
    // Meta reintenta si no contesta 200: mejor avisar en el registro y seguir.
    return Response.json({ ok: false });
  }
}
