// GET /api/tareas, /api/rutinas, /api/aprobaciones, /api/actividad, /api/correos, /api/eventos, /api/whatsapp
// (/api/conexiones tiene su propia ruta: nunca devuelve los tokens)
// POST /api/tareas  → agregar una tarea a mano
import { ErrorDeDatos, crearTarea } from '@/lib/acciones';
import { almacen } from '@/lib/almacen';
import { cuerpo, responder } from '@/lib/api';
import { COLECCIONES, type Coleccion } from '@/lib/tipos';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type Contexto = { params: { coleccion: string } };
const noExiste = () => Response.json({ error: 'Esa ruta no existe.' }, { status: 404 });

export async function GET(peticion: Request, { params }: Contexto) {
  if (!COLECCIONES.includes(params.coleccion as Coleccion) || params.coleccion === 'conexiones') return noExiste();
  return responder(peticion, () => almacen().listar(params.coleccion as Coleccion));
}

export async function POST(peticion: Request, { params }: Contexto) {
  if (params.coleccion !== 'tareas') return noExiste();
  return responder(peticion, async () => {
    const datos = await cuerpo(peticion);
    if (typeof datos.titulo !== 'string' || !datos.titulo.trim()) throw new ErrorDeDatos('Escribe qué hay que hacer.');
    return crearTarea(datos, 'tu');
  });
}
