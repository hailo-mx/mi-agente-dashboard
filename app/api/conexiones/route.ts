// GET /api/conexiones → el estado de cada cuenta (sin secretos).
import { responder } from '@/lib/api';
import { estadoConexiones } from '@/lib/conexiones';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export function GET(peticion: Request) {
  return responder(peticion, estadoConexiones);
}
