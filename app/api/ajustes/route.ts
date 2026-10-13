// GET y PUT de los ajustes (nombre, color, fondo, logo, sonido, voz, agente). La foto y el ícono van por /api/foto y /api/icono.
import { guardarAjustes } from '@/lib/acciones';
import { almacen } from '@/lib/almacen';
import { cuerpo, responder } from '@/lib/api';
import { ajustesParaPantalla } from '@/lib/imagenes';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export function GET(peticion: Request) {
  return responder(peticion, async () => ajustesParaPantalla(await almacen().leerAjustes()));
}

export function PUT(peticion: Request) {
  return responder(peticion, async () => ajustesParaPantalla(await guardarAjustes(await cuerpo(peticion))));
}
