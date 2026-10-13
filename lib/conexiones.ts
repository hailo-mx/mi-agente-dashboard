// Las cuentas conectadas: estado, sincronizar correo y calendario, y mandar cosas (solo con una aprobación).
import { randomBytes } from 'crypto';
import { ErrorDeDatos, anotarActividad, compacto, fechaHora, texto, textoOpcional } from './acciones';
import { almacen } from './almacen';
import type { Cuenta } from './cuentas';
import { google } from './google';
import { microsoft } from './microsoft';
import { PROVEEDORES, type Aprobacion, type Canal, type Conexion, type Correo, type Evento, type Proveedor, type Whatsapp } from './tipos';
import { enviarWhatsapp as mandarWhatsapp, faltaWhatsapp, numeroWhatsapp } from './whatsapp';

type Entrada = Record<string, unknown>;

export const CUENTAS: Record<Proveedor, Cuenta> = { google, microsoft };
export const NOMBRE: Record<Proveedor, string> = { google: 'Google', microsoft: 'Microsoft 365' };

const nuevoId = () => randomBytes(6).toString('base64url');
const ahora = () => new Date().toISOString();
const DIAS_CALENDARIO = 7;
/** La cookie que guarda el "state" de OAuth entre iniciar y callback. */
export const GALLETA_ESTADO = 'conexion_estado';

export function esProveedor(valor: unknown): valor is Proveedor {
  return PROVEEDORES.includes(valor as Proveedor);
}

/** La dirección pública del panel (APP_URL) o, si no está puesta, la de la petición. */
export function direccionBase(peticion: Request): string {
  return (process.env.APP_URL || new URL(peticion.url).origin).replace(/\/$/, '');
}

export const urlCallback = (peticion: Request, proveedor: Proveedor) => `${direccionBase(peticion)}/api/conexiones/${proveedor}/callback`;

/** Lo que se le puede enseñar a la pantalla y al agente: nunca el refreshToken. */
const publica = ({ proveedor, correo, conectada, ultimaSync }: Conexion) => ({ proveedor, correo, conectada, ultimaSync });

export async function conexion(proveedor: Proveedor): Promise<Conexion | undefined> {
  return (await almacen().listar('conexiones')).find((c) => c.proveedor === proveedor);
}

export async function estadoConexiones() {
  const conexiones = await almacen().listar('conexiones');
  const de = (p: Proveedor) => {
    const c = conexiones.find((x) => x.proveedor === p);
    return { configurado: !CUENTAS[p].falta(), falta: CUENTAS[p].falta(), conectada: Boolean(c), ...(c ? publica(c) : {}) };
  };
  const mensajes = await almacen().listar('whatsapp');
  const configurado = !faltaWhatsapp();
  return {
    google: de('google'),
    microsoft: de('microsoft'),
    whatsapp: {
      configurado,
      falta: faltaWhatsapp(),
      numero: configurado ? await numeroWhatsapp() : undefined,
      mensajesRecibidos: mensajes.length,
      ultimoMensaje: mensajes.length ? mensajes[mensajes.length - 1].recibido : undefined,
    },
  };
}

export async function guardarConexion(proveedor: Proveedor, datos: { correo: string; refreshToken: string }) {
  const otras = (await almacen().listar('conexiones')).filter((c) => c.proveedor !== proveedor);
  const nueva: Conexion = { id: nuevoId(), proveedor, conectada: ahora(), ...datos };
  await almacen().reemplazar('conexiones', [...otras, nueva]);
  await anotarActividad(`Conectaste ${NOMBRE[proveedor]}: ${datos.correo}`);
  return publica(nueva);
}

export async function desconectar(proveedor: Proveedor) {
  const todas = await almacen().listar('conexiones');
  const actual = todas.find((c) => c.proveedor === proveedor);
  if (!actual) throw new ErrorDeDatos(`${NOMBRE[proveedor]} no está conectado.`);
  await almacen().reemplazar('conexiones', todas.filter((c) => c.proveedor !== proveedor));
  await anotarActividad(`Desconectaste ${NOMBRE[proveedor]}: ${actual.correo}`);
  return { ok: true };
}

// ── sincronizar ──

