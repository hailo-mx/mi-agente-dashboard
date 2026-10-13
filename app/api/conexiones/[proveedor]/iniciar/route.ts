// GET /api/conexiones/google/iniciar (o microsoft) → manda al navegador a la pantalla de permisos.
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { navegadorAutorizado } from '@/lib/acceso';
import { CUENTAS, GALLETA_ESTADO, esProveedor, urlCallback } from '@/lib/conexiones';

export const dynamic = 'force-dynamic';

export async function GET(peticion: Request, { params }: { params: { proveedor: string } }) {
  const { proveedor } = params;
  if (!esProveedor(proveedor)) return Response.json({ error: 'Esa ruta no existe.' }, { status: 404 });
  if (!navegadorAutorizado()) return Response.redirect(new URL('/', peticion.url));
  const falta = CUENTAS[proveedor].falta();
  if (falta) return Response.json({ error: `Falta configurar ${falta}.` }, { status: 400 });
  // Un valor al azar que debe regresar igual en el callback: así nadie puede colarnos una cuenta ajena.
  const estado = randomBytes(16).toString('base64url');
  cookies().set(GALLETA_ESTADO, estado, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 });
  return Response.redirect(CUENTAS[proveedor].urlInicio(urlCallback(peticion, proveedor), estado));
}
