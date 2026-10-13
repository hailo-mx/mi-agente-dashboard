// GET y PUT de los ajustes (nombre, color, fondo, logo, sonido).
import { guardarAjustes } from '@/lib/acciones';
import { almacen } from '@/lib/almacen';
import { cuerpo, responder } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export function GET(peticion: Request) {
  return responder(peticion, () => almacen().leerAjustes());
}

export function PUT(peticion: Request) {
  return responder(peticion, async () => guardarAjustes(await cuerpo(peticion)));
}
