// POST /api/conexiones/crear-evento → Crea un evento en el calendario. Exige "aprobacion_id" de una aprobación ya aprobada.
import { cuerpo, responder } from '@/lib/api';
import { crearEvento } from '@/lib/conexiones';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export function POST(peticion: Request) {
  return responder(peticion, async () => crearEvento(await cuerpo(peticion)));
}
