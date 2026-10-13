// POST /mcp con el encabezado Authorization: Bearer <CLAVE_AGENTE>. La lógica vive en lib/mcp.ts.
import { agenteAutorizado } from '@/lib/acceso';
import { atenderMcp, saludoMcp, sinClave } from '@/lib/mcp';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST(peticion: Request) {
  if (!agenteAutorizado(peticion)) return sinClave();
  return atenderMcp(peticion);
}

export function GET() {
  return saludoMcp();
}

// Este servidor no ofrece el canal SSE ni sesiones.
export function DELETE() {
  return Response.json({ error: 'Este servidor MCP no usa sesiones.' }, { status: 405, headers: { Allow: 'GET, POST' } });
}
