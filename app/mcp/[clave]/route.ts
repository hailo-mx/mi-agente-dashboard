// POST /mcp/<CLAVE_AGENTE>: la clave va en la dirección, sin encabezados. Es para agentes que
// solo aceptan "sin autenticación" u OAuth (los plugins personales de ChatGPT, por ejemplo).
import { claveEnRuta } from '@/lib/acceso';
import { atenderMcp, saludoMcp, sinClave } from '@/lib/mcp';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type Contexto = { params: { clave: string } };

export async function POST(peticion: Request, { params }: Contexto) {
  if (!claveEnRuta(params.clave)) return sinClave();
  return atenderMcp(peticion);
}

export function GET(_peticion: Request, { params }: Contexto) {
  return claveEnRuta(params.clave) ? saludoMcp() : sinClave();
}

export function DELETE() {
  return Response.json({ error: 'Este servidor MCP no usa sesiones.' }, { status: 405, headers: { Allow: 'GET, POST' } });
}
