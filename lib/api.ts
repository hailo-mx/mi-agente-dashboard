// Ayudas para las rutas /api: revisan el acceso y convierten los errores en respuestas claras.
import { ErrorDeDatos } from './acciones';
import { agenteAutorizado, hayClave, navegadorAutorizado } from './acceso';

export async function responder(peticion: Request, trabajo: () => Promise<unknown>): Promise<Response> {
  // Vale la cookie del navegador o, para probar con curl, el mismo encabezado Bearer del agente.
  const autorizado = navegadorAutorizado() || (hayClave() && agenteAutorizado(peticion));
  if (!autorizado) return Response.json({ error: 'Falta la clave de acceso.' }, { status: 401 });
  try {
    return Response.json(await trabajo());
  } catch (e) {
    if (e instanceof ErrorDeDatos) return Response.json({ error: e.message }, { status: 400 });
    console.error('[api]', e);
    return Response.json({ error: `No se pudo leer o guardar: ${e instanceof Error ? e.message : 'error desconocido'}` }, { status: 500 });
  }
}

/** El cuerpo de la petición como objeto; si viene mal, se avisa. */
export async function cuerpo(peticion: Request): Promise<Record<string, unknown>> {
  const datos = await peticion.json().catch(() => null);
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) throw new ErrorDeDatos('Se esperaba un objeto JSON.');
  return datos as Record<string, unknown>;
}
