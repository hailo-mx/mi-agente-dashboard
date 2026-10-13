// PATCH /api/tareas/:id        { hecha }
// PATCH /api/rutinas/:id       { activa }
// PATCH /api/aprobaciones/:id  { estado: "aprobada" | "rechazada", textoEditado? }
import { activarRutina, marcarTarea, resolverAprobacion } from '@/lib/acciones';
import { cuerpo, responder } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function PATCH(peticion: Request, { params }: { params: { coleccion: string; id: string } }) {
  const { coleccion, id } = params;
  if (!['tareas', 'rutinas', 'aprobaciones'].includes(coleccion)) return Response.json({ error: 'Esa ruta no existe.' }, { status: 404 });
  return responder(peticion, async () => {
    const datos: Record<string, unknown> = { ...(await cuerpo(peticion)), id };
    if (coleccion === 'tareas') return marcarTarea(datos, datos.hecha === true, 'tu');
    if (coleccion === 'rutinas') return activarRutina(datos);
    return resolverAprobacion(datos);
  });
}
