// POST /api/conexiones/sincronizar → sincroniza todas las cuentas conectadas.
import { responder } from '@/lib/api';
import { sincronizar } from '@/lib/conexiones';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export function POST(peticion: Request) {
  return responder(peticion, () => sincronizar());
}
