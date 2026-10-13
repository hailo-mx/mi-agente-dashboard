// POST /api/conexiones/enviar-correo → Manda un correo. Exige "aprobacion_id" de una aprobación ya aprobada.
import { cuerpo, responder } from '@/lib/api';
import { enviarCorreo } from '@/lib/conexiones';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export function POST(peticion: Request) {
  return responder(peticion, async () => enviarCorreo(await cuerpo(peticion)));
}
