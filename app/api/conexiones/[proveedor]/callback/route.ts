// GET /api/conexiones/google/callback (o microsoft) → Google/Microsoft regresan aquí con el código; se guarda la cuenta.
import { cookies } from 'next/headers';
import { navegadorAutorizado } from '@/lib/acceso';
import { ErrorDeDatos } from '@/lib/acciones';
import { CUENTAS, GALLETA_ESTADO, esProveedor, guardarConexion, urlCallback } from '@/lib/conexiones';

export const dynamic = 'force-dynamic';

export async function GET(peticion: Request, { params }: { params: { proveedor: string } }) {
  const { proveedor } = params;
  if (!esProveedor(proveedor)) return Response.json({ error: 'Esa ruta no existe.' }, { status: 404 });
  if (!navegadorAutorizado()) return Response.redirect(new URL('/', peticion.url));
  const regresar = (q: Record<string, string>) => Response.redirect(new URL(`/conexiones?${new URLSearchParams(q)}`, peticion.url));

  const url = new URL(peticion.url);
  const code = url.searchParams.get('code');
  const estado = url.searchParams.get('state');
  const galleta = cookies().get(GALLETA_ESTADO)?.value;
  cookies().delete(GALLETA_ESTADO);
  if (url.searchParams.get('error')) return regresar({ error: `No se dio el permiso (${url.searchParams.get('error')}).` });
  if (!code || !estado || estado !== galleta) return regresar({ error: 'La conexión no se completó. Inténtalo de nuevo desde el botón Conectar.' });

  try {
    const cuenta = await CUENTAS[proveedor].canjear(code, urlCallback(peticion, proveedor));
    await guardarConexion(proveedor, cuenta);
    return regresar({ ok: proveedor });
  } catch (e) {
    if (!(e instanceof ErrorDeDatos)) console.error(`[conexiones] ${proveedor}:`, e);
    return regresar({ error: e instanceof Error ? e.message : 'No se pudo completar la conexión.' });
  }
}
