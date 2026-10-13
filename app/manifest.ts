// Con esto el panel se puede instalar como app en el teléfono o la computadora.
// Lee los ajustes en cada petición: el nombre, el color y el ícono que subas se reflejan al instante.
import type { MetadataRoute } from 'next';
import { ajustesActuales } from '@/lib/ajustes';
import { versionImagen } from '@/lib/imagenes';
import { COLOR_FONDO } from '@/lib/tipos';

export const dynamic = 'force-dynamic';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { nombreApp, color, fondo, icono } = await ajustesActuales();
  // ?v= cambia con cada ícono subido (o con el color, si es la letra): así el teléfono no guarda el viejo.
  const v = `?v=${icono ? versionImagen(icono) : color.slice(1)}`;
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
      { src: `/iconos/192.png${v}`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `/iconos/512.png${v}`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `/iconos/maskable-192.png${v}`, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: `/iconos/maskable-512.png${v}`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: `/apple-icon${v}`, sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  };
}
