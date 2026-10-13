// El ícono de la app: un cuadro redondeado del color de acento con la inicial del nombre.
import { ImageResponse } from 'next/og';
import { ajustesActuales } from './ajustes';
import { sobreColor } from './formato';
import { NOMBRE } from './marca';

export async function dibujarIcono(lado: number) {
  const { nombreApp, color } = await ajustesActuales();
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
          fontSize: lado * 0.56,
          fontWeight: 700,
        }}
      >
        {(nombreApp.trim()[0] ?? NOMBRE[0]).toUpperCase()}
      </div>
    ),
    { width: lado, height: lado },
  );
}
