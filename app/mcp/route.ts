// Servidor MCP mínimo (transporte Streamable HTTP, sin sesiones, respuestas en JSON).
// Por aquí entra el agente: POST /mcp con mensajes JSON-RPC 2.0.
import { ErrorDeDatos } from '@/lib/acciones';
import { agenteAutorizado } from '@/lib/acceso';
import { HERRAMIENTAS } from '@/lib/herramientas';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const VERSION_PROTOCOLO = '2025-06-18';

type Respuesta = { jsonrpc: '2.0'; id: unknown; result?: unknown; error?: { code: number; message: string } };

const fallo = (id: unknown, code: number, message: string): Respuesta => ({ jsonrpc: '2.0', id, error: { code, message } });
const esObjeto = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

async function llamarHerramienta(params: unknown) {
  const p = esObjeto(params) ? params : {};
  const herramienta = HERRAMIENTAS.find((h) => h.name === p.name);
  if (!herramienta) return null;
  const argumentos = p.arguments === undefined || p.arguments === null ? {} : p.arguments;
  try {
    if (!esObjeto(argumentos)) throw new ErrorDeDatos('"arguments" debe ser un objeto.');
    const resultado = await herramienta.ejecutar(argumentos);
    return { content: [{ type: 'text', text: JSON.stringify(resultado) }] };
  } catch (e) {
    if (!(e instanceof ErrorDeDatos)) console.error(`[mcp] ${herramienta.name}:`, e);
    const mensaje = e instanceof ErrorDeDatos ? e.message : `No se pudo guardar en el panel: ${e instanceof Error ? e.message : 'error desconocido'}`;
    return { content: [{ type: 'text', text: JSON.stringify({ error: mensaje }) }], isError: true };
  }
}

/** Atiende un mensaje. Regresa null cuando es una notificación (no lleva respuesta). */
async function atender(mensaje: unknown): Promise<Respuesta | null> {
  if (!esObjeto(mensaje) || mensaje.jsonrpc !== '2.0' || typeof mensaje.method !== 'string') {
    return fallo(esObjeto(mensaje) ? (mensaje.id ?? null) : null, -32600, 'Mensaje inválido: se esperaba JSON-RPC 2.0 con "method".');
  }
  const { id, method, params } = mensaje;
  if (id === undefined || id === null) return null; // notifications/initialized y cualquier otra notificación
  const ok = (result: unknown): Respuesta => ({ jsonrpc: '2.0', id, result });

  switch (method) {
    case 'initialize': {
      const pedida = esObjeto(params) && typeof params.protocolVersion === 'string' ? params.protocolVersion : VERSION_PROTOCOLO;
      return ok({
        protocolVersion: pedida,
        capabilities: { tools: {} },
        serverInfo: { name: 'mi-agente-dashboard', version: '1.0.0' },
        instructions:
          'Panel personal de la persona a la que ayudas. Anota aquí lo que haces (tareas, rutinas, correos, calendario, actividad). Antes de mandar algo en su nombre, pide permiso con crear_aprobacion y espera a que quede "aprobada".',
      });
    }
    case 'ping':
      return ok({});
    case 'tools/list':
      return ok({ tools: HERRAMIENTAS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case 'tools/call': {
      const resultado = await llamarHerramienta(params);
      return resultado ? ok(resultado) : fallo(id, -32602, `No existe la herramienta "${esObjeto(params) ? String(params.name) : ''}". Usa tools/list para ver las disponibles.`);
    }
    default:
      return fallo(id, -32601, `Método no soportado: ${method}`);
  }
}

export async function POST(peticion: Request) {
  if (!agenteAutorizado(peticion)) {
    return Response.json(
      { error: 'Falta la clave o es incorrecta. Manda el encabezado: Authorization: Bearer <CLAVE_AGENTE>' },
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } },
    );
  }

  let cuerpo: unknown;
  try {
    cuerpo = await peticion.json();
  } catch {
    return Response.json(fallo(null, -32700, 'El cuerpo no es JSON válido.'), { status: 400 });
  }

  // Lote: varios mensajes en una lista. Se atienden en orden.
  if (Array.isArray(cuerpo)) {
    if (cuerpo.length === 0) return Response.json(fallo(null, -32600, 'El lote está vacío.'), { status: 400 });
    const respuestas: Respuesta[] = [];
    for (const mensaje of cuerpo) {
      const r = await atender(mensaje);
      if (r) respuestas.push(r);
    }
    return respuestas.length ? Response.json(respuestas) : new Response(null, { status: 202 });
  }

  const respuesta = await atender(cuerpo);
  return respuesta ? Response.json(respuesta) : new Response(null, { status: 202 });
}

// Este servidor no ofrece el canal SSE: solo POST.
const soloPost = () => Response.json({ error: 'Este servidor MCP solo acepta POST.' }, { status: 405, headers: { Allow: 'POST' } });
export { soloPost as GET, soloPost as DELETE };
