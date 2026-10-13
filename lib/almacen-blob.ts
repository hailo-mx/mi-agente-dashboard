// Almacén en Vercel Blob: todos los datos viven en un solo archivo JSON privado dentro del
// store de Blob del proyecto. Se activa solo con la variable BLOB_READ_WRITE_TOKEN (Vercel la
// crea al agregar un store en Storage, o al desplegar con el botón de LEEME.md).
import { createHash } from 'crypto';
import { get, put } from '@vercel/blob';
import type { Almacen } from './almacen';
import { AJUSTES_INICIALES, COLECCIONES, type Datos } from './tipos';

// El blob es privado (solo se lee con el token), pero por si acaso el nombre tampoco se adivina:
// sale de la CLAVE_AGENTE pasada por sha256.
function ruta(): string {
  const huella = createHash('sha256').update(process.env.CLAVE_AGENTE ?? '').digest('hex').slice(0, 32);
  return `mi-agente/${huella}/datos.json`;
}

function vacio(): Datos {
  return { tareas: [], rutinas: [], aprobaciones: [], actividad: [], correos: [], eventos: [], conexiones: [], whatsapp: [], ajustes: { ...AJUSTES_INICIALES } };
}

async function leer(): Promise<Datos> {
  const datos = vacio();
  // useCache: false → siempre la versión más reciente, nunca la copia del CDN.
  const r = await get(ruta(), { access: 'private', useCache: false });
  if (!r) return datos;
  const crudo = await new Response(r.stream).text();
  let guardado: Partial<Datos>;
  try {
    guardado = JSON.parse(crudo);
  } catch {
    throw new Error('El archivo guardado en Vercel Blob está dañado (no es JSON válido). Bórralo desde Vercel → Storage para empezar de cero.');
  }
  for (const c of COLECCIONES) if (Array.isArray(guardado[c])) (datos[c] as unknown[]) = guardado[c] as unknown[];
  datos.ajustes = { ...AJUSTES_INICIALES, ...(guardado.ajustes ?? {}) };
  return datos;
}

async function escribir(datos: Datos) {
  await put(ruta(), JSON.stringify(datos), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60, // el mínimo que acepta Blob; de todos modos leemos sin caché
  });
}

// Una fila para los cambios: dos escrituras al mismo tiempo no se pisan.
// Vive en globalThis porque Next carga este módulo más de una vez.
const fila = globalThis as unknown as { __miAgenteFilaBlob?: Promise<unknown> };

function cambiar<T>(cambio: (datos: Datos) => T): Promise<T> {
  const turno = (fila.__miAgenteFilaBlob ?? Promise.resolve()).then(async () => {
    const datos = await leer();
    const resultado = cambio(datos);
    await escribir(datos);
    return resultado;
  });
  fila.__miAgenteFilaBlob = turno.catch(() => undefined);
  return turno;
}

export const almacenBlob: Almacen = {
  leerTodo: leer,
  async listar(coleccion) {
    return (await leer())[coleccion] as never;
  },
  async agregar(coleccion, elemento) {
    await cambiar((d) => void (d[coleccion] as unknown[]).push(elemento));
  },
  actualizar(coleccion, id, cambios) {
    return cambiar((d) => {
      const lista = d[coleccion] as { id: string }[];
      const i = lista.findIndex((x) => x.id === id);
      if (i < 0) return null;
      lista[i] = { ...lista[i], ...cambios, id };
      return lista[i] as never;
    });
  },
  async reemplazar(coleccion, elementos) {
    await cambiar((d) => void ((d[coleccion] as unknown[]) = elementos));
  },
  async leerAjustes() {
    return (await leer()).ajustes;
  },
  async guardarAjustes(ajustes) {
    await cambiar((d) => void (d.ajustes = ajustes));
  },
};
