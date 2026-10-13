// El ícono de la app. Si subiste uno en Ajustes, se usa ese (recortado al cuadro y al tamaño pedido);
// si no, un cuadro del color de acento con la inicial del nombre.
// La versión «maskable» (Android la recorta en círculo) lleva la imagen o la letra más chica, dentro de la zona segura.
import { ImageResponse } from 'next/og';
import { ajustesActuales } from './ajustes';
import { sobreColor } from './formato';
import { imagenComoDataUrl } from './imagenes';
import { NOMBRE } from './marca';

// Cambia con cada subida: que el navegador no se quede con el ícono viejo.
const ENCABEZADOS = { 'Cache-Control': 'public, max-age=0, must-revalidate' };

export async function dibujarIcono(lado: number, maskable = false) {
  const ajustes = await ajustesActuales();
  const { nombreApp, color } = ajustes;
  const subido = await imagenComoDataUrl('icono', ajustes).catch(() => null);
  const opciones = { width: lado, height: lado, headers: ENCABEZADOS };

  if (subido) {
    // Maskable: la imagen ocupa el 80% (la zona segura) sobre el color de acento.
    const interior = maskable ? Math.round(lado * 0.8) : lado;
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: color }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={subido} width={interior} height={interior} style={{ width: interior, height: interior, objectFit: 'cover', borderRadius: maskable ? Math.round(interior * 0.22) : 0 }} alt="" />
        </div>
      ),
      opciones,
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: color,
          color: sobreColor(color),
          fontSize: lado * (maskable ? 0.42 : 0.56),
          fontWeight: 700,
        }}
      >
        {(nombreApp.trim()[0] ?? NOMBRE[0]).toUpperCase()}
      </div>
    ),
    opciones,
  );
}
