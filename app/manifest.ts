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
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: COLOR_FONDO[fondo],
    theme_color: color,
    icons: [
      { src: '/iconos/192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/iconos/512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/iconos/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/iconos/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  };
}
