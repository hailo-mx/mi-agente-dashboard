// Tu foto y el ícono de la app. Se guardan dentro de los ajustes como data URL o, si hay
// Vercel Blob, como archivo privado en el store (y en los ajustes queda solo un marcador).
// La pantalla nunca recibe la imagen en el JSON: la pide por /api/foto y /api/icono.
import { createHash } from 'crypto';
import { del, get, put } from '@vercel/blob';
import { ErrorDeDatos } from './acciones';
import { almacen, hayBlob } from './almacen';
import type { Ajustes } from './tipos';

export type Imagen = 'foto' | 'icono';
export const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGEN = 2 * 1024 * 1024; // 2 MB
const MARCA_BLOB = 'blob:';

function rutaBlob(cual: Imagen): string {
  const huella = createHash('sha256').update(process.env.CLAVE_AGENTE ?? '').digest('hex').slice(0, 32);
  return `mi-agente/${huella}/${cual}`;
}

/** Saca la imagen del cuerpo de la petición: multipart (campo "archivo") o el archivo tal cual. */
export async function leerSubida(peticion: Request): Promise<{ bytes: Buffer; tipo: string }> {
  let tipo = (peticion.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  let datos: ArrayBuffer;
  if (tipo === 'multipart/form-data') {
    const forma = await peticion.formData().catch(() => null);
    const archivo = forma?.get('archivo') ?? forma?.get('file');
    if (!(archivo instanceof Blob)) throw new ErrorDeDatos('Manda la imagen en el campo "archivo".');
    tipo = archivo.type.toLowerCase();
    datos = await archivo.arrayBuffer();
  } else {
    datos = await peticion.arrayBuffer();
  }
  if (!(TIPOS_IMAGEN as readonly string[]).includes(tipo)) throw new ErrorDeDatos('La imagen debe ser JPG, PNG o WebP.');
  if (datos.byteLength === 0) throw new ErrorDeDatos('La imagen llegó vacía.');
  if (datos.byteLength > MAX_IMAGEN) throw new ErrorDeDatos(`La imagen pesa ${(datos.byteLength / 1024 / 1024).toFixed(1)} MB y el máximo es 2 MB.`);
  return { bytes: Buffer.from(datos), tipo };
}

export async function guardarImagen(cual: Imagen, bytes: Buffer, tipo: string): Promise<Ajustes> {
  let valor: string;
  if (hayBlob()) {
    await put(rutaBlob(cual), bytes, { access: 'private', contentType: tipo, addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });
    valor = `${MARCA_BLOB}${tipo}:${Date.now()}`;
  } else {
    valor = `data:${tipo};base64,${bytes.toString('base64')}`;
  }
  const a = almacen();
  const ajustes = { ...(await a.leerAjustes()), [cual]: valor };
  await a.guardarAjustes(ajustes);
  return ajustes;
}

export async function borrarImagen(cual: Imagen): Promise<Ajustes> {
  const a = almacen();
  const { [cual]: anterior, ...resto } = await a.leerAjustes();
  if (anterior?.startsWith(MARCA_BLOB)) await del(rutaBlob(cual)).catch(() => undefined);
  await a.guardarAjustes(resto);
  return resto;
}

/** Los bytes de la imagen guardada, o null si no hay. */
export async function leerImagen(cual: Imagen, ajustes?: Ajustes): Promise<{ bytes: Buffer; tipo: string } | null> {
  const valor = (ajustes ?? (await almacen().leerAjustes()))[cual];
  if (!valor) return null;
  if (valor.startsWith(MARCA_BLOB)) {
    const r = await get(rutaBlob(cual), { access: 'private', useCache: false }).catch(() => null);
    if (!r) return null;
    return { bytes: Buffer.from(await new Response(r.stream).arrayBuffer()), tipo: valor.slice(MARCA_BLOB.length).split(':')[0] };
  }
  const m = /^data:([^;]+);base64,(.*)$/s.exec(valor);
  if (!m) return null;
  return { bytes: Buffer.from(m[2], 'base64'), tipo: m[1] };
}

/** La imagen como data URL, para dibujar el ícono con next/og. */
export async function imagenComoDataUrl(cual: Imagen, ajustes?: Ajustes): Promise<string | null> {
  const img = await leerImagen(cual, ajustes);
  return img ? `data:${img.tipo};base64,${img.bytes.toString('base64')}` : null;
}

/** Un texto corto que cambia cuando cambia la imagen: va en ?v= para que el navegador no muestre la vieja. */
export function versionImagen(valor: string | undefined): string {
  if (!valor) return '';
  if (valor.startsWith(MARCA_BLOB)) return valor.split(':').pop() ?? '';
  return createHash('sha1').update(valor).digest('hex').slice(0, 10);
}

/** Lo que ve la pantalla: en vez de la imagen, la dirección para pedirla. */
export function ajustesParaPantalla(ajustes: Ajustes): Ajustes {
  const { foto, icono, ...resto } = ajustes;
  const salida: Ajustes = resto;
  if (foto) salida.foto = `/api/foto?v=${versionImagen(foto)}`;
  if (icono) salida.icono = `/api/icono?v=${versionImagen(icono)}`;
  return salida;
}

export function respuestaImagen(img: { bytes: Buffer; tipo: string } | null, privada: boolean): Response {
  if (!img) return new Response('No hay imagen', { status: 404 });
  return new Response(new Uint8Array(img.bytes), {
    headers: { 'Content-Type': img.tipo, 'Content-Length': String(img.bytes.length), 'Cache-Control': privada ? 'private, max-age=0, must-revalidate' : 'public, max-age=0, must-revalidate' },
  });
}
