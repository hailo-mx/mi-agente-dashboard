import { dibujarIcono } from '@/lib/icono';

export const dynamic = 'force-dynamic';
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icono() {
  return dibujarIcono(512);
}
