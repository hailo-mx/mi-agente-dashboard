'use client';
import { useEffect } from 'react';

/* Registra el service worker (public/sw.js) para que el panel se pueda instalar y abrir como app. */
export default function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* sin service worker el panel funciona igual, solo no se instala */
    });
  }, []);
  return null;
}
