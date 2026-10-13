import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { ajustesActuales } from '@/lib/ajustes';
import { COLOR_FONDO } from '@/lib/tipos';
import RegistrarSW from '@/components/RegistrarSW';
import './globals.css';

export const dynamic = 'force-dynamic';

// La misma letra del demo del taller. Si no se puede descargar, se usa la del sistema.
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export async function generateMetadata(): Promise<Metadata> {
  const { nombreApp } = await ajustesActuales();
  return {
    title: nombreApp,
    applicationName: nombreApp,
    description: 'Tu panel personal: aquí ves y apruebas lo que hace tu agente.',
    manifest: '/manifest.webmanifest',
    appleWebApp: { capable: true, title: nombreApp, statusBarStyle: 'black-translucent' },
    // Android/Chrome: que se abra como app al instalarla.
    other: { 'mobile-web-app-capable': 'yes' },
    robots: { index: false, follow: false },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const { fondo } = await ajustesActuales();
  return { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: COLOR_FONDO[fondo] };
}

export default function Raiz({ children }: { children: ReactNode }) {
  return (
    <html lang="es-MX" className={sans.variable}>
      <body>
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
