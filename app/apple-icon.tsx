import { dibujarIcono } from '@/lib/icono';

export const dynamic = 'force-dynamic';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function IconoApple() {
  return dibujarIcono(180);
}
