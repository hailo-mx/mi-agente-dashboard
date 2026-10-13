// Recibe la clave una vez y deja una cookie (solo la ve el servidor) por 60 días.
import { cookies } from 'next/headers';
import { DIAS_GALLETA, GALLETA, claveCorrecta, hayClave, valorGalleta } from '@/lib/acceso';

export const dynamic = 'force-dynamic';

export async function POST(peticion: Request) {
  if (!hayClave()) return Response.json({ ok: true });
  const datos = await peticion.json().catch(() => null);
  const intento = typeof datos?.clave === 'string' ? datos.clave.trim() : '';
  if (!intento || !claveCorrecta(intento)) {
    return Response.json({ error: 'Esa no es la clave. Revísala e inténtalo de nuevo.' }, { status: 401 });
  }
  const seguro = (peticion.headers.get('x-forwarded-proto') ?? new URL(peticion.url).protocol).startsWith('https');
  cookies().set(GALLETA, valorGalleta(), { httpOnly: true, sameSite: 'lax', secure: seguro, path: '/', maxAge: DIAS_GALLETA * 24 * 60 * 60 });
  return Response.json({ ok: true });
}
