// POST /api/conexiones/google/sincronizar (o microsoft) → trae los últimos correos y la semana del calendario.
import { responder } from '@/lib/api';
import { esProveedor, sincronizar } from '@/lib/conexiones';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export function POST(peticion: Request, { params }: { params: { proveedor: string } }) {
  const { proveedor } = params;
  if (!esProveedor(proveedor)) return Response.json({ error: 'Esa ruta no existe.' }, { status: 404 });
  return responder(peticion, () => sincronizar(proveedor));
}