/** Mezcla lo nuevo con lo que ya había: si el idProveedor ya existía se conserva su id (y lo que el agente le anotó). */
function fusionar<T extends { id: string; idProveedor?: string }>(actuales: T[], nuevos: Omit<T, 'id'>[], seSustituye: (x: T) => boolean): T[] {
  const previos = new Map(actuales.filter((x) => x.idProveedor).map((x) => [x.idProveedor!, x]));
  const fusionados = nuevos.map((n) => {
    const previo = previos.get(n.idProveedor!);
    return (previo ? { ...previo, ...n, id: previo.id } : { id: nuevoId(), ...n }) as T;
  });
  const ids = new Set(nuevos.map((n) => n.idProveedor));
  return [...actuales.filter((x) => !seSustituye(x) && !ids.has(x.idProveedor)), ...fusionados];
}

export async function sincronizar(proveedor?: Proveedor) {
  const conexiones = (await almacen().listar('conexiones')).filter((c) => !proveedor || c.proveedor === proveedor);
  if (conexiones.length === 0) throw new ErrorDeDatos(proveedor ? `${NOMBRE[proveedor]} no está conectado.` : 'No hay ninguna cuenta conectada. Conecta Google o Microsoft en la sección Conexiones.');
  const desde = new Date();
  const hasta = new Date(desde.getTime() + DIAS_CALENDARIO * 86_400_000);
  const resultados = [];
  for (const c of conexiones) {
    const cuenta = CUENTAS[c.proveedor];
    const [correos, eventos] = await Promise.all([cuenta.leerCorreos(c), cuenta.leerEventos(c, desde, hasta)]);
    const prefijo = `${c.proveedor}:`;
    const esDeEsta = (x: { idProveedor?: string }) => Boolean(x.idProveedor?.startsWith(prefijo));
    const a = almacen();
    // Correos: los últimos 20 hilos sustituyen a los anteriores de esta cuenta. Los que anotó el agente a mano no se tocan.
    await a.reemplazar('correos', fusionar<Correo>(await a.listar('correos'), correos, esDeEsta));
    // Eventos: se sustituyen solo los de esta cuenta dentro de la semana que se consultó.
    const enRango = (x: Evento) => esDeEsta(x) && x.inicio >= desde.toISOString() && x.inicio < hasta.toISOString();
    await a.reemplazar('eventos', fusionar<Evento>(await a.listar('eventos'), eventos, enRango));
    await a.actualizar('conexiones', c.id, { ultimaSync: ahora() });
    await anotarActividad(`Sincronizó ${NOMBRE[c.proveedor]} (${c.correo}): ${correos.length} correos y ${eventos.length} eventos`);
    resultados.push({ proveedor: c.proveedor, correo: c.correo, correos: correos.length, eventos: eventos.length });
  }
  return resultados;
}

// ── mandar cosas: siempre con una aprobación ya aprobada ──

/** Busca la aprobación, revisa que esté "aprobada" y que sea del canal correcto. */
async function aprobacionPara(e: Entrada, canal: Canal): Promise<Aprobacion> {
  const id = textoOpcional(e, 'aprobacion_id', 40);
  if (!id) throw new ErrorDeDatos('Falta "aprobacion_id". Primero pide permiso con crear_aprobacion y espera a que la persona la apruebe en el panel.');
  const a = (await almacen().listar('aprobaciones')).find((x) => x.id === id);
  if (!a) throw new ErrorDeDatos('No encontré una aprobación con ese id. Usa listar_aprobaciones para ver los id.');
  if (a.estado !== 'aprobada') throw new ErrorDeDatos(`Esa aprobación está "${a.estado}". Solo se puede mandar con una aprobación "aprobada" (y cada una sirve una sola vez).`);
  if (a.canal !== canal) throw new ErrorDeDatos(`Esa aprobación es del canal "${a.canal}", no de "${canal}".`);
  return a;
}

async function cerrarAprobacion(a: Aprobacion, hecho: string) {
  await almacen().actualizar('aprobaciones', a.id, { estado: 'hecha' });
  await anotarActividad(hecho);
}

