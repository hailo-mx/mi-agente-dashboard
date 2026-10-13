// Almacén en la nube (Convex). Solo se llama desde el servidor de Next, nunca desde el navegador.
import { ConvexHttpClient } from 'convex/browser';
import { anyApi } from 'convex/server';
import type { Almacen } from './almacen';
import { AJUSTES_INICIALES, COLECCIONES, type Datos } from './tipos';

export function crearAlmacenConvex(url: string): Almacen {
  // Sin caché: Next guarda las respuestas de fetch si no se le dice lo contrario.
  const cliente = new ConvexHttpClient(url, { fetch: (entrada, opciones) => fetch(entrada, { ...opciones, cache: 'no-store' }) });
  // Las funciones de Convex piden la misma clave que el panel (variable CLAVE_AGENTE en Convex).
  const clave = () => process.env.CLAVE_AGENTE ?? '';
  const api = anyApi.datos;

  return {
    async leerTodo() {
      const r = await cliente.query(api.leerTodo, { clave: clave() });
      const datos = { ajustes: { ...AJUSTES_INICIALES, ...(r.ajustes ?? {}) } } as Datos;
      for (const c of COLECCIONES) (datos[c] as unknown[]) = r[c] ?? [];
      return datos;
    },
    listar: (coleccion) => cliente.query(api.listar, { clave: clave(), coleccion }),
    async agregar(coleccion, elemento) {
      await cliente.mutation(api.agregar, { clave: clave(), coleccion, elemento });
    },
    actualizar: (coleccion, id, cambios) => cliente.mutation(api.actualizar, { clave: clave(), coleccion, id, cambios }),
    async reemplazar(coleccion, elementos) {
      await cliente.mutation(api.reemplazar, { clave: clave(), coleccion, elementos });
    },
    async leerAjustes() {
      const a = await cliente.query(api.leerAjustes, { clave: clave() });
      return { ...AJUSTES_INICIALES, ...(a ?? {}) };
    },
    async guardarAjustes(ajustes) {
      await cliente.mutation(api.guardarAjustes, { clave: clave(), ajustes });
    },
  };
}
