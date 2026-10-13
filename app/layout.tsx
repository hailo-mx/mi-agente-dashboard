import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { ajustesActuales } from '@/lib/ajustes';
import { COLOR_FONDO } from '@/lib/tipos';
import './globals.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { nombreApp } = await ajustesActuales();
  return {
    title: nombreApp,
    description: 'Tu panel personal: aquí ves y apruebas lo que hace tu agente.',
    appleWebApp: { capable: true, title: nombreApp, statusBarStyle: 'black-translucent' },
    robots: { index: false, follow: false },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const { fondo } = await ajustesActuales();
  return { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: COLOR_FONDO[fondo] };
}

export default function Raiz({ children }: { children: ReactNode }) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  );
}