async function cuentaConectada(): Promise<Conexion> {
  const conexiones = await almacen().listar('conexiones');
  // Si hay dos, se usa Google; el agente lo sabe por listar_conexiones.
  const c = conexiones.find((x) => x.proveedor === 'google') ?? conexiones[0];
  if (!c) throw new ErrorDeDatos('No hay ninguna cuenta de correo conectada. Pídele a la persona que conecte Google o Microsoft en Conexiones.');
  return c;
}

export async function enviarCorreo(e: Entrada) {
  const a = await aprobacionPara(e, 'Correo');
  const para = texto(e, 'para', 300);
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(para)) throw new ErrorDeDatos('"para" debe ser un correo, por ejemplo nombre@dominio.com.');
  const mensaje = { para, asunto: texto(e, 'asunto', 500), texto: textoOpcional(e, 'texto', 20000) ?? a.textoEditado ?? a.texto };
  const c = await cuentaConectada();
  await CUENTAS[c.proveedor].enviarCorreo(c, mensaje);
  await cerrarAprobacion(a, `Mandó un correo a ${para} desde ${c.correo}: ${mensaje.asunto}`);
  return { ok: true, desde: c.correo, ...mensaje };
}

export async function crearEvento(e: Entrada) {
  const a = await aprobacionPara(e, 'Calendario');
  const evento = compacto({ titulo: texto(e, 'titulo', 300), inicio: fechaHora(e, 'inicio'), fin: fechaHora(e, 'fin'), descripcion: textoOpcional(e, 'descripcion') });
  if (evento.fin <= evento.inicio) throw new ErrorDeDatos('"fin" debe ser posterior a "inicio".');
  const c = await cuentaConectada();
  await CUENTAS[c.proveedor].crearEvento(c, evento);
  await cerrarAprobacion(a, `Creó el evento "${evento.titulo}" en el calendario de ${c.correo}`);
  // Para que se vea en el panel sin esperar la siguiente sincronización.
  await sincronizar(c.proveedor).catch(() => undefined);
  return { ok: true, en: c.correo, ...evento };
}

export async function enviarWhatsapp(e: Entrada) {
  const falta = faltaWhatsapp();
  if (falta) throw new ErrorDeDatos(`WhatsApp no está configurado: falta la variable ${falta}.`);
  const a = await aprobacionPara(e, 'WhatsApp');
  const para = texto(e, 'para', 30).replace(/[^\d]/g, '');
  if (para.length < 10) throw new ErrorDeDatos('"para" debe ser un número con código de país, por ejemplo 5215512345678.');
  const mensaje = textoOpcional(e, 'texto', 4000) ?? a.textoEditado ?? a.texto;
  await mandarWhatsapp(para, mensaje);
  await cerrarAprobacion(a, `Mandó un WhatsApp a +${para}`);
  return { ok: true, para, texto: mensaje };
}

// ── mensajes que llegan por el webhook de Meta ──

export async function guardarMensajesWhatsapp(cuerpo: unknown) {
  const entradas = (cuerpo as { entry?: Record<string, any>[] })?.entry ?? [];
  const nuevos: Whatsapp[] = [];
  for (const entrada of entradas) {
    for (const cambio of entrada.changes ?? []) {
      const v = cambio.value ?? {};
      const nombre = v.contacts?.[0]?.profile?.name;
      for (const m of v.messages ?? []) {
        nuevos.push(compacto({
          id: nuevoId(),
          idProveedor: String(m.id),
          de: String(m.from ?? ''),
          nombre: typeof nombre === 'string' ? nombre : undefined,
          texto: m.text?.body ?? `[${m.type ?? 'mensaje'} sin texto]`,
          recibido: new Date(Number(m.timestamp) * 1000 || Date.now()).toISOString(),
        }));
      }
    }
  }
  if (nuevos.length === 0) return 0;
  const a = almacen();
  const actuales = await a.listar('whatsapp');
  const vistos = new Set(actuales.map((x) => x.idProveedor));
  const agregar = nuevos.filter((n) => !vistos.has(n.idProveedor));
  if (agregar.length) await a.reemplazar('whatsapp', [...actuales, ...agregar].slice(-200));
  return agregar.length;
}
