// El almacén: una sola interfaz y dos lugares donde guardar.
//  - Local (por defecto): el archivo datos/datos.json en tu computadora.
//  - Convex: una base de datos en la nube, cuando existe la variable CONVEX_URL.
import type { Ajustes, Coleccion, Colecciones, Datos } from './tipos';
import { almacenLocal } from './almacen-local';
import { crearAlmacenConvex } from './almacen-convex';

export interface Almacen {
  /** Todo de un jalón (lo usa la pantalla). */
  leerTodo(): Promise<Datos>;
  listar<C extends Coleccion>(coleccion: C): Promise<Colecciones[C][]>;
  agregar<C extends Coleccion>(coleccion: C, elemento: Colecciones[C]): Promise<void>;
  /** Cambia algunos campos de un elemento. Regresa null si el id no existe. */
  actualizar<C extends Coleccion>(coleccion: C, id: string, cambios: Partial<Colecciones[C]>): Promise<Colecciones[C] | null>;
  /** Sustituye la colección completa por la lista dada. */
  reemplazar<C extends Coleccion>(coleccion: C, elementos: Colecciones[C][]): Promise<void>;
  leerAjustes(): Promise<Ajustes>;
  guardarAjustes(ajustes: Ajustes): Promise<void>;
}

export function urlConvex(): string | undefined {
  return process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL || undefined;
}

/** Publicado en Vercel sin base de datos en la nube: lo que se escriba no se conserva. */
export function sinNube(): boolean {
  return Boolean(process.env.VERCEL) && !urlConvex();
}

let convex: { url: string; almacen: Almacen } | undefined;

export function almacen(): Almacen {
  const url = urlConvex();
  if (!url) return almacenLocal;
  if (convex?.url !== url) convex = { url, almacen: crearAlmacenConvex(url) };
  return convex.almacen;
}
