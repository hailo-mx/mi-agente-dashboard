// Con esto el panel se puede instalar como app en el teléfono o la computadora.
import type { MetadataRoute } from 'next';
import { ajustesActuales } from '@/lib/ajustes';
import { COLOR_FONDO } from '@/lib/tipos';

export const dynamic = 'force-dynamic';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { nombreApp, color, fondo } = await ajustesActuales();
  return {
    name: nombreApp,
    short_name: nombreApp,
    description: 'Tu panel personal: aquí ves y apruebas lo que hace tu agente.',
    lang: 'es-MX',
    start_url: '/',
    display: 'standalone',
    background_color: COLOR_FONDO[fondo],
    theme_color: color,
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  };
}
