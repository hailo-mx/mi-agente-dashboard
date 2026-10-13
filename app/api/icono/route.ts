// El ícono de tu app: GET lo muestra tal cual se subió (público: el navegador lo pide sin cookie),
// POST lo sube (JPG/PNG/WebP, 2 MB), DELETE lo quita y vuelve la letra de siempre.
import { responder } from '@/lib/api';
import { ajustesParaPantalla, borrarImagen, guardarImagen, leerImagen, leerSubida, respuestaImagen } from '@/lib/imagenes';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  return respuestaImagen(await leerImagen('icono'), false);
}

export function POST(peticion: Request) {
  return responder(peticion, async () => {
    const { bytes, tipo } = await leerSubida(peticion);
    return ajustesParaPantalla(await guardarImagen('icono', bytes, tipo));
  });
}

export function DELETE(peticion: Request) {
  return responder(peticion, async () => ajustesParaPantalla(await borrarImagen('icono')));
}
