// POST /api/enviar → Responder un correo o un WhatsApp desde la pantalla.
// Deja una aprobación ya aprobada y, si hay cuenta conectada, lo manda de una vez.
import { cuerpo, responder } from '@/lib/api';
import { enviarDesdePanel } from '@/lib/conexiones';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export function POST(peticion: Request) {
  return responder(peticion, async () => enviarDesdePanel(await cuerpo(peticion)));
}
