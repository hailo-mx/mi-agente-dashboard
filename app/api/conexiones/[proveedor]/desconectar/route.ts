// POST /api/conexiones/google/desconectar (o microsoft) → olvida la cuenta.
import { responder } from '@/lib/api';
import { desconectar, esProveedor } from '@/lib/conexiones';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export function POST(peticion: Request, { params }: { params: { proveedor: string } }) {
  const { proveedor } = params;
  if (!esProveedor(proveedor)) return Response.json({ error: 'Esa ruta no existe.' }, { status: 404 });
  return responder(peticion, () => desconectar(proveedor));
}
