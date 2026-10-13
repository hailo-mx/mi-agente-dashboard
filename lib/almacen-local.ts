// Almacén local: un archivo JSON. Se crea solo la primera vez que se escribe algo.
import { promises as fs } from 'fs';
import path from 'path';
import type { Almacen } from './almacen';
import { AJUSTES_INICIALES, COLECCIONES, type Datos } from './tipos';

// En Vercel solo se puede escribir en /tmp (y se borra seguido): por eso el aviso en pantalla.
const ARCHIVO = process.env.VERCEL ? '/tmp/mi-agente-datos.json' : path.join(process.cwd(), 'datos', 'datos.json');

function vacio(): Datos {
  return { tareas: [], rutinas: [], aprobaciones: [], actividad: [], correos: [], eventos: [], conexiones: [], whatsapp: [], ajustes: { ...AJUSTES_INICIALES } };
}

async function leer(): Promise<Datos> {
  const datos = vacio();
  let crudo: string;
  try {
    crudo = await fs.readFile(ARCHIVO, 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return datos;
    throw e;
  }
  let guardado: Partial<Datos>;
  try {
    guardado = JSON.parse(crudo);
  } catch {
    throw new Error(`El archivo ${ARCHIVO} está dañado (no es JSON válido). Corrígelo o bórralo para empezar de cero.`);
  }
  for (const c of COLECCIONES) if (Array.isArray(guardado[c])) (datos[c] as unknown[]) = guardado[c] as unknown[];
  datos.ajustes = { ...AJUSTES_INICIALES, ...(guardado.ajustes ?? {}) };
  return datos;
}

async function escribir(datos: Datos) {
  await fs.mkdir(path.dirname(ARCHIVO), { recursive: true });
  // Primero a un archivo temporal y luego se renombra: así nunca queda a medias.
  const temporal = `${ARCHIVO}.${process.pid}.tmp`;
  await fs.writeFile(temporal, JSON.stringify(datos, null, 2), 'utf8');
  await fs.rename(temporal, ARCHIVO);
}

// Una fila para los cambios: dos escrituras al mismo tiempo no se pisan.
// Vive en globalThis porque Next carga este módulo más de una vez.
const fila = globalThis as unknown as { __miAgenteFila?: Promise<unknown> };

function cambiar<T>(cambio: (datos: Datos) => T): Promise<T> {
  const turno = (fila.__miAgenteFila ?? Promise.resolve()).then(async () => {
    const datos = await leer();
    const resultado = cambio(datos);
    await escribir(datos);
    return resultado;
  });
  fila.__miAgenteFila = turno.catch(() => undefined);
  return turno;
}

export const almacenLocal: Almacen = {
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
