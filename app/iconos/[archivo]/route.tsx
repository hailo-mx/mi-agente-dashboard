// Los íconos para instalar la app: /iconos/192.png, /iconos/512.png y sus versiones maskable.
import { dibujarIcono } from '@/lib/icono';

export const dynamic = 'force-dynamic';

export async function GET(_pedido: Request, { params }: { params: { archivo: string } }) {
  const m = /^(maskable-)?(192|512)\.png$/.exec(params.archivo);
  if (!m) return new Response('No existe', { status: 404 });
  return dibujarIcono(Number(m[2]), Boolean(m[1]));
}
