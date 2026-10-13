// POST /api/conexiones/enviar-whatsapp → Manda un WhatsApp. Exige "aprobacion_id" de una aprobación ya aprobada.
import { cuerpo, responder } from '@/lib/api';
import { enviarWhatsapp } from '@/lib/conexiones';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export function POST(peticion: Request) {
  return responder(peticion, async () => enviarWhatsapp(await cuerpo(peticion)));
}
