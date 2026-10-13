// Tu foto: GET la muestra (solo con la cookie o la clave), POST la sube (JPG/PNG/WebP, 2 MB), DELETE la quita.
import { autorizado, responder } from '@/lib/api';
import { ajustesParaPantalla, borrarImagen, guardarImagen, leerImagen, leerSubida, respuestaImagen } from '@/lib/imagenes';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(peticion: Request) {
  if (!autorizado(peticion)) return Response.json({ error: 'Falta la clave de acceso.' }, { status: 401 });
  return respuestaImagen(await leerImagen('foto'), true);
}

export function POST(peticion: Request) {
  return responder(peticion, async () => {
    const { bytes, tipo } = await leerSubida(peticion);
    return ajustesParaPantalla(await guardarImagen('foto', bytes, tipo));
  });
}

export function DELETE(peticion: Request) {
  return responder(peticion, async () => ajustesParaPantalla(await borrarImagen('foto')));
}
