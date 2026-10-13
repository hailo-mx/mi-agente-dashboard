// Los ajustes para dibujar la página, el manifiesto y el ícono. Si el almacén falla, se usan los iniciales.
import { cache } from 'react';
import { almacen } from './almacen';
import { AJUSTES_INICIALES, type Ajustes } from './tipos';

export const ajustesActuales = cache(async (): Promise<Ajustes> => {
  try {
    return await almacen().leerAjustes();
  } catch (e) {
    console.error('[ajustes]', e);
    return { ...AJUSTES_INICIALES };
  }
});
